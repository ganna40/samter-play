(() => {
  'use strict';
  const M = window.SAMTER_DOCUMENT_MODEL;
  const KEY = 'samter_public_demo_documents_v2';
  const DB_NAME = 'samter_public_demo_files_v1';
  const STORE = 'files';
  const roleLabels = { ADMIN: '협동조합 관리자', WORKER: '생산자', CONSUMER: '소비자', AGENCY_USER: '발주기관' };
  const typeLabels = { QUOTE: '견적서', WORK_PLAN: '작업계획서', WORK_RESULT: '작업결과서' };
  const statusLabels = { SUBMITTED: '소비자 확인 대기', CONSUMER_APPROVED: '소비자 확인 완료', APPROVED: '관리자 최종 승인', REVISION_REQUIRED: '보완 요청' };
  let documentViewActive = false;
  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved?.version === 2 && Array.isArray(saved.documents) && Array.isArray(saved.publications)) return saved;
    } catch { /* Use fictional seed if storage is unavailable or malformed. */ }
    return M.seed();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function user() {
    let current = {};
    try { current = JSON.parse(localStorage.getItem('samter_public_demo_session') || '{}'); } catch {}
    if (current.role === 'AGENCY_USER') {
      try {
        const phase15 = JSON.parse(localStorage.getItem('samter_public_demo_phase15_v1') || 'null');
        current.agencyId = phase15?.users?.find(item => item.email === current.email)?.agencyId || (current.email === 'agency2@samter.kr' ? 2 : 1);
      } catch { current.agencyId = current.email === 'agency2@samter.kr' ? 2 : 1; }
    }
    return current;
  }
  function syncProjectLinks() {
    try {
      const phase15 = JSON.parse(localStorage.getItem('samter_public_demo_phase15_v1') || 'null');
      if (!Array.isArray(phase15?.projects)) return;
      state.projects.forEach(project => {
        const linked = phase15.projects.find(item => item.id === project.id);
        if (linked) project.agencyId = linked.agencyId;
      });
      if (Array.isArray(phase15.orders)) phase15.orders.forEach(order => {
        const id = `order-${order.id}`;
        if (!state.scopes.some(item => item.id === id)) state.scopes.push({ id, kind: 'MARKET_ORDER', title: `${order.title} 주문 #${order.id}`, workerEmail: 'worker@samter.kr', consumerEmail: 'consumer@samter.kr' });
      });
    } catch { /* Seeded links remain available. */ }
  }
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const prettyDate = value => new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  const fileSize = bytes => bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
  const root = () => document.querySelector('.content') || document.querySelector('#phase15-portal') || document.querySelector('.producer-page');
  const scope = doc => M.scopeFor(state, doc.scopeId);
  const publication = doc => state.publications.find(item => item.documentId === doc.id && !item.revokedAt);

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function putFile(key, blob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, key);
      request.onsuccess = () => { db.close(); resolve(); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }
  async function getFile(key, doc) {
    const db = await openDb();
    const blob = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return blob || new Blob([`삼터 공개 데모 가상 문서\n${doc.fileName}\n${typeLabels[doc.type]} ${doc.version}차 버전\n실제 업무 문서가 아닙니다.`], { type: 'text/plain;charset=utf-8' });
  }
  async function download(doc, preview = false) {
    const blob = await getFile(doc.fileKey, doc);
    const url = URL.createObjectURL(blob);
    if (preview) window.open(url, '_blank', 'noopener');
    else {
      const link = document.createElement('a');
      link.href = url; link.download = doc.fileName; link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function card(doc, current) {
    const itemScope = scope(doc);
    const project = state.projects.find(item => item.id === itemScope?.projectId);
    const livePublication = publication(doc);
    const lastReview = doc.reviewHistory?.at(-1);
    const latest = !state.documents.some(item => item.scopeId === doc.scopeId && item.type === doc.type && item.version > doc.version);
    const adminFallbackReview = current.role === 'ADMIN' && itemScope?.kind === 'PUBLIC_TASK' && !itemScope.consumerEmail && !(itemScope.consumerEmails?.length);
    let actions = `<button type="button" class="btn btn-secondary btn-small" data-doc-open="${doc.id}">열기</button><button type="button" class="btn btn-secondary btn-small" data-doc-download="${doc.id}">다운로드</button>`;
    if (current.role === 'CONSUMER' && doc.status === 'SUBMITTED' && latest) {
      actions += `<button type="button" class="btn btn-primary btn-small" data-doc-review="APPROVE" data-id="${doc.id}">승인</button><button type="button" class="btn btn-secondary btn-small" data-doc-review="REVISION" data-id="${doc.id}">보완 요청</button>`;
    }
    if (current.role === 'ADMIN' && itemScope?.kind === 'PUBLIC_TASK' && latest && (doc.status === 'CONSUMER_APPROVED' || adminFallbackReview && doc.status === 'SUBMITTED')) actions += `<button type="button" class="btn btn-primary btn-small" data-doc-admin-review="APPROVE" data-id="${doc.id}">최종 승인</button>`;
    if (current.role === 'ADMIN' && itemScope?.kind === 'PUBLIC_TASK' && latest && ['SUBMITTED', 'CONSUMER_APPROVED', 'APPROVED'].includes(doc.status)) actions += `<button type="button" class="btn btn-secondary btn-small" data-doc-admin-review="REVISION" data-id="${doc.id}">보완 요청</button>`;
    if (current.role === 'ADMIN' && itemScope?.kind === 'PUBLIC_TASK' && doc.status === 'APPROVED' && latest && !livePublication) actions += `<button type="button" class="btn btn-primary btn-small" data-doc-publish="${doc.id}">기관에 공개</button>`;
    if (current.role === 'ADMIN' && livePublication) actions += `<button type="button" class="btn btn-secondary btn-small" data-doc-revoke="${livePublication.id}">공개 회수</button>`;
    return `<article class="document-card" data-doc-card data-doc-id="${doc.id}"><div class="document-card-head"><span class="document-status document-status-${doc.status.toLowerCase()}">${esc(statusLabels[doc.status] || doc.status)}</span>${livePublication ? '<span class="document-status document-status-published">기관 공개중</span>' : ''}</div><div><span class="eyebrow">${esc(typeLabels[doc.type])} · ${doc.version}차 버전</span><h3>${esc(doc.fileName)}</h3></div><p>${esc(itemScope?.title || '연결 정보 없음')}</p><p class="document-meta">${esc(project?.title || '')} · ${fileSize(doc.fileSize)} · ${prettyDate(doc.submittedAt)}</p>${lastReview ? `<p class="document-history">최근 검토: ${esc(statusLabels[doc.status])}${lastReview.comment ? ` · ${esc(lastReview.comment)}` : ''}</p>` : ''}<div class="document-card-actions">${actions}</div></article>`;
  }

  function submitDialog(scopes) {
    return `<dialog class="document-dialog" id="document-submit-dialog" aria-labelledby="document-submit-title"><form method="dialog" id="document-submit-form"><h2 id="document-submit-title">문서 제출</h2><p>배정된 작업 또는 주문과 문서 종류를 선택하고 파일을 첨부해 주세요. 같은 종류를 다시 제출하면 새 버전으로 남습니다.</p><label>연결 작업 · 주문<select name="scopeId" required>${scopes.map(item => `<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('')}</select></label><label>문서 종류<select name="type" required><option value="QUOTE">견적서</option><option value="WORK_PLAN">작업계획서</option><option value="WORK_RESULT">작업결과서</option></select></label><label>첨부 파일<input type="file" name="file" data-doc-upload required></label><div class="document-dialog-actions"><button type="button" class="btn btn-secondary" data-doc-close>취소</button><button type="submit" class="btn btn-primary" data-doc-submit>제출</button></div></form></dialog>`;
  }

  function renderDocuments() {
    const host = root();
    if (!host || !user().role) return;
    documentViewActive = true;
    host.dataset.documentView = '1';
    syncProjectLinks();
    save();
    const current = user();
    const docs = M.visibleDocuments(state, current).sort((a, b) => b.id - a.id);
    const scopes = state.scopes.filter(item => item.workerEmail === current.email);
    const waiting = docs.filter(doc => doc.status === 'SUBMITTED').length;
    const published = docs.filter(doc => publication(doc)).length;
    const roleHelp = current.role === 'WORKER' ? '배정된 작업과 실제 내 주문의 견적서·작업계획서·작업결과서를 제출합니다. 같은 종류는 보완 요청 후에만 새 버전을 낼 수 있습니다.' : current.role === 'CONSUMER' ? '명시적으로 배정된 작업과 실제 내 주문의 최신 문서만 확인하거나 보완 요청할 수 있습니다.' : current.role === 'ADMIN' ? '전체 버전을 감독하고 소비자 확인을 거친 공공업무 최신본을 최종 승인한 뒤 연결 기관에 공개하거나 회수할 수 있습니다.' : '연결된 사업에서 관리자가 공개한 공공업무 버전만 조회할 수 있습니다.';
    host.innerHTML = `<div class="document-vault"><div class="page-heading"><div><span class="eyebrow">${esc(roleLabels[current.role])} · BROWSER DEMO</span><h1>문서함</h1></div><div class="today">GitHub Pages Demo</div></div><p class="document-demo-note"><strong>브라우저 전용 시연입니다.</strong> ${esc(roleHelp)} 파일과 변경 기록은 이 브라우저에만 저장되며 실제 다중 사용자 공유, 서버 저장, 보안 권한을 제공하지 않습니다. 실제 개인정보나 업무 자료를 올리지 마세요.</p>${current.role === 'WORKER' ? `<div class="document-toolbar"><button type="button" class="btn btn-primary" data-doc-new>문서 제출</button></div>${submitDialog(scopes)}` : ''}<section class="document-summary" aria-label="문서함 요약"><article><span>조회 문서</span><strong>${docs.length}</strong></article><article><span>검토 대기</span><strong>${waiting}</strong></article><article><span>기관 공개중</span><strong>${published}</strong></article></section><section class="panel"><div class="section-head"><div><span class="eyebrow">VERSION HISTORY</span><h2>${current.role === 'AGENCY_USER' ? '공개 문서' : '문서 버전 목록'}</h2></div></div><div class="document-grid" data-doc-list>${docs.map(doc => card(doc, current)).join('') || `<p class="document-empty">현재 조회할 수 있는 문서가 없습니다.</p>`}</div></section></div>`;
    bindDocumentActions();
    document.querySelectorAll('.sidebar .side-link').forEach(button => button.classList.toggle('active', button.textContent.trim() === '문서함'));
  }

  function bindDocumentActions() {
    const dialog = document.querySelector('#document-submit-dialog');
    document.querySelector('[data-doc-new]')?.addEventListener('click', () => dialog.showModal());
    document.querySelector('[data-doc-close]')?.addEventListener('click', () => dialog.close());
    document.querySelector('#document-submit-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const file = data.get('file');
      if (!(file instanceof File) || !file.size) return notice('제출할 파일을 선택해 주세요.');
      const key = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        await putFile(key, file);
        M.submit(state, user(), { scopeId: data.get('scopeId'), type: data.get('type'), fileKey: key, fileName: file.name, fileSize: file.size });
        save(); dialog.close(); notice('새 문서 버전을 제출했습니다.'); renderDocuments();
      } catch (error) { notice(error.message || '파일을 저장하지 못했습니다.'); }
    });
    document.querySelectorAll('[data-doc-open]').forEach(button => button.onclick = () => download(state.documents.find(doc => doc.id === Number(button.dataset.docOpen)), true));
    document.querySelectorAll('[data-doc-download]').forEach(button => button.onclick = () => download(state.documents.find(doc => doc.id === Number(button.dataset.docDownload))));
    document.querySelectorAll('[data-doc-review]').forEach(button => button.onclick = async () => {
      const decision = button.dataset.docReview;
      const comment = decision === 'REVISION' ? await window.SamterUI.prompt('보완할 내용을 입력해 주세요.') : '';
      if (decision === 'REVISION' && !comment?.trim()) return;
      try { M.review(state, user(), Number(button.dataset.id), decision, comment); save(); notice(decision === 'APPROVE' ? '문서 버전을 승인했습니다.' : '보완 요청을 등록했습니다.'); renderDocuments(); } catch (error) { notice(error.message); }
    });
    document.querySelectorAll('[data-doc-admin-review]').forEach(button => button.onclick = async () => {
      const decision = button.dataset.docAdminReview;
      const comment = decision === 'REVISION' ? await window.SamterUI.prompt('생산자에게 요청할 보완 내용을 입력해 주세요.') : '';
      if (decision === 'REVISION' && !comment?.trim()) return;
      try { M.adminReview(state, user(), Number(button.dataset.id), decision, comment); save(); notice(decision === 'APPROVE' ? '관리자 최종 승인을 완료했습니다.' : '관리자 보완 요청을 등록했습니다.'); renderDocuments(); } catch (error) { notice(error.message); }
    });
    document.querySelectorAll('[data-doc-publish]').forEach(button => button.onclick = () => {
      try { syncProjectLinks(); M.publish(state, user(), Number(button.dataset.docPublish)); save(); notice('선택한 승인 버전을 연결 기관에 공개했습니다.'); renderDocuments(); } catch (error) { notice(error.message); }
    });
    document.querySelectorAll('[data-doc-revoke]').forEach(button => button.onclick = () => {
      try { M.revoke(state, user(), Number(button.dataset.docRevoke)); save(); notice('기관 공개를 회수했습니다.'); renderDocuments(); } catch (error) { notice(error.message); }
    });
  }

  function restoreRoleView(label) {
    if (!documentViewActive) return;
    documentViewActive = false;
    render();
    setTimeout(() => {
      const replacement = [...document.querySelectorAll('.sidebar .side-link')].find(button => button.textContent.trim() === label);
      replacement?.click();
    });
  }

  function install() {
    const current = user();
    if (!current.role) { documentViewActive = false; return; }
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.querySelectorAll('.role-anchor:not([data-document-restore])').forEach(button => {
      button.dataset.documentRestore = '1';
      button.addEventListener('click', event => {
        if (!documentViewActive) return;
        event.preventDefault(); event.stopImmediatePropagation();
        restoreRoleView(button.textContent.trim());
      }, true);
    });
    if (sidebar.querySelector('[data-document-menu]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'side-link'; button.dataset.documentMenu = '1'; button.textContent = '문서함';
    button.onclick = renderDocuments;
    sidebar.append(button);
  }

  new MutationObserver(install).observe(document.querySelector('#app'), { childList: true, subtree: true });
  install();
})();
