const APPLICATIONS_KEY = 'samter_demo_membership_applications';

function loadApplications() {
  try { return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]'); } catch (_) { return []; }
}

function saveApplications(rows) {
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(rows));
}

function setResult(message, type = 'success') {
  const box = document.querySelector('#join-result');
  box.hidden = false;
  box.className = `join-result ${type}`;
  box.innerHTML = message;
}

function payloadFromForm(form) {
  const data = new FormData(form);
  return {
    membership_type: data.get('membership_type'),
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim().toLowerCase(),
    demo_password: String(data.get('password') || ''),
    phone: String(data.get('phone') || '').trim() || null,
    address: String(data.get('address') || '').trim() || null,
    region: String(data.get('region') || '').trim() || null,
    motivation: String(data.get('motivation') || '').trim() || null,
    skills: String(data.get('skills') || '').trim() || null,
    available_areas: String(data.get('available_areas') || '').trim() || null,
  };
}

function submitMembership(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = payloadFromForm(form);
  const rows = loadApplications();
  if (rows.some((row) => row.email === payload.email && row.status !== 'REJECTED')) {
    setResult('같은 이메일로 진행 중인 데모 가입신청이 있습니다.', 'error');
    return;
  }
  const item = {
    id: rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 8000) + 1,
    ...payload,
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
    review_note: null,
  };
  rows.unshift(item);
  saveApplications(rows);
  form.reset();
  setResult(`데모 가입신청이 접수되었습니다. <strong>신청번호 #${item.id}</strong><br>관리자 데모 계정으로 로그인해 가입관리에서 승인해보세요.`);
}

document.querySelector('#membership-form')?.addEventListener('submit', submitMembership);
export { payloadFromForm, loadApplications };
