/* Public, fictional demo data only. Browser roles are a simulation, not authorization. */
(() => {
  'use strict';
  const rules = {
    accept: ['WORKER', ['PLACED'], 'ACCEPTED'], reject: ['WORKER', ['PLACED'], 'REJECTED'],
    start: ['WORKER', ['ACCEPTED'], 'IN_PROGRESS'], fulfill: ['WORKER', ['IN_PROGRESS', 'REVISION_REQUIRED'], 'FULFILLED'],
    approve: ['CONSUMER', ['FULFILLED'], 'INSPECTION_APPROVED'], revision: ['CONSUMER', ['FULFILLED'], 'REVISION_REQUIRED'],
    payment: ['CONSUMER', ['INSPECTION_APPROVED'], 'PAYMENT_SENT'], confirm: ['WORKER', ['PAYMENT_SENT'], 'COMPLETED'],
    cancel: ['CONSUMER', ['PLACED','ACCEPTED','IN_PROGRESS','FULFILLED','REVISION_REQUIRED','INSPECTION_APPROVED'], 'CANCELLATION_REQUESTED'],
    agree: ['WORKER', ['CANCELLATION_REQUESTED'], 'CANCELLED'], contest: ['WORKER', ['CANCELLATION_REQUESTED'], 'DISPUTE'],
    dispute: [['CONSUMER','WORKER'], ['PAYMENT_SENT'], 'DISPUTE'],
    continue: ['ADMIN', ['DISPUTE'], null], resolve: ['ADMIN', ['DISPUTE'], 'CANCELLED'],
  };
  function actions(o, role) {
    return Object.keys(rules).filter(k => [].concat(rules[k][0]).includes(role) && rules[k][1].includes(o.status));
  }
  function transition(o, role, action) {
    if (!actions(o, role).includes(action)) throw Error('현재 역할 또는 상태에서는 처리할 수 없습니다.');
    const previous = o.status;
    if (action === 'cancel' || action === 'dispute') o.resume_status = previous;
    o.status = action === 'continue' ? o.resume_status : action === 'cancel' && previous === 'PLACED' ? 'CANCELLED' : rules[action][2];
    if (action === 'revision') o.revisions = (o.revisions || 0) + 1;
    o.history.push({ action, role, status: o.status });
  }
  function seed() {
    return {
      version: 1, seller: 'VERIFIED', orders: [],
      offerings: [
        { id: 1, title: '생활공간 정리 서비스', description: '청주 지역 방문 · 2시간 정리 지원', price: 50000, status: 'ACTIVE' },
        { id: 2, title: '온라인 문서 정리', description: '문서 편집 및 자료 분류 · 온라인', price: 30000, status: 'PENDING_APPROVAL' },
      ],
      agencies: [{ id: 1, name: 'OO시청 (시연)', active: true }, { id: 2, name: 'OO구청 (시연)', active: true }],
      users: [{ email: 'agency@samter.kr', agencyId: 1 }, { email: 'agency2@samter.kr', agencyId: 2 }],
      projects: [
        { id: 1, agencyId: 1, title: '2026 농촌 환경개선 사업', budget: 45000000, period: '2026.09 ~ 2026.12',
          tasks: [{ title: '시설 점검', status: 'APPROVED' }, { title: '환경개선 현장 지원', status: 'IN_PROGRESS' }, { title: '취소된 추가 조사', status: 'CANCELLED' }],
          evidence: [{ id: 1, name: '현장 점검 공개자료', caption: '시설 점검 완료 현황 (가상 자료)', published: true }, { id: 2, name: '추가 현장자료', caption: '공개 승인 대기 중인 가상 자료', published: false }],
          reviews: [{ id: 1, summary: '시설 점검 결과가 승인되었습니다.', published: true }, { id: 2, summary: '추가 업무 검수 요약 (시연)', published: false }] },
        { id: 2, agencyId: 2, title: '도심 환경정비 사업', budget: 20000000, period: '2026.09 ~ 2026.11', tasks: [{ title: '환경정비', status: 'PAID' }], evidence: [], reviews: [] },
      ],
    };
  }
  function order(s, role, id) {
    const offering = s.offerings.find(x => x.id === Number(id));
    if (role !== 'CONSUMER' || offering?.status !== 'ACTIVE' || s.seller !== 'VERIFIED') throw Error('승인된 서비스만 소비자 조합원이 주문할 수 있습니다.');
    const o = { id: Math.max(0, ...s.orders.map(x => x.id)) + 1, title: offering.title, price: offering.price, status: 'PLACED', revisions: 0, history: [] };
    s.orders.push(o);
    return o;
  }
  function portal(s, agencyId) {
    if (!s.agencies.some(x => x.id === agencyId && x.active)) return [];
    return s.projects.filter(x => x.agencyId === agencyId).map(p => {
      const eligible = p.tasks.filter(t => t.status !== 'CANCELLED');
      const completed = eligible.filter(t => ['APPROVED','PAYMENT_PENDING','PAID'].includes(t.status)).length;
      return { id: p.id, title: p.title, budget: p.budget, period: p.period, completed, total: eligible.length,
        progress: eligible.length ? Math.round(completed / eligible.length * 100) : 0,
        tasks: p.tasks.map(t => ({ title: t.title, status: t.status })),
        evidence: p.evidence.filter(e => e.published).map(e => ({ id: e.id, name: e.name, caption: e.caption })),
        reviews: p.reviews.filter(r => r.published).map(r => ({ id: r.id, summary: r.summary })) };
    });
  }
  const api = { seed, actions, transition, order, portal };
  if (typeof module !== 'undefined') module.exports = api;
  else window.SAMTER_PHASE15_MODEL = api;
})();
