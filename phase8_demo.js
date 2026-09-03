(() => {
  const APPLICATIONS_KEY = 'samter_demo_membership_applications';
  const APPROVED_KEY = 'samter_demo_approved_members';
  const SESSION_KEY = 'samter_public_demo_session';
  const TYPE_LABELS = {PRODUCER:'생산자조합원',CONSUMER:'소비자조합원',EMPLOYEE:'직원조합원',VOLUNTEER:'자원봉사자조합원',SUPPORTER:'후원자조합원'};
  const STATUS_LABELS = {SUBMITTED:'신청',UNDER_REVIEW:'심사중',APPROVED:'승인',REJECTED:'반려'};

  const load = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  function seed() {
    if (localStorage.getItem(APPLICATIONS_KEY) !== null) return;
    save(APPLICATIONS_KEY, [{
      id: 8001, membership_type:'PRODUCER', name:'홍길동', email:'join-demo@samter.kr', demo_password:'JoinDemo123!',
      phone:'010-1234-5678', region:'청주시', available_areas:'청주, 증평', skills:'시설점검 · 현장조사',
      motivation:'충북 지역 공공사업에 생산자조합원으로 참여하고 싶습니다.', status:'SUBMITTED',
      submitted_at:new Date().toISOString(), review_note:null,
    }]);
  }

  function session() { return load(SESSION_KEY, null); }
  function isAdmin() { return session()?.role === 'ADMIN'; }
  function apps() { seed(); return load(APPLICATIONS_KEY, []); }
  function setApps(rows) { save(APPLICATIONS_KEY, rows); }

  function showNotice(message) {
    const el = document.querySelector('#notice');
    if (!el) return;
    el.textContent = message; el.className = 'notice notice-success'; el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 2200);
  }

  function renderMembershipAdmin() {
    const content = document.querySelector('.content');
    if (!content) return;
    const rows = apps();
    const pending = rows.filter((x) => ['SUBMITTED','UNDER_REVIEW'].includes(x.status)).length;
    const body = rows.map((item) => {
      const start = item.status === 'SUBMITTED' ? `<button class="btn btn-small btn-secondary" data-membership-review="${item.id}">심사 시작</button>` : '';
      const decisions = ['SUBMITTED','UNDER_REVIEW'].includes(item.status) ? `<button class="btn btn-small btn-primary" data-membership-approve="${item.id}">승인</button><button class="btn btn-small btn-secondary" data-membership-reject="${item.id}">반려</button>` : '';
      return `<tr><td>${item.id}</td><td><strong>${esc(item.name)}</strong><br><small>${esc(item.email)}</small></td><td>${TYPE_LABELS[item.membership_type] || item.membership_type}</td><td>${esc(item.region || '-')}</td><td>${esc(item.skills || '-')}</td><td><span class="phase8-status phase8-${item.status.toLowerCase()}">${STATUS_LABELS[item.status] || item.status}</span></td><td><div class="phase8-actions">${start}${decisions}</div><small>${esc(item.review_note || '')}</small></td></tr>`;
    }).join('') || '<tr><td colspan="7">가입신청이 없습니다.</td></tr>';
    content.innerHTML = `<div class="page-heading"><div><span class="eyebrow">MEMBERSHIP · PUBLIC DEMO</span><h1>조합원 가입관리</h1></div><div class="today">심사대기 ${pending}건</div></div><section class="panel table-panel"><div class="section-head"><div><h2>가입 신청</h2></div><span class="count-chip">${rows.length}건</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>신청자</th><th>유형</th><th>지역</th><th>경력·기술</th><th>상태</th><th>심사</th></tr></thead><tbody>${body}</tbody></table></div></section>`;

    content.querySelectorAll('[data-membership-review]').forEach((button) => button.onclick = () => update(Number(button.dataset.membershipReview), 'UNDER_REVIEW'));
    content.querySelectorAll('[data-membership-approve]').forEach((button) => button.onclick = () => approve(Number(button.dataset.membershipApprove)));
    content.querySelectorAll('[data-membership-reject]').forEach((button) => button.onclick = () => reject(Number(button.dataset.membershipReject)));
  }

  function update(id, status, note=null) {
    const rows = apps(); const item = rows.find((x) => Number(x.id) === id); if (!item) return;
    item.status = status; item.review_note = note; item.reviewed_at = new Date().toISOString(); setApps(rows);
    renderMembershipAdmin(); showNotice('가입 심사 상태를 변경했습니다.');
  }

  function approve(id) {
    const rows = apps(); const item = rows.find((x) => Number(x.id) === id); if (!item || !['SUBMITTED','UNDER_REVIEW'].includes(item.status)) return;
    if (!confirm(`${item.name}님의 가입을 승인하시겠습니까?`)) return;
    item.status = 'APPROVED'; item.review_note = '관리자 데모 승인'; item.reviewed_at = new Date().toISOString();
    if (item.membership_type === 'PRODUCER') {
      const approved = load(APPROVED_KEY, []);
      const account = {email:item.email, password:item.demo_password, name:item.name, role:'WORKER', region:item.region, membership_type:item.membership_type};
      const index = approved.findIndex((x) => x.email === item.email); if (index >= 0) approved[index] = account; else approved.push(account); save(APPROVED_KEY, approved);
    }
    delete item.demo_password; setApps(rows); renderMembershipAdmin(); showNotice('조합원 가입을 승인했습니다.');
  }

  function reject(id) {
    const reason = prompt('반려 사유를 입력하세요.'); if (!reason) return;
    const rows = apps(); const item = rows.find((x) => Number(x.id) === id); if (!item) return;
    item.status = 'REJECTED'; item.review_note = reason; item.reviewed_at = new Date().toISOString(); delete item.demo_password; setApps(rows); renderMembershipAdmin(); showNotice('가입신청을 반려했습니다.');
  }

  function installAdminMenu() {
    if (!isAdmin()) return;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.querySelector('[data-membership-demo]')) return;
    const button = document.createElement('button'); button.className = 'side-link'; button.dataset.membershipDemo = '1'; button.textContent = '조합원 가입관리';
    button.onclick = () => { sidebar.querySelectorAll('.side-link').forEach((x) => x.classList.remove('active')); button.classList.add('active'); renderMembershipAdmin(); };
    sidebar.appendChild(button);
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'login-form') return;
    const data = new FormData(form); const email = String(data.get('email') || '').trim().toLowerCase(); const password = String(data.get('password') || '');
    const account = load(APPROVED_KEY, []).find((x) => x.email === email && x.password === password);
    if (!account) return;
    event.preventDefault(); event.stopImmediatePropagation();
    save(SESSION_KEY, {email:account.email,name:account.name,role:account.role,region:account.region}); location.reload();
  }, true);

  seed();
  new MutationObserver(installAdminMenu).observe(document.documentElement, {childList:true,subtree:true});
  installAdminMenu();
})();
