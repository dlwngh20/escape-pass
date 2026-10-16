
const SITES = window.ESCAPE_SITES || [];
const KEY = 'escape_pass_v1';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = {
  data: {
    profile:{name:'',phone:'',people:'2'},
    plans:[],
    scripts:{},
    pin:null,
    pinSalt:null,
    deviceId:null
  },
  pinBuffer:'',
  setupMode:false,
  firstPin:null
};

function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw) state.data={...state.data,...JSON.parse(raw)};
  }catch{}
  if(!state.data.deviceId){
    state.data.deviceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    save();
  }
}
function save(){ localStorage.setItem(KEY,JSON.stringify(state.data)); }

function toast(msg){
  const el=$('#toast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),1800);
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtDate(d){
  if(!d) return '-';
  const x=new Date(`${d}T00:00:00`);
  return `${x.getMonth()+1}월 ${x.getDate()}일`;
}
function daysUntil(d){
  const a=new Date(); a.setHours(0,0,0,0);
  const b=new Date(`${d}T00:00:00`);
  return Math.round((b-a)/86400000);
}

async function derivePin(pin,saltHex){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);
  const salt=new Uint8Array(saltHex.match(/.{1,2}/g).map(x=>parseInt(x,16)));
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function randomHex(n=16){
  const a=new Uint8Array(n); crypto.getRandomValues(a);
  return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function showLock(setup=false){
  state.setupMode=setup; state.pinBuffer=''; state.firstPin=null;
  $('#app').classList.add('hidden'); $('#lockScreen').classList.remove('hidden');
  $('#lockTitle').textContent=setup?'PIN 만들기':'ESCAPE PASS';
  $('#lockDesc').textContent=setup?'4자리 PIN을 설정하세요.':'PIN을 입력해 잠금을 해제하세요.';
  renderDots();
}
function unlock(){
  $('#lockScreen').classList.add('hidden'); $('#app').classList.remove('hidden');
  renderAll();
}
function renderDots(){
  $$('#pinDots b').forEach((x,i)=>x.classList.toggle('on',i<Math.min(4,state.pinBuffer.length)));
}
async function submitPin(){
  const pin=state.pinBuffer;
  if(pin.length<4) return;
  if(state.setupMode){
    if(!state.firstPin){
      state.firstPin=pin; state.pinBuffer='';
      $('#lockDesc').textContent='한 번 더 입력해 확인하세요.'; renderDots(); return;
    }
    if(pin!==state.firstPin){
      $('#pinError').textContent='PIN이 일치하지 않아요.'; state.pinBuffer=''; state.firstPin=null; renderDots(); return;
    }
    const salt=randomHex();
    state.data.pinSalt=salt;
    state.data.pin=await derivePin(pin,salt);
    save(); unlock(); toast('PIN 설정 완료');
  }else{
    const hash=await derivePin(pin,state.data.pinSalt);
    if(hash===state.data.pin){ unlock(); }
    else{
      $('#pinError').textContent='PIN이 맞지 않아요.';
      state.pinBuffer=''; renderDots();
      setTimeout(()=>$('#pinError').textContent='',1300);
    }
  }
}
function renderPinPad(){
  const nums=['1','2','3','4','5','6','7','8','9','','0','⌫'];
  $('#pinPad').innerHTML=nums.map(n=>n?`<button class="pin-key" data-key="${n}">${n}</button>`:`<span></span>`).join('');
  $('#pinPad').addEventListener('click',e=>{
    const k=e.target.dataset.key;if(!k)return;
    if(k==='⌫')state.pinBuffer=state.pinBuffer.slice(0,-1);
    else if(state.pinBuffer.length<4)state.pinBuffer+=k;
    renderDots();
    if(state.pinBuffer.length===4)setTimeout(submitPin,100);
  });
  $('#useKeyboardBtn').onclick=()=>{ $('#pinInput').style.pointerEvents='auto'; $('#pinInput').focus(); };
  $('#pinInput').addEventListener('input',e=>{
    state.pinBuffer=e.target.value.replace(/\D/g,'').slice(0,4);
    renderDots(); if(state.pinBuffer.length===4)setTimeout(submitPin,100);
  });
}

function renderSites(){
  $('#siteGrid').innerHTML=SITES.map(s=>`
    <button class="site-card" style="--site-color:${s.accent}" data-open-site="${s.id}">
      <div class="site-icon">${escapeHtml(s.icon)}</div>
      <div class="site-name">${escapeHtml(s.name)}</div>
      <div class="site-sub">${escapeHtml(s.subtitle)}</div>
      <div class="site-bottom"><span class="site-badge">${escapeHtml(s.badge)}</span><span class="arrow">↗</span></div>
    </button>`).join('');
  $$('[data-open-site]').forEach(b=>b.onclick=()=>openSite(b.dataset.openSite));
}
function openSite(id){
  const s=SITES.find(x=>x.id===id); if(!s)return;
  window.open(s.url,'_blank','noopener');
  toast(`${s.name} 열기`);
}
function renderPlans(){
  const plans=[...state.data.plans].sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  $('#planCount').textContent=plans.length;
  if(!plans.length){
    $('#planList').innerHTML=`<div class="empty">아직 저장된 예약 플랜이 없어요.<br>새 플랜을 만들어두면 오픈런 준비가 훨씬 편해져요.</div>`;
  }else{
    $('#planList').innerHTML=plans.map(p=>planCard(p,true)).join('');
  }
  const future=plans.find(p=>new Date(`${p.date}T${p.time||'00:00'}`)>=new Date());
  $('#nextPlan').innerHTML=future?planCard(future,false):`<div class="empty">예정된 예약 플랜이 없습니다.</div>`;
  bindPlanActions();
}
function planCard(p,full){
  const s=SITES.find(x=>x.id===p.site)||{name:p.site,accent:'#8b5cf6'};
  const du=daysUntil(p.date);
  const when=du===0?'오늘':du===1?'내일':du>1?`D-${du}`:'지난 일정';
  return `<article class="plan-card glass" data-plan="${p.id}">
    <div class="plan-top">
      <div><div class="plan-site" style="color:${s.accent}">${escapeHtml(s.name)}</div><div class="plan-meta">${escapeHtml(p.branch||'지점 미입력')} · ${escapeHtml(p.theme||'테마 미입력')}</div></div>
      <div style="text-align:right"><div class="plan-time">${escapeHtml(p.time)}</div><div class="plan-meta">${fmtDate(p.date)} · ${when}</div></div>
    </div>
    ${p.memo?`<div class="plan-note">${escapeHtml(p.memo)}</div>`:''}
    <div class="plan-actions">
      <button data-launch-plan="${p.id}">예약페이지 열기</button>
      ${full?`<button data-edit-plan="${p.id}">수정</button><button data-del-plan="${p.id}">삭제</button>`:''}
    </div>
  </article>`;
}
function bindPlanActions(){
  $$('[data-launch-plan]').forEach(b=>b.onclick=()=>{
    const p=state.data.plans.find(x=>x.id===b.dataset.launchPlan); if(p)openSite(p.site);
  });
  $$('[data-edit-plan]').forEach(b=>b.onclick=()=>openPlanDialog(state.data.plans.find(x=>x.id===b.dataset.editPlan)));
  $$('[data-del-plan]').forEach(b=>b.onclick=()=>{
    if(confirm('이 예약 플랜을 삭제할까요?')){
      state.data.plans=state.data.plans.filter(x=>x.id!==b.dataset.delPlan);save();renderPlans();
    }
  });
}
function openPlanDialog(p=null){
  $('#planDialogTitle').textContent=p?'예약 플랜 수정':'예약 플랜 추가';
  $('#planId').value=p?.id||'';
  $('#planSite').value=p?.site||SITES[0].id;
  $('#planDate').value=p?.date||'';
  $('#planTime').value=p?.time||'';
  $('#planBranch').value=p?.branch||'';
  $('#planTheme').value=p?.theme||'';
  $('#planMemo').value=p?.memo||'';
  $('#planDialog').showModal();
}
function savePlan(){
  const id=$('#planId').value||`${Date.now()}-${Math.random().toString(16).slice(2,6)}`;
  const p={id,site:$('#planSite').value,date:$('#planDate').value,time:$('#planTime').value,branch:$('#planBranch').value.trim(),theme:$('#planTheme').value.trim(),memo:$('#planMemo').value.trim()};
  if(!p.date||!p.time){toast('날짜와 시간을 입력하세요');return}
  const idx=state.data.plans.findIndex(x=>x.id===id);
  if(idx>=0)state.data.plans[idx]=p; else state.data.plans.push(p);
  save();$('#planDialog').close();renderPlans();toast('예약 플랜 저장 완료');
}
function renderProfile(){
  const p=state.data.profile;
  $('#profileName').value=p.name||'';$('#profilePhone').value=p.phone||'';$('#profilePeople').value=p.people||'2';
  $('#profileStatus').textContent=(p.name&&p.phone)?'완료':'미설정';
}
function renderScripts(){
  $('#scriptChecklist').innerHTML=SITES.map(s=>`
    <div class="check-item"><label>${escapeHtml(s.name)}</label><input class="toggle" type="checkbox" data-script="${s.id}" ${state.data.scripts[s.id]?'checked':''}></div>
  `).join('');
  $$('[data-script]').forEach(x=>x.onchange=()=>{state.data.scripts[x.dataset.script]=x.checked;save();});
}
function navigate(view){
  $$('.view').forEach(x=>x.classList.remove('active'));
  $(`#${view}View`).classList.add('active');
  $$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderAll(){
  renderSites();renderPlans();renderProfile();renderScripts();
  $('#siteCount').textContent=SITES.length;
}
function exportData(){
  const blob=new Blob([JSON.stringify(state.data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`escape-pass-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{try{const data=JSON.parse(r.result);state.data={...state.data,...data};save();renderAll();toast('복원 완료');}catch{toast('백업 파일을 확인하세요');}};
  r.readAsText(file);
}

function wire(){
  $$('[data-nav]').forEach(x=>x.onclick=()=>navigate(x.dataset.nav));
  $('#lockBtn').onclick=()=>showLock(false);
  $('#installHelpBtn').onclick=()=>$('#installDialog').showModal();
  $('#addPlanBtn').onclick=()=>openPlanDialog();
  $('#savePlanBtn').onclick=savePlan;
  $('#planSite').innerHTML=SITES.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  $('#profileForm').onsubmit=e=>{
    e.preventDefault();
    state.data.profile={name:$('#profileName').value.trim(),phone:$('#profilePhone').value.trim(),people:$('#profilePeople').value};
    save();renderProfile();toast('프로필 저장 완료');
  };
  $('#scriptsBtn').onclick=()=>{renderScripts();$('#scriptsDialog').showModal()};
  $('#exportBtn').onclick=exportData;
  $('#importInput').onchange=e=>{if(e.target.files[0])importData(e.target.files[0])};
  $('#changePinBtn').onclick=()=>{ if(confirm('PIN을 새로 설정할까요?')){state.data.pin=null;state.data.pinSalt=null;save();showLock(true);} };
  $('#resetBtn').onclick=()=>{if(confirm('이 기기의 ESCAPE PASS 데이터를 모두 삭제할까요?')){localStorage.removeItem(KEY);location.reload();}};
}

async function init(){
  load(); renderPinPad(); wire();
  if('serviceWorker' in navigator){ try{await navigator.serviceWorker.register('./sw.js');}catch{} }
  if(!state.data.pin || !state.data.pinSalt) showLock(true); else showLock(false);
}
document.addEventListener('DOMContentLoaded',init);
