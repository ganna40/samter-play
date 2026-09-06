// Structured public-demo offering and commissioned-project details.
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

    await login('worker@samter.kr', 'Worker1234!');
    await page.locator('.sidebar').getByRole('button', { name: '서비스 마켓', exact: true }).click();
    await page.locator('[data-p15="offer-detail"]').first().click();
    assert.match(await page.locator('.p15-detail').innerText(), /서비스 소개|제공 범위|첨부자료/);
    await page.locator('[data-p15="market"]').click();
    await page.getByRole('button', { name: '서비스 등록', exact: true }).click();
    const offerForm = page.locator('.p15-entry-dialog form');
    await offerForm.locator('[name=title]').fill('마을 기록 사진 촬영');
    await offerForm.locator('[name=category]').fill('기록·콘텐츠');
    await offerForm.locator('[name=description]').fill('마을 행사와 주민 활동을 촬영하고 이야기와 함께 정리합니다.');
    await offerForm.locator('[name=scope]').fill('현장 촬영 3시간, 보정 사진 20장');
    await offerForm.locator('[name=location]').fill('청주시 상당구');
    await offerForm.locator('[name=schedule]').fill('2026-10-03 10:00');
    await offerForm.locator('[name=amount]').fill('180000');
    await offerForm.locator('[name=files]').setInputFiles({ name: '촬영예시.txt', mimeType: 'text/plain', buffer: Buffer.from('fictional photo guide') });
    await offerForm.getByRole('button', { name: '등록', exact: true }).click();
    await page.getByText('마을 기록 사진 촬영', { exact: true }).waitFor();
    const offerCard = page.locator('.p15-card').filter({ hasText: '마을 기록 사진 촬영' });
    await offerCard.getByRole('button', { name: '서비스 상세', exact: true }).click();
    assert.match(await page.locator('.p15-detail').innerText(), /주민 활동|촬영예시\.txt/);
    const offerDownloadEvent = page.waitForEvent('download');
    await page.locator('[data-p15-file-download]').click();
    assert.equal((await offerDownloadEvent).suggestedFilename(), '촬영예시.txt');

    await login('admin@samter.kr', 'Samter1234!');
    await page.locator('.sidebar').getByRole('button', { name: '발주기관 관리', exact: true }).click();
    await page.getByRole('button', { name: '발주 사업 등록', exact: true }).click();
    const projectForm = page.locator('.p15-entry-dialog form');
    await projectForm.locator('[name=agencyId]').selectOption('1');
    await projectForm.locator('[name=title]').fill('농촌 경관 기록 사업');
    await projectForm.locator('[name=category]').fill('지역 기록');
    await projectForm.locator('[name=description]').fill('대상 마을의 계절 경관과 공동체 활동을 기록합니다.');
    await projectForm.locator('[name=scope]').fill('3개 마을 현장 조사와 사진 아카이브');
    await projectForm.locator('[name=location]').fill('청주시 문의면');
    await projectForm.locator('[name=schedule]').fill('2026.10.01 ~ 2026.11.30');
    await projectForm.locator('[name=amount]').fill('12000000');
    await projectForm.locator('[name=files]').setInputFiles({ name: '과업지시서.txt', mimeType: 'text/plain', buffer: Buffer.from('fictional commissioned project brief') });
    await projectForm.getByRole('button', { name: '등록', exact: true }).click();
    await page.getByText('농촌 경관 기록 사업', { exact: true }).waitFor();
    const projectCard = page.locator('.p15-card').filter({ hasText: '농촌 경관 기록 사업' });
    assert.match(await projectCard.innerText(), /내부 전용/);
    await projectCard.getByRole('button', { name: '첨부 기관 공개', exact: true }).click();
    await projectCard.getByRole('button', { name: '사업 상세', exact: true }).click();
    assert.match(await page.locator('.p15-detail').innerText(), /계절 경관|과업지시서\.txt/);

    await login('agency@samter.kr', 'Agency1234!');
    const agencyProject = page.locator('.p15-card').filter({ hasText: '농촌 경관 기록 사업' });
    await agencyProject.getByRole('button', { name: '사업 상세', exact: true }).click();
    assert.match(await page.locator('.p15-detail').innerText(), /사업 소개|3개 마을|과업지시서\.txt/);
    const projectDownloadEvent = page.waitForEvent('download');
    await page.locator('[data-p15-file-download]').click();
    assert.equal((await projectDownloadEvent).suggestedFilename(), '과업지시서.txt');
    assert.deepEqual(errors, []);
    console.log('PASS: structured offering/project modals, editorial detail, attachment persistence/download, and agency projection.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
