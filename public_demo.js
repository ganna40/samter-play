const DEMO = {
  users: {
    'admin@samter.kr': { password: 'Samter1234!', role: 'ADMIN', name: '삼터 관리자' },
    'worker@samter.kr': { password: 'Worker1234!', role: 'WORKER', name: '김수행', region: '충청북도 청주시' },
  },
  applications: [
    { id: 1, task: '청주시 A지역 시설 점검', worker: '김수행', region: '청주시', experience: '시설점검 3회', status: 'APPLIED' },
    { id: 2, task: '환경정비 업무', worker: '박조합', region: '충주시', experience: '환경정비 경험', status: 'APPLIED' },
  ],
  reviews: [
    { id: 11, task: '청주시 B지역 시설 점검', worker: '이현장', status: 'SUBMITTED', evidence: 4 },
    { id: 12, task: '현장 사진 조사', worker: '최기록', status: 'UNDER_REVIEW', evidence: 7 },
  ],
  settlements: [
    { id: 21, task: '환경정비 업무', worker: '박조합', amount: 180000, status: 'PAYMENT_PENDING' },
    { id: 22, task: '현장 사진 조사', worker: '최기록', amount: 120000, status: 'PAID' },
  ],
  audit: [
    ['18:21', '삼터 관리자', 'WORKER_SELECTED', 'TaskApplication #1'],
    ['18:11', '이현장', 'WORK_SUBMITTED', 'Assignment #11'],
    ['17:54', '삼터 관리자', 'SETTLEMENT_CONFIRMED', 'Settlement #21'],
    ['17:32', '김수행', 'BANK_ACCOUNT_UPDATED', 'Member #2'],
  ],
  publicTasks: [
    { id: 101, title: '청주시 A지역 시설 점검', project: '2026 농촌 환경개선 사업', region: '청주시', date: '2026-09-08', pay: 150000, applicants: 2, capacity: 3 },
    { id: 102, title: '환경정비 현장 지원', project: '도심 환경정비 사업', region: '충주시', date: '2026-09-10', pay: 180000, applicants: 4, capacity: 5 },
    { id: 103, title: '공공시설 사진 조사', project: '시설 현황 조사 사업', region: '제천시', date: '2026-09-12', pay: 120000, applicants: 1, capacity: 2 },
  ],
};

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const money = (v) => `${Number(v || 0).toLocaleString('ko-KR')}원`;
let session = JSON.parse(localStorage.getItem('samter_public_demo_session') || 'null');
let adminTab = 'dashboard';
let noticeTimer;

function notice(message) {
  const el = $('#notice');
  el.textContent = message;
  el.className = 'notice notice-success';
  el.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => el.hidden = true, 2200);
}

function setSession(value) {
  session = value;
  if (value) localStorage.setItem('samter_public_demo_session', JSON.stringify(value));
  else localStorage.removeItem('samter_public_demo_session');
  render();
}

function renderSession() {
  const el = $('#session-area');
  if (!session) { el.innerHTML = '<span class="session-guest">PUBLIC DEMO</span>'; return; }
  el.innerHTML = `<div class="session-user"><div><strong>${esc(session.name)}</strong><span>${esc(session.role)}</span></div><button id="logout" class="btn btn-small btn-secondary">로그아웃</button></div>`;
  $('#logout').onclick = () => setSession(null);
}

function loginView() {
  return `<main class="login-page"><section class="login-card">
    <div class="login-emblem">三</div><span class="eyebrow">SAMTER PUBLIC DEMO</span><h1>삼터 업무 플랫폼</h1>
    <p>GitHub Pages에서 실행되는 공개 시연 버전입니다. 입력/변경 데이터는 실제 서버에 저장되지 않습니다.</p>
    <form id="login-form" class="stack-form login-form">
      <label>이메일<input name="email" type="email" value="admin@samter.kr" required></label>
      <label>비밀번호<input name="password" type="password" value="Samter1234!" required></label>
      <button class="btn btn-primary login-button" type="submit">로그인</button>
    </form>
    <div class="login-help">관리자 <code>admin@samter.kr / Samter1234!</code><br>수행자 <code>worker@samter.kr / Worker1234!</code></div>
  </section></main>`;
}

