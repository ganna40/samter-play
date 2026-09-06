/* Fictional public-demo document workflow. Browser roles demonstrate policy, not security. */
(() => {
  'use strict';

  const documentTypes = ['QUOTE', 'WORK_PLAN', 'WORK_RESULT'];
  const now = () => new Date().toISOString();
  const idOf = (items) => Math.max(0, ...items.map(item => Number(item.id) || 0)) + 1;

  function seed() {
    return {
      version: 2,
      projects: [
        { id: 1, agencyId: 1, title: '2026 농촌 환경개선 사업' },
        { id: 2, agencyId: 2, title: '도심 환경정비 사업' },
      ],
      scopes: [
        { id: 'task-101', kind: 'PUBLIC_TASK', title: '청주시 A지역 시설 점검', projectId: 1, workerEmail: 'worker@samter.kr', consumerEmails: ['consumer@samter.kr'] },
        { id: 'task-102', kind: 'PUBLIC_TASK', title: '환경정비 현장 지원', projectId: 2, workerEmail: 'other@samter.kr', consumerEmails: [] },
      ],
      documents: [
        { id: 1, scopeId: 'task-101', type: 'QUOTE', version: 1, status: 'APPROVED', fileKey: 'seed-quote-1', fileName: '시설점검-견적서-v1.txt', fileSize: 174, submittedBy: 'worker@samter.kr', submittedAt: '2026-09-04T01:00:00.000Z', reviewHistory: [{ decision: 'APPROVE', actor: 'consumer@samter.kr', actorRole: 'CONSUMER', comment: '금액과 범위를 확인했습니다.', at: '2026-09-04T02:00:00.000Z' }, { decision: 'APPROVE', actor: 'admin@samter.kr', actorRole: 'ADMIN', comment: '관리자 최종 승인', at: '2026-09-04T03:00:00.000Z' }] },
        { id: 2, scopeId: 'task-101', type: 'WORK_PLAN', version: 1, status: 'SUBMITTED', fileKey: 'seed-plan-1', fileName: '시설점검-작업계획서-v1.txt', fileSize: 202, submittedBy: 'worker@samter.kr', submittedAt: '2026-09-05T01:00:00.000Z', reviewHistory: [] },
        { id: 3, scopeId: 'task-102', type: 'WORK_RESULT', version: 1, status: 'APPROVED', fileKey: 'seed-result-2', fileName: '환경정비-작업결과서-v1.txt', fileSize: 198, submittedBy: 'other@samter.kr', submittedAt: '2026-09-05T03:00:00.000Z', reviewHistory: [{ decision: 'APPROVE', actor: 'admin@samter.kr', actorRole: 'ADMIN', comment: '연결 소비자 없는 업무 관리자 승인', at: '2026-09-05T04:00:00.000Z' }] },
      ],
      publications: [],
    };
  }

  function scopeFor(state, scopeId) {
    return state.scopes.find(scope => scope.id === String(scopeId));
  }

  function canWorkerUse(scope, actor) {
    return actor.role === 'WORKER' && scope?.workerEmail === actor.email;
  }

  function canConsumerUse(scope, actor) {
    return actor.role === 'CONSUMER' && (scope?.consumerEmail === actor.email || scope?.consumerEmails?.includes(actor.email));
  }

  function isLatest(state, document) {
    return !state.documents.some(item => item.scopeId === document.scopeId && item.type === document.type && item.version > document.version);
  }

  function submit(state, actor, input) {
    const scope = scopeFor(state, input.scopeId);
    if (!canWorkerUse(scope, actor)) throw Error('이 작업이나 주문에 배정된 생산자만 제출할 수 있습니다.');
    if (!documentTypes.includes(input.type)) throw Error('지원하지 않는 문서 종류입니다.');
    if (!input.fileKey || !input.fileName || !(Number(input.fileSize) > 0)) throw Error('제출할 파일을 선택해 주세요.');
    const related = state.documents.filter(doc => doc.scopeId === scope.id && doc.type === input.type);
    const previous = related.sort((a, b) => b.version - a.version)[0];
    if (previous && previous.status !== 'REVISION_REQUIRED') throw Error('보완 요청을 받은 뒤에만 같은 종류의 새 버전을 제출할 수 있습니다.');
    const document = {
      id: idOf(state.documents), scopeId: scope.id, type: input.type,
      version: Math.max(0, ...related.map(doc => doc.version)) + 1,
      status: 'SUBMITTED', fileKey: String(input.fileKey), fileName: String(input.fileName), fileSize: Number(input.fileSize),
      submittedBy: actor.email, submittedAt: now(), reviewHistory: [],
    };
    state.documents.push(document);
    return document;
  }

  function review(state, actor, documentId, decision, comment = '') {
    const document = state.documents.find(doc => doc.id === Number(documentId));
    const scope = document && scopeFor(state, document.scopeId);
    if (!document || !canConsumerUse(scope, actor)) throw Error('이 문서를 검토할 권한이 없습니다.');
    if (!isLatest(state, document)) throw Error('최신 문서 버전만 검토할 수 있습니다.');
    if (document.status !== 'SUBMITTED') throw Error('제출된 버전만 검토할 수 있습니다.');
    if (!['APPROVE', 'REVISION'].includes(decision)) throw Error('지원하지 않는 검토 결과입니다.');
    document.status = decision === 'APPROVE' ? 'CONSUMER_APPROVED' : 'REVISION_REQUIRED';
    document.reviewHistory.push({ decision, actor: actor.email, actorRole: actor.role, comment: String(comment).trim(), at: now() });
    return document;
  }

  function adminReview(state, actor, documentId, decision, comment = '') {
    if (actor.role !== 'ADMIN') throw Error('관리자만 최종 검토할 수 있습니다.');
    const document = state.documents.find(doc => doc.id === Number(documentId));
    const scope = document && scopeFor(state, document.scopeId);
    if (!document || scope?.kind !== 'PUBLIC_TASK') throw Error('관리자가 검토할 공공업무 문서를 찾을 수 없습니다.');
    if (!isLatest(state, document)) throw Error('최신 문서 버전만 검토할 수 있습니다.');
    if (!['APPROVE', 'REVISION'].includes(decision)) throw Error('지원하지 않는 검토 결과입니다.');
    const hasConsumer = Boolean(scope.consumerEmail || scope.consumerEmails?.length);
    if (decision === 'APPROVE') {
      if (hasConsumer && document.status !== 'CONSUMER_APPROVED') throw Error('연결된 소비자의 확인 후 관리자가 승인할 수 있습니다.');
      if (!hasConsumer && document.status !== 'SUBMITTED') throw Error('제출된 버전만 승인할 수 있습니다.');
      document.status = 'APPROVED';
    } else {
      if (!['SUBMITTED', 'CONSUMER_APPROVED', 'APPROVED'].includes(document.status)) throw Error('현재 상태에서는 보완 요청을 할 수 없습니다.');
      document.status = 'REVISION_REQUIRED';
    }
    document.reviewHistory.push({ decision, actor: actor.email, actorRole: actor.role, comment: String(comment).trim(), at: now() });
    return document;
  }

  function publish(state, actor, documentId) {
    if (actor.role !== 'ADMIN') throw Error('관리자만 기관에 공개할 수 있습니다.');
    const document = state.documents.find(doc => doc.id === Number(documentId));
    const scope = document && scopeFor(state, document.scopeId);
    if (scope?.kind !== 'PUBLIC_TASK') throw Error('기관 공개는 발주기관 사업에 연결된 공공업무 문서만 가능합니다.');
    if (!document) throw Error('공개할 문서를 찾을 수 없습니다.');
    if (!isLatest(state, document)) throw Error('최신 승인 문서 버전만 공개할 수 있습니다.');
    if (document.status !== 'APPROVED') throw Error('관리자가 최종 승인한 문서 버전만 공개할 수 있습니다.');
    const project = state.projects.find(item => item.id === scope?.projectId);
    if (!project?.agencyId) throw Error('연결된 발주기관이 없습니다.');
    const existing = state.publications.find(item => item.documentId === document.id && !item.revokedAt);
    if (existing) return existing;
    state.publications.filter(item => !item.revokedAt).forEach(item => {
      const previouslyPublished = state.documents.find(doc => doc.id === item.documentId);
      if (previouslyPublished?.scopeId === document.scopeId && previouslyPublished?.type === document.type) item.revokedAt = now();
    });
    const publication = { id: idOf(state.publications), documentId: document.id, projectId: project.id, agencyId: project.agencyId, publishedAt: now(), revokedAt: null };
    state.publications.push(publication);
    return publication;
  }

  function revoke(state, actor, publicationId) {
    if (actor.role !== 'ADMIN') throw Error('관리자만 공개를 회수할 수 있습니다.');
    const publication = state.publications.find(item => item.id === Number(publicationId) && !item.revokedAt);
    if (!publication) throw Error('공개 중인 문서를 찾을 수 없습니다.');
    publication.revokedAt = now();
    return publication;
  }

  function visibleDocuments(state, actor) {
    if (actor.role === 'ADMIN') return [...state.documents];
    if (actor.role === 'WORKER') return state.documents.filter(doc => canWorkerUse(scopeFor(state, doc.scopeId), actor));
    if (actor.role === 'CONSUMER') return state.documents.filter(doc => canConsumerUse(scopeFor(state, doc.scopeId), actor));
    if (actor.role === 'AGENCY_USER') {
      return state.publications.filter(publication => {
        if (publication.revokedAt) return false;
        const project = state.projects.find(item => item.id === publication.projectId);
        return publication.agencyId === actor.agencyId && project?.agencyId === actor.agencyId;
      }).map(publication => state.documents.find(doc => doc.id === publication.documentId)).filter(Boolean);
    }
    return [];
  }

  const api = { seed, submit, review, adminReview, publish, revoke, visibleDocuments, scopeFor };
  if (typeof module !== 'undefined') module.exports = api;
  else window.SAMTER_DOCUMENT_MODEL = api;
})();
