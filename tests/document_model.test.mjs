import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let model;
try { model = require('../document_model.js'); } catch {}

test('worker submits a new document version only for assigned work or own order', () => {
  assert.ok(model, 'document demo model is available');
  const state = model.seed();
  const first = model.submit(state, { role: 'WORKER', email: 'worker@samter.kr' }, {
    scopeId: 'task-101', type: 'WORK_RESULT', fileKey: 'blob-1', fileName: '작업결과서.pdf', fileSize: 1234,
  });
  model.review(state, { role: 'CONSUMER', email: 'consumer@samter.kr' }, first.id, 'REVISION', '현장 사진을 보완해 주세요.');
  const second = model.submit(state, { role: 'WORKER', email: 'worker@samter.kr' }, {
    scopeId: 'task-101', type: 'WORK_RESULT', fileKey: 'blob-2', fileName: '작업결과서-v2.pdf', fileSize: 1400,
  });
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.equal(second.status, 'SUBMITTED');
  assert.throws(() => model.submit(state, { role: 'WORKER', email: 'other@samter.kr' }, {
    scopeId: 'task-101', type: 'QUOTE', fileKey: 'blob-x', fileName: '견적서.pdf', fileSize: 1,
  }), /배정/);
});

test('consumer sees and reviews only explicitly assigned work or own order documents', () => {
  const state = model.seed();
  const consumer = { role: 'CONSUMER', email: 'consumer@samter.kr' };
  const visible = model.visibleDocuments(state, consumer);
  assert.ok(visible.length > 0);
  assert.ok(visible.every(doc => ['task-101', 'order-1'].includes(doc.scopeId)));
  assert.ok(!visible.some(doc => doc.scopeId === 'task-102'));
  const submitted = visible.find(doc => doc.status === 'SUBMITTED');
  model.review(state, consumer, submitted.id, 'APPROVE', '내용을 확인했습니다.');
  assert.equal(state.documents.find(doc => doc.id === submitted.id).status, 'CONSUMER_APPROVED');
  const forbidden = state.documents.find(doc => doc.scopeId === 'task-102');
  assert.throws(() => model.review(state, consumer, forbidden.id, 'REVISION', '수정'), /권한/);
});

test('revision creates a separate version and never replaces the published version', () => {
  const state = model.seed();
  const admin = { role: 'ADMIN', email: 'admin@samter.kr' };
  const worker = { role: 'WORKER', email: 'worker@samter.kr' };
  const approved = state.documents.find(doc => doc.scopeId === 'task-101' && doc.type === 'QUOTE' && doc.status === 'APPROVED');
  model.publish(state, admin, approved.id);
  model.adminReview(state, admin, approved.id, 'REVISION', '산출 근거 갱신');
  const revision = model.submit(state, worker, {
    scopeId: 'task-101', type: 'QUOTE', fileKey: 'quote-v2', fileName: '견적서-v2.pdf', fileSize: 2000,
  });
  const agencyDocs = model.visibleDocuments(state, { role: 'AGENCY_USER', email: 'agency@samter.kr', agencyId: 1 });
  assert.equal(agencyDocs.length, 1);
  assert.equal(agencyDocs[0].id, approved.id);
  assert.equal(revision.version, approved.version + 1);
  assert.equal(revision.status, 'SUBMITTED');
});

test('agency projection exposes only active publications linked to its projects and revocation hides them', () => {
  const state = model.seed();
  const admin = { role: 'ADMIN', email: 'admin@samter.kr' };
  const projectOne = state.documents.find(doc => doc.scopeId === 'task-101' && doc.status === 'APPROVED');
  const projectTwo = state.documents.find(doc => doc.scopeId === 'task-102' && doc.status === 'APPROVED');
  const firstPublication = model.publish(state, admin, projectOne.id);
  model.publish(state, admin, projectTwo.id);
  assert.deepEqual(model.visibleDocuments(state, { role: 'AGENCY_USER', email: 'agency@samter.kr', agencyId: 1 }).map(doc => doc.id), [projectOne.id]);
  assert.deepEqual(model.visibleDocuments(state, { role: 'AGENCY_USER', email: 'agency2@samter.kr', agencyId: 2 }).map(doc => doc.id), [projectTwo.id]);
  model.revoke(state, admin, firstPublication.id);
  assert.deepEqual(model.visibleDocuments(state, { role: 'AGENCY_USER', email: 'agency@samter.kr', agencyId: 1 }), []);
});