const metric = (label, value, sub='') => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${sub}</small></article>`;

function dashboard() {
  return `<div class="metric-grid">
    ${metric('진행 사업','3','PublicProject')}${metric('모집중 업무','7','OPEN')}${metric('신청 대기','4','APPLIED')}${metric('검수 대기','2','SUBMITTED')}
  </div><div class="metric-grid">
    ${metric('보완 요청','1','REVISION_REQUIRED')}${metric('지급 대기','3','PAYMENT_PENDING')}${metric('지급 완료','12','PAID')}${metric('총 지급 완료','2,840,000원','누적')}
  </div><section class="panel phase6-dashboard"><div class="section-head"><div><span class="eyebrow">OPERATIONS</span><h2>사업별 운영 현황</h2></div></div>
    <div class="table-wrap"><table><thead><tr><th>사업</th><th>발주기관</th><th>업무수</th><th>완료율</th><th>수행자</th><th>예정 지급액</th></tr></thead><tbody>
    <tr><td><strong>2026 농촌 환경개선 사업</strong></td><td>OO시청</td><td>12</td><td>67%</td><td>8명</td><td>1,850,000원</td></tr>
    <tr><td><strong>도심 환경정비 사업</strong></td><td>OO구청</td><td>8</td><td>50%</td><td>6명</td><td>1,120,000원</td></tr>
    <tr><td><strong>시설 현황 조사 사업</strong></td><td>OO공단</td><td>5</td><td>80%</td><td>4명</td><td>720,000원</td></tr>
    </tbody></table></div></section>`;
}

function projects() {
  return `<section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">PUBLIC PROJECTS</span><h2>공공사업</h2></div><span class="count-chip">3건</span></div>
  <div class="table-wrap"><table><thead><tr><th>사업</th><th>발주기관</th><th>기간</th><th>예산</th><th>상태</th></tr></thead><tbody>
  <tr><td><strong>2026 농촌 환경개선 사업</strong></td><td>OO시청</td><td>2026.09 ~ 2026.12</td><td>45,000,000원</td><td><span class="status status-open">진행중</span></td></tr>
  <tr><td><strong>도심 환경정비 사업</strong></td><td>OO구청</td><td>2026.08 ~ 2026.11</td><td>28,000,000원</td><td><span class="status status-open">진행중</span></td></tr>
  <tr><td><strong>시설 현황 조사 사업</strong></td><td>OO공단</td><td>2026.09 ~ 2026.10</td><td>18,000,000원</td><td><span class="status status-open">진행중</span></td></tr>
  </tbody></table></div></section>`;
}

function applications() {
  const rows = DEMO.applications.map(a => `<tr><td><strong>${esc(a.task)}</strong></td><td>${esc(a.worker)}</td><td>${a.region}</td><td>${a.experience}</td><td><span class="status ${a.status==='SELECTED'?'status-approved':'status-open'}">${a.status}</span></td><td><div class="application-actions"><button class="btn btn-small btn-primary select-app" data-id="${a.id}">선정</button><button class="btn btn-small btn-secondary reject-app" data-id="${a.id}">미선정</button></div></td></tr>`).join('');
  return `<section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">APPLICATIONS</span><h2>신청관리</h2></div><span class="count-chip">${DEMO.applications.length}건</span></div><div class="table-wrap"><table><thead><tr><th>업무</th><th>수행자</th><th>지역</th><th>경험</th><th>상태</th><th>처리</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function reviews() {
  return `<div class="phase4-review-grid">${DEMO.reviews.map(r => `<article class="panel phase4-review-card"><div><span class="eyebrow">${r.status}</span><h2>${esc(r.task)}</h2></div><div class="phase4-review-meta"><span>수행자 <strong>${r.worker}</strong></span><span>증빙 <strong>${r.evidence}건</strong></span></div><div class="phase4-result"><strong>수행 결과</strong><p>현장 수행을 완료하고 요구된 사진 및 문서 증빙을 제출했습니다.</p></div><div class="application-actions"><button class="btn btn-primary approve-review" data-id="${r.id}">승인</button><button class="btn btn-secondary revision-review" data-id="${r.id}">보완 요청</button></div></article>`).join('')}</div>`;
}

function settlements() {
  const rows = DEMO.settlements.map(s => `<tr><td><strong>${s.worker}</strong></td><td>${esc(s.task)}</td><td>${money(s.amount)}</td><td><span class="status status-${s.status.toLowerCase()}">${s.status}</span></td><td>${s.status==='PAYMENT_PENDING'?`<button class="btn btn-small btn-primary paid" data-id="${s.id}">지급 완료</button>`:'지급 처리됨'}</td></tr>`).join('');
  return `<section class="panel table-panel phase5-settlement-panel"><div class="section-head"><div><span class="eyebrow">SETTLEMENTS</span><h2>정산관리</h2></div><button class="btn btn-secondary" id="csv-demo">CSV 다운로드</button></div><div class="table-wrap"><table><thead><tr><th>수행자</th><th>업무</th><th>지급금액</th><th>상태</th><th>처리</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function audit() {
  return `<section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">AUDIT LOG</span><h2>감사로그</h2></div></div><div class="table-wrap"><table><thead><tr><th>시간</th><th>사용자</th><th>행위</th><th>대상</th></tr></thead><tbody>${DEMO.audit.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td><strong>${x[2]}</strong></td><td>${x[3]}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function adminView() {
  const labels = {dashboard:'대시보드',projects:'사업관리',applications:'신청관리',reviews:'검수관리',settlements:'정산관리',audit:'감사로그'};
  const contents = {dashboard,projects,applications,reviews,settlements,audit};
  return `<div class="view-shell"><aside class="sidebar"><div class="sidebar-label">관리자 메뉴</div>${Object.entries(labels).map(([k,v])=>`<button class="side-link admin-tab ${adminTab===k?'active':''}" data-tab="${k}">${v}</button>`).join('')}</aside><main class="content"><div class="page-heading"><div><span class="eyebrow">SAMTER COOPERATIVE · PUBLIC DEMO</span><h1>${labels[adminTab]}</h1></div><div class="today">GitHub Pages Demo</div></div>${contents[adminTab]()}</main></div>`;
}

