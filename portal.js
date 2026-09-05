/* Shared enhancement layer: keep feature handlers and API contracts intact. */
(function () {
  'use strict';
  const groups = [
    ['시작', /대시보드|업무 요약/],
    ['조합원', /가입|회원|명부/],
    ['사업·업무', /사업관리|업무 배정|신청관리|검수|기관/],
    ['서비스 거래', /서비스|주문|분쟁/],
    ['회계·정산', /정산|거래|결산|출자/],
    ['조합 운영', /총회|이사회|공익|공시|감사/]
  ];
  const groupFor = label => (groups.find(([, rule]) => rule.test(label)) || ['기타'])[0];
  const normalize = text => text.replace(/\s+/g, '').toLowerCase();
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function link(text, href) {
    const a = element('a', '', text); a.href = href; return a;
  }
  window.SamterUI = {
    prompt(message, initial = '') {
      return new Promise(resolve => {
        const previous = document.activeElement;
        const dialog = element('dialog','ui-dialog');
        const form = element('form');
        const label = element('label','',message);
        const input = element('textarea'); input.value = String(initial ?? ''); input.rows = 3;
        label.append(input);
        const actions = element('div','ui-dialog-heading');
        const cancel = element('button','btn btn-secondary','취소'); cancel.type='button';
        const submit = element('button','btn btn-primary','입력 완료'); submit.type='submit';
        actions.append(cancel,submit); form.append(label,actions); dialog.append(form);
        dialog.setAttribute('aria-label',message);
        let value = null;
        form.onsubmit = event => {event.preventDefault();value=input.value;dialog.close();};
        cancel.onclick = () => dialog.close();
        dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus();resolve(value);},{once:true});
        document.body.append(dialog);dialog.showModal();input.focus();
      });
    }
  };
  let restoring = false;
  function navigate(label, record = true) {
    const button = [...document.querySelectorAll('.sidebar .side-link')].find(b => b.textContent.trim() === label);
    if (!button) return false;
    restoring = true;
    button.click();
    restoring = false;
    if (record) history.pushState(null, '', '#menu=' + encodeURIComponent(label));
    document.querySelector('.sidebar')?.classList.remove('ui-menu-open');
    document.querySelector('.ui-menu-toggle')?.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      const heading = document.querySelector('#app main h1, #app .content h2');
      if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
    }, 100);
    return true;
  }
  let restored = '';
  function restore() {
    if (!location.hash.startsWith('#menu=')) return;
    let label;
    try { label = decodeURIComponent(location.hash.slice(6)); } catch { return; }
    if (restored !== location.hash && navigate(label, false)) restored = location.hash;
  }
  window.addEventListener('popstate', () => { restored = ''; restore(); });
  function menus() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) { restored = ''; return; }
    if (!sidebar.querySelector('.ui-menu-search')) {
      const toggle = element('button','ui-menu-toggle','업무 메뉴 열기');
      toggle.type = 'button'; toggle.setAttribute('aria-expanded','false');
      toggle.onclick = () => { const open = sidebar.classList.toggle('ui-menu-open'); toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? '업무 메뉴 닫기' : '업무 메뉴 열기'; };
      const search = element('input','ui-menu-search'); search.type = 'search'; search.placeholder = '메뉴 찾기'; search.setAttribute('aria-label','업무 메뉴 검색');
      search.oninput = () => {
        const query = normalize(search.value);
        sidebar.querySelectorAll('.side-link').forEach(b => { b.hidden = !normalize(b.textContent).includes(query); });
        sidebar.querySelectorAll('[data-ui-group]').forEach(section => { section.hidden = !section.querySelector('.side-link:not([hidden])'); });
      };
      sidebar.prepend(search); sidebar.prepend(toggle);
      if (!sidebar.classList.contains('role-sidebar')) {
        [...groups.map(([name])=>name),'기타'].forEach(name => {
          const section = element('section'); section.dataset.uiGroup = name;
          section.append(element('h2','ui-menu-heading',name)); section.hidden = true; sidebar.append(section);
        });
      }
    }
    sidebar.querySelectorAll('.side-link:not([data-ui-menu])').forEach(button => {
      button.dataset.uiMenu = '1';
      const group = [...sidebar.querySelectorAll('[data-ui-group]')].find(n=>n.dataset.uiGroup === groupFor(button.textContent));
      if (group) { group.hidden = false; group.append(button); }
      button.addEventListener('click', event => { if(button.classList.contains('active') && !restoring){event.stopImmediatePropagation();event.preventDefault();} }, true);
      button.addEventListener('click', () => {
        if (!restoring) { history.pushState(null,'','#menu='+encodeURIComponent(button.textContent.trim())); restored = location.hash; }
        sidebar.classList.remove('ui-menu-open');
        sidebar.querySelector('.ui-menu-toggle')?.setAttribute('aria-expanded','false');
      });
    });
    sidebar.querySelectorAll('.side-link').forEach(b=> {
      if (b.classList.contains('active')) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
    const main = document.querySelector('.view-shell .content');
    if (main && !main.querySelector('.ui-shortcuts')) {
      const box = element('section','ui-shortcuts');
      const roleMenu = sidebar.classList.contains('role-sidebar');
      box.append(element('h2','',roleMenu ? '내 업무 바로가기' : '어떤 업무를 처리하시겠어요?'), element('p','',roleMenu ? '자주 쓰는 화면을 한 번에 확인하세요.' : '심사부터 정산까지, 자주 쓰는 업무로 바로 이동하세요.'));
      const grid = element('div','ui-shortcut-grid'); box.append(grid);
      main.prepend(box);
    }
    const grid = main?.querySelector('.ui-shortcut-grid');
    if (grid) {
      const roleMenu = sidebar.classList.contains('role-sidebar');
      const preferred = roleMenu ? [...sidebar.querySelectorAll('.side-link')].map(button => button.textContent.trim()) : ['가입','신청관리','검수','정산','사업관리','기관'];
      preferred.slice(0,6).forEach(word => {
        const target = [...sidebar.querySelectorAll('.side-link')].find(b=>b.textContent.includes(word));
        if (!target || [...grid.children].some(b=>b.textContent === target.textContent)) return;
        const button = element('button','',target.textContent); button.type='button';
        button.onclick = () => navigate(target.textContent.trim()); grid.append(button);
      });
    }
    restore();
  }
  function forms() {
    document.querySelectorAll('input[type="password"]:not([data-ui-password])').forEach(input => {
      input.dataset.uiPassword='1';
      const button = element('button','ui-password-toggle','비밀번호 표시'); button.type='button'; button.setAttribute('aria-pressed','false');
      button.onclick=()=>{ const visible=input.type==='password'; input.type=visible?'text':'password'; button.textContent=visible?'비밀번호 숨기기':'비밀번호 표시'; button.setAttribute('aria-pressed',String(visible)); };
      input.after(button);
    });
    const login = document.querySelector('#login-form');
    if (login && !document.querySelector('.ui-login-links')) {
      const links = element('div','ui-login-links'); links.append(link('처음 오셨나요? 가입 신청','./join.html'),link('삼터 홈','./index.html'));
      login.after(links);
    }
    document.querySelectorAll('form:not([data-ui-form])').forEach(form=>{
      form.dataset.uiForm='1';
      form.addEventListener('invalid',event=>{
        event.target.setAttribute('aria-invalid','true');
        if (!event.target.nextElementSibling?.classList.contains('ui-form-error')) {
          const message = element('p','ui-form-error',event.target.validationMessage);
          event.target.after(message);
        }
      },true);
      form.addEventListener('input',event=>{
        if (event.target.validity?.valid) {
          event.target.removeAttribute('aria-invalid');
          if(event.target.nextElementSibling?.classList.contains('ui-form-error')) event.target.nextElementSibling.remove();
        }
      });
    });
    document.querySelectorAll('#notice,#join-result').forEach(n=>{ n.setAttribute('role','status'); n.setAttribute('aria-live','polite'); });
  }
  function tables() {
    document.querySelectorAll('.table-wrap:not([data-ui-table])').forEach(wrap=>{
      wrap.dataset.uiTable='1'; wrap.tabIndex=0; wrap.setAttribute('role','region'); wrap.setAttribute('aria-label','목록. 좁은 화면에서는 좌우로 이동할 수 있습니다.');
      const table = wrap.querySelector('table'); if (!table) return;
      const rows = [...table.querySelectorAll('tbody tr')]; if(rows.length<2) return;
      const bar=element('div','ui-filter'); const input=element('input'); input.type='search'; input.placeholder='현재 목록에서 검색'; input.setAttribute('aria-label','현재 표시된 목록 검색');
      const count=element('span','',rows.length+'개 항목 · 현재 불러온 목록 기준'); count.setAttribute('aria-live','polite');
      const empty=element('div','ui-table-empty','검색 결과가 없습니다. 검색어를 바꿔 주세요.'); empty.hidden=true;
      input.oninput=()=>{let found=0; rows.forEach(row=>{row.hidden=!normalize(row.textContent).includes(normalize(input.value)); if(!row.hidden)found++;}); count.textContent=found+' / '+rows.length+'개 항목 · 현재 불러온 목록 기준'; empty.hidden=found!==0;};
      bar.append(input,count); wrap.before(bar); wrap.after(empty);
    });
  }
  function sections() {
    document.querySelectorAll('.producer-page,.phase15a-consumer-page,.phase15b-agency-page,[data-phase15a-consumer],#phase15-portal').forEach(main=>{
      const sectionIds = {'내 신청 목록':'my-applications','참여 가능한 업무':'open-tasks','내 업무 / 지급 현황':'my-work','서비스 찾기':'p15-services','내 주문':'p15-orders','담당 사업':'p15-projects'};
      main.querySelectorAll('h2').forEach(heading => {
        const label = Object.keys(sectionIds).find(text => heading.textContent.trim().startsWith(text));
        const id = sectionIds[label];
        if (id && heading.closest('section,article')) heading.closest('section,article').id = id;
      });
      if (main.closest('.view-shell')) return;
      const headings = [...main.querySelectorAll('h2')].filter(h=>!h.closest('.ui-shortcuts,dialog'));
      if (headings.length < 2) return;
      let nav=main.querySelector('.ui-section-nav');
      if(!nav){nav=element('nav','ui-section-nav');nav.setAttribute('aria-label','이 화면의 서비스'); main.prepend(nav);}
      headings.forEach((heading,index)=>{
        if(heading.dataset.uiSection)return;
        heading.dataset.uiSection='1';
        if(!heading.id)heading.id='service-section-'+index+'-'+Math.random().toString(36).slice(2,7);
        nav.append(link(heading.textContent,'#'+heading.id));
      });
    });
  }
  function publicHome() {
    if (!document.querySelector('.site-header') || document.querySelector('.ui-portal')) return;
    const portal=element('section','ui-portal');
    portal.innerHTML='<h1 class="ui-portal-title">지역의 일과 생활, 삼터에서 함께</h1><p class="ui-portal-lead">공공업무 참여부터 조합 서비스 이용까지. 필요한 서비스를 쉽게 찾아보세요.</p><label class="ui-service-search"><span>서비스 찾기</span><input type="search" placeholder="무엇을 하고 싶으세요? 업무, 가입, 서비스…" aria-label="삼터 서비스 검색"></label><div class="ui-portal-grid"><section class="ui-shortcuts"><h2>자주 찾는 서비스</h2><p>로그인 후 내 역할에 맞는 서비스를 이용할 수 있습니다.</p><div class="ui-shortcut-grid"></div><p class="ui-home-empty" hidden>검색 결과가 없습니다. 다른 검색어를 입력해 주세요.</p></section><aside class="ui-welcome"><h2>나의 삼터</h2><p>내 업무와 주문 진행 상황을<br>로그인하고 확인하세요.</p><a class="button primary" href="./app.html">로그인</a><a class="button secondary" href="./join.html">조합원 가입 신청</a></aside></div>';
    const grid=portal.querySelector('.ui-shortcut-grid');
    [['공공업무 참여','./app.html'],['내 업무 · 증빙 제출','./app.html'],['서비스 찾기 · 내 주문','./app.html'],['사업 현황 · 보고서','./app.html'],['조합원 가입 신청','./join.html'],['조합원 유형 안내','#membership'],['삼터 사업 안내','#business'],['참여 절차 확인','#process']].forEach(([text,href])=>grid.append(link(text,href)));
    portal.querySelector('input').oninput=event=>{let found=0; [...grid.children].forEach(a=>{a.hidden=!normalize(a.textContent).includes(normalize(event.target.value));if(!a.hidden)found++;});portal.querySelector('.ui-home-empty').hidden=found!==0;};
    document.querySelector('main').prepend(portal);
  }
  function dialogs() {
    document.querySelectorAll('#app form:not([data-ui-dialog])').forEach(form => {
      if (form.closest('dialog') || /login|mfa/.test(form.id)) return;
      const submit = form.querySelector('button[type="submit"]');
      if (!submit || !/등록|추가|생성|저장|업로드|제출|연결|공개|주문|신청/.test(submit.textContent)) return;
      form.dataset.uiDialog = '1';
      const application = form.closest('details.application-box');
      const title = application ? '업무 참여 신청' : submit.textContent.trim();
      const opener = element('button','btn btn-primary ui-open-form',title);
      opener.type = 'button';
      if(application)opener.textContent='내가 하겠습니다';
      const dialog = element('dialog','ui-dialog');
      const titleId = 'dialog-title-' + Math.random().toString(36).slice(2);
      dialog.setAttribute('aria-labelledby', titleId);
      const head = element('div','ui-dialog-heading');
      const heading = element('h2','',title); heading.id = titleId;
      const close = element('button','btn btn-secondary','닫기'); close.type='button'; close.setAttribute('aria-label',title+' 창 닫기');
      head.append(heading,close);
      const help = element('p','ui-dialog-help','내용을 입력한 후 아래 버튼을 눌러 완료하세요.');
      (application || form).before(opener,dialog); dialog.append(head,help,form);
      if(application)application.remove();
      opener.onclick=()=>{dialog.showModal(); const first=form.querySelector('input:not([type="hidden"]),select,textarea'); first?.focus();};
      close.onclick=()=>dialog.close();
      dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
      dialog.addEventListener('close',()=>opener.isConnected&&opener.focus());
      form.addEventListener('reset',()=>{ if(dialog.open)dialog.close(); });
      // Existing async submit handlers own success/error state. Never close on submit:
      // failed requests must leave the entered values and the validation visible.
    });
  }
  let scheduled=false;
  function enhance() {scheduled=false; menus(); forms(); tables(); dialogs(); sections();}
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(enhance);}
  function start(){
    const skip=link('본문 바로가기','#app');skip.className='ui-skip';
    if(!document.querySelector('#app')){const main=document.querySelector('main');if(main){main.id=main.id||'main-content';skip.href='#'+main.id;}}
    document.body.prepend(skip);
    const header=document.querySelector('.topbar');
    if(header){const home=link('삼터 홈','./index.html');home.className='ui-home'; header.querySelector('.brand')?.after(home);}
    publicHome();enhance();
    const notice = document.querySelector('#notice');
    if (notice) new MutationObserver(() => {
      const dialog = document.querySelector('dialog[open]');
      if (!dialog || notice.hidden || !notice.textContent.trim()) return;
      let feedback = dialog.querySelector('.ui-dialog-feedback');
      if(!feedback){feedback=element('p','ui-dialog-feedback');feedback.setAttribute('role','status');dialog.prepend(feedback);}
      if(feedback.textContent!==notice.textContent)feedback.textContent=notice.textContent;
    }).observe(notice,{childList:true,subtree:true,attributes:true});
    new MutationObserver(schedule).observe(document.querySelector('#app')||document.querySelector('main')||document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
