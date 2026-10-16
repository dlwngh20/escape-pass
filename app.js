
const SITES=window.ESCAPE_SITES||[],KEY='escape_pass_v21';
const LEGACY_KEYS=['escape_pass_v2','escape_pass_v1'];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isDesktop=!isIOS && matchMedia('(min-width:761px)').matches;
const state={data:{pin:null,salt:null,profile:{name:'',phone:'',people:'2'},last:null,plans:[]},buf:'',first:null,setup:false,deferredInstall:null};

function load(){
  let raw=localStorage.getItem(KEY);
  if(!raw){for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break}}
  try{if(raw){const x=JSON.parse(raw);state.data={...state.data,...x,plans:Array.isArray(x.plans)?x.plans:[]}}}catch{}
  save()
}
function save(){localStorage.setItem(KEY,JSON.stringify(state.data))}
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),2200)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function rnd(){const a=new Uint8Array(16);crypto.getRandomValues(a);return[...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function hash(pin,salt){const e=new TextEncoder(),k=await crypto.subtle.importKey('raw',e.encode(pin),'PBKDF2',false,['deriveBits']),sa=new Uint8Array(salt.match(/../g).map(x=>parseInt(x,16))),b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:sa,iterations:120000,hash:'SHA-256'},k,256);return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function dots(){$$('.dots i').forEach((x,i)=>x.classList.toggle('on',i<state.buf.length))}
function showLock(setup){state.setup=setup;state.buf='';state.first=null;$('#app').classList.add('hidden');$('#lock').classList.remove('hidden');$('#lockText').textContent=setup?'4자리 PIN을 설정하세요.':'PIN을 입력해 잠금을 해제하세요.';dots()}
function unlock(){$('#lock').classList.add('hidden');$('#app').classList.remove('hidden');render()}
async function submitPin(){if(state.buf.length!==4)return;if(state.setup){if(!state.first){state.first=state.buf;state.buf='';$('#lockText').textContent='한 번 더 입력해 확인하세요.';dots();return}if(state.first!==state.buf){$('#pinMsg').textContent='PIN이 일치하지 않아요.';state.first=null;state.buf='';dots();return}state.data.salt=rnd();state.data.pin=await hash(state.buf,state.data.salt);save();unlock();toast('PIN 설정 완료')}else{if(await hash(state.buf,state.data.salt)===state.data.pin)unlock();else{$('#pinMsg').textContent='PIN이 맞지 않아요.';state.buf='';dots();setTimeout(()=>$('#pinMsg').textContent='',1200)}}}
function pad(){const a=['1','2','3','4','5','6','7','8','9','','0','⌫'];$('#pad').innerHTML=a.map(n=>n?`<button data-k="${n}">${n}</button>`:'<span></span>').join('');$('#pad').onclick=e=>{const k=e.target.dataset.k;if(!k)return;if(k==='⌫')state.buf=state.buf.slice(0,-1);else if(state.buf.length<4)state.buf+=k;dots();if(state.buf.length===4)setTimeout(submitPin,80)}}

function b64u(t){const b=new TextEncoder().encode(t);let s='';b.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function site(id){return SITES.find(x=>x.id===id)}
function makePayload(cfg){
  const p=state.data.profile||{};
  return {v:2,runId:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,autoStart:true,ts:Date.now(),
    site:cfg.site,date:cfg.date,time:cfg.time,branch:cfg.branch||'',theme:cfg.theme||'',openAt:cfg.openAt||'',depositor:cfg.depositor||'',
    name:(p.name||'').trim(),phone:(p.phone||'').trim(),people:String(p.people||'2')}
}
function validatePayload(cfg){
  const m=[];if(!cfg.date)m.push('날짜');if(!cfg.time)m.push('시간');if(!cfg.theme)m.push('테마');if(!cfg.branch&&cfg.site!=='dps')m.push('지점');if(!cfg.name)m.push('프로필 이름');if(!cfg.phone)m.push('프로필 전화번호');return m
}
function targetUrl(payload){const s=site(payload.site);return s.url.replace(/#.*$/,'')+'#ep='+encodeURIComponent(b64u(JSON.stringify(payload)))}
function launchPayload(payload, mode='single'){
  const missing=validatePayload(payload);if(missing.length){toast('확인: '+missing.join(', '));return false}
  state.data.last=payload;save();
  const url=targetUrl(payload);
  if(isDesktop || mode==='tab'){
    const w=window.open(url,'_blank','noopener');
    if(!w){toast('팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.');return false}
  }else location.href=url;
  return true
}

function render(){
  const p=state.data.profile||{};
  $('#name').value=p.name||'';$('#phone').value=p.phone||'';$('#people').value=p.people||'2';
  $('#profileState').textContent=p.name&&p.phone?'완료':'미설정';
  $('#lastState').textContent=state.data.last?site(state.data.last.site)?.name||'실행됨':'없음';
  $('#deviceBadge').textContent=isIOS?'iPhone · Safari':'PC · Chrome/Edge';
  $('#siteCount').textContent=SITES.length;
  $('#grid').innerHTML=SITES.map(s=>`<article class="site glass" style="--c:${s.accent}"><div class="icon">${esc(s.name==='PLAY33'?'33':s.name[0])}</div><h4>${esc(s.name)}</h4><p>${esc(s.sub)}</p><span class="badge">${esc(s.badge)}</span><button data-site="${s.id}">⚡ 자동예약</button></article>`).join('');
  $$('[data-site]').forEach(b=>b.onclick=()=>openBook(b.dataset.site));
  renderPlans();
}
function openBook(id){
  const s=site(id),p=state.data.profile||{};
  $('#site').innerHTML=SITES.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');
  $('#site').value=id||SITES[0].id;$('#date').value='';$('#time').value='';$('#branch').value=s.branchDefault||'';$('#theme').value='';$('#openAt').value='';$('#depositor').value='';
  updateHint();
  $('#profilePreview').innerHTML=`<b>예약자 프로필</b><br>${esc(p.name||'이름 미설정')} · ${esc(p.phone||'전화번호 미설정')} · ${esc(p.people||'2')}명`;
  $('#bookDialog').showModal()
}
function updateHint(){const s=site($('#site').value);if(!s)return;$('#hint').innerHTML=`<b>${esc(s.name)}</b><br>지점: ${esc(s.branch)}<br>테마: ${esc(s.theme)}<br>${esc(s.note)}`;$('#branch').placeholder=s.branch;if(s.branchDefault&&!$('#branch').value)$('#branch').value=s.branchDefault;$('#theme').placeholder=s.theme}
function startSingle(){
  const cfg={site:$('#site').value,date:$('#date').value,time:$('#time').value,branch:$('#branch').value.trim(),theme:$('#theme').value.trim(),openAt:$('#openAt').value||'',depositor:$('#depositor').value.trim()};
  const payload=makePayload(cfg);const m=validatePayload(payload);if(m.length){toast('확인: '+m.join(', '));return}
  $('#bookDialog').close();launchPayload(payload)
}

function openPlanDialog(plan=null){
  $('#planDialogTitle').textContent=plan?'예약 플랜 수정':'예약 플랜 추가';
  $('#planId').value=plan?.id||'';$('#planSite').value=plan?.site||SITES[0].id;$('#planDate').value=plan?.date||'';$('#planTime').value=plan?.time||'';
  $('#planBranch').value=plan?.branch||site($('#planSite').value)?.branchDefault||'';$('#planTheme').value=plan?.theme||'';$('#planOpenAt').value=plan?.openAt||'';$('#planDepositor').value=plan?.depositor||'';$('#planMemo').value=plan?.memo||'';
  updatePlanHint();$('#planDialog').showModal()
}
function updatePlanHint(){const s=site($('#planSite').value);if(!s)return;$('#planHint').innerHTML=`<b>${esc(s.name)}</b><br>지점: ${esc(s.branch)} · 테마: ${esc(s.theme)}<br>${esc(s.note)}`;$('#planBranch').placeholder=s.branch;$('#planTheme').placeholder=s.theme;if(s.branchDefault&&!$('#planBranch').value)$('#planBranch').value=s.branchDefault}
function savePlan(){
  const p={id:$('#planId').value||`${Date.now()}-${Math.random().toString(16).slice(2,7)}`,site:$('#planSite').value,date:$('#planDate').value,time:$('#planTime').value,branch:$('#planBranch').value.trim(),theme:$('#planTheme').value.trim(),openAt:$('#planOpenAt').value||'',depositor:$('#planDepositor').value.trim(),memo:$('#planMemo').value.trim(),selected:true};
  if(!p.date||!p.time||!p.theme){toast('날짜·시간·테마를 확인하세요.');return}
  if(!p.branch&&p.site!=='dps'){toast('지점을 입력하세요.');return}
  const i=state.data.plans.findIndex(x=>x.id===p.id);if(i>=0)state.data.plans[i]={...state.data.plans[i],...p};else state.data.plans.push(p);
  save();$('#planDialog').close();renderPlans();toast('플랜 저장 완료')
}
function renderPlans(){
  const plans=state.data.plans||[];$('#planCount').textContent=plans.length;
  if(!plans.length){$('#planList').innerHTML='<div class="empty">저장된 예약 플랜이 없습니다.<br>PC에서는 여러 플랜을 선택해 동시에 새 탭으로 실행할 수 있습니다.</div>';return}
  $('#planList').innerHTML=plans.map(p=>{const s=site(p.site)||{name:p.site,sub:'',accent:'#8b5cf6'};return `<article class="plan-row glass">
    <input class="plan-check" type="checkbox" data-check="${p.id}" ${p.selected!==false?'checked':''}>
    <div class="plan-main"><div class="plan-site" style="color:${s.accent}">${esc(s.name)}</div><div class="plan-sub">${esc(p.branch||'')} · ${esc(p.theme||'')}</div></div>
    <div class="plan-extra"><div class="plan-date">${esc(p.date)}</div><div class="plan-note">${esc(p.memo||'')}</div></div>
    <div class="plan-when"><div class="plan-time">${esc(p.time)}</div></div>
    <div class="plan-sub">${p.openAt?'수동 오픈 '+esc(p.openAt.replace('T',' ')):'자동/사이트 규칙'}</div>
    <div class="plan-actions"><button data-run="${p.id}">⚡ 실행</button><button data-edit="${p.id}">수정</button><button data-del="${p.id}">삭제</button></div>
  </article>`}).join('');
  $$('[data-check]').forEach(c=>c.onchange=()=>{const p=state.data.plans.find(x=>x.id===c.dataset.check);if(p){p.selected=c.checked;save()}});
  $$('[data-run]').forEach(b=>b.onclick=()=>runPlan(b.dataset.run));
  $$('[data-edit]').forEach(b=>b.onclick=()=>openPlanDialog(state.data.plans.find(x=>x.id===b.dataset.edit)));
  $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('이 플랜을 삭제할까요?')){state.data.plans=state.data.plans.filter(x=>x.id!==b.dataset.del);save();renderPlans()}});
}
function runPlan(id){const p=state.data.plans.find(x=>x.id===id);if(!p)return;launchPayload(makePayload(p),isDesktop?'tab':'single')}
function runSelected(){
  if(!isDesktop){toast('다중 실행은 PC에서 사용해 주세요.');return}
  const selected=state.data.plans.filter(x=>x.selected!==false);
  if(!selected.length){toast('실행할 플랜을 체크하세요.');return}
  const profile=state.data.profile||{};if(!profile.name||!profile.phone){toast('먼저 예약자 프로필을 저장하세요.');return}
  const payloads=selected.map(makePayload);
  for(const p of payloads){const m=validatePayload(p);if(m.length){toast(`${site(p.site)?.name}: ${m.join(', ')} 확인`);return}}
  // Open blank tabs synchronously from the click event to reduce popup blocking.
  const tabs=payloads.map(()=>window.open('about:blank','_blank'));
  let blocked=0;
  tabs.forEach((w,i)=>{if(!w){blocked++;return} try{w.location.href=targetUrl(payloads[i])}catch{blocked++}});
  if(blocked)toast(`${blocked}개 탭이 차단됐어요. ESCAPE PASS 팝업을 허용해 주세요.`);
  else{state.data.last=payloads[payloads.length-1];save();toast(`${payloads.length}개 예약 플랜 실행`) }
}

function installApp(){
  if(state.deferredInstall){state.deferredInstall.prompt();state.deferredInstall.userChoice.finally(()=>state.deferredInstall=null);return}
  if(isIOS)toast('Safari 공유 버튼 → 홈 화면에 추가를 눌러주세요.');
  else toast('Chrome/Edge 주소창의 앱 설치 아이콘을 이용할 수 있어요.');
}
function init(){
  load();pad();
  $('#lockBtn').onclick=()=>showLock(false);$('#fastBtn').onclick=()=>openBook(state.data.last?.site||SITES[0].id);$('#closeDialog').onclick=()=>$('#bookDialog').close();$('#site').onchange=updateHint;$('#start').onclick=startSingle;
  $('#saveProfile').onclick=()=>{state.data.profile={name:$('#name').value.trim(),phone:$('#phone').value.trim(),people:$('#people').value};save();render();toast('프로필 저장 완료')};
  $('#addPlanBtn').onclick=()=>openPlanDialog();$('#closePlanDialog').onclick=()=>$('#planDialog').close();$('#savePlanBtn').onclick=savePlan;$('#planSite').innerHTML=SITES.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');$('#planSite').onchange=()=>{const s=site($('#planSite').value);$('#planBranch').value=s?.branchDefault||'';updatePlanHint()};
  $('#selectAllBtn').onclick=()=>{const all=state.data.plans.every(x=>x.selected!==false);state.data.plans.forEach(x=>x.selected=!all);save();renderPlans()};
  $('#runSelectedBtn').onclick=runSelected;$('#goPlansBtn').onclick=()=>$('#plansSection').scrollIntoView({behavior:'smooth'});$('#installBtn').onclick=installApp;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e});
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(!state.data.pin||!state.data.salt)showLock(true);else showLock(false)
}
document.addEventListener('DOMContentLoaded',init);
