(() => {
  const KEY='samter_demo_phase10_config';
  const SESSION='samter_public_demo_session';
  const PROJECTS=[
    {name:'충북 지역생활환경 개선사업',agency:'충청북도',budget:20000000,type:'LOCAL_COMMUNITY',serviceTotal:30,servicePublic:30},
    {name:'청주시 공공시설 현황조사 위탁',agency:'청주시청',budget:45000000,type:'PUBLIC_DELEGATED',serviceTotal:50,servicePublic:50},
    {name:'일반 시설관리 사업',agency:'민간 발주',budget:35000000,type:'GENERAL',serviceTotal:20,servicePublic:0},
  ];
  const TYPES={GENERAL:'일반사업',LOCAL_COMMUNITY:'지역사회 공헌형',VULNERABLE_SERVICE:'취약계층 사회서비스형',VULNERABLE_EMPLOYMENT:'취약계층 일자리형',PUBLIC_DELEGATED:'국가·지자체 위탁사업형',OTHER_PUBLIC_INTEREST:'기타 공익증진형'};
  const METHODS={DELEGATED_BUDGET:'국가·지자체 위탁사업비 비율',BUSINESS_COST:'지역·기타공익 사업비 비율',SERVICE_SUPPLY:'서비스 공급 비율',VULNERABLE_PAYROLL:'취약계층 인건비 비율',VULNERABLE_EMPLOYEE_COUNT:'취약계층 직원 비율'};
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{year:2026,method:'DELEGATED_BUDGET',target:40,totalPayroll:100000000,vulnerablePayroll:45000000,totalEmployees:10,vulnerableEmployees:4}}catch(_){return {year:2026,method:'DELEGATED_BUDGET',target:40}}};
  const save=(v)=>localStorage.setItem(KEY,JSON.stringify(v));
  const session=()=>{try{return JSON.parse(localStorage.getItem(SESSION)||'null')}catch(_){return null}};
  const money=(v)=>Number(v||0).toLocaleString('ko-KR');
  function calc(c){
    let n=0,d=0;
    if(c.method==='DELEGATED_BUDGET'){d=PROJECTS.reduce((s,p)=>s+p.budget,0);n=PROJECTS.filter(p=>p.type==='PUBLIC_DELEGATED').reduce((s,p)=>s+p.budget,0)}
    else if(c.method==='BUSINESS_COST'){d=PROJECTS.reduce((s,p)=>s+p.budget,0);n=PROJECTS.filter(p=>['LOCAL_COMMUNITY','OTHER_PUBLIC_INTEREST'].includes(p.type)).reduce((s,p)=>s+p.budget,0)}
    else if(c.method==='SERVICE_SUPPLY'){d=PROJECTS.reduce((s,p)=>s+p.serviceTotal,0);n=PROJECTS.filter(p=>['LOCAL_COMMUNITY','VULNERABLE_SERVICE','OTHER_PUBLIC_INTEREST'].includes(p.type)).reduce((s,p)=>s+p.servicePublic,0)}
    else if(c.method==='VULNERABLE_PAYROLL'){n=Number(c.vulnerablePayroll||0);d=Number(c.totalPayroll||0)}
    else {n=Number(c.vulnerableEmployees||0);d=Number(c.totalEmployees||0)}
    return {n,d,ratio:d?Math.round(n/d*1000)/10:0};
  }
  function render(){
    const content=document.querySelector('.content');if(!content)return;const c=load(),r=calc(c),ok=r.d>0&&r.ratio>=Number(c.target||40);
    content.innerHTML=`<div class="page-heading"><div><span class="eyebrow">SOCIAL COOPERATIVE · PUBLIC DEMO</span><h1>공익사업 40%</h1></div><div class="today">${c.year} 회계연도</div></div>
      <section class="panel"><form id="phase10-demo-config" class="phase10-demo-config"><label>판단방법<select name="method">${Object.entries(METHODS).map(([v,l])=>`<option value="${v}" ${c.method===v?'selected':''}>${l}</option>`).join('')}</select></label><label>법정 기준(%)<input name="target" type="number" value="${c.target||40}"></label><label>전체 인건비<input name="totalPayroll" type="number" value="${c.totalPayroll||0}"></label><label>취약계층 인건비<input name="vulnerablePayroll" type="number" value="${c.vulnerablePayroll||0}"></label><label>전체 직원수<input name="totalEmployees" type="number" value="${c.totalEmployees||0}"></label><label>취약계층 직원수<input name="vulnerableEmployees" type="number" value="${c.vulnerableEmployees||0}"></label><button class="btn btn-primary" type="submit">계산 기준 저장</button></form></section>
      <div class="phase10-demo-summary"><section class="panel phase10-demo-ratio"><span>현재 비율</span><strong>${r.ratio.toFixed(1)}%</strong><div class="phase10-demo-meter"><span style="width:${Math.min(r.ratio,100)}%"></span><i style="left:${c.target||40}%"></i></div><small>법정 기준 ${c.target||40}%</small></section><section class="panel"><span>상태</span><strong class="${ok?'phase10-demo-ok':'phase10-demo-risk'}">${ok?'충족':'미충족'}</strong></section><section class="panel"><span>주사업 산정값</span><strong>${money(r.n)}</strong></section><section class="panel"><span>전체 산정값</span><strong>${money(r.d)}</strong></section></div>
      <section class="panel table-panel"><div class="section-head"><div><h2>충북 사업별 분류</h2></div></div><div class="table-wrap"><table><thead><tr><th>사업</th><th>기관</th><th>유형</th><th>사업비</th><th>서비스 공익/전체</th></tr></thead><tbody>${PROJECTS.map(p=>`<tr><td><strong>${p.name}</strong></td><td>${p.agency}</td><td>${TYPES[p.type]}</td><td>${money(p.budget)}원</td><td>${p.servicePublic}/${p.serviceTotal}</td></tr>`).join('')}</tbody></table></div></section>`;
    document.querySelector('#phase10-demo-config').onsubmit=(e)=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));save({year:c.year,method:f.method,target:Number(f.target),totalPayroll:Number(f.totalPayroll),vulnerablePayroll:Number(f.vulnerablePayroll),totalEmployees:Number(f.totalEmployees),vulnerableEmployees:Number(f.vulnerableEmployees)});render()};
  }
  function install(){if(session()?.role!=='ADMIN')return;const sidebar=document.querySelector('.sidebar');if(!sidebar||sidebar.querySelector('[data-phase10-demo]'))return;const b=document.createElement('button');b.className='side-link';b.dataset.phase10Demo='1';b.textContent='공익사업 40%';b.onclick=()=>{sidebar.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active'));b.classList.add('active');render()};sidebar.appendChild(b)}
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});install();
})();
