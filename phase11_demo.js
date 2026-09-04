(() => {
  const ROSTER_KEY = 'samter_demo_membership_roster';
  const SESSION_KEY = 'samter_public_demo_session';
  const LIMIT = 30;
  const WARNING = 25;
  const MIN_ENFORCEMENT_MEMBERS = 4;
  const TERMINAL = new Set(['WITHDRAWN', 'EXPELLED']);
  const load = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } };
  const session = () => load(SESSION_KEY, null);
  const roster = () => load(ROSTER_KEY, []);
  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const typeLabel = {PRODUCER:'생산자조합원',CONSUMER:'소비자조합원',EMPLOYEE:'직원조합원',VOLUNTEER:'자원봉사자조합원',SUPPORTER:'후원자조합원'};

  function includedRows(rows = roster()) {
    return rows.filter((item) => !TERMINAL.has(item.status));
  }

  function ratio(shares, total) {
    return total > 0 ? Math.round((Number(shares || 0) / Number(total)) * 1000) / 10 : 0;
  }

  function band(shares, total) {
    if (total <= 0) return 'SAFE';
    if (Number(shares || 0) * 100 > Number(total) * LIMIT) return 'VIOLATION';
    if (Number(shares || 0) * 100 >= Number(total) * WARNING) return 'WARNING';
    return 'SAFE';
  }

  function snapshot(rows = roster()) {
    const included = includedRows(rows);
    const total = included.reduce((sum, item) => sum + Number(item.share_count || 0), 0);
    const members = included.map((item) => {
      const value = ratio(item.share_count, total);
      const state = band(item.share_count, total);
      return {...item, ratio_percent:value, band:state, is_compliant:state !== 'VIOLATION'};
    }).sort((a,b) => b.ratio_percent - a.ratio_percent || Number(b.share_count || 0) - Number(a.share_count || 0));
    return {
      total_share_count: total,
      included_member_count: included.length,
      enforcement_active: included.length >= MIN_ENFORCEMENT_MEMBERS,
      members,
      warning_count: members.filter((item) => item.band === 'WARNING').length,
      violation_count: members.filter((item) => item.band === 'VIOLATION').length,
      max_holder: members[0] || null,
    };
  }

  function validateSharePlan(id, proposedShareCount) {
    const rows = roster();
    const target = rows.find((item) => Number(item.id) === Number(id));
    if (!target) return {ok:false, message:'조합원을 찾을 수 없습니다.'};
    if (TERMINAL.has(target.status)) return {ok:false, message:'탈퇴·제명 조합원의 출자계획은 변경할 수 없습니다.'};
    const proposed = Number(proposedShareCount);
    if (!Number.isInteger(proposed) || proposed < 1) return {ok:false, message:'출자 좌수는 1좌 이상 정수로 입력해 주세요.'};

    const included = includedRows(rows);
    if (included.length < MIN_ENFORCEMENT_MEMBERS) {
      return {ok:true, bootstrap:true, message:'설립 준비 단계(집계 조합원 4명 미만)에서는 30% 차단을 적용하지 않습니다.'};
    }

    const others = included.filter((item) => Number(item.id) !== Number(id)).reduce((sum, item) => sum + Number(item.share_count || 0), 0);
    const current = Number(target.share_count || 0);
    const currentTotal = others + current;
    const proposedTotal = others + proposed;
    const proposedOver = proposed * 100 > proposedTotal * LIMIT;
    const currentOver = current * 100 > currentTotal * LIMIT;
    const strictlyImproving = proposed * currentTotal < current * proposedTotal;
    const proposedRatio = ratio(proposed, proposedTotal);

    if (proposedOver && !(currentOver && strictlyImproving)) {
      return {ok:false, proposed_ratio:proposedRatio, message:`제안 출자비율 ${proposedRatio.toFixed(1)}%가 1인 출자한도 30%를 초과합니다.`};
    }
    return {ok:true, proposed_ratio:proposedRatio};
  }

  function currentHint(id) {
    const snap = snapshot();
    const item = snap.members.find((row) => Number(row.id) === Number(id));
    if (!item) return '1인 출자한도 30% 기준이 적용됩니다.';
    const bootstrap = snap.enforcement_active ? '' : ' · 설립 준비 단계';
    return `현재 출자비율 ${item.ratio_percent.toFixed(1)}% · 1인 출자한도 30%${bootstrap}`;
  }

  function render() {
    const content = document.querySelector('.content'); if (!content) return;
    const snap = snapshot();
    const max = snap.max_holder;
    const ok = snap.violation_count === 0;
    const rows = snap.members.map((item) => `<tr class="phase11-${item.band.toLowerCase()}"><td><strong>${esc(item.name)}</strong><br><small>${esc(item.membership_number || '-')}</small></td><td>${typeLabel[item.membership_type] || item.membership_type}</td><td>${Number(item.share_count || 0).toLocaleString('ko-KR')}좌</td><td><strong>${item.ratio_percent.toFixed(1)}%</strong></td><td><span class="phase11-badge phase11-${item.band.toLowerCase()}">${item.band === 'SAFE' ? '안전' : item.band === 'WARNING' ? '주의' : '기준 초과'}</span></td></tr>`).join('') || '<tr><td colspan="5">집계할 조합원이 없습니다.</td></tr>';

    content.innerHTML = `<div class="page-heading"><div><span class="eyebrow">CONTRIBUTION SHARE COMPLIANCE · PUBLIC DEMO</span><h1>출자 지분 30%</h1></div><div class="today">1인 출자한도 30%</div></div>
      <div class="phase11-summary">
        <section class="panel"><span>전체 출자좌수</span><strong>${snap.total_share_count.toLocaleString('ko-KR')}좌</strong><small>${snap.included_member_count}명 기준</small></section>
        <section class="panel"><span>최대 출자자</span><strong>${esc(max?.name || '-')}</strong><small>${max ? max.ratio_percent.toFixed(1) + '%' : '-'}</small></section>
        <section class="panel"><span>주의 / 초과</span><strong>${snap.warning_count} / ${snap.violation_count}</strong><small>25%부터 주의</small></section>
        <section class="panel"><span>Compliance</span><strong class="${ok ? 'phase11-ok' : 'phase11-risk'}">${ok ? '기준 충족' : '확인 필요'}</strong><small>${snap.enforcement_active ? '30% 차단 활성' : '설립 준비 단계'}</small></section>
      </div>
      ${snap.enforcement_active ? '' : '<section class="panel phase11-bootstrap"><strong>설립 준비 단계</strong><p>집계 조합원이 4명 미만이면 모든 조합원이 동시에 30% 이하가 될 수 없어 공개 데모에서는 출자 설정 차단을 유예합니다. 비율 계산은 그대로 표시됩니다.</p></section>'}
      <section class="panel table-panel"><div class="section-head"><div><h2>조합원별 출자 비율</h2></div><span class="count-chip">${snap.members.length}명</span></div><p class="phase11-guide">SAFE: 25% 미만 · WARNING: 25~30% · VIOLATION: 30% 초과</p><div class="table-wrap"><table><thead><tr><th>조합원</th><th>유형</th><th>출자좌수</th><th>비율</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function install() {
    if (session()?.role !== 'ADMIN') return;
    const sidebar = document.querySelector('.sidebar'); if (!sidebar || sidebar.querySelector('[data-phase11-demo]')) return;
    const button = document.createElement('button');
    button.className = 'side-link'; button.dataset.phase11Demo = '1'; button.textContent = '출자 지분 30%';
    button.onclick = () => { sidebar.querySelectorAll('.side-link').forEach((x) => x.classList.remove('active')); button.classList.add('active'); render(); };
    sidebar.appendChild(button);
  }

  window.SAMTER_PHASE11_DEMO = {snapshot, validateSharePlan, currentHint, render};
  window.addEventListener('storage', (event) => { if (event.key === ROSTER_KEY && document.querySelector('[data-phase11-demo].active')) render(); });
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  install();
})();