function workerView() {
  return `<main class="producer-page"><div class="producer-hero"><div><span class="eyebrow">WORKER PORTAL · PUBLIC DEMO</span><h1>공공업무 참여</h1><p>${esc(session.name)}님이 참여 가능한 업무와 지급 현황입니다.</p></div><div class="today">${session.region || '충청북도'}</div></div>
  <section class="worker-section"><div class="worker-section-head"><div><span class="eyebrow">OPEN TASKS</span><h2>참여 가능한 업무</h2></div><span class="count-chip">${DEMO.publicTasks.length}건</span></div><div class="producer-work-grid">${DEMO.publicTasks.map(t=>`<article class="work-card public-work-card"><div class="work-card-top"><div><div class="eyebrow">${t.project}</div><h3>${t.title}</h3></div><span class="status status-open">모집중</span></div><p>${t.region} 현장 업무 · 수행일 ${t.date}</p><div class="public-work-pay">${money(t.pay)}</div><div class="work-meta public-work-meta"><span>신청 <strong>${t.applicants}/${t.capacity}명</strong></span></div><div class="work-actions"><button class="btn btn-primary apply-task" data-id="${t.id}">내가 하겠습니다</button></div></article>`).join('')}</div></section>
  <section class="worker-section"><div class="worker-section-head"><div><span class="eyebrow">MY WORK</span><h2>내 업무 / 지급 현황</h2></div></div><div class="phase5-worker-grid"><article class="phase5-worker-card"><div><div class="eyebrow">APPROVED</div><h3>환경정비 업무</h3><span>검수 승인 완료</span></div><div class="phase5-worker-amount"><strong>180,000원</strong><span class="status status-payment_pending">지급대기</span></div></article><article class="phase6-bank-card"><div class="section-head"><div><span class="eyebrow">BANK ACCOUNT</span><h2>지급 계좌</h2></div></div><div class="phase6-bank-summary"><div><span>은행</span><strong>OO은행</strong></div><div><span>계좌번호</span><strong>110-***-****89</strong></div><div><span>예금주</span><strong>김수행</strong></div></div><small>실서비스에서는 암호화 저장되며 권한 있는 관리자만 원문을 조회할 수 있습니다.</small></article></div></section></main>`;
}

function render() {
  renderSession();
  const app = $('#app');
  if (!session) { app.innerHTML = loginView(); bind(); return; }
  app.innerHTML = session.role === 'ADMIN' ? adminView() : workerView();
  bind();
}

function bind() {
  const form = $('#login-form');
  if (form) form.onsubmit = (e) => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const user = DEMO.users[data.email];
    if (!user || user.password !== data.password) return notice('데모 계정을 확인해 주세요.');
    setSession({ email:data.email, role:user.role, name:user.name, region:user.region });
  };
  document.querySelectorAll('.admin-tab').forEach(b => b.onclick = () => { adminTab=b.dataset.tab; render(); });
  document.querySelectorAll('.select-app').forEach(b => b.onclick = () => { const a=DEMO.applications.find(x=>x.id==b.dataset.id); a.status='SELECTED'; notice('수행자를 선정했습니다.'); render(); });
  document.querySelectorAll('.reject-app').forEach(b => b.onclick = () => { const a=DEMO.applications.find(x=>x.id==b.dataset.id); a.status='REJECTED'; notice('미선정 처리했습니다.'); render(); });
  document.querySelectorAll('.approve-review').forEach(b => b.onclick = () => { const r=DEMO.reviews.find(x=>x.id==b.dataset.id); r.status='APPROVED'; notice('검수를 승인했습니다.'); render(); });
  document.querySelectorAll('.revision-review').forEach(b => b.onclick = () => { const r=DEMO.reviews.find(x=>x.id==b.dataset.id); r.status='REVISION_REQUIRED'; notice('보완 요청을 등록했습니다.'); render(); });
  document.querySelectorAll('.paid').forEach(b => b.onclick = () => { const s=DEMO.settlements.find(x=>x.id==b.dataset.id); s.status='PAID'; notice('지급 완료 처리했습니다.'); render(); });
  document.querySelectorAll('.apply-task').forEach(b => b.onclick = () => { const t=DEMO.publicTasks.find(x=>x.id==b.dataset.id); t.applicants++; notice('업무 신청을 완료했습니다.'); render(); });
  const csv=$('#csv-demo'); if(csv) csv.onclick=()=>notice('공개 데모: 지급대상 CSV 생성 동작을 시연했습니다.');
}

render();
