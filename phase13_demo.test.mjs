import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('public demo loads phase13 transaction assets', () => {
  const html = fs.readFileSync('app.html', 'utf8');
  assert.match(html, /phase13_demo\.css/);
  assert.match(html, /phase13_demo\.js/);
});

test('phase13 public demo exposes simple money-flow workspace', () => {
  const script = fs.readFileSync('phase13_demo.js', 'utf8');
  assert.match(script, /거래·결산/);
  assert.match(script, /거래 차액/);
  assert.match(script, /자동 기록/);
  assert.match(script, /직접 입력/);
  assert.match(script, /연도 마감/);
  assert.match(script, /CSV/);
  assert.match(script, /사업별 거래 요약/);
});
