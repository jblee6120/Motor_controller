const state = { data: null, view: 'dashboard', process: '', query: '', kind: '', status: '', selected: '' };
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageName = p => state.data.stages.find(s => s[0] === p)?.[1] || p;
const kindName = k => ({requirement:'요구사항',architecture:'아키텍처',design:'설계',test_case:'시험 명세',test_run:'시험 결과',document:'문서',change:'변경 요청',problem:'문제 보고'})[k] || k;
const stageGuide = {
  'MAN.3':'목표 범위, 마일스톤, 위험과 결정 사항을 기록합니다.',
  'SYS.1':'사용자와 운영자의 필요를 수집하고 합의 상태를 관리합니다.',
  'SYS.2':'시스템 동작과 정량 기준, 검증 방법을 정의합니다.',
  'SYS.3':'시스템 기능을 HW와 SW에 할당하고 인터페이스를 정의합니다.',
  'HWE.1':'전기 정격, 센싱, 보호 요구사항을 정의합니다.',
  'HWE.2':'회로·PCB·BOM·계산 근거와 제작 형상을 관리합니다.',
  'HWE.3':'제작된 보드가 회로 설계대로 구현되었는지 검증합니다.',
  'HWE.4':'하드웨어 요구사항의 측정 조건과 결과를 관리합니다.',
  'SWE.1':'시스템에서 할당된 소프트웨어 기능과 제약을 정의합니다.',
  'SWE.2':'SW 컴포넌트, 인터페이스, 실행 주기를 설계합니다.',
  'SWE.3':'드라이버·FOC·상태기계의 상세 설계와 구현을 연결합니다.',
  'SWE.4':'소프트웨어 단위의 시험 명세와 실행 결과를 기록합니다.',
  'SWE.5':'컴포넌트 간 통합과 인터페이스 검증을 기록합니다.',
  'SWE.6':'소프트웨어 요구사항 충족 여부를 검증합니다.',
  'SYS.4':'HW/SW 통합 순서와 시스템 인터페이스 검증을 기록합니다.',
  'SYS.5':'시스템 요구사항의 시험 명세, 결과, 형상을 연결합니다.',
  'VAL.1':'실제 사용 목적과 환경에 맞는지 확인합니다.',
  'SPL.2':'HW Rev, FW Commit, 설정, 시험 결과를 릴리스 형상으로 묶습니다.',
  'SUP.8':'기준선과 구성 항목의 버전 및 출처를 관리합니다.',
  'SUP.9':'발견한 문제와 재현 조건, 해결 결과를 기록합니다.',
  'SUP.10':'변경 이유와 영향 범위, 재검증 판단을 기록합니다.'
};
const pretty = v => Array.isArray(v) ? v.join('\n') : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '');
function notice(msg) { $('#notice').innerHTML = `<div class="notice">${esc(msg)}</div>`; setTimeout(() => { if ($('#notice')) $('#notice').innerHTML = ''; }, 4500); }
async function api(path, options={}) { const r = await fetch(path, {headers:{'Content-Type':'application/json'}, ...options}); const data = await r.json(); if (!r.ok) throw new Error(data.error || '요청에 실패했습니다.'); return data; }
async function refresh() { state.data = await api('/api/data'); render(); }
function select(view, process='') { state.view=view; state.process=process; state.selected=''; state.query=''; state.kind=''; state.status=''; render(); }
function openItem(id) { state.selected=id; state.view='detail'; render(); }
function renderNav() {
  document.querySelectorAll('#main-nav button').forEach(b => b.classList.toggle('active', b.dataset.view === state.view && !state.process));
  $('#stage-nav').innerHTML = state.data.stages.map(([p,n]) => `<button class="${state.process === p ? 'active' : ''}" data-stage="${esc(p)}"><span class="code">${esc(p)}</span>${esc(n)}</button>`).join('');
  document.querySelectorAll('[data-stage]').forEach(b => b.onclick=()=>select('items',b.dataset.stage));
}
function render() {
  if (!state.data) return;
  renderNav();
  let title = {dashboard:'대시보드',items:state.process ? `${state.process} · ${stageName(state.process)}`:'전체 산출물',trace:'추적성',quality:'품질 점검',detail:'산출물 상세'}[state.view];
  $('#page-title').textContent=title;
  $('#new-button').onclick=()=>showItemForm();
  const content=$('#content');
  if (state.view==='dashboard') content.innerHTML=dashboard();
  if (state.view==='items') content.innerHTML=itemsPage();
  if (state.view==='detail') content.innerHTML=detailPage();
  if (state.view==='trace') content.innerHTML=tracePage();
  if (state.view==='quality') content.innerHTML=qualityPage();
  bindContent();
}
function dashboard() {
  const d=state.data, items=d.items, req=items.filter(x=>x.kind==='requirement');
  const drafts=items.filter(x=>x.status==='Draft'||x.status==='Proposed').length;
  const stageCards=d.stages.map(([p,n])=>{let count=items.filter(x=>x.process===p).length;return `<article class="card process-card" data-process="${p}"><span class="count">${count}개</span><span class="code">${p}</span><h3>${esc(n)}</h3><p>${count ? `등록된 산출물 ${count}개 보기`:'이 단계의 첫 산출물 만들기'} →</p></article>`}).join('');
  return `<div class="card hero"><div><div class="overline">PROJECT OVERVIEW</div><strong>모터제어기 Rev.A 개발 공간</strong><p>요구사항에서 설계, 시험 결과까지 하나의 ID와 관계로 이어서 관리합니다.<br>현재 SYS.1·SYS.2 초안을 기반으로 다음 단계를 채워 나가세요.</p></div><div class="hero-side"><button class="ghost" data-action="quality">미결정 항목 보기</button><button class="primary" data-action="items">요구사항 열기</button></div></div>
  <div class="metric-grid"><div class="card metric"><div class="label">전체 산출물</div><strong>${items.length}</strong><small>모든 프로세스</small></div><div class="card metric"><div class="label">요구사항</div><strong>${req.length}</strong><small>SYS.1 ${req.filter(x=>x.process==='SYS.1').length} · SYS.2 ${req.filter(x=>x.process==='SYS.2').length}</small></div><div class="card metric"><div class="label">추적 링크</div><strong>${d.links.length}</strong><small>항목 간 연결</small></div><div class="card metric"><div class="label">검토 중</div><strong>${drafts}</strong><small>제안·초안 상태</small></div></div>
  <div class="section-heading"><div><h2>ASPICE 프로세스 지도</h2><p>단계를 선택해 산출물을 보고 추가하세요.</p></div></div><div class="process-grid">${stageCards}</div>`;
}
function filteredItems() { let a=state.data.items; if(state.process)a=a.filter(x=>x.process===state.process);if(state.kind)a=a.filter(x=>x.kind===state.kind);if(state.status)a=a.filter(x=>x.status===state.status);if(state.query){const q=state.query.toLowerCase();a=a.filter(x=>[x.id,x.title,x.body,x.category].some(v=>String(v).toLowerCase().includes(q)));}return a; }
function itemsPage() {
  const rows=filteredItems().map(x=>`<tr data-item="${esc(x.id)}"><td class="id">${esc(x.id)}</td><td class="title-cell">${esc(x.title)}</td><td class="subtle">${esc(x.process)}</td><td class="subtle">${kindName(x.kind)}</td><td><span class="pill ${esc(x.status)}">${esc(x.status)}</span></td><td class="subtle">${esc(x.updated_at.slice(0,10))}</td></tr>`).join('');
  return `${state.process?`<div class="card hero" style="margin-bottom:17px"><div><div class="overline">${esc(state.process)} / PROCESS GUIDE</div><strong>${esc(stageName(state.process))}</strong><p>${esc(stageGuide[state.process])}</p></div></div>`:''}<div class="toolbar"><input id="search" class="search" placeholder="ID, 제목, 본문 검색" value="${esc(state.query)}" aria-label="산출물 검색"><select id="kind-filter" aria-label="산출물 종류"><option value="">모든 종류</option>${state.data.types.map(k=>`<option value="${k}" ${state.kind===k?'selected':''}>${kindName(k)}</option>`).join('')}</select><select id="status-filter" aria-label="상태"><option value="">모든 상태</option>${['Proposed','Draft','Reviewed','Approved','Obsolete'].map(s=>`<option ${state.status===s?'selected':''}>${s}</option>`).join('')}</select></div><p class="filter-note">${filteredItems().length}개 산출물 · 항목을 선택하면 상세 정보와 관계를 볼 수 있습니다.</p><div class="card table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>제목</th><th>프로세스</th><th>종류</th><th>상태</th><th>수정일</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="empty">조건에 맞는 산출물이 없습니다. 새 산출물을 추가해 보세요.</td></tr>`}</tbody></table></div>`;
}
function metaDisplay(meta) { return Object.entries(meta||{}).filter(([k,v]) => v!==''&&v!==null&&(!(Array.isArray(v))||v.length)).map(([k,v])=>{const label=({verification:'검증',technical_feasibility:'기술 실현 가능성',open_points:'미결정 항목',rationale:'근거',operating_environment_impact:'운용 환경 영향',stakeholder:'이해관계자',imported_from:'원본 파일',acceptance_of_stakeholder:'이해관계자 수용'})[k]||k;const value=(v&&typeof v==='object'&&!Array.isArray(v))?Object.entries(v).map(([a,b])=>`${({method:'방법',acceptance_criteria:'판정 기준',status:'상태',evidence:'근거'})[a]||a}: ${b}`).join('\n'):pretty(v);return `<div class="metadata"><b>${esc(label)}</b>${esc(value)}</div>`}).join(''); }
function detailPage() {
  const x=state.data.items.find(i=>i.id===state.selected); if(!x)return `<div class="card empty">항목을 찾을 수 없습니다.</div>`;
  const related=state.data.links.filter(l=>l.source===x.id||l.target===x.id);
  const linkRows=related.map(l=>{const other=l.source===x.id?l.target:l.source; const direction=l.source===x.id?'→':'←';return `<div class="link-row"><div><small>${direction} ${esc(l.relation)}</small><br><a href="#" data-item="${esc(other)}">${esc(other)}</a></div><button title="관계 삭제" data-delete-link="${encodeURIComponent(l.source)}/${encodeURIComponent(l.relation)}/${encodeURIComponent(l.target)}">×</button></div>`}).join('');
  const issues=state.data.diagnostics.filter(i=>i.item_id===x.id);
  return `<div class="toolbar"><button class="small-button" data-action="back">← 목록으로</button></div><div class="detail"><article class="card detail-main"><div class="detail-head"><div><span class="id">${esc(x.id)}</span><h2>${esc(x.title)}</h2><span class="pill ${esc(x.status)}">${esc(x.status)}</span></div><div><button class="small-button" data-history="${esc(x.id)}">이력</button> <button class="primary" data-edit="${esc(x.id)}">편집</button></div></div><div class="detail-body">${esc(x.body)}</div><div class="meta-grid"><div><label>프로세스</label><strong>${esc(x.process)} · ${esc(stageName(x.process))}</strong></div><div><label>종류</label><strong>${kindName(x.kind)}</strong></div><div><label>우선순위 / 분류</label><strong>${esc(x.priority)} ${x.category?'· '+esc(x.category):''}</strong></div><div><label>개정 / 최종 수정</label><strong>r${x.revision} · ${esc(x.updated_at.slice(0,16).replace('T',' '))}</strong></div></div>${metaDisplay(x.metadata)}</article><aside class="card detail-side"><div class="section-heading" style="margin:0 0 12px"><h2>연결 관계</h2><button class="small-button" data-link-source="${esc(x.id)}">＋ 연결</button></div>${linkRows||'<p>아직 연결된 항목이 없습니다.</p>'}<div class="section-heading"><h2>점검</h2></div>${issues.map(i=>`<div class="issue-row"><span class="${i.level}">●</span>${esc(i.message)}</div>`).join('')||'<p>현재 항목에 표시할 점검 사항이 없습니다.</p>'}<div class="status-note">ID는 유지됩니다. 사용하지 않는 항목은 상태를 Obsolete로 전환하세요.</div></aside></div>`;
}
function tracePage() {
  const rows=state.data.links.map(l=>`<div class="trace-row"><a class="id" href="#" data-item="${esc(l.source)}">${esc(l.source)}</a><span>${esc(l.relation)} →</span><a class="id" href="#" data-item="${esc(l.target)}">${esc(l.target)}</a></div>`).join('');
  return `<div class="card hero"><div><div class="overline">TRACEABILITY</div><strong>산출물 간 연결</strong><p>요구사항의 출처, 설계 구현, 시험 검증 관계를 양방향으로 탐색합니다.</p></div><button class="primary" data-link-source="">＋ 관계 추가</button></div><div class="section-heading"><h2>전체 링크 ${state.data.links.length}개</h2></div><div class="card trace-list">${rows||'<div class="empty">아직 관계가 없습니다.</div>'}</div>`;
}
function qualityPage() {
  const issues=state.data.diagnostics;
  const errors=issues.filter(x=>x.level==='error').length, warnings=issues.length-errors;
  const rows=issues.map(i=>`<tr data-item="${esc(i.item_id)}"><td class="id">${esc(i.item_id)}</td><td><span class="${i.level}">● ${i.level==='error'?'오류':'검토'}</span></td><td>${esc(i.message)}</td></tr>`).join('');
  return `<div class="card hero"><div><div class="overline">QUALITY CHECK</div><strong>산출물 점검</strong><p>현재 데이터의 미연결·미결정·검증 준비 상태를 보여줍니다.</p></div></div><div class="metric-grid"><div class="card metric"><div class="label">오류</div><strong class="error">${errors}</strong><small>필수 정보 또는 링크</small></div><div class="card metric"><div class="label">검토 필요</div><strong class="warning">${warnings}</strong><small>TBD 및 평가 대기</small></div><div class="card metric"><div class="label">승인됨</div><strong>${state.data.items.filter(x=>x.status==='Approved').length}</strong><small>승인 상태 항목</small></div><div class="card metric"><div class="label">시험 명세</div><strong>${state.data.items.filter(x=>x.kind==='test_case').length}</strong><small>검증 계획 항목</small></div></div><div class="section-heading"><div><h2>점검 목록</h2><p>초기 초안의 TBD는 정상적인 검토 대기 항목입니다.</p></div></div><div class="card table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>등급</th><th>내용</th></tr></thead><tbody>${rows||'<tr><td colspan="3" class="empty">현재 점검 사항이 없습니다.</td></tr>'}</tbody></table></div>`;
}
function bindContent() {
  document.querySelectorAll('[data-process]').forEach(e=>e.onclick=()=>select('items',e.dataset.process));
  document.querySelectorAll('[data-action]').forEach(e=>e.onclick=()=>{if(e.dataset.action==='back')select('items',state.process);else if(e.dataset.action==='quality')select('quality');else select('items','SYS.2')});
  document.querySelectorAll('[data-item]').forEach(e=>e.onclick=ev=>{ev.preventDefault();openItem(e.dataset.item)});
  document.querySelectorAll('[data-edit]').forEach(e=>e.onclick=()=>showItemForm(state.data.items.find(x=>x.id===e.dataset.edit)));
  document.querySelectorAll('[data-history]').forEach(e=>e.onclick=()=>showHistory(e.dataset.history));
  document.querySelectorAll('[data-link-source]').forEach(e=>e.onclick=()=>showLinkForm(e.dataset.linkSource));
  document.querySelectorAll('[data-delete-link]').forEach(e=>e.onclick=async()=>{if(!confirm('이 연결 관계를 삭제할까요?'))return;await api('/api/links/'+e.dataset.deleteLink,{method:'DELETE'});await refresh();notice('연결 관계를 삭제했습니다.')});
  if ($('#search')) $('#search').oninput=e=>{state.query=e.target.value;updateItemRows()};
  if ($('#kind-filter')) $('#kind-filter').onchange=e=>{state.kind=e.target.value;updateItemRows()};
  if ($('#status-filter')) $('#status-filter').onchange=e=>{state.status=e.target.value;updateItemRows()};
}
function updateItemRows(){ const focus=document.activeElement?.id;const pos=focus==='search'?$('#search').selectionStart:null;$('#content').innerHTML=itemsPage();bindContent();if(focus==='search'){const e=$('#search');e.focus();e.setSelectionRange(pos,pos);}}
function modal(html) { $('#modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal">${html}</div></div>`; $('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()};$('.close').onclick=closeModal; }
function closeModal(){ $('#modal-root').innerHTML=''; }
async function showHistory(id) {
  const rows=await api('/api/history/'+encodeURIComponent(id));
  modal(`<div class="modal-head"><h2>변경 이력 · ${esc(id)}</h2><button class="close" aria-label="닫기">×</button></div><div class="form">${rows.map(r=>`<div class="issue-row"><span class="id">r${r.revision}</span><div><strong>${esc(r.snapshot.title)}</strong><br><span class="subtle">${esc(r.changed_at.slice(0,16).replace('T',' '))} · ${esc(r.snapshot.status)}</span><p class="detail-body" style="margin:8px 0">${esc(r.snapshot.body)}</p></div></div>`).join('')||'<p class="subtle">저장된 이전 개정이 없습니다.</p>'}</div>`);
}
function showItemForm(item=null) {
  const create=!item;const p=item?.process||state.process||'SYS.2';const k=item?.kind||'requirement';const meta=item?.metadata||{};
  modal(`<div class="modal-head"><h2>${create?'새 산출물':'산출물 편집 · '+esc(item.id)}</h2><button class="close" aria-label="닫기">×</button></div><form class="form" id="item-form"><div class="form-grid"><div class="field"><label for="process">ASPICE 단계</label><select id="process" name="process" ${create?'':'disabled'}>${state.data.stages.map(([code,name])=>`<option value="${code}" ${code===p?'selected':''}>${code} · ${esc(name)}</option>`).join('')}</select></div><div class="field"><label for="kind">산출물 종류</label><select id="kind" name="kind" ${create?'':'disabled'}>${state.data.types.map(t=>`<option value="${t}" ${t===k?'selected':''}>${kindName(t)}</option>`).join('')}</select></div></div><div class="field"><label for="title">제목 *</label><input id="title" name="title" value="${esc(item?.title)}" required></div><div class="field"><label for="body">내용 *</label><textarea id="body" name="body" rows="6" required>${esc(item?.body)}</textarea></div><div class="form-grid"><div class="field"><label for="status">상태</label><select id="status" name="status">${['Proposed','Draft','Reviewed','Approved','Obsolete'].map(s=>`<option ${item?.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label for="priority">우선순위</label><select id="priority" name="priority">${['Must','Should','Could'].map(s=>`<option ${item?.priority===s?'selected':''}>${s}</option>`).join('')}</select></div></div><div class="field"><label for="category">분류</label><input id="category" name="category" value="${esc(item?.category)}" placeholder="예: functional, interface"></div><div id="requirement-fields"></div><div class="form-error" id="form-error"></div><div class="form-actions"><button type="button" class="ghost" id="cancel">취소</button><button class="primary" type="submit">${create?'생성':'저장'}</button></div></form>`);
  const reqFields=()=>{
    const process=$('#process').value, kind=$('#kind').value;
    let fields='';
    if(kind==='requirement'){
      fields+=`<div class="field"><label for="rationale">도출 근거</label><textarea id="rationale" rows="2">${esc(meta.rationale)}</textarea></div>`;
      if(process==='SYS.1')fields+=`<div class="field"><label for="stakeholder">이해관계자</label><input id="stakeholder" value="${esc(meta.stakeholder)}" placeholder="예: STK-OWNER"></div><div class="field"><label for="acceptance">이해관계자 수용 상태</label><input id="acceptance" value="${esc(meta.acceptance_of_stakeholder)}" placeholder="TBD"></div>`;
      if(process==='SYS.2')fields+=`<div class="field"><label for="impact">운용 환경 영향</label><textarea id="impact" rows="2">${esc(meta.operating_environment_impact)}</textarea></div><div class="form-grid"><div class="field"><label for="method">검증 방법</label><select id="method"><option value="">선택</option>${['Test','Analysis','Inspection','Demonstration'].map(x=>`<option ${meta.verification?.method===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label for="feasibility">실현 가능성</label><select id="feasibility"><option value="NotAssessed" ${meta.technical_feasibility?.status!=='Assessed'?'selected':''}>NotAssessed</option><option value="Assessed" ${meta.technical_feasibility?.status==='Assessed'?'selected':''}>Assessed</option></select></div></div><div class="field"><label for="criteria">검증 판정 기준</label><textarea id="criteria" rows="3">${esc(meta.verification?.acceptance_criteria)}</textarea></div><div class="field"><label for="feasibility-evidence">실현 가능성 평가 근거</label><textarea id="feasibility-evidence" rows="2">${esc(meta.technical_feasibility?.evidence)}</textarea></div><div class="field"><label for="open-points">미결정 항목 (한 줄에 하나)</label><textarea id="open-points" rows="2">${esc((meta.open_points||[]).join('\n'))}</textarea></div>`;
    }
    if(kind==='test_case')fields+=`<div class="field"><label for="preconditions">사전 조건</label><textarea id="preconditions" rows="2">${esc(meta.preconditions)}</textarea></div><div class="field"><label for="procedure">시험 절차</label><textarea id="procedure" rows="3">${esc(meta.procedure)}</textarea></div><div class="field"><label for="expected">기대 결과 / 판정 기준</label><textarea id="expected" rows="2">${esc(meta.expected)}</textarea></div>`;
    if(kind==='test_run')fields+=`<div class="form-grid"><div class="field"><label for="result">결과</label><select id="result">${['NOT_RUN','PASS','FAIL','BLOCKED'].map(v=>`<option ${meta.result===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="execution-date">실행일</label><input id="execution-date" type="date" value="${esc(meta.execution_date||'')}"></div></div><div class="field"><label for="configuration">시험 형상 (HW Rev, FW Commit, 모터)</label><textarea id="configuration" rows="2">${esc(meta.configuration)}</textarea></div><div class="field"><label for="evidence">증거 파일 경로 또는 링크</label><textarea id="evidence" rows="2">${esc(meta.evidence)}</textarea></div>`;
    if(kind==='change')fields+=`<div class="field"><label for="impact">영향 범위</label><textarea id="impact" rows="2">${esc(meta.impact)}</textarea></div><div class="field"><label for="decision">결정 / 조치</label><textarea id="decision" rows="2">${esc(meta.decision)}</textarea></div>`;
    if(kind==='problem')fields+=`<div class="field"><label for="observed">관측된 문제</label><textarea id="observed" rows="2">${esc(meta.observed)}</textarea></div><div class="field"><label for="resolution">해결 기록</label><textarea id="resolution" rows="2">${esc(meta.resolution)}</textarea></div>`;
    $('#requirement-fields').innerHTML=fields;
  };
  $('#process').onchange=reqFields;$('#kind').onchange=reqFields;reqFields();$('#cancel').onclick=closeModal;
  $('#item-form').onsubmit=async e=>{e.preventDefault();try{
    let extra={...meta};const value=id=>$(id)?.value;
    for(const [field,key] of [['#rationale','rationale'],['#stakeholder','stakeholder'],['#acceptance','acceptance_of_stakeholder'],['#impact',($('#kind').value==='change'?'impact':'operating_environment_impact')],['#preconditions','preconditions'],['#procedure','procedure'],['#expected','expected'],['#result','result'],['#execution-date','execution_date'],['#configuration','configuration'],['#evidence','evidence'],['#decision','decision'],['#observed','observed'],['#resolution','resolution']])if($(field))extra[key]=value(field);
    if($('#method')){extra.verification={...(meta.verification||{}),method:value('#method'),acceptance_criteria:value('#criteria')};extra.technical_feasibility={...(meta.technical_feasibility||{}),status:value('#feasibility'),evidence:value('#feasibility-evidence')};extra.open_points=value('#open-points').split('\n').map(x=>x.trim()).filter(Boolean);}
    const payload={process:value('#process'),kind:value('#kind'),title:value('#title'),body:value('#body'),status:value('#status'),priority:value('#priority'),category:value('#category'),metadata:extra};
    const response=await api(create?'/api/items':'/api/items/'+encodeURIComponent(item.id),{method:create?'POST':'PUT',body:JSON.stringify(payload)});closeModal();await refresh();openItem(response.id);notice(create?'산출물을 생성했습니다.':'변경 사항을 저장했습니다.');
  }catch(err){$('#form-error').textContent=err.message;}};
}
function showLinkForm(source='') {
  const opts=state.data.items.map(x=>`<option value="${esc(x.id)}">${esc(x.id)} · ${esc(x.title)}</option>`).join('');
  modal(`<div class="modal-head"><h2>연결 관계 추가</h2><button class="close" aria-label="닫기">×</button></div><form class="form" id="link-form"><div class="field"><label for="link-source">출발 항목</label><select id="link-source"><option value="">선택</option>${opts}</select></div><div class="field"><label for="relation">관계</label><select id="relation"><option value="derived_from">derived_from · 상위 요구에서 도출</option><option value="implements">implements · 요구 구현</option><option value="allocated_to">allocated_to · 기능 할당</option><option value="verifies">verifies · 요구 검증</option><option value="result_of">result_of · 시험 결과</option><option value="related_to">related_to · 관련 항목</option></select></div><div class="field"><label for="link-target">대상 항목</label><select id="link-target"><option value="">선택</option>${opts}</select></div><p class="help">예: SYS-REQ-001 → derived_from → STK-REQ-002, TC-SYS5-001 → verifies → SYS-REQ-001</p><div class="form-error" id="form-error"></div><div class="form-actions"><button type="button" class="ghost" id="cancel">취소</button><button type="submit" class="primary">관계 저장</button></div></form>`);
  $('#link-source').value=source;$('#cancel').onclick=closeModal;
  $('#link-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/links',{method:'POST',body:JSON.stringify({source:$('#link-source').value,relation:$('#relation').value,target:$('#link-target').value})});closeModal();await refresh();notice('연결 관계를 추가했습니다.')}catch(err){$('#form-error').textContent=err.message;}};
}
document.querySelectorAll('#main-nav button').forEach(b=>b.onclick=()=>select(b.dataset.view));
refresh().catch(err=>{$('#content').innerHTML=`<div class="card empty">데이터를 불러오지 못했습니다: ${esc(err.message)}</div>`});
