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

test('worker creates a structured offering with attachment metadata', () => {
  const s = model.seed();
  const offering = model.createOffering(s, { role: 'WORKER', email: 'worker@samter.kr' }, {
    title: '마을 기록 사진 촬영', category: '기록·콘텐츠', description: '마을 행사와 주민 활동을 촬영하고 정리합니다.',
    scope: '현장 촬영 3시간, 보정 사진 20장', location: '청주시 상당구', schedule: '2026-10-03 10:00', price: 180000,
    attachments: [{ key: 'offer-file-1', name: '촬영예시.jpg', size: 2048, type: 'image/jpeg' }],
  });
  assert.equal(offering.status, 'DRAFT');
  assert.equal(offering.workerEmail, 'worker@samter.kr');
  assert.equal(offering.attachments[0].name, '촬영예시.jpg');
  assert.throws(() => model.createOffering(s, { role: 'CONSUMER', email: 'consumer@samter.kr' }, { title: 'x' }), /생산자/);
});

test('administrator creates an agency-linked commissioned project with full details', () => {
  const s = model.seed();
  const project = model.createProject(s, { role: 'ADMIN', email: 'admin@samter.kr' }, {
    agencyId: 1, title: '농촌 경관 기록 사업', category: '지역 기록', description: '사업 대상 마을의 계절 경관과 공동체 활동을 기록합니다.',
    scope: '3개 마을 현장 조사와 사진 아카이브', location: '청주시 문의면', period: '2026.10.01 ~ 2026.11.30', budget: 12000000,
    attachments: [{ key: 'project-file-1', name: '과업지시서.pdf', size: 4096, type: 'application/pdf' }],
  });
  assert.equal(project.agencyId, 1);
  assert.equal(project.description, '사업 대상 마을의 계절 경관과 공동체 활동을 기록합니다.');
  assert.equal(project.attachments[0].name, '과업지시서.pdf');
  assert.throws(() => model.createProject(s, { role: 'WORKER', email: 'worker@samter.kr' }, { agencyId: 1, title: 'x' }), /관리자/);
});

test('orders retain the actual consumer and offering worker for document scope sync', () => {
  const s = model.seed();
  const order = model.order(s, { role: 'CONSUMER', email: 'consumer@samter.kr' }, 1);
  assert.equal(order.consumerEmail, 'consumer@samter.kr');
  assert.equal(order.workerEmail, 'worker@samter.kr');
  assert.equal(order.offeringId, 1);
});

test('v1 state migrates without losing orders, statuses, agency links, or publications', () => {
  const legacy = model.seed();
  legacy.version = 1;
  legacy.orders = [{ id: 77, title: '기존 주문', price: 44000, status: 'PAYMENT_SENT', revisions: 2, history: [{ action: 'payment' }] }];
  legacy.projects[0].agencyId = 2;
  legacy.projects[0].evidence[0].published = false;
  delete legacy.offerings[0].category;
  const migrated = model.migrate(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.orders[0].id, 77);
  assert.equal(migrated.orders[0].status, 'PAYMENT_SENT');
  assert.equal(migrated.projects[0].agencyId, 2);
  assert.equal(migrated.projects[0].evidence[0].published, false);
  assert.ok(migrated.offerings[0].category);
});

test('commissioned project originals require per-attachment admin publication', () => {
  const state = model.seed();
  assert.deepEqual(model.portal(state, 1)[0].attachments, []);
  state.projects[0].attachments[0].published = true;
  assert.equal(model.portal(state, 1)[0].attachments[0].name, '농촌환경개선-과업안내.txt');
  const created = model.createProject(state, { role: 'ADMIN', email: 'admin@samter.kr' }, {
    agencyId: 1, title: '새 사업', category: '환경', description: '상세 사업 설명', scope: '과업 범위', location: '청주시', period: '2026.10', budget: 1000000,
    attachments: [{ key: 'private-original', name: '원본.pdf', size: 100, type: 'application/pdf' }],
  });
  assert.equal(created.attachments[0].published, false);
});
