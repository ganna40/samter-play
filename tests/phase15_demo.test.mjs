import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let model;
try { model = require('../phase15_model.js'); } catch {}
test('market purchase follows inspection and direct-transfer lifecycle', () => {
  assert.ok(model, 'P15 demo model is available');
  const s = model.seed();
  const order = model.order(s, 'CONSUMER', 1);
  for (const [role, action] of [['WORKER','accept'],['WORKER','start'],['WORKER','fulfill'],['CONSUMER','revision'],['WORKER','fulfill'],['CONSUMER','approve'],['CONSUMER','payment'],['WORKER','confirm']]) model.transition(order, role, action);
  assert.equal(order.status, 'COMPLETED');
  assert.equal(order.revisions, 1);
  assert.throws(() => model.transition(order, 'CONSUMER', 'cancel'));
});
test('role and state rules prevent invalid purchases and transitions', () => {
  assert.ok(model);
  const s = model.seed();
  assert.throws(() => model.order(s, 'AGENCY_USER', 1));
  assert.throws(() => model.order(s, 'CONSUMER', 2));
  const o = model.order(s, 'CONSUMER', 1);
  assert.throws(() => model.transition(o, 'CONSUMER', 'accept'));
  assert.throws(() => model.transition(o, 'WORKER', 'confirm'));
  model.transition(o, 'CONSUMER', 'cancel');
  assert.equal(o.status, 'CANCELLED');
});
test('cancellation and dispute restore the previous status or cancel', () => {
  assert.ok(model);
  const o = model.order(model.seed(), 'CONSUMER', 1);
  model.transition(o, 'WORKER', 'accept');
  model.transition(o, 'CONSUMER', 'cancel');
  model.transition(o, 'WORKER', 'contest');
  model.transition(o, 'ADMIN', 'continue');
  assert.equal(o.status, 'ACCEPTED');
  model.transition(o, 'CONSUMER', 'cancel');
  model.transition(o, 'WORKER', 'agree');
  assert.equal(o.status, 'CANCELLED');
});
test('agency data is explicitly linked, published, and projected to public fields', () => {
  assert.ok(model);
  const s = model.seed();
  s.projects[0].internal_note = 'PRIVATE';
  const p = model.portal(s, 1);
  assert.equal(p.length, 1);
  assert.equal(p[0].progress, 50);
  assert.equal(p[0].evidence.length, 1);
  assert.ok(!JSON.stringify(p).includes('PRIVATE'));
  s.projects[0].agencyId = 2;
  assert.equal(model.portal(s, 1).length, 0);
  s.agencies[1].active = false;
  assert.equal(model.portal(s, 2).length, 0);
});
test('post-transfer dispute is available to both parties and preserves resume status', () => {
  const o = model.order(model.seed(), 'CONSUMER', 1);
  for (const [r,a] of [['WORKER','accept'],['WORKER','start'],['WORKER','fulfill'],['CONSUMER','approve'],['CONSUMER','payment']]) model.transition(o,r,a);
  assert.ok(model.actions(o,'WORKER').includes('dispute'));
  assert.ok(model.actions(o,'CONSUMER').includes('dispute'));
  model.transition(o,'WORKER','dispute');
  model.transition(o,'ADMIN','continue');
  assert.equal(o.status,'PAYMENT_SENT');
});
test('zero eligible agency tasks gives zero progress and exposes no unpublished summaries', () => {
  const s = model.seed();
  s.projects[0].tasks = [{title:'cancelled', status:'CANCELLED'}];
  s.projects[0].reviews.forEach(r => r.published = false);
  const [p] = model.portal(s,1);
  assert.equal(p.progress,0);
  assert.deepEqual(p.reviews,[]);
});
