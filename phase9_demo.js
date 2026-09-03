(() => {
  const ROSTER_KEY = 'samter_demo_membership_roster';
  const APPROVED_KEY = 'samter_demo_approved_members';
  const SESSION_KEY = 'samter_public_demo_session';
  const APPLICATIONS_KEY = 'samter_demo_membership_applications';
  const load = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const money = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;
  const typeLabel = {PRODUCER:'생산자조합원',CONSUMER:'소비자조합원',EMPLOYEE:'직원조합원',VOLUNTEER:'자원봉사자조합원',SUPPORTER:'후원자조합원'};

  function session() { return load(SESSION_KEY, null); }
  function roster() { return load(ROSTER_KEY, []); }
  function saveRoster(rows) { save(ROSTER_KEY, rows); }
  function nextNumber(id) { return `SAMTER-2026-${String(id).padStart(6,'0')}`; }

  function syncApprovedApplications() {
    const apps = load(APPLICATIONS_KEY, []);
    const rows = roster();
    let changed = false;
    for (const app of apps) {
      if (app.status !== 'APPROVED' || rows.some((x) => x.email === app.email)) continue;
      const id = 9000 + rows.length + 1;
      rows.push({
        id, membership_number:nextNumber(id), membership_type:app.membership_type,
        name:app.name, email:app.email, region:app.region || '충청북도', status:'APPROVED',
        share_count:1, share_price:0, paid_contribution_amount:0, contribution_status:'NOT_CONFIGURED',
        can_perform_work:false, qualifications:app.skills || '', work_regions:app.available_areas || '', status_reason:null,
      });
      changed = true;
    }
    if (changed) saveRoster(rows);
  }

  function notice(message) {
    const el = document.querySelector('#notice'); if (!el) return;
    el.textContent = message; el.className = 'notice notice-success'; el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 2200);
  }

  function required(item) { return Number(item.share_count || 0) * Number(item.share_price || 0); }
  function memberById(id) { return roster().find((x) => Number(x.id) === Number(id)); }

  function renderRosterAdmin() {
    syncApprovedApplications();
    const content = document.querySelector('.content'); if (!content) return;
    const rows = roster();
    const active = rows.filter((x) => x.status === 'ACTIVE').length;
    const eligible = rows.filter((x) => x.status === 'ACTIVE' && x.can_perform_work).length;
    const body = rows.map((item) => {
      const terminal = ['WITHDRAWN','EXPELLED'].includes(item.status);
      const contribution = terminal
        ? (item.paid_contribution_amount > 0 ? `<button class="btn btn-small btn-secondary" data-p9-refund="${item.id}">출자금 반환</button>` : '')
        : `<button class="btn btn-small btn-secondary" data-p9-plan="${item.id}">출자 설정</button><button class="btn btn-small btn-primary" data-p9-pay="${item.id}">입금 확인</button>`;
      const eligibility = item.membership_type === 'PRODUCER' && !terminal ? `<button class="btn btn-small btn-secondary" data-p9-eligible="${item.id}">${item.can_perform_work ? '수행자격 수정' : '수행자격 승인'}</button>` : '';
      const life = terminal ? '' : `<button class="btn btn-small btn-secondary" data-p9-withdraw="${item.id}">탈퇴</button><button class="btn btn-small btn-secondary" data-p9-expel="${item.id}">제명</button>`;
      return `<tr><td><strong>${esc(item.membership_number)}</strong></td><td><strong>${esc(item.name)}</strong><br><small>${esc(item.email)}</small></td><td>${typeLabel[item.membership_type] || item.membership_type}<br><small>${esc(item.region)}</small></td><td>${item.status}</td><td>${item.share_count}좌 × ${money(item.share_price)}<br><small>약정 ${money(required(item))}</small></td><td>${money(item.paid_contribution_amount)}<br><small>${item.contribution_status}</small></td><td>${item.can_perform_work ? '<strong>업무 수행 가능</strong>' : '수행 미승인'}<br><small>${esc(item.qualifications || '-')} · ${esc(item.work_regions || '-')}</small></td><td><div class="phase8-actions">${contribution}${eligibility}</div></td><td><div class="phase8-actions">${life}</div><small>${esc(item.status_reason || '')}</small></td></tr>`;
    }).join('') || '<tr><td colspan="9">승인된 조합원이 없습니다. 먼저 조합원 가입관리에서 신청을 승인하세요.</td></tr>';
    content.innerHTML = `<div class="page-heading"><div><span class="eyebrow">COOPERATIVE ROSTER · PUBLIC DEMO</span><h1>조합원 명부</h1></div><div class="today">활동 ${active}명 · 수행가능 ${eligible}명</div></div><section class="panel table-panel"><div class="section-head"><div><h2>조합원·출자·수행자격</h2></div><span class="count-chip">${rows.length}명</span></div><div class="table-wrap"><table class="phase9-demo-table"><thead><tr><th>조합원번호</th><th>조합원</th><th>유형·지역</th><th>상태</th><th>출자 약정</th><th>납입</th><th>수행자격</th><th>관리</th><th>상태</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
    bind(content);
  }

  function bind(root) {
    root.querySelectorAll('[data-p9-plan]').forEach((b) => b.onclick = () => {
      const rows=roster(), item=rows.find((x)=>Number(x.id)===Number(b.dataset.p9Plan));
      const count=prompt('출자 좌수', String(item.share_count || 1)); if(!count) return;
      const price=prompt('1좌 금액', String(item.share_price || 10000)); if(!price) return;
      item.share_count=Number(count); item.share_price=Number(price); item.contribution_status=item.paid_contribution_amount>0?'PARTIAL':'UNPAID'; saveRoster(rows); renderRosterAdmin(); notice('출자 약정을 저장했습니다.');
    });
    root.querySelectorAll('[data-p9-pay]').forEach((b) => b.onclick = () => {
      const rows=roster(), item=rows.find((x)=>Number(x.id)===Number(b.dataset.p9Pay));
      const amount=Number(prompt('입금 확인 금액', String(Math.max(required(item)-item.paid_contribution_amount,0)))||0); if(amount<=0) return;
      item.paid_contribution_amount += amount;
      if (item.paid_contribution_amount >= required(item) && required(item)>0) { item.contribution_status='PAID'; item.status='ACTIVE'; }
      else item.contribution_status='PARTIAL';
      saveRoster(rows); renderRosterAdmin(); notice('출자금 입금을 확인했습니다.');
    });
    root.querySelectorAll('[data-p9-eligible]').forEach((b) => b.onclick = () => {
      const rows=roster(), item=rows.find((x)=>Number(x.id)===Number(b.dataset.p9Eligible));
      item.qualifications=prompt('보유 자격·경력', item.qualifications || '') ?? item.qualifications;
      item.work_regions=prompt('업무 수행 가능지역', item.work_regions || '') ?? item.work_regions;
      item.can_perform_work=confirm('업무 수행자격을 승인하시겠습니까?'); saveRoster(rows); renderRosterAdmin(); notice('수행자격 상태를 변경했습니다.');
    });
    root.querySelectorAll('[data-p9-withdraw]').forEach((b) => b.onclick = () => terminate(Number(b.dataset.p9Withdraw),'WITHDRAWN'));
    root.querySelectorAll('[data-p9-expel]').forEach((b) => b.onclick = () => terminate(Number(b.dataset.p9Expel),'EXPELLED'));
    root.querySelectorAll('[data-p9-refund]').forEach((b) => b.onclick = () => {
      const rows=roster(), item=rows.find((x)=>Number(x.id)===Number(b.dataset.p9Refund));
      const amount=Number(prompt('반환할 출자금', String(item.paid_contribution_amount))||0); if(amount<=0||amount>item.paid_contribution_amount) return;
      item.paid_contribution_amount -= amount; if(item.paid_contribution_amount===0) item.contribution_status='REFUNDED'; saveRoster(rows); renderRosterAdmin(); notice('출자금 반환 이력을 기록했습니다.');
    });
  }

  function terminate(id, status) {
    const reason=prompt(status==='WITHDRAWN'?'탈퇴 사유':'제명 사유'); if(!reason) return;
    const rows=roster(), item=rows.find((x)=>Number(x.id)===id); if(!item) return;
    item.status=status; item.status_reason=reason; item.can_perform_work=false; saveRoster(rows);
    const accounts=load(APPROVED_KEY, []); const account=accounts.find((x)=>x.email===item.email); if(account) account.disabled=true; save(APPROVED_KEY, accounts);
    renderRosterAdmin(); notice(status==='WITHDRAWN'?'탈퇴 처리했습니다.':'제명 처리했습니다.');
  }

  function installMenu() {
    syncApprovedApplications();
    if (session()?.role !== 'ADMIN') return;
    const sidebar=document.querySelector('.sidebar'); if(!sidebar||sidebar.querySelector('[data-phase9-demo]')) return;
    const button=document.createElement('button'); button.className='side-link'; button.dataset.phase9Demo='1'; button.textContent='조합원 명부';
    button.onclick=()=>{sidebar.querySelectorAll('.side-link').forEach((x)=>x.classList.remove('active'));button.classList.add('active');renderRosterAdmin();}; sidebar.appendChild(button);
  }

  function installMyCard() {
    const s=session(); if(!s||s.role==='ADMIN'||document.querySelector('[data-phase9-demo-card]')) return;
    syncApprovedApplications(); const item=roster().find((x)=>x.email===s.email); if(!item) return;
    const host=document.querySelector('.producer-page,.consumer-page'); if(!host) return;
    const card=document.createElement('section'); card.className='panel phase9-demo-card'; card.dataset.phase9DemoCard='1';
    card.innerHTML=`<div class="section-head"><div><span class="eyebrow">MY MEMBERSHIP · DEMO</span><h2>내 조합원 정보</h2></div><strong>${esc(item.membership_number)}</strong></div><div class="phase9-demo-grid"><div>상태<br><strong>${item.status}</strong></div><div>출자<br><strong>${money(item.paid_contribution_amount)} / ${money(required(item))}</strong></div><div>수행자격<br><strong>${item.can_perform_work?'업무 수행 가능':'승인 전'}</strong></div></div>`;
    host.prepend(card);
  }

  document.addEventListener('click', (event) => {
    const button=event.target.closest?.('.apply-task'); if(!button) return;
    const s=session(); if(!s||s.role!=='WORKER') return;
    syncApprovedApplications(); const item=roster().find((x)=>x.email===s.email); if(!item) return;
    if(item.status!=='ACTIVE'||!item.can_perform_work){event.preventDefault();event.stopImmediatePropagation();alert('생산자조합원은 출자금 완납으로 ACTIVE가 되고 수행자격 승인을 받아야 업무에 신청할 수 있습니다.');}
  }, true);

  syncApprovedApplications();
  new MutationObserver(()=>{installMenu();installMyCard();}).observe(document.documentElement,{childList:true,subtree:true});
  installMenu(); installMyCard();
})();
