(() => {
  'use strict';
  const M = window.SAMTER_PHASE15_MODEL;
  const KEY = 'samter_public_demo_phase15_v1';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  let state = read(KEY, M.seed());
  if (state.version !== 1 || !Array.isArray(state.orders) || !Array.isArray(state.projects)) state = M.seed();
  const user = () => read('samter_public_demo_session', {});
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const won = v => `${Number(v).toLocaleString('ko-KR')}원`;
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const labels = { PLACED:'주문접수', ACCEPTED:'생산자 수락', IN_PROGRESS:'수행중', FULFILLED:'검수대기', REVISION_REQUIRED:'보완요청', INSPECTION_APPROVED:'검수승인·송금대기', PAYMENT_SENT:'송금완료·입금확인대기', COMPLETED:'거래완료', CANCELLED:'취소', REJECTED:'반려', CANCELLATION_REQUESTED:'취소요청중', DISPUTE:'분쟁처리중', ACTIVE:'판매중', PENDING_APPROVAL:'승인대기', DRAFT:'초안', PAUSED:'판매중지', ARCHIVED:'보관', APPROVED:'승인완료', PAID:'완료' };
  const actionLabels = {accept:'주문 수락',reject:'주문 거절',start:'수행 시작',fulfill:'수행완료 제출',approve:'검수 승인',revision:'보완 요청',payment:'송금 완료 표시 (시연)',confirm:'입금 확인 (시연)',cancel:'취소 요청',agree:'취소 동의',contest:'취소 이의제기',dispute:'분쟁 접수',continue:'거래 계속',resolve:'취소로 중재'};
  const button = (label, action, id = '') => `<button type="button" class="btn btn-secondary btn-small" data-p15="${action}" data-id="${id}">${label}</button>`;
  const status = value => `<span class="p15-status">${esc(labels[value] || value)}</span>`;
  let view = 'market', projectId = null;
  function root() { return document.querySelector('#phase15-portal') || document.querySelector('.content') || document.querySelector('.producer-page'); }
  function shell(title, content) {
    delete root().dataset.documentView;
    root().innerHTML = `<div class="p15"><div class="page-heading"><div><span class="eyebrow">SAMTER · P15 PUBLIC DEMO</span><h1>${title}</h1></div></div><p class="p15-note">가상 데이터로 체험하는 공개 데모입니다. 실제 개인정보·계좌정보를 입력하지 마세요. 변경사항은 이 브라우저에만 저장됩니다.</p><div class="p15-actions">${user().role === 'WORKER' ? button('공공업무로 돌아가기','back') : ''}${user().role === 'ADMIN' ? button('마켓 관리','market') + button('기관 관리','agency') : ''}${button('P15 시연 데이터 초기화','reset')}</div>${content}</div>`;
    root().querySelectorAll('[data-p15]').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      b.disabled = true;
      try { await act(b.dataset.p15, Number(b.dataset.id), b); } catch (e) { notice(e.message); } finally { b.disabled = false; }
    });
  }
  function market() {
    view = 'market';
    const role = user().role;
    if (!['ADMIN','WORKER','CONSUMER'].includes(role)) return;
    const offers = state.offerings.filter(o => role !== 'CONSUMER' || o.status === 'ACTIVE');
    const services = offers.map(o => `<article class="p15-card"><h3>${esc(o.title)}</h3>${status(o.status)}<p>${esc(o.description)}</p><strong>${won(o.price)}</strong><div class="p15-actions">${role === 'CONSUMER' ? button('서비스 주문','order',o.id) : role === 'ADMIN' ? (o.status === 'PENDING_APPROVAL' ? button('서비스 승인','offer-approve',o.id) + button('서비스 반려','offer-reject',o.id) : '') : (['DRAFT','REJECTED'].includes(o.status) ? button('승인 요청','offer-submit',o.id) : o.status === 'ACTIVE' ? button('판매 중지','offer-pause',o.id) : o.status === 'PAUSED' ? button('판매 재개','offer-resume',o.id) : '') + (['DRAFT','REJECTED','PAUSED'].includes(o.status) ? button('내용 수정','offer-edit',o.id) + button('보관','offer-archive',o.id) : '')}</div></article>`).join('');
    const orders = state.orders.map(o => `<article class="p15-card"><h3>#${o.id} ${esc(o.title)}</h3>${status(o.status)}<p>${won(o.price)} · 보완 ${o.revisions}회</p><div class="p15-actions">${M.actions(o,role).map(a => button(actionLabels[a],a,o.id)).join('')}${role === 'CONSUMER' && ['INSPECTION_APPROVED','PAYMENT_SENT'].includes(o.status) ? button('시연 계좌 안내','bank',o.id) : ''}</div><small>${o.history.map(h => esc(actionLabels[h.action] || h.action)).join(' → ') || '주문 접수'}</small></article>`).join('');
    shell(role === 'ADMIN' ? '조합원 마켓 관리' : role === 'WORKER' ? '판매자 정보 · 내 서비스 · 주문관리' : '서비스 찾기 · 내 주문', `<p class="p15-note">소비자 → 생산자 직접송금 거래입니다. 삼터는 결제·환불을 실행하지 않습니다. 마켓 실적은 조합 회계(P13)·공익실적(P10)에 자동 합산되지 않습니다.</p>${role !== 'CONSUMER' ? `<section class="panel"><h2>판매자 확인</h2><p>${state.seller === 'VERIFIED' ? '확인된 생산자 조합원' : '판매자 확인 대기'}</p><div class="p15-actions">${role === 'ADMIN' ? button('판매자 확인 승인','seller-verify') + button('판매자 반려','seller-reject') : button('판매자 정보 변경 (재확인)','seller-edit') + button('서비스 등록','offer-new')}</div></section>` : ''}<section class="panel"><h2>${role === 'CONSUMER' ? '서비스 찾기' : '서비스 승인·판매관리'}</h2><div class="p15-grid">${services || '<p>공개된 서비스가 없습니다.</p>'}</div></section><section class="panel"><h2>${role === 'CONSUMER' ? '내 주문' : '마켓 거래·분쟁관리'}</h2><p>총 ${state.orders.length}건 · 거래완료 ${won(state.orders.filter(o => o.status === 'COMPLETED').reduce((sum,o) => sum + o.price,0))} (참고실적)</p><div class="p15-grid">${orders || '<p>소비자 계정으로 서비스를 주문한 뒤 생산자 계정에서 수락해 보세요.</p>'}</div></section>`);
  }
  function agency() {
    view = 'agency';
    if (user().role === 'ADMIN') return agencyAdmin();
    if (user().role !== 'AGENCY_USER') return;
    const link = state.users.find(u => u.email === user().email);
    const a = state.agencies.find(a => a.id === link?.agencyId);
    const projects = M.portal(state, link?.agencyId);
    const detail = projects.find(p => p.id === projectId);
    shell('발주기관 사업 조회', `<p class="p15-note">${esc(a?.name || '연결된 기관 없음')} · 조회 전용 · 관리자 공개 승인 자료만 표시합니다. 기관 간 접근 제한은 시연이며 실제 인증·권한 검증은 서버에서 수행합니다.</p>${detail ? `<section class="panel" id="p15-report"><h2>${esc(detail.title)}</h2><p>${esc(detail.period)} · 사업예산 ${won(detail.budget)}</p><h3>진행률 ${detail.progress}% (${detail.completed}/${detail.total})</h3><progress max="100" value="${detail.progress}" aria-label="사업 진행률"></progress><h3>업무 진행현황</h3>${detail.tasks.map(t => `<p>${esc(t.title)} · ${status(t.status)}</p>`).join('')}<h3>공개 검수결과</h3>${detail.reviews.map(r => `<p>${esc(r.summary)}</p>`).join('') || '<p>공개된 검수결과가 없습니다.</p>'}<h3>공개 증빙</h3>${detail.evidence.map(e => `<article class="p15-card"><strong>${esc(e.name)}</strong><p>${esc(e.caption)}</p><div class="p15-actions">${button('시연 자료 내려받기','evidence',e.id)}</div></article>`).join('') || '<p>공개된 증빙이 없습니다.</p>'}<p>생성시각: ${esc(new Date().toLocaleString('ko-KR'))} · 가상 자료 / 실제 결과보고서 아님</p><div class="p15-actions">${button('결과보고서 인쇄 / PDF 저장','report')}${button('사업 목록','projects')}</div></section>` : `<section class="panel"><h2>담당 사업 ${projects.length}건</h2><div class="p15-grid">${projects.map(p => `<article class="p15-card"><h3>${esc(p.title)}</h3><p>${esc(p.period)}</p><p>진행률 ${p.progress}% · ${p.completed}/${p.total} 업무 완료</p><progress value="${p.progress}" max="100" aria-label="${esc(p.title)} 진행률"></progress><div class="p15-actions">${button('사업 상세','project',p.id)}</div></article>`).join('') || '<p>활성 기관에 연결된 사업이 없습니다.</p>'}</div></section>`}`);
  }
  function agencyAdmin() {
    shell('기관 · 사업 연결 · 공개 승인 관리', `<section class="panel"><h2>기관 관리</h2><div class="p15-actions">${button('기관 등록','agency-new')}</div><div class="p15-grid">${state.agencies.map(a => `<article class="p15-card"><h3>${esc(a.name)}</h3><p>${a.active ? '활성' : '비활성'}</p>${button(a.active ? '기관 비활성화' : '기관 활성화','agency-toggle',a.id)}</article>`).join('')}</div><h3>시연 담당자 연결 / 재배정</h3>${state.users.map((u,i) => `<label>${esc(u.email)}<select data-link-user="${i}">${state.agencies.map(a => `<option value="${a.id}" ${u.agencyId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>`).join('')}<small>공개 데모 담당자는 로그인 화면의 두 가상 계정을 사용합니다. 신규 실제 계정 생성은 서버 버전에서 제공합니다.</small></section><section class="panel"><h2>사업 연결 / 공개자료 승인·해제</h2>${state.projects.map(p => `<article class="p15-card"><h3>${esc(p.title)}</h3><label>연결 기관<select data-link-project="${p.id}">${state.agencies.map(a => `<option value="${a.id}" ${p.agencyId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>${p.evidence.map(e => `<p>증빙: ${esc(e.name)} · ${e.published ? '공개중' : '비공개'} ${button(e.published ? '증빙 공개 해제' : '증빙 공개 승인','evidence-toggle',e.id)}</p>`).join('')}${p.reviews.map(r => `<p>검수: ${esc(r.summary)} · ${r.published ? '공개중' : '비공개'} ${button(r.published ? '검수 공개 해제' : '검수 공개 승인','review-toggle',r.id)}</p>`).join('')}</article>`).join('')}</section>`);
    root().querySelectorAll('[data-link-user]').forEach(el => el.onchange = () => { if (user().role !== 'ADMIN') return; state.users[Number(el.dataset.linkUser)].agencyId = Number(el.value); save(); });
    root().querySelectorAll('[data-link-project]').forEach(el => el.onchange = () => { if (user().role !== 'ADMIN') return; state.projects.find(p => p.id === Number(el.dataset.linkProject)).agencyId = Number(el.value); save(); });
  }
  async function act(action, id) {
    const role = user().role;
    if (action === 'back') return render();
    if (action === 'market') return market();
    if (action === 'agency') return agency();
    if (action === 'reset') { if (!confirm('P15 시연 데이터만 초기화할까요? 기존 공공업무·회계·공시 데이터는 유지됩니다.')) return; state = M.seed(); save(); projectId = null; return view === 'agency' ? agency() : market(); }
    if (role === 'AGENCY_USER') {
      const link = state.users.find(u => u.email === user().email);
      const projects = M.portal(state,link?.agencyId);
      if (action === 'project') { if (!projects.some(p => p.id === id)) throw Error('조회할 수 없는 사업입니다.'); projectId = id; }
      else if (action === 'projects') projectId = null;
      else if (action === 'report' && projects.some(p => p.id === projectId)) { document.body.classList.add('p15-print'); window.print(); document.body.classList.remove('p15-print'); return; }
      else if (action === 'evidence') {
        const e = projects.find(p => p.id === projectId)?.evidence.find(e => e.id === id);
        if (!e) throw Error('공개된 자료가 없습니다.');
        const url = URL.createObjectURL(new Blob([`공개 데모 가상 자료\n${e.name}\n${e.caption}\n실제 증빙 파일이 아닙니다.`],{type:'text/plain;charset=utf-8'}));
        const a = document.createElement('a'); a.href = url; a.download = `samter-demo-evidence-${id}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); return;
      }
      return agency();
    }
    if (action === 'order') M.order(state,role,id);
    else if (action === 'bank') { const o = state.orders.find(o => o.id === id); if (role !== 'CONSUMER' || !['INSPECTION_APPROVED','PAYMENT_SENT'].includes(o?.status)) throw Error('검수 승인 후 조회 가능합니다.'); return notice('시연 전용: OO은행 / DEMO-송금불가 / 가상 생산자. 실제 송금하지 마세요.'); }
    else if (action.startsWith('seller-')) {
      if ((action === 'seller-edit' && role !== 'WORKER') || (action !== 'seller-edit' && role !== 'ADMIN')) throw Error('권한이 없습니다.');
      state.seller = action === 'seller-verify' ? 'VERIFIED' : action === 'seller-reject' ? 'REJECTED' : 'UNVERIFIED';
      if (state.seller !== 'VERIFIED') state.offerings.filter(o => o.status === 'ACTIVE').forEach(o => o.status = 'PAUSED');
    } else if (action.startsWith('offer-')) {
      const o = state.offerings.find(o => o.id === id);
      if (['offer-approve','offer-reject'].includes(action)) {
        if (role !== 'ADMIN' || o?.status !== 'PENDING_APPROVAL' || (action === 'offer-approve' && state.seller !== 'VERIFIED')) throw Error('판매자 확인 및 승인대기 상태를 확인하세요.');
        o.status = action === 'offer-approve' ? 'ACTIVE' : 'REJECTED';
      } else {
        if (role !== 'WORKER') throw Error('생산자 전용입니다.');
        if (action === 'offer-new' || action === 'offer-edit') {
          if (action === 'offer-edit' && !['DRAFT','REJECTED','PAUSED'].includes(o?.status)) throw Error('판매를 중지한 뒤 수정하세요.');
          const title = await window.SamterUI.prompt('시연 서비스 이름',o?.title || '새 시연 서비스'); if (!title?.trim()) return;
          const priceText = await window.SamterUI.prompt('가격 (원)',String(o?.price || 30000)); if (priceText === null) return;
          const price = Number(priceText); if (!Number.isSafeInteger(price) || price <= 0 || price > 100000000) throw Error('1~100,000,000 사이의 정수 금액을 입력하세요.');
          if (o) Object.assign(o,{title:title.trim().slice(0,100),price,status:'DRAFT'});
          else state.offerings.push({id:Math.max(...state.offerings.map(x => x.id),0)+1,title:title.trim().slice(0,100),price,description:'생산자가 등록한 가상 서비스',status:'DRAFT'});
        } else {
          const rules = {'offer-submit':[['DRAFT','REJECTED'],'PENDING_APPROVAL'],'offer-pause':[['ACTIVE'],'PAUSED'],'offer-resume':[['PAUSED'],'ACTIVE'],'offer-archive':[['DRAFT','REJECTED','PAUSED'],'ARCHIVED']};
          const rule = rules[action];
          if (!rule || !rule[0].includes(o?.status) || (action === 'offer-resume' && state.seller !== 'VERIFIED')) throw Error('현재 상태에서는 처리할 수 없습니다.');
          o.status = rule[1];
        }
      }
    } else if (['agency-new','agency-toggle','evidence-toggle','review-toggle'].includes(action)) {
      if (role !== 'ADMIN') throw Error('관리자 전용입니다.');
      if (action === 'agency-new') { const name = await window.SamterUI.prompt('가상 기관 이름'); if (!name?.trim()) return; state.agencies.push({id:Math.max(...state.agencies.map(a => a.id))+1,name:name.trim().slice(0,100),active:true}); }
      if (action === 'agency-toggle') { const a = state.agencies.find(a => a.id === id); a.active = !a.active; }
      if (action === 'evidence-toggle' || action === 'review-toggle') { const key = action === 'evidence-toggle' ? 'evidence' : 'reviews'; const item = state.projects.flatMap(p => p[key]).find(e => e.id === id); item.published = !item.published; }
    } else {
      const o = state.orders.find(o => o.id === id); if (!o) return;
      if (action === 'resolve' && o.resume_status === 'PAYMENT_SENT') {
        const resolution = await window.SamterUI.prompt('당사자 간 외부 환불·정산 처리 내용 (시연)'); if (!resolution?.trim()) return;
        o.admin_resolution = resolution.trim();
      }
      M.transition(o,role,action);
    }
    save(); view === 'agency' ? agency() : market();
  }
  function install() {
    const role = user().role;
    const portal = document.querySelector('#phase15-portal');
    if (portal && !portal.dataset.documentView && !portal.querySelector('.p15')) { projectId = null; role === 'AGENCY_USER' ? agency() : market(); }
    if (role === 'ADMIN') {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar || sidebar.querySelector('[data-phase15-demo]')) return;
      for (const [label,fn] of [['서비스 마켓',market],['발주기관 관리',agency]]) { const b = document.createElement('button'); b.className = 'side-link'; b.dataset.phase15Demo = '1'; b.textContent = label; b.onclick = () => { sidebar.querySelectorAll('.side-link').forEach(x => x.classList.remove('active')); b.classList.add('active'); fn(); }; sidebar.appendChild(b); }
    }
    if (role === 'WORKER') { const hero = document.querySelector('.producer-hero'); if (hero && !hero.querySelector('[data-phase15-demo]')) { const b = document.createElement('button'); b.className = 'btn btn-primary'; b.dataset.phase15Demo = '1'; b.textContent = '내 서비스 · 마켓 주문관리'; b.onclick = market; hero.appendChild(b); } }
    if (role === 'WORKER') {
      const sidebar = document.querySelector('.role-sidebar');
      if (sidebar && !sidebar.querySelector('[data-phase15-worker]')) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'side-link'; b.dataset.phase15Worker = '1'; b.textContent = '서비스 마켓';
        b.onclick = () => { sidebar.querySelectorAll('.side-link').forEach(x => x.classList.remove('active')); b.classList.add('active'); market(); };
        sidebar.appendChild(b);
      }
    }
  }
  new MutationObserver(install).observe(document.querySelector('#app'),{childList:true,subtree:true});
  install();
})();
