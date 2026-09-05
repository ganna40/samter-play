import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appHtml = fs.readFileSync('app.html', 'utf8');

test('app loads phase 14 disclosure demo assets', () => {
  assert.match(appHtml, /phase14_demo\.css/);
  assert.match(appHtml, /phase14_demo\.js/);
});

test('phase 14 demo exposes disclosure lifecycle and privacy-safe summaries', () => {
  const source = fs.readFileSync('phase14_demo.js', 'utf8');
  assert.match(source, /경영공시/);
  assert.match(source, /DRAFT/);
  assert.match(source, /READY/);
  assert.match(source, /FINALIZED/);
  assert.match(source, /SUBMITTED/);
  assert.match(source, /정관/);
  assert.match(source, /사업결산/);
  assert.match(source, /공익 주사업/);
  assert.match(source, /총회·이사회/);
  assert.match(source, /운영거래 참고요약/);
  assert.match(source, /PDF/);
  assert.match(source, /ZIP/);
  assert.doesNotMatch(source, /bank_account|계좌번호|resident_registration/i);
});

test('phase 14 demo keeps finalized packages read only', () => {
  const source = fs.readFileSync('phase14_demo.js', 'utf8');
  assert.match(source, /FINALIZED.*SUBMITTED|SUBMITTED.*FINALIZED/s);
  assert.match(source, /readOnly|readonly|immutable/i);
});
