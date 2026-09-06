// Run against a local server or DEMO_URL; uses an isolated browser context.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const base = process.env.DEMO_URL || 'http://127.0.0.1:8765/';
    await page.goto(base + 'app.html');

    const login = async (email, password) => {
      if (await page.locator('#logout').count()) await page.locator('#logout').click();
      await page.locator('[name=email]').fill(email);
      await page.locator('[name=password]').fill(password);
      await page.locator('#login-form button[type="submit"]').click();
    };
    const openDocuments = async () => page.locator('.sidebar').getByRole('button', { name: '문서함', exact: true }).click();
    const waitNotice = async text => page.waitForFunction(expected => document.querySelector('#notice')?.textContent.includes(expected), text);
    const expectReentry = async (otherMenu) => {
      await openDocuments();
      await page.getByRole('heading', { name: '문서함', exact: true }).waitFor();
      await page.locator('.sidebar').getByRole('button', { name: otherMenu, exact: true }).click();
      await openDocuments();
      await page.getByRole('heading', { name: '문서함', exact: true }).waitFor();
    };

    await login('worker@samter.kr', 'Worker1234!');
    await expectReentry('참여 가능한 업무');
    await page.reload();
    await page.getByRole('heading', { name: '문서함', exact: true }).waitFor();
    await page.locator('[data-doc-new]').click();
    await page.locator('#document-submit-form [name="type"]').selectOption('WORK_RESULT');
    const chooser = page.locator('[data-doc-upload]').first();
    await chooser.setInputFiles({ name: '새-작업계획서.txt', mimeType: 'text/plain', buffer: Buffer.from('fictional demo plan') });
    await page.locator('[data-doc-submit]').click();
    await waitNotice('제출');
    assert.match(await page.locator('#notice').innerText(), /제출/);

    await login('consumer@samter.kr', 'Consumer1234!');
    await expectReentry('내 주문');
    assert.match(await page.locator('[data-doc-list]').innerText(), /새-작업계획서/);
    await page.locator('[data-doc-card]').filter({ hasText: '새-작업계획서' }).locator('[data-doc-review="APPROVE"]').click();
    await waitNotice('승인');
    assert.match(await page.locator('#notice').innerText(), /승인/);

    await page.locator('.sidebar').getByRole('button', { name: '서비스 찾기', exact: true }).click();
    await page.locator('[data-p15="order"]').first().click();
    await login('worker@samter.kr', 'Worker1234!');
    await openDocuments();
    await page.locator('[data-doc-new]').click();
    await page.locator('#document-submit-form [name="scopeId"]').selectOption('order-1');
    await page.locator('#document-submit-form [name="type"]').selectOption('QUOTE');
    await page.locator('[data-doc-upload]').setInputFiles({ name: '주문-견적서.txt', mimeType: 'text/plain', buffer: Buffer.from('fictional order quote') });
    await page.locator('[data-doc-submit]').click();
    await waitNotice('제출');
    await login('consumer@samter.kr', 'Consumer1234!');
    await openDocuments();
    const orderCard = page.locator('[data-doc-card]').filter({ hasText: '주문-견적서' });
    await orderCard.locator('[data-doc-review="APPROVE"]').click();
    await waitNotice('승인');

    await login('admin@samter.kr', 'Samter1234!');
    await expectReentry('대시보드');
    const privateOrderCard = page.locator('[data-doc-card]').filter({ hasText: '주문-견적서' });
    assert.equal(await privateOrderCard.locator('[data-doc-publish], [data-doc-admin-review]').count(), 0);
    const approvedCard = page.locator('[data-doc-card]').filter({ hasText: '새-작업계획서' });
    await approvedCard.locator('[data-doc-admin-review="APPROVE"]').click();
    await waitNotice('최종 승인');
    await approvedCard.locator('[data-doc-publish]').click();
    assert.match(await page.locator('#notice').innerText(), /공개/);

    await login('agency@samter.kr', 'Agency1234!');
    await expectReentry('담당 사업');
    assert.match(await page.locator('[data-doc-list]').innerText(), /새-작업계획서/);
    assert.doesNotMatch(await page.locator('[data-doc-list]').innerText(), /주문-견적서/);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('[data-doc-card]').filter({ hasText: '새-작업계획서' }).locator('[data-doc-download]').click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), '새-작업계획서.txt');

    await login('agency2@samter.kr', 'Agency1234!');
    await openDocuments();
    assert.doesNotMatch(await page.locator('[data-doc-list]').innerText(), /새-작업계획서/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS: public-task and order documents, separate reviews, all-role entry/reentry, refresh restoration, agency isolation, blob download, and mobile layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
