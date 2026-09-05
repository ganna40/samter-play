(() => {
  'use strict';

  const KEY = 'samter_demo_disclosure_v1';
  const SESSION_KEY = 'samter_public_demo_session';
  const FINANCE_KEY = 'samter_demo_financial_v1';
  const COMPLIANCE_KEY = 'samter_demo_phase10_config';
  const YEAR = 2026;
  const STATUSES = ['DRAFT', 'READY', 'FINALIZED', 'SUBMITTED'];
  const IMMUTABLE = new Set(['FINALIZED', 'SUBMITTED']);
  const DOC_LABELS = {
    ARTICLES: '정관',
    BYLAWS: '규약',
    REGULATION: '규정',
    SETTLEMENT_REPORT: '사업결산 보고서',
    BUSINESS_RESULT_REPORT: '사업결과 보고서 최종본',
    ACTIVITY_REPORT: '총회·이사회 활동상황 최종본',
    SUPPORTING_DOCUMENT: '기타 제출자료',
  };
  const SNAPSHOT_LABELS = {
    GOVERNANCE: '총회·이사회',
    PUBLIC_INTEREST: '공익 주사업 40%',
    FINANCIAL: '운영거래 참고요약',
    PROJECT_RESULTS: '사업결과',
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return clone(fallback); }
  };
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const session = () => load(SESSION_KEY, null);
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const won = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;
  const fmt = (value) => Number(value || 0).toLocaleString('ko-KR');

  function addMonths(dateText, months) {
    const [y, m, d] = String(dateText).split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function seed() {
    return {
      nextDocumentId: 4,
      packages: {
        2026: {
          fiscal_year: 2026,
          status: 'DRAFT',
          closing_date: '2026-12-31',
          submission_deadline: '2027-04-30',
          organization_profile: {
            cooperative_name: '삼터 사회적협동조합',
            industry_name: '공공업무 지원',
            purpose: '지역 공익사업 수행과 조합원 일자리 창출',
          },
          business_result_narrative: '2026년 공공사업의 현장 수행, 검수, 정산 결과를 바탕으로 연간 사업성과를 정리합니다.',
          no_separate_rules_declared: true,
          documents: [
            { id: 1, kind: 'ARTICLES', original_filename: '2026_정관_확정본.pdf', content_type: 'application/pdf', file_size: 284120 },
            { id: 2, kind: 'SETTLEMENT_REPORT', original_filename: '2026_사업결산보고서_확정본.pdf', content_type: 'application/pdf', file_size: 391440 },
            { id: 3, kind: 'SUPPORTING_DOCUMENT', original_filename: '2026_공시준비_참고자료.pdf', content_type: 'application/pdf', file_size: 144200 },
          ],
          snapshots: [],
          finalized_at: null,
          submitted_at: null,
          external_submission_date: null,
          submission_reference: null,
          submission_note: null,
        },
      },
    };
  }

  let state = load(KEY, seed());
  if (!state?.packages) state = seed();

  function packageFor(year) {
    return state.packages[String(year)] || state.packages[year] || null;
  }

  function financeState() {
    return load(FINANCE_KEY, { closed: {}, rows: [] });
  }

  function p13Closed(year) {
    const f = financeState();
    return Boolean(f.closed?.[year] || f.closed?.[String(year)]);
  }

  function complianceSnapshot(year) {
    const c = load(COMPLIANCE_KEY, {
      year,
      method: 'DELEGATED_BUDGET',
      target: 40,
      totalPayroll: 100000000,
      vulnerablePayroll: 45000000,
      totalEmployees: 10,
      vulnerableEmployees: 4,
    });
    const projects = [
      { budget: 20000000, type: 'LOCAL_COMMUNITY', serviceTotal: 30, servicePublic: 30 },
      { budget: 45000000, type: 'PUBLIC_DELEGATED', serviceTotal: 50, servicePublic: 50 },
      { budget: 35000000, type: 'GENERAL', serviceTotal: 20, servicePublic: 0 },
    ];
    let numerator = 0;
    let denominator = 0;
    if (c.method === 'DELEGATED_BUDGET') {
      denominator = projects.reduce((sum, p) => sum + p.budget, 0);
      numerator = projects.filter((p) => p.type === 'PUBLIC_DELEGATED').reduce((sum, p) => sum + p.budget, 0);
    } else if (c.method === 'BUSINESS_COST') {
      denominator = projects.reduce((sum, p) => sum + p.budget, 0);
      numerator = projects.filter((p) => ['LOCAL_COMMUNITY', 'OTHER_PUBLIC_INTEREST'].includes(p.type)).reduce((sum, p) => sum + p.budget, 0);
    } else if (c.method === 'SERVICE_SUPPLY') {
      denominator = projects.reduce((sum, p) => sum + p.serviceTotal, 0);
      numerator = projects.filter((p) => ['LOCAL_COMMUNITY', 'VULNERABLE_SERVICE', 'OTHER_PUBLIC_INTEREST'].includes(p.type)).reduce((sum, p) => sum + p.servicePublic, 0);
    } else if (c.method === 'VULNERABLE_PAYROLL') {
      numerator = Number(c.vulnerablePayroll || 0);
      denominator = Number(c.totalPayroll || 0);
    } else {
      numerator = Number(c.vulnerableEmployees || 0);
      denominator = Number(c.totalEmployees || 0);
    }
    const ratio = denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
    return {
      configured: true,
      method: c.method,
      target_percent: Number(c.target || 40),
      numerator,
      denominator,
      ratio_percent: ratio,
      is_compliant: denominator > 0 && ratio >= Number(c.target || 40),
    };
  }

  function governanceSnapshot(year) {
    const data = window.SAMTER_PHASE12_DEMO?.summary?.(year) || {};
    return {
      general_assembly_count: Number(data.general_assembly_count || 0),
      board_meeting_count: Number(data.board_meeting_count || 0),
      finalized_meeting_count: Number(data.finalized_meeting_count || 0),
      cancelled_meeting_count: Number(data.cancelled_meeting_count || 0),
      total_agenda_count: Number(data.total_agenda_count || 0),
      approved_agenda_count: Number(data.approved_agenda_count || 0),
      notice_period_warning_count: Number(data.notice_period_warning_count || 0),
    };
  }

  function financialSnapshot(year) {
    const summary = window.SAMTER_PHASE13_DEMO?.summarize?.(year) || { in: 0, out: 0, diff: 0, n: 0, worker: 0, contrib: 0, refund: 0, income: 0, expense: 0, ops: 0 };
    return {
      fiscal_year_status: p13Closed(year) ? 'CLOSED' : 'OPEN',
      total_inflow: Number(summary.in || 0),
      total_outflow: Number(summary.out || 0),
      transaction_difference: Number(summary.diff || 0),
      contribution_inflow: Number(summary.contrib || 0),
      contribution_refunds: Number(summary.refund || 0),
      worker_payments: Number(summary.worker || 0),
      project_income: Number(summary.income || 0),
      project_expense: Number(summary.expense || 0),
      operating_expense: Number(summary.ops || 0),
      transaction_count: Number(summary.n || 0),
    };
  }

  function projectResultsSnapshot(year) {
    const financial = financialSnapshot(year);
    return {
      project_count: 3,
      task_count: 25,
      approved_assignment_count: 18,
      worker_payment_total: financial.worker_payments || 450000,
      project_inflow: financial.project_income || 7400000,
      project_outflow: financial.project_expense || 350000,
      projects: [
        { name: '2026 농촌 환경개선 사업', agency: 'OO시청', task_count: 12, approved_assignment_count: 8 },
        { name: '도심 환경정비 사업', agency: 'OO구청', task_count: 8, approved_assignment_count: 6 },
        { name: '시설 현황 조사 사업', agency: 'OO공단', task_count: 5, approved_assignment_count: 4 },
      ],
    };
  }

  function collectSnapshots(year) {
    return [
      { snapshot_type: 'GOVERNANCE', payload: governanceSnapshot(year), captured_at: new Date().toISOString() },
      { snapshot_type: 'PUBLIC_INTEREST', payload: complianceSnapshot(year), captured_at: new Date().toISOString() },
      { snapshot_type: 'FINANCIAL', payload: financialSnapshot(year), captured_at: new Date().toISOString() },
      { snapshot_type: 'PROJECT_RESULTS', payload: projectResultsSnapshot(year), captured_at: new Date().toISOString() },
    ];
  }

  function refreshSnapshots(pkg) {
    if (IMMUTABLE.has(pkg.status)) return false;
    pkg.snapshots = collectSnapshots(pkg.fiscal_year);
    save();
    return true;
  }

  function snap(pkg, type) {
    return (pkg.snapshots || []).find((row) => row.snapshot_type === type)?.payload || {};
  }

  function checklist(pkg) {
    const docs = pkg.documents || [];
    const snapshotTypes = new Set((pkg.snapshots || []).map((row) => row.snapshot_type));
    const hardItems = [
      ['closing_date', '결산일 입력', Boolean(pkg.closing_date)],
      ['organization_name', '조합명 입력', Boolean(pkg.organization_profile?.cooperative_name)],
      ['articles', '정관 확정본', docs.some((d) => d.kind === 'ARTICLES')],
      ['rules', '규약·규정 또는 별도 없음 확인', pkg.no_separate_rules_declared || docs.some((d) => ['BYLAWS', 'REGULATION'].includes(d.kind))],
      ['settlement_report', '사업결산 보고서 PDF', docs.some((d) => d.kind === 'SETTLEMENT_REPORT' && d.content_type === 'application/pdf')],
      ['financial_closed', 'P13 회계연도 마감', p13Closed(pkg.fiscal_year)],
      ['governance_snapshot', '총회·이사회 Snapshot', snapshotTypes.has('GOVERNANCE')],
      ['public_interest_snapshot', '공익 주사업 Snapshot', snapshotTypes.has('PUBLIC_INTEREST')],
      ['financial_snapshot', '운영거래 참고요약 Snapshot', snapshotTypes.has('FINANCIAL')],
      ['project_results_snapshot', '사업결과 Snapshot', snapshotTypes.has('PROJECT_RESULTS')],
      ['business_result_narrative', '사업결과 관리자 설명', Boolean(String(pkg.business_result_narrative || '').trim())],
    ].map(([key, label, complete]) => ({ key, label, complete }));

    const warnings = [];
    const gov = snap(pkg, 'GOVERNANCE');
    const pi = snap(pkg, 'PUBLIC_INTEREST');
    const fin = snap(pkg, 'FINANCIAL');
    const project = snap(pkg, 'PROJECT_RESULTS');
    if (!gov.general_assembly_count) warnings.push({ key: 'general_assembly_missing', message: '해당 연도 총회 기록이 없습니다. 운영자료를 확인하세요.' });
    if (!gov.board_meeting_count) warnings.push({ key: 'board_missing', message: '해당 연도 이사회 기록이 없습니다. 운영자료를 확인하세요.' });
    if (gov.notice_period_warning_count) warnings.push({ key: 'governance_notice_warning', message: `총회 소집통지 확인 필요 ${gov.notice_period_warning_count}건` });
    if (!pi.configured || !pi.denominator) warnings.push({ key: 'public_interest_unconfigured', message: '공익 주사업 계산 기준을 확인하세요.' });
    else if (Number(pi.ratio_percent || 0) < Number(pi.target_percent || 40)) warnings.push({ key: 'public_interest_under_target', message: `공익 주사업 비율 ${pi.ratio_percent}%로 목표 ${pi.target_percent}% 미만입니다.` });
    if (Number(fin.transaction_difference || 0) < 0) warnings.push({ key: 'negative_transaction_difference', message: '운영거래 차액이 음수입니다. 거래 내역을 확인하세요.' });
    if (!project.project_count) warnings.push({ key: 'projects_missing', message: '연도에 연결된 사업이 없습니다.' });
    if (!docs.some((d) => d.kind === 'BUSINESS_RESULT_REPORT')) warnings.push({ key: 'business_result_report_missing', message: '사업결과 보고서 최종본은 선택 첨부입니다.' });
    if (!docs.some((d) => d.kind === 'ACTIVITY_REPORT')) warnings.push({ key: 'activity_report_missing', message: '총회·이사회 활동상황 최종본은 선택 첨부입니다.' });
    return { hard_items: hardItems, warnings, ready: hardItems.every((item) => item.complete) };
  }

  function notice(message, type = 'success') {
    const el = document.querySelector('#notice');
    if (!el) return;
    el.textContent = message;
    el.className = `notice notice-${type}`;
    el.hidden = false;
    window.setTimeout(() => { el.hidden = true; }, 2600);
  }

  function renderChecklist(data) {
    const checks = data.hard_items.map((item) => `<div class="phase14-check ${item.complete ? 'complete' : 'missing'}"><span class="phase14-check-icon">${item.complete ? '✓' : '!'}</span><span>${esc(item.label)}</span><strong>${item.complete ? '완료' : '필요'}</strong></div>`).join('');
    const warnings = data.warnings.map((item) => `<div class="phase14-warning"><strong>확인 필요</strong><span>${esc(item.message)}</span></div>`).join('');
    return `<section class="panel phase14-checklist"><div class="section-head"><div><span class="eyebrow">READINESS</span><h2>준비 체크리스트</h2></div><span class="count-chip">${data.hard_items.filter((x) => x.complete).length}/${data.hard_items.length}</span></div><div class="phase14-check-grid">${checks}</div>${warnings ? `<div class="phase14-warnings"><h3>확인 필요</h3>${warnings}</div>` : ''}</section>`;
  }

  function renderDocuments(pkg, readOnly) {
    const rows = (pkg.documents || []).map((d) => `<tr><td><strong>${esc(DOC_LABELS[d.kind] || d.kind)}</strong></td><td>${esc(d.original_filename)}</td><td>${fmt(d.file_size)} bytes</td><td><button class="btn btn-small btn-secondary" data-p14-doc-info="${d.id}">보기</button>${readOnly ? '' : ` <button class="btn btn-small btn-secondary" data-p14-delete-document="${d.id}">삭제</button>`}</td></tr>`).join('');
    return `<section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">YEAR-SPECIFIC DOCUMENTS</span><h2>공시연도 확정 문서</h2></div></div><p class="phase14-help">정관과 사업결산 보고서 확정본을 연도별로 보존합니다. 공개 데모는 실제 파일 대신 파일 메타데이터만 저장합니다.</p>${readOnly ? '' : `<form id="phase14-document-form" class="phase14-document-form"><select name="kind"><option value="ARTICLES">정관</option><option value="BYLAWS">규약</option><option value="REGULATION">규정</option><option value="SETTLEMENT_REPORT">사업결산 보고서 PDF</option><option value="BUSINESS_RESULT_REPORT">사업결과 보고서 최종본</option><option value="ACTIVITY_REPORT">총회·이사회 활동상황 최종본</option><option value="SUPPORTING_DOCUMENT">기타 제출자료</option></select><input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required><button class="btn btn-small btn-primary">문서 추가</button></form>`}<div class="table-wrap"><table><thead><tr><th>종류</th><th>파일</th><th>크기</th><th>관리</th></tr></thead><tbody>${rows || '<tr><td colspan="4">등록된 문서가 없습니다.</td></tr>'}</tbody></table></div></section>`;
  }

  function renderSourceSummaries(pkg) {
    const g = snap(pkg, 'GOVERNANCE');
    const p = snap(pkg, 'PUBLIC_INTEREST');
    const f = snap(pkg, 'FINANCIAL');
    const r = snap(pkg, 'PROJECT_RESULTS');
    return `<section class="panel"><div class="section-head"><div><span class="eyebrow">FROZEN SOURCE SNAPSHOTS</span><h2>자동 집계 자료</h2></div></div><div class="phase14-source-grid"><article class="phase14-source-card"><span>${SNAPSHOT_LABELS.GOVERNANCE}</span><strong>총회 ${fmt(g.general_assembly_count)}회 · 이사회 ${fmt(g.board_meeting_count)}회</strong><small>확정회의 ${fmt(g.finalized_meeting_count)}회 · 안건 ${fmt(g.total_agenda_count)}건</small></article><article class="phase14-source-card"><span>${SNAPSHOT_LABELS.PUBLIC_INTEREST}</span><strong>${Number(p.ratio_percent || 0).toFixed(1)}%</strong><small>목표 ${fmt(p.target_percent || 40)}% · ${p.is_compliant ? '충족' : '확인 필요'}</small></article><article class="phase14-source-card"><span>${SNAPSHOT_LABELS.FINANCIAL}</span><strong>${won(f.transaction_difference)}</strong><small>입금 ${won(f.total_inflow)} · 출금 ${won(f.total_outflow)} · ${esc(f.fiscal_year_status || '-')}</small></article><article class="phase14-source-card"><span>${SNAPSHOT_LABELS.PROJECT_RESULTS}</span><strong>사업 ${fmt(r.project_count)}건 · 업무 ${fmt(r.task_count)}건</strong><small>승인 수행 ${fmt(r.approved_assignment_count)}건 · 수행자 지급 ${won(r.worker_payment_total)}</small></article></div></section>`;
  }

  function render(year = YEAR) {
    const content = document.querySelector('.content');
    if (!content) return;
    const pkg = packageFor(year);
    if (!pkg) {
      content.innerHTML = `<div class="page-heading"><div><span class="eyebrow">DISCLOSURE & ANNUAL REPORT · PUBLIC DEMO</span><h1>경영공시</h1></div><label>회계연도 <input id="phase14-year" type="number" value="${year}"></label></div><section class="panel phase14-empty"><h2>${year}년 공시 패키지가 없습니다.</h2><p>연도별 문서와 P10/P12/P13 운영데이터 Snapshot을 묶어 제출 준비 패키지를 만듭니다.</p><button class="btn btn-primary" data-p14-create>공시 패키지 만들기</button></section>`;
      document.querySelector('#phase14-year').onchange = (e) => render(Number(e.target.value || YEAR));
      document.querySelector('[data-p14-create]').onclick = async () => createPackage(year);
      return;
    }

    if (!(pkg.snapshots || []).length && !IMMUTABLE.has(pkg.status)) refreshSnapshots(pkg);
    const checks = checklist(pkg);
    const readOnly = IMMUTABLE.has(pkg.status);
    const activeIndex = STATUSES.indexOf(pkg.status);
    const profile = pkg.organization_profile || {};
    const controls = [];
    if (!readOnly) {
      controls.push('<button class="btn btn-secondary" data-p14-refresh>Snapshot 새로고침</button>');
      controls.push('<button class="btn btn-secondary" data-p14-prepare>준비상태 확인</button>');
      if (pkg.status === 'READY') controls.push('<button class="btn btn-primary" data-p14-finalize>공시 패키지 확정</button>');
    }
    if (pkg.status === 'FINALIZED') controls.push('<button class="btn btn-primary" data-p14-submit>외부 제출 기록</button>');
    if (readOnly) {
      controls.push('<button class="btn btn-secondary" data-p14-pdf>요약 PDF</button>');
      controls.push('<button class="btn btn-secondary" data-p14-zip>제출 패키지 ZIP</button>');
    }

    content.innerHTML = `<div class="page-heading phase14-heading"><div><span class="eyebrow">DISCLOSURE & ANNUAL REPORT · PUBLIC DEMO</span><h1>경영공시</h1><div class="phase14-status-row"><span class="phase14-status phase14-${pkg.status.toLowerCase()}">${pkg.status}</span></div></div><div class="phase14-head-actions"><label>회계연도<input id="phase14-year" type="number" value="${year}"></label>${controls.join('')}</div></div><div class="phase14-demo-note">공개 데모는 브라우저 localStorage에서 동작합니다. 실제 정부 사이트 제출은 하지 않으며, 실제 PDF/ZIP 생성과 원본 파일 보관은 FastAPI/PostgreSQL 버전에서 수행합니다.</div><div class="phase14-progress">${STATUSES.map((s, i) => `<span class="${i <= activeIndex ? 'active' : ''}">${s}</span>`).join('')}</div>${readOnly ? '<div class="phase14-readonly"><strong>확정된 공시 패키지 · 읽기 전용</strong><span>FINALIZED / SUBMITTED 상태에서는 연도별 문서와 Snapshot을 변경하지 않습니다.</span></div>' : ''}<div class="phase14-summary"><section class="panel"><span>결산일</span><strong>${esc(pkg.closing_date)}</strong></section><section class="panel"><span>운영 참고 제출기한</span><strong>${esc(pkg.submission_deadline)}</strong><small>결산일 + 4개월</small></section><section class="panel"><span>필수자료</span><strong>${checks.hard_items.filter((x) => x.complete).length}/${checks.hard_items.length}</strong><small>${checks.ready ? '준비 완료' : '보완 필요'}</small></section><section class="panel"><span>확인 필요</span><strong>${checks.warnings.length}건</strong><small>법적 유효성 판정 아님</small></section></div>${pkg.status === 'SUBMITTED' ? `<section class="panel phase14-submission"><div><span>외부 제출일</span><strong>${esc(pkg.external_submission_date || '-')}</strong></div><div><span>접수번호</span><strong>${esc(pkg.submission_reference || '-')}</strong></div><div><span>제출 메모</span><strong>${esc(pkg.submission_note || '-')}</strong></div></section>` : ''}${renderChecklist(checks)}${!p13Closed(year) && !readOnly ? '<section class="panel phase14-dependency"><div><strong>P13 회계연도 마감이 필요합니다.</strong><p class="phase14-help">거래·결산 메뉴에서 해당 연도를 마감한 뒤 다시 준비상태를 확인하세요.</p></div><button class="btn btn-small btn-secondary" data-p14-open-finance>P13 거래·결산 열기</button></section>' : ''}<section class="panel phase14-profile"><div class="section-head"><div><span class="eyebrow">ORGANIZATION PROFILE</span><h2>연도별 조직 정보</h2></div>${readOnly ? '' : '<button class="btn btn-small btn-secondary" data-p14-edit-profile>수정</button>'}</div><div class="phase14-profile-grid"><div><span>조합명</span><strong>${esc(profile.cooperative_name || '-')}</strong></div><div><span>목적</span><strong>${esc(profile.purpose || '-')}</strong></div><div><span>별도 규약·규정 없음 확인</span><strong>${pkg.no_separate_rules_declared ? '예' : '아니오'}</strong></div></div></section><section class="panel phase14-narrative"><div class="section-head"><div><span class="eyebrow">BUSINESS RESULT NARRATIVE</span><h2>사업결과 관리자 설명</h2></div>${readOnly ? '' : '<button class="btn btn-small btn-secondary" data-p14-edit-narrative>수정</button>'}</div><p>${esc(pkg.business_result_narrative || '입력되지 않았습니다.')}</p></section>${renderDocuments(pkg, readOnly)}${renderSourceSummaries(pkg)}`;
    bind(pkg, checks);
  }

  function createPackage(year) {
    state.packages[String(year)] = {
      fiscal_year: year,
      status: 'DRAFT',
      closing_date: `${year}-12-31`,
      submission_deadline: addMonths(`${year}-12-31`, 4),
      organization_profile: { cooperative_name: '삼터 사회적협동조합', purpose: '' },
      business_result_narrative: '',
      no_separate_rules_declared: true,
      documents: [],
      snapshots: collectSnapshots(year),
      finalized_at: null,
      submitted_at: null,
      external_submission_date: null,
      submission_reference: null,
      submission_note: null,
    };
    save();
    render(year);
  }

  function bind(pkg) {
    const year = pkg.fiscal_year;
    document.querySelector('#phase14-year').onchange = (e) => render(Number(e.target.value || YEAR));
    document.querySelector('[data-p14-refresh]')?.addEventListener('click', async () => {
      refreshSnapshots(pkg);
      notice('P10·P12·P13·사업결과 Snapshot을 새로고침했습니다.');
      render(year);
    });
    document.querySelector('[data-p14-prepare]')?.addEventListener('click', async () => {
      refreshSnapshots(pkg);
      const result = checklist(pkg);
      if (!result.ready) {
        const missing = result.hard_items.filter((x) => !x.complete).map((x) => x.label).join(', ');
        return notice(`필수자료 보완 필요: ${missing}`, 'error');
      }
      pkg.status = 'READY';
      save();
      notice('제출 준비 완료 상태로 변경했습니다.');
      render(year);
    });
    document.querySelector('[data-p14-finalize]')?.addEventListener('click', async () => {
      if (pkg.status !== 'READY') return;
      refreshSnapshots(pkg);
      if (!checklist(pkg).ready) return notice('필수자료가 다시 누락되어 확정할 수 없습니다.', 'error');
      if (!confirm('공시 패키지를 확정하면 문서와 Snapshot을 더 이상 수정할 수 없습니다. 확정하시겠습니까?')) return;
      pkg.status = 'FINALIZED';
      pkg.finalized_at = new Date().toISOString();
      save();
      notice('공시 패키지를 확정했습니다.');
      render(year);
    });
    document.querySelector('[data-p14-submit]')?.addEventListener('click', async () => {
      if (pkg.status !== 'FINALIZED') return;
      const date = await window.SamterUI.prompt('외부 제출일 (YYYY-MM-DD)', `${year + 1}-03-31`);
      if (!date) return;
      const ref = await window.SamterUI.prompt('접수번호 또는 참조번호', `SAMTER-${year}-001`) || '';
      const memo = await window.SamterUI.prompt('제출 메모', '외부 공시 시스템 제출 완료') || '';
      pkg.status = 'SUBMITTED';
      pkg.external_submission_date = date;
      pkg.submission_reference = ref;
      pkg.submission_note = memo;
      pkg.submitted_at = new Date().toISOString();
      save();
      notice('외부 제출 정보를 기록했습니다.');
      render(year);
    });
    document.querySelector('[data-p14-edit-profile]')?.addEventListener('click', async () => {
      const name = await window.SamterUI.prompt('조합명', pkg.organization_profile?.cooperative_name || '삼터 사회적협동조합');
      if (!name) return;
      const purpose = await window.SamterUI.prompt('조합 목적', pkg.organization_profile?.purpose || '') ?? '';
      pkg.organization_profile = { ...pkg.organization_profile, cooperative_name: name, purpose };
      pkg.no_separate_rules_declared = confirm('별도의 규약/규정이 없는 상태로 기록할까요?\n취소를 누르면 규약/규정 파일이 필요합니다.');
      save();
      render(year);
    });
    document.querySelector('[data-p14-edit-narrative]')?.addEventListener('click', async () => {
      const text = await window.SamterUI.prompt('연간 사업결과 설명', pkg.business_result_narrative || '');
      if (text === null) return;
      pkg.business_result_narrative = text;
      save();
      render(year);
    });
    document.querySelector('#phase14-document-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const kind = String(form.get('kind') || 'SUPPORTING_DOCUMENT');
      const file = form.get('file');
      if (!(file instanceof File) || !file.name) return;
      const lower = file.name.toLowerCase();
      const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'].some((ext) => lower.endsWith(ext));
      if (!allowed) return notice('PDF/JPG/PNG/WebP 파일만 사용할 수 있습니다.', 'error');
      if (kind === 'SETTLEMENT_REPORT' && !lower.endsWith('.pdf')) return notice('사업결산 보고서는 PDF만 등록할 수 있습니다.', 'error');
      pkg.documents.push({ id: state.nextDocumentId++, kind, original_filename: file.name, content_type: lower.endsWith('.pdf') ? 'application/pdf' : (file.type || 'image/jpeg'), file_size: file.size || 120000 });
      save();
      notice('공개 데모 문서 메타데이터를 추가했습니다.');
      render(year);
    });
    document.querySelectorAll('[data-p14-delete-document]').forEach((button) => button.onclick = async () => {
      pkg.documents = pkg.documents.filter((d) => Number(d.id) !== Number(button.dataset.p14DeleteDocument));
      save();
      render(year);
    });
    document.querySelectorAll('[data-p14-doc-info]').forEach((button) => button.onclick = async () => {
      const doc = pkg.documents.find((d) => Number(d.id) === Number(button.dataset.p14DocInfo));
      if (doc) notice(`${DOC_LABELS[doc.kind] || doc.kind}: ${doc.original_filename} · 공개 데모는 실제 파일을 저장하지 않습니다.`);
    });
    document.querySelector('[data-p14-open-finance]')?.addEventListener('click', async () => {
      document.querySelector('[data-phase13-demo]')?.click();
    });
    document.querySelector('[data-p14-pdf]')?.addEventListener('click', async () => {
      notice('요약 PDF 데모: 브라우저 인쇄 화면에서 PDF로 저장할 수 있습니다.');
      window.print();
    });
    document.querySelector('[data-p14-zip]')?.addEventListener('click', async () => {
      const manifest = {
        demo: true,
        fiscal_year: year,
        status: pkg.status,
        files: ['01_summary.pdf', 'documents/정관', 'documents/사업결산_보고서', '08_financial-transactions.csv'],
        note: '공개 데모에서는 ZIP 구조를 JSON manifest로 시뮬레이션합니다.',
      };
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `samter-disclosure-${year}-zip-manifest.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notice('제출 패키지 ZIP 구조 manifest를 다운로드했습니다.');
    });
  }

  function install() {
    if (session()?.role !== 'ADMIN') return;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.querySelector('[data-phase14-demo]')) return;
    const button = document.createElement('button');
    button.className = 'side-link';
    button.dataset.phase14Demo = '1';
    button.textContent = '경영공시';
    button.onclick = async () => {
      sidebar.querySelectorAll('.side-link').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      render(YEAR);
    };
    sidebar.appendChild(button);
  }

  window.SAMTER_PHASE14_DEMO = {
    render,
    checklist(year = YEAR) {
      const pkg = packageFor(year);
      return pkg ? clone(checklist(pkg)) : null;
    },
    reset() {
      state = seed();
      const pkg = packageFor(YEAR);
      pkg.snapshots = collectSnapshots(YEAR);
      save();
      render(YEAR);
    },
  };

  const initial = packageFor(YEAR);
  if (initial && !(initial.snapshots || []).length) initial.snapshots = collectSnapshots(YEAR);
  save();
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
