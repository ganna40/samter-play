import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { SITE_INFO, institutionalFooterMarkup } from '../site_info.js';

test('public institution pages use the confirmed identity and shared shell', async () => {
  assert.equal(SITE_INFO.institutionName, 'ㅇㅇ사회적협동조합');
  assert.equal(SITE_INFO.representative, '염광선');
  assert.equal(SITE_INFO.address, '정보 준비 중');
  assert.match(institutionalFooterMarkup(), /개인정보 처리방침/);

  for (const page of ['about', 'history', 'leader', 'terms', 'privacy', 'location']) {
    const html = await fs.readFile(new URL(`../${page}.html`, import.meta.url), 'utf8');
    assert.match(html, /data-samter-site-header/);
    assert.match(html, /data-samter-site-footer/);
  }
});

test('public policy pages describe browser-only demo handling and reject real personal data', async () => {
  const privacy = await fs.readFile(new URL('../privacy.html', import.meta.url), 'utf8');
  const terms = await fs.readFile(new URL('../terms.html', import.meta.url), 'utf8');
  assert.match(privacy, /localStorage/);
  assert.match(privacy, /IndexedDB/);
  assert.match(privacy, /실제 인증이나 권한 경계가 아닙니다/);
  assert.match(terms, /실제 개인정보나 업무 문서를 입력하거나 올리지 마세요/);
  assert.doesNotMatch(privacy, /현재 시스템은 비밀번호를 원문 대신 해시로 저장/);
});
