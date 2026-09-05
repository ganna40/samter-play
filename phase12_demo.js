(() => {
  'use strict';

  const KEY = 'samter_demo_governance_v1';
  const SESSION_KEY = 'samter_public_demo_session';
  const ROSTER_KEY = 'samter_demo_membership_roster';
  const CURRENT_YEAR = 2026;
  const TERMINAL = new Set(['FINALIZED', 'CANCELLED']);

  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return structuredClone(fallback); }
  };
  const save = (value) => localStorage.setItem(KEY, JSON.stringify(value));
  const session = () => load(SESSION_KEY, null);
  const roster = () => load(ROSTER_KEY, []);
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const fmtDate = (value) => value ? new Date(value).toLocaleString('ko-KR') : '-';
  const meetingTypeLabel = (value) => value === 'GENERAL_ASSEMBLY' ? '총회' : '이사회';
  const resultLabel = (value) => ({APPROVED:'가결', REJECTED:'부결', DEFERRED:'보류'}[value] || '-');
  const statusLabel = (value) => ({DRAFT:'준비중', HELD:'개최됨', FINALIZED:'확정', CANCELLED:'취소'}[value] || value);

  function seed() {
    return {
      nextMeeting: 3,
      nextAttendance: 20,
      nextAgenda: 20,
      nextDocument: 20,
      meetings: [
        {
          id: 1,
          meeting_type: 'GENERAL_ASSEMBLY',
          status: 'FINALIZED',
          fiscal_year: 2026,
          title: '2026년 정기총회',
          scheduled_at: '2026-03-20T10:00:00',
          location: '삼터 회의실',
          convener_name_snapshot: '삼터 이사장',
          chair_name_snapshot: '삼터 이사장',
          notice_sent_at: '2026-03-10T09:00:00',
          minutes_text: '2026년도 사업계획 및 예산안을 심의하고 원안대로 의결함.',
          held_at: '2026-03-20T10:00:00',
          finalized_at: '2026-03-20T13:00:00',
          cancellation_reason: null,
          attendees: [
            {id:11, membership_id:1, name_snapshot:'김수행', attendance_role:'MEMBER', is_present:true, is_minutes_signer:true, note:''},
            {id:12, membership_id:2, name_snapshot:'박수행', attendance_role:'MEMBER', is_present:true, is_minutes_signer:true, note:''},
            {id:13, membership_id:null, name_snapshot:'삼터 이사장', attendance_role:'CHAIR', is_present:true, is_minutes_signer:true, note:''},
            {id:14, membership_id:null, name_snapshot:'외부 감사', attendance_role:'AUDITOR', is_present:true, is_minutes_signer:false, note:''},
          ],
          agenda: [
            {id:11, sequence_no:1, title:'2026년도 사업계획 승인', description:'연간 공공사업 수행계획', resolution_rule:'NORMAL', yes_count:3, no_count:0, abstain_count:0, result:'APPROVED', resolution_memo:'원안 가결'},
            {id:12, sequence_no:2, title:'2026년도 예산 승인', description:'연간 예산안', resolution_rule:'NORMAL', yes_count:3, no_count:0, abstain_count:0, result:'APPROVED', resolution_memo:'원안 가결'},
          ],
          documents: [
            {id:11, document_type:'SIGNED_MINUTES', original_filename:'2026_정기총회_서명회의록.pdf', content_type:'application/pdf', file_size:248120, created_at:'2026-03-20T13:00:00'},
          ],
        },
        {
          id: 2,
          meeting_type: 'BOARD',
          status: 'DRAFT',
          fiscal_year: 2026,
          title: '2026년 제2차 이사회',
          scheduled_at: '2026-09-15T14:00:00',
          location: '삼터 회의실',
          convener_name_snapshot: '삼터 이사장',
          chair_name_snapshot: '삼터 이사장',
          notice_sent_at: '2026-09-08T09:00:00',
          minutes_text: '',
          held_at: null,
          finalized_at: null,
          cancellation_reason: null,
          attendees: [
            {id:15, membership_id:null, name_snapshot:'삼터 이사장', attendance_role:'CHAIR', is_present:true, is_minutes_signer:true, note:''},
            {id:16, membership_id:1, name_snapshot:'김수행', attendance_role:'DIRECTOR', is_present:true, is_minutes_signer:false, note:''},
            {id:17, membership_id:2, name_snapshot:'박수행', attendance_role:'DIRECTOR', is_present:true, is_minutes_signer:false, note:''},
          ],
          agenda: [
            {id:13, sequence_no:1, title:'하반기 공공사업 운영계획', description:'하반기 사업 배분 및 운영계획 검토', resolution_rule:'NORMAL', yes_count:0, no_count:0, abstain_count:0, result:null, resolution_memo:''},
          ],
          documents: [],
        },
      ],
    };
  }

  let state = load(KEY, seed());
  if (!state || !Array.isArray(state.meetings)) state = seed();
  save(state);

  function notice(message, type = 'success') {
    const el = document.querySelector('#notice');
    if (!el) return;
    el.textContent = message;
    el.className = `notice notice-${type}`;
    el.hidden = false;
    window.setTimeout(() => { el.hidden = true; }, 2400);
  }

  function meeting(id) { return state.meetings.find((item) => Number(item.id) === Number(id)); }
  function mutable(item) { return item && !TERMINAL.has(item.status); }
  function presentCount(item) { return (item.attendees || []).filter((row) => row.is_present).length; }
  function noticeLeadDays(item) {
    if (!item.notice_sent_at || !item.scheduled_at) return null;
    const ms = new Date(item.scheduled_at).getTime() - new Date(item.notice_sent_at).getTime();
    return Math.floor(ms / 86400000);
  }
  function noticeWarning(item) {
    const days = noticeLeadDays(item);
    return item.meeting_type === 'GENERAL_ASSEMBLY' && days !== null && days < 7;
  }

  function summary(year) {
    const rows = state.meetings.filter((item) => Number(item.fiscal_year) === Number(year));
    const agenda = rows.flatMap((item) => item.agenda || []);
    return {
      fiscal_year: Number(year),
      general_assembly_count: rows.filter((item) => item.meeting_type === 'GENERAL_ASSEMBLY').length,
      board_meeting_count: rows.filter((item) => item.meeting_type === 'BOARD').length,
      finalized_meeting_count: rows.filter((item) => item.status === 'FINALIZED').length,
      cancelled_meeting_count: rows.filter((item) => item.status === 'CANCELLED').length,
      total_agenda_count: agenda.length,
      approved_agenda_count: agenda.filter((item) => item.result === 'APPROVED').length,
      rejected_agenda_count: agenda.filter((item) => item.result === 'REJECTED').length,
      deferred_agenda_count: agenda.filter((item) => item.result === 'DEFERRED').length,
      notice_period_warning_count: rows.filter(noticeWarning).length,
      meetings: rows,
    };
  }

  function renderList(year = CURRENT_YEAR) {
    const content = document.querySelector('.content');
    if (!content) return;
    const data = summary(year);
    const rows = [...data.meetings]
      .sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
      .map((item) => `
        <tr>
          <td>${meetingTypeLabel(item.meeting_type)}</td>
          <td><button class="phase12-link" data-p12-open="${item.id}">${esc(item.title)}</button></td>
          <td>${fmtDate(item.scheduled_at)}</td>
          <td>${esc(item.location)}</td>
          <td><span class="phase12-status phase12-${item.status.toLowerCase()}">${statusLabel(item.status)}</span></td>
          <td>${presentCount(item)}명</td>
          <td>${(item.agenda || []).length}건</td>
        </tr>`).join('') || '<tr><td colspan="7">등록된 회의가 없습니다.</td></tr>';

    content.innerHTML = `
      <div class="page-heading">
        <div><span class="eyebrow">GOVERNANCE · PUBLIC DEMO</span><h1>총회·이사회</h1></div>
        <div class="today">PHASE 12</div>
      </div>
      <div class="phase12-toolbar panel">
        <label>회계연도 <input id="phase12-year" type="number" min="2020" max="2100" value="${data.fiscal_year}"></label>
        <button class="btn btn-secondary" id="phase12-refresh">조회</button>
        <button class="btn btn-primary" id="phase12-create">새 회의 등록</button>
      </div>
      <div class="phase12-summary">
        <section class="panel"><span>총회</span><strong>${data.general_assembly_count}</strong><small>회</small></section>
        <section class="panel"><span>이사회</span><strong>${data.board_meeting_count}</strong><small>회</small></section>
        <section class="panel"><span>확정 / 취소</span><strong>${data.finalized_meeting_count} / ${data.cancelled_meeting_count}</strong><small>회의</small></section>
        <section class="panel"><span>의결 안건</span><strong>${data.approved_agenda_count} / ${data.total_agenda_count}</strong><small>가결 / 전체</small></section>
        <section class="panel"><span>통지 경고</span><strong>${data.notice_period_warning_count}</strong><small>7일 미만 총회</small></section>
      </div>
      <section class="panel table-panel">
        <div class="section-head"><div><h2>${data.fiscal_year}년 회의 현황</h2></div><span class="count-chip">${data.meetings.length}건</span></div>
        <div class="table-wrap"><table><thead><tr><th>유형</th><th>회의</th><th>일시</th><th>장소</th><th>상태</th><th>출석</th><th>안건</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>`;

    document.querySelector('#phase12-refresh').onclick = async () => renderList(Number(document.querySelector('#phase12-year').value || CURRENT_YEAR));
    document.querySelector('#phase12-create').onclick = async () => createMeeting(Number(document.querySelector('#phase12-year').value || CURRENT_YEAR));
    content.querySelectorAll('[data-p12-open]').forEach((button) => button.onclick = async () => renderDetail(button.dataset.p12Open));
  }

  async function createMeeting(year) {
    const typeRaw = await window.SamterUI.prompt('회의 유형을 입력하세요.\n1 = 총회 / 2 = 이사회', '1');
    if (!typeRaw) return;
    const type = String(typeRaw).trim() === '2' ? 'BOARD' : 'GENERAL_ASSEMBLY';
    const title = await window.SamterUI.prompt('회의 제목을 입력하세요.', type === 'BOARD' ? `${year}년 이사회` : `${year}년 정기총회`);
    if (!title) return;
    const scheduled = await window.SamterUI.prompt('회의 일시 (YYYY-MM-DDTHH:MM)', `${year}-09-30T14:00`);
    if (!scheduled) return;
    const location = await window.SamterUI.prompt('회의 장소', '삼터 회의실');
    if (!location) return;
    const id = state.nextMeeting++;
    state.meetings.push({
      id,
      meeting_type:type,
      status:'DRAFT',
      fiscal_year:year,
      title,
      scheduled_at:scheduled,
      location,
      convener_name_snapshot:'삼터 이사장',
      chair_name_snapshot:'삼터 이사장',
      notice_sent_at:null,
      minutes_text:'',
      held_at:null,
      finalized_at:null,
      cancellation_reason:null,
      attendees:[], agenda:[], documents:[],
    });
    save(state);
    notice('새 회의를 등록했습니다.');
    renderDetail(id);
  }

  function attendeeRows(item, readonly) {
    const rows = (item.attendees || []).map((row) => `
      <tr>
        <td>${esc(row.name_snapshot)}</td><td>${esc(row.attendance_role)}</td><td>${row.is_present ? '출석' : '불참'}</td><td>${row.is_minutes_signer ? '회의록 서명자' : '-'}</td>
        <td>${readonly ? '' : `<button class="btn btn-small btn-secondary" data-p12-del-attendee="${row.id}">삭제</button>`}</td>
      </tr>`).join('') || '<tr><td colspan="5">참석자 기록이 없습니다.</td></tr>';
    return rows;
  }

  function agendaRows(item, readonly) {
    const rows = (item.agenda || []).sort((a,b) => a.sequence_no - b.sequence_no).map((row) => `
      <tr>
        <td>${row.sequence_no}</td><td><strong>${esc(row.title)}</strong><br><small>${esc(row.description || '')}</small></td><td>${esc(row.resolution_rule)}</td>
        <td>${row.yes_count}/${row.no_count}/${row.abstain_count}</td><td>${resultLabel(row.result)}</td>
        <td>${readonly ? '' : `<button class="btn btn-small btn-secondary" data-p12-edit-agenda="${row.id}">의결 입력</button><button class="btn btn-small btn-secondary" data-p12-del-agenda="${row.id}">삭제</button>`}</td>
      </tr>`).join('') || '<tr><td colspan="6">등록된 안건이 없습니다.</td></tr>';
    return rows;
  }

  function documentRows(item, readonly) {
    const rows = (item.documents || []).map((row) => `
      <tr><td>${esc(row.document_type)}</td><td>${esc(row.original_filename)}</td><td>${Math.round(Number(row.file_size || 0)/1024).toLocaleString('ko-KR')} KB</td><td>${fmtDate(row.created_at)}</td><td>${readonly ? '' : `<button class="btn btn-small btn-secondary" data-p12-del-document="${row.id}">삭제</button>`}</td></tr>`).join('') || '<tr><td colspan="5">등록된 문서가 없습니다.</td></tr>';
    return rows;
  }

  function renderDetail(id) {
    const item = meeting(id);
    const content = document.querySelector('.content');
    if (!item || !content) return;
    const readonly = !mutable(item);
    const lead = noticeLeadDays(item);
    const warning = noticeWarning(item);
    const decisionsComplete = (item.agenda || []).length > 0 && (item.agenda || []).every((row) => row.result);
    const minutesReady = Boolean(String(item.minutes_text || '').trim()) || (item.documents || []).some((row) => ['MINUTES','SIGNED_MINUTES'].includes(row.document_type));

    content.innerHTML = `
      <div class="page-heading">
        <div><button class="phase12-back" id="phase12-back">← 목록</button><span class="eyebrow">${meetingTypeLabel(item.meeting_type)} · ${item.fiscal_year}</span><h1>${esc(item.title)}</h1></div>
        <span class="phase12-status phase12-${item.status.toLowerCase()}">${statusLabel(item.status)}</span>
      </div>
      ${warning ? `<section class="panel phase12-warning"><strong>소집통지 기간 확인</strong><p>회의 예정일 기준 통지 선행기간이 ${lead}일입니다. 7일 미만 경고는 운영상 확인용이며 법적 효력을 자동 판정하지 않습니다.</p></section>` : ''}
      ${readonly ? '<section class="panel phase12-readonly"><strong>확정/취소된 회의</strong><p>이 회의 기록은 공개 데모에서도 읽기 전용입니다.</p></section>' : ''}
      <section class="panel phase12-detail-grid">
        <div><span>일시</span><strong>${fmtDate(item.scheduled_at)}</strong></div><div><span>장소</span><strong>${esc(item.location)}</strong></div>
        <div><span>소집자</span><strong>${esc(item.convener_name_snapshot || '-')}</strong></div><div><span>의장</span><strong>${esc(item.chair_name_snapshot || '-')}</strong></div>
        <div><span>소집통지</span><strong>${fmtDate(item.notice_sent_at)}</strong></div><div><span>출석</span><strong>${presentCount(item)}명</strong></div>
      </section>
      <section class="panel">
        <div class="section-head"><h2>회의 관리</h2></div>
        <div class="phase12-actions">
          ${readonly ? '' : `<button class="btn btn-secondary" id="p12-edit-meeting">기본정보 수정</button><button class="btn btn-secondary" id="p12-set-notice">통지일 설정</button>`}
          ${item.status === 'DRAFT' ? '<button class="btn btn-primary" id="p12-hold">개최 처리</button>' : ''}
          ${item.status === 'HELD' ? '<button class="btn btn-primary" id="p12-finalize">회의 확정</button>' : ''}
          ${!readonly ? '<button class="btn btn-secondary" id="p12-cancel">회의 취소</button>' : ''}
        </div>
      </section>
      <section class="panel table-panel">
        <div class="section-head"><h2>참석자</h2>${readonly ? '' : '<button class="btn btn-small btn-primary" id="p12-add-attendee">참석자 추가</button>'}</div>
        <div class="table-wrap"><table><thead><tr><th>이름</th><th>역할</th><th>출석</th><th>서명</th><th></th></tr></thead><tbody>${attendeeRows(item, readonly)}</tbody></table></div>
      </section>
      <section class="panel table-panel">
        <div class="section-head"><h2>안건·의결</h2>${readonly ? '' : '<button class="btn btn-small btn-primary" id="p12-add-agenda">안건 추가</button>'}</div>
        <div class="table-wrap"><table><thead><tr><th>순번</th><th>안건</th><th>규칙</th><th>찬성/반대/기권</th><th>결과</th><th></th></tr></thead><tbody>${agendaRows(item, readonly)}</tbody></table></div>
      </section>
      <section class="panel">
        <div class="section-head"><h2>회의록</h2></div>
        <textarea id="p12-minutes" rows="5" ${readonly ? 'disabled' : ''} placeholder="회의 진행 및 의결 결과를 기록하세요.">${esc(item.minutes_text || '')}</textarea>
        ${readonly ? '' : '<div class="phase12-actions"><button class="btn btn-secondary" id="p12-save-minutes">회의록 저장</button></div>'}
      </section>
      <section class="panel table-panel">
        <div class="section-head"><h2>회의 문서</h2>${readonly ? '' : '<button class="btn btn-small btn-primary" id="p12-add-document">문서 등록</button>'}</div>
        <div class="table-wrap"><table><thead><tr><th>유형</th><th>파일</th><th>크기</th><th>등록일</th><th></th></tr></thead><tbody>${documentRows(item, readonly)}</tbody></table></div>
      </section>
      <section class="panel phase12-checklist">
        <strong>확정 준비상태</strong>
        <span>${(item.attendees || []).length ? '✅' : '⬜'} 참석자</span>
        <span>${(item.agenda || []).length ? '✅' : '⬜'} 안건</span>
        <span>${decisionsComplete ? '✅' : '⬜'} 모든 안건 의결결과</span>
        <span>${minutesReady ? '✅' : '⬜'} 회의록</span>
      </section>`;

    document.querySelector('#phase12-back').onclick = async () => renderList(item.fiscal_year);
    bindDetail(item);
  }

  function bindDetail(item) {
    const refresh = () => { save(state); renderDetail(item.id); };
    const byId = (list, id) => list.find((row) => Number(row.id) === Number(id));

    const edit = document.querySelector('#p12-edit-meeting');
    if (edit) edit.onclick = async () => {
      if (!mutable(item)) return;
      const title = await window.SamterUI.prompt('회의 제목', item.title); if (!title) return;
      const scheduled = await window.SamterUI.prompt('회의 일시 (YYYY-MM-DDTHH:MM)', String(item.scheduled_at).slice(0,16)); if (!scheduled) return;
      const location = await window.SamterUI.prompt('회의 장소', item.location); if (!location) return;
      item.title = title; item.scheduled_at = scheduled; item.location = location; refresh(); notice('회의 정보를 수정했습니다.');
    };
    const setNotice = document.querySelector('#p12-set-notice');
    if (setNotice) setNotice.onclick = async () => {
      const value = await window.SamterUI.prompt('소집통지 일시 (YYYY-MM-DDTHH:MM)', item.notice_sent_at ? String(item.notice_sent_at).slice(0,16) : String(item.scheduled_at).slice(0,10) + 'T09:00');
      if (!value) return; item.notice_sent_at = value; refresh(); notice('소집통지 일시를 저장했습니다.');
    };
    const hold = document.querySelector('#p12-hold');
    if (hold) hold.onclick = async () => { if (item.status !== 'DRAFT') return; item.status = 'HELD'; item.held_at = new Date().toISOString(); refresh(); notice('회의를 개최 상태로 변경했습니다.'); };
    const cancel = document.querySelector('#p12-cancel');
    if (cancel) cancel.onclick = async () => {
      const reason = await window.SamterUI.prompt('취소 사유를 입력하세요.'); if (!reason) return;
      item.status = 'CANCELLED'; item.cancellation_reason = reason; refresh(); notice('회의를 취소 처리했습니다.');
    };
    const finalize = document.querySelector('#p12-finalize');
    if (finalize) finalize.onclick = async () => {
      if (item.status !== 'HELD') return;
      if (!(item.attendees || []).length) return alert('참석자 기록이 필요합니다.');
      if (!(item.agenda || []).length) return alert('안건이 최소 1건 필요합니다.');
      if (!(item.agenda || []).every((row) => row.result)) return alert('모든 안건의 의결결과를 입력해 주세요.');
      const hasMinutes = Boolean(String(item.minutes_text || '').trim()) || (item.documents || []).some((row) => ['MINUTES','SIGNED_MINUTES'].includes(row.document_type));
      if (!hasMinutes) return alert('회의록 본문 또는 회의록 문서가 필요합니다.');
      if (!confirm('회의를 확정하면 더 이상 수정할 수 없습니다. 확정하시겠습니까?')) return;
      item.status = 'FINALIZED'; item.finalized_at = new Date().toISOString(); refresh(); notice('회의를 확정했습니다.');
    };

    const addAttendee = document.querySelector('#p12-add-attendee');
    if (addAttendee) addAttendee.onclick = async () => {
      const members = roster();
      const examples = members.slice(0,5).map((row) => `${row.id}: ${row.name}`).join('\n');
      const raw = await window.SamterUI.prompt(`조합원 ID를 입력하거나 비워두고 외부 참석자를 기록하세요.\n${examples}`, '');
      let membershipId = raw ? Number(raw) : null;
      const memberRow = members.find((row) => Number(row.id) === membershipId);
      const name = memberRow?.name || await window.SamterUI.prompt('참석자 이름'); if (!name) return;
      const role = await window.SamterUI.prompt('역할: MEMBER / CHAIR / DIRECTOR / AUDITOR / OTHER', item.meeting_type === 'BOARD' ? 'DIRECTOR' : 'MEMBER') || 'MEMBER';
      const isPresent = confirm('출석자로 기록하시겠습니까?');
      const signer = confirm('회의록 서명자로 기록하시겠습니까?');
      item.attendees.push({id:state.nextAttendance++, membership_id:memberRow?.id || null, name_snapshot:name, attendance_role:role, is_present:isPresent, is_minutes_signer:signer, note:''});
      refresh(); notice('참석자를 추가했습니다.');
    };
    document.querySelectorAll('[data-p12-del-attendee]').forEach((button) => button.onclick = async () => {
      item.attendees = item.attendees.filter((row) => Number(row.id) !== Number(button.dataset.p12DelAttendee)); refresh(); notice('참석자를 삭제했습니다.');
    });

    const addAgenda = document.querySelector('#p12-add-agenda');
    if (addAgenda) addAgenda.onclick = async () => {
      const seq = Math.max(0, ...(item.agenda || []).map((row) => Number(row.sequence_no || 0))) + 1;
      const title = await window.SamterUI.prompt('안건명'); if (!title) return;
      const description = await window.SamterUI.prompt('안건 설명', '') || '';
      const rule = await window.SamterUI.prompt('의결 규칙: NORMAL / SPECIAL / CUSTOM', 'NORMAL') || 'NORMAL';
      item.agenda.push({id:state.nextAgenda++, sequence_no:seq, title, description, resolution_rule:rule, yes_count:0, no_count:0, abstain_count:0, result:null, resolution_memo:''});
      refresh(); notice('안건을 추가했습니다.');
    };
    document.querySelectorAll('[data-p12-edit-agenda]').forEach((button) => button.onclick = async () => {
      const row = byId(item.agenda, button.dataset.p12EditAgenda); if (!row) return;
      if (item.status === 'DRAFT') return alert('의결결과는 개최 처리 후 입력할 수 있습니다.');
      const yes = Number(await window.SamterUI.prompt('찬성 수', String(row.yes_count || 0)) ?? row.yes_count); const no = Number(await window.SamterUI.prompt('반대 수', String(row.no_count || 0)) ?? row.no_count); const abstain = Number(await window.SamterUI.prompt('기권 수', String(row.abstain_count || 0)) ?? row.abstain_count);
      const totalVotes = yes + no + abstain;
      if (row.resolution_rule !== 'CUSTOM' && totalVotes > presentCount(item)) return alert('투표수 합계가 출석자 수를 초과할 수 없습니다.');
      const result = await window.SamterUI.prompt('결과: APPROVED / REJECTED / DEFERRED', row.result || 'APPROVED'); if (!result) return;
      const memo = await window.SamterUI.prompt('의결 메모', row.resolution_memo || '') || '';
      if (row.resolution_rule === 'CUSTOM' && totalVotes > presentCount(item) && !memo.trim()) return alert('CUSTOM 규칙으로 출석자 수를 초과하는 경우 메모가 필요합니다.');
      row.yes_count = yes; row.no_count = no; row.abstain_count = abstain; row.result = result; row.resolution_memo = memo; refresh(); notice('의결결과를 저장했습니다.');
    });
    document.querySelectorAll('[data-p12-del-agenda]').forEach((button) => button.onclick = async () => {
      item.agenda = item.agenda.filter((row) => Number(row.id) !== Number(button.dataset.p12DelAgenda)); refresh(); notice('안건을 삭제했습니다.');
    });

    const saveMinutes = document.querySelector('#p12-save-minutes');
    if (saveMinutes) saveMinutes.onclick = async () => { item.minutes_text = document.querySelector('#p12-minutes').value; refresh(); notice('회의록을 저장했습니다.'); };

    const addDocument = document.querySelector('#p12-add-document');
    if (addDocument) addDocument.onclick = async () => {
      const type = await window.SamterUI.prompt('문서 유형: NOTICE / MINUTES / SIGNED_MINUTES / ATTACHMENT', 'MINUTES'); if (!type) return;
      const filename = await window.SamterUI.prompt('파일명을 입력하세요. (공개 데모는 실제 파일 대신 메타데이터만 저장)', type === 'NOTICE' ? '소집통지.pdf' : '회의록.pdf'); if (!filename) return;
      item.documents.push({id:state.nextDocument++, document_type:type, original_filename:filename, content_type:filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', file_size:120000, created_at:new Date().toISOString()});
      refresh(); notice('공개 데모 문서를 등록했습니다.');
    };
    document.querySelectorAll('[data-p12-del-document]').forEach((button) => button.onclick = async () => {
      item.documents = item.documents.filter((row) => Number(row.id) !== Number(button.dataset.p12DelDocument)); refresh(); notice('문서를 삭제했습니다.');
    });
  }

  function install() {
    if (session()?.role !== 'ADMIN') return;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.querySelector('[data-phase12-demo]')) return;
    const button = document.createElement('button');
    button.className = 'side-link';
    button.dataset.phase12Demo = '1';
    button.textContent = '총회·이사회';
    button.onclick = async () => {
      sidebar.querySelectorAll('.side-link').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderList(CURRENT_YEAR);
    };
    sidebar.appendChild(button);
  }

  window.SAMTER_PHASE12_DEMO = {
    summary,
    renderList,
    renderDetail,
    reset() { state = seed(); save(state); renderList(CURRENT_YEAR); },
  };

  new MutationObserver(install).observe(document.documentElement, {childList:true, subtree:true});
  install();
})();