test('only approved versions can be published and every version has its own review history', () => {
  const state = model.seed();
  const admin = { role: 'ADMIN', email: 'admin@samter.kr' };
  const submitted = state.documents.find(doc => doc.status === 'SUBMITTED');
  assert.throws(() => model.publish(state, admin, submitted.id), /승인/);
  const consumer = { role: 'CONSUMER', email: 'consumer@samter.kr' };
  model.review(state, consumer, submitted.id, 'REVISION', '금액 근거를 보완해 주세요.');
  assert.equal(submitted.status, 'REVISION_REQUIRED');
  assert.equal(submitted.reviewHistory.at(-1).comment, '금액 근거를 보완해 주세요.');
});

test('only the latest version can be reviewed or published', () => {
  const state = model.seed();
  const worker = { role: 'WORKER', email: 'worker@samter.kr' };
  const consumer = { role: 'CONSUMER', email: 'consumer@samter.kr' };
  const admin = { role: 'ADMIN', email: 'admin@samter.kr' };
  const oldPlan = state.documents.find(doc => doc.scopeId === 'task-101' && doc.type === 'WORK_PLAN');
  model.review(state, consumer, oldPlan.id, 'REVISION', '계획 보완');
  model.submit(state, worker, { scopeId: 'task-101', type: 'WORK_PLAN', fileKey: 'new-plan', fileName: 'new-plan.pdf', fileSize: 10 });
  assert.throws(() => model.review(state, consumer, oldPlan.id, 'APPROVE'), /최신/);
  const oldQuote = state.documents.find(doc => doc.scopeId === 'task-101' && doc.type === 'QUOTE');
  model.adminReview(state, admin, oldQuote.id, 'REVISION', '견적 갱신');
  model.submit(state, worker, { scopeId: 'task-101', type: 'QUOTE', fileKey: 'new-quote', fileName: 'new-quote.pdf', fileSize: 10 });
  assert.throws(() => model.publish(state, admin, oldQuote.id), /최신/);
});

test('market order documents stay private and unassigned public work can be reviewed by admin', () => {
  const state = model.seed();
  state.scopes.push({ id: 'order-1', kind: 'MARKET_ORDER', title: '생활공간 정리 서비스 주문 #1', workerEmail: 'worker@samter.kr', consumerEmail: 'consumer@samter.kr' });
  const worker = { role: 'WORKER', email: 'worker@samter.kr' };
  const admin = { role: 'ADMIN', email: 'admin@samter.kr' };
  const orderDoc = model.submit(state, worker, { scopeId: 'order-1', type: 'QUOTE', fileKey: 'order-quote', fileName: 'order-quote.pdf', fileSize: 10 });
  model.review(state, { role: 'CONSUMER', email: 'consumer@samter.kr' }, orderDoc.id, 'APPROVE');
  assert.throws(() => model.publish(state, admin, orderDoc.id), /공공업무/);
  const unassigned = state.documents.find(doc => doc.scopeId === 'task-102');
  unassigned.status = 'SUBMITTED';
  model.adminReview(state, admin, unassigned.id, 'APPROVE', '관리자 검토');
  assert.equal(unassigned.status, 'APPROVED');
});

test('consumer acceptance and administrator approval are separate public-work reviews', () => {
  const state = model.seed();
  const consumer = { role: 'CONSUMER', email: 'consumer@samter.kr' };
  const admin = { role: 'ADMIN', email: 'admin@samter.kr' };
  const submitted = state.documents.find(doc => doc.scopeId === 'task-101' && doc.status === 'SUBMITTED');
  assert.throws(() => model.adminReview(state, admin, submitted.id, 'APPROVE'), /소비자/);
  model.review(state, consumer, submitted.id, 'APPROVE', '소비자 확인');
  assert.equal(submitted.status, 'CONSUMER_APPROVED');
  assert.throws(() => model.publish(state, admin, submitted.id), /관리자/);
  model.adminReview(state, admin, submitted.id, 'APPROVE', '관리자 최종 검토');
  assert.equal(submitted.status, 'APPROVED');
});

test('same document type can be resubmitted only after revision is requested', () => {
  const state = model.seed();
  const worker = { role: 'WORKER', email: 'worker@samter.kr' };
  assert.throws(() => model.submit(state, worker, { scopeId: 'task-101', type: 'WORK_PLAN', fileKey: 'early', fileName: 'early.pdf', fileSize: 10 }), /보완/);
  const plan = state.documents.find(doc => doc.scopeId === 'task-101' && doc.type === 'WORK_PLAN');
  model.review(state, { role: 'CONSUMER', email: 'consumer@samter.kr' }, plan.id, 'REVISION');
  const next = model.submit(state, worker, { scopeId: 'task-101', type: 'WORK_PLAN', fileKey: 'next', fileName: 'next.pdf', fileSize: 10 });
  assert.equal(next.version, 2);
});
