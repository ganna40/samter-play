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
      version: 2, seller: 'VERIFIED', orders: [],
      offerings: [
        { id: 1, title: '생활공간 정리 서비스', category: '생활 지원', description: '정리가 필요한 생활공간을 함께 살펴보고 자주 쓰는 물건의 위치와 동선을 기준으로 정돈합니다.', scope: '청주 지역 방문 2시간 · 공간 1곳 · 정리 방법 안내', location: '충청북도 청주시', schedule: '주중 10:00~17:00 협의', price: 50000, status: 'ACTIVE', workerEmail: 'worker@samter.kr', createdAt: '2026-09-01T01:00:00.000Z', attachments: [{ key: 'seed-offer-guide', name: '서비스-진행안내.txt', size: 182, type: 'text/plain', published: false }] },
        { id: 2, title: '온라인 문서 정리', category: '문서·사무', description: '흩어진 문서의 제목과 목차를 다듬고 찾기 쉬운 기준으로 자료를 분류합니다.', scope: '문서 20쪽 이내 · 목차 정리 · 폴더 분류안 제안', location: '온라인', schedule: '자료 수령 후 3일 이내', price: 30000, status: 'PENDING_APPROVAL', workerEmail: 'worker@samter.kr', createdAt: '2026-09-02T01:00:00.000Z', attachments: [] },
      ],
      agencies: [{ id: 1, name: 'OO시청 (시연)', active: true }, { id: 2, name: 'OO구청 (시연)', active: true }],
      users: [{ email: 'agency@samter.kr', agencyId: 1 }, { email: 'agency2@samter.kr', agencyId: 2 }],
      projects: [
        { id: 1, agencyId: 1, title: '2026 농촌 환경개선 사업', category: '환경·시설', description: '농촌 생활권의 공공시설을 점검하고 주민 이용이 많은 구역의 환경을 개선하는 시연 사업입니다.', scope: '시설 상태 조사, 현장 환경정비, 결과 기록', location: '충청북도 청주시 농촌지역', budget: 45000000, period: '2026.09 ~ 2026.12', createdAt: '2026-08-25T01:00:00.000Z', attachments: [{ key: 'seed-project-brief-1', name: '농촌환경개선-과업안내.txt', size: 214, type: 'text/plain', published: false }],
          tasks: [{ title: '시설 점검', status: 'APPROVED' }, { title: '환경개선 현장 지원', status: 'IN_PROGRESS' }, { title: '취소된 추가 조사', status: 'CANCELLED' }],
          evidence: [{ id: 1, name: '현장 점검 공개자료', caption: '시설 점검 완료 현황 (가상 자료)', published: true }, { id: 2, name: '추가 현장자료', caption: '공개 승인 대기 중인 가상 자료', published: false }],
          reviews: [{ id: 1, summary: '시설 점검 결과가 승인되었습니다.', published: true }, { id: 2, summary: '추가 업무 검수 요약 (시연)', published: false }] },
        { id: 2, agencyId: 2, title: '도심 환경정비 사업', category: '환경·시설', description: '도심 생활권의 정비 필요 구역을 확인하고 현장 작업 결과를 기록하는 시연 사업입니다.', scope: '현장 정비와 완료 사진 기록', location: '충청북도 충주시', budget: 20000000, period: '2026.09 ~ 2026.11', createdAt: '2026-08-28T01:00:00.000Z', attachments: [], tasks: [{ title: '환경정비', status: 'PAID' }], evidence: [], reviews: [] },
      ],
    };
  }
  function migrate(input) {
    if (!input || ![1, 2].includes(input.version) || !Array.isArray(input.offerings) || !Array.isArray(input.orders) || !Array.isArray(input.projects)) return seed();
    const state = JSON.parse(JSON.stringify(input));
    const defaults = seed();
    state.agencies = Array.isArray(state.agencies) ? state.agencies : defaults.agencies;
    state.users = Array.isArray(state.users) ? state.users : defaults.users;
    state.seller = state.seller || defaults.seller;
    state.offerings.forEach(item => {
      const fallback = defaults.offerings.find(value => value.id === item.id) || {};
      for (const key of ['category', 'description', 'scope', 'location', 'schedule', 'workerEmail', 'createdAt']) if (!item[key]) item[key] = fallback[key] || ({ category: '조합 서비스', description: '기존에 등록된 시연 서비스입니다.', scope: '제공 범위 협의', location: '지역 협의', schedule: '일정 협의', workerEmail: 'worker@samter.kr' }[key] || new Date().toISOString());
      item.attachments = Array.isArray(item.attachments) ? item.attachments : (fallback.attachments || []);
      item.attachments.forEach(file => { if (typeof file.published !== 'boolean') file.published = false; });
    });
    state.orders.forEach(order => {
      if (!order.offeringId) order.offeringId = state.offerings.find(item => item.title === order.title)?.id || null;
      if (!order.consumerEmail) order.consumerEmail = 'consumer@samter.kr';
      if (!order.workerEmail) order.workerEmail = state.offerings.find(item => item.id === order.offeringId)?.workerEmail || 'worker@samter.kr';
    });
    state.projects.forEach(item => {
      const fallback = defaults.projects.find(value => value.id === item.id) || {};
      for (const key of ['category', 'description', 'scope', 'location', 'createdAt']) if (!item[key]) item[key] = fallback[key] || ({ category: '발주 사업', description: '기존에 등록된 시연 발주 사업입니다.', scope: '과업 범위 협의', location: '지역 협의' }[key] || new Date().toISOString());
      item.attachments = Array.isArray(item.attachments) ? item.attachments : (fallback.attachments || []);
      item.attachments.forEach(file => { if (typeof file.published !== 'boolean') file.published = false; });
      item.tasks = Array.isArray(item.tasks) ? item.tasks : [];
      item.evidence = Array.isArray(item.evidence) ? item.evidence : [];
      item.reviews = Array.isArray(item.reviews) ? item.reviews : [];
    });
    state.version = 2;
    return state;
  }
  const roleOf = actor => typeof actor === 'string' ? actor : actor?.role;
  const text = (value, label, max = 2000) => {
    const cleaned = String(value ?? '').trim();
    if (!cleaned) throw Error(`${label}을(를) 입력해 주세요.`);
    return cleaned.slice(0, max);
  };
  const attachments = values => (Array.isArray(values) ? values : []).map(file => ({ key: text(file.key, '첨부 파일 키', 200), name: text(file.name, '첨부 파일명', 200), size: Number(file.size) || 0, type: String(file.type || 'application/octet-stream').slice(0, 100), published: Boolean(file.published) }));
  function createOffering(s, actor, input) {
    if (roleOf(actor) !== 'WORKER') throw Error('생산자만 서비스를 등록할 수 있습니다.');
    const price = Number(input.price);
    if (!Number.isSafeInteger(price) || price <= 0 || price > 100000000) throw Error('1~100,000,000 사이의 정수 금액을 입력하세요.');
    const offering = { id: Math.max(0, ...s.offerings.map(item => item.id)) + 1, title: text(input.title, '서비스 이름', 100), category: text(input.category, '분류', 60), description: text(input.description, '상세 설명'), scope: text(input.scope, '제공 범위'), location: text(input.location, '지역', 120), schedule: text(input.schedule, '일정', 120), price, status: 'DRAFT', workerEmail: actor.email, createdAt: new Date().toISOString(), attachments: attachments(input.attachments) };
    s.offerings.push(offering);
    return offering;
  }
  function createProject(s, actor, input) {
    if (roleOf(actor) !== 'ADMIN') throw Error('관리자만 발주 사업을 등록할 수 있습니다.');
    const agencyId = Number(input.agencyId);
    if (!s.agencies.some(agency => agency.id === agencyId && agency.active)) throw Error('활성 발주기관을 선택해 주세요.');
    const budget = Number(input.budget);
    if (!Number.isSafeInteger(budget) || budget <= 0) throw Error('사업 예산을 정수로 입력해 주세요.');
    const project = { id: Math.max(0, ...s.projects.map(item => item.id)) + 1, agencyId, title: text(input.title, '사업명', 120), category: text(input.category, '분류', 60), description: text(input.description, '상세 설명'), scope: text(input.scope, '과업 범위'), location: text(input.location, '지역', 120), period: text(input.period, '사업 기간', 120), budget, createdAt: new Date().toISOString(), attachments: attachments(input.attachments), tasks: [], evidence: [], reviews: [] };
    s.projects.push(project);
    return project;
  }
  function order(s, actor, id) {
    const offering = s.offerings.find(x => x.id === Number(id));
    if (roleOf(actor) !== 'CONSUMER' || offering?.status !== 'ACTIVE' || s.seller !== 'VERIFIED') throw Error('승인된 서비스만 소비자 조합원이 주문할 수 있습니다.');
    const o = { id: Math.max(0, ...s.orders.map(x => x.id)) + 1, offeringId: offering.id, title: offering.title, price: offering.price, consumerEmail: typeof actor === 'object' ? actor.email : null, workerEmail: offering.workerEmail || 'worker@samter.kr', status: 'PLACED', revisions: 0, history: [] };
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
        category: p.category, description: p.description, scope: p.scope, location: p.location, createdAt: p.createdAt,
        attachments: (p.attachments || []).filter(file => file.published).map(file => ({ key: file.key, name: file.name, size: file.size, type: file.type })),
        tasks: p.tasks.map(t => ({ title: t.title, status: t.status })),
        evidence: p.evidence.filter(e => e.published).map(e => ({ id: e.id, name: e.name, caption: e.caption })),
        reviews: p.reviews.filter(r => r.published).map(r => ({ id: r.id, summary: r.summary })) };
    });
  }
  const api = { seed, migrate, actions, transition, order, portal, createOffering, createProject };
  if (typeof module !== 'undefined') module.exports = api;
  else window.SAMTER_PHASE15_MODEL = api;
})();
