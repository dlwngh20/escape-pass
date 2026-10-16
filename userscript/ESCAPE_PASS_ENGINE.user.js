// ==UserScript==
// @name         ESCAPE PASS ENGINE v2.3 BRANCH + THEME
// @namespace    escape.pass.universal
// @version      2.3.0
// @description  ESCAPE PASS iPhone/PC 공용 엔진. 사이트/지점/테마 연동 선택 및 CAPTCHA 사용자 입력 흐름.
// @match        *://keyescape.com/*
// @match        *://www.keyescape.com/*
// @match        *://*.keyescape.com/*
// @match        https://zeroworldkorea.com/*
// @match        https://www.zeroworldkorea.com/*
// @match        *://doomescape.com/*
// @match        *://www.doomescape.com/*
// @match        https://play33.kr/*
// @match        https://www.play33.kr/*
// @match        *://dpsnnn.com/*
// @match        *://www.dpsnnn.com/*
// @match        *://*.dpsnnn.com/*
// @match        https://ledasquare.com/layout/res/home.php*
// @match        https://oasismuseum.com/*
// @match        https://www.oasismuseum.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

if (/(^|\.)keyescape\.com$/i.test(location.hostname)) {
  try {
(() => {
  'use strict';

  // v1.3 FORCE VISIBLE: Userscripts 주입 여부를 패널보다 먼저 표시.
  let __keAlive = null;
  let __keLastInitError = '';

  function __keMountAlive() {
    if (__keAlive || document.getElementById('__ke_alive_badge')) return;
    const host = document.documentElement || document.body;
    if (!host) return;
    const b = document.createElement('div');
    b.id = '__ke_alive_badge';
    b.textContent = '🟢 KEY JS 실행됨';
    b.setAttribute('style', [
      'position:fixed !important',
      'top:calc(env(safe-area-inset-top,0px) + 8px) !important',
      'right:8px !important',
      'z-index:2147483647 !important',
      'background:#08783b !important',
      'color:#fff !important',
      'padding:9px 12px !important',
      'border-radius:999px !important',
      'font:800 12px -apple-system,BlinkMacSystemFont,Apple SD Gothic Neo,sans-serif !important',
      'box-shadow:0 4px 16px rgba(0,0,0,.35) !important',
      'pointer-events:none !important'
    ].join(';'));
    host.appendChild(b);
    __keAlive = b;
  }

  function __keAliveState(kind, msg) {
    __keMountAlive();
    const b = __keAlive || document.getElementById('__ke_alive_badge');
    if (!b) return;
    if (kind === 'error') {
      b.style.setProperty('background','#a61c1c','important');
      b.textContent = '🔴 KEY 오류: ' + String(msg || '초기화 실패').slice(0,70);
    } else if (kind === 'ready') {
      b.style.setProperty('background','#075fbf','important');
      b.textContent = '🔵 KEY 패널 준비됨';
      setTimeout(function(){ try { b.style.setProperty('opacity','0.72','important'); } catch (_) {} }, 1800);
    } else {
      b.style.setProperty('background','#08783b','important');
      b.textContent = '🟢 KEY JS 실행됨';
    }
  }

  __keMountAlive();
  if (!__keAlive) document.addEventListener('DOMContentLoaded', __keMountAlive, {once:true});
  window.addEventListener('error', function(ev) {
    __keLastInitError = (ev && (ev.message || (ev.error && ev.error.message))) || 'JavaScript 오류';
    __keAliveState('error', __keLastInitError);
  });
  window.addEventListener('unhandledrejection', function(ev) {
    const r = ev && ev.reason;
    __keLastInitError = (r && (r.message || String(r))) || 'Promise 오류';
    __keAliveState('error', __keLastInitError);
  });


  const STORE = '__keyescape_direct_fast_v1__';
  const ORIGIN = location.origin;
  const RUN_PROC = '/controller/run_proc.php';
  const STEP2 = '/reservation2.php';

  const DEFAULTS = {
    targetUrl: '',
    branch: '',
    themeNum: '',
    themeInfoNum: '',
    themeName: '',
    targetDate: '',
    targetTime: '',
    openAt: '',
    name: '',
    phone: '',
    people: '2',
    autoOpenResult: true,
    armed: false,
    offsetMs: 0,
    rttMs: 0,
    captchaSeenAt: 0,
    doing: '',
    branchName: '',
    branchOpenTime: '',
    autoOpenTime: true
  };

  let stopped = false;
  let clockOffset = 0;
  let currentCaptchaToken = '';
  let captchaSeenAt = 0;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const normTime = s => clean(s).replace(/\s/g, '').replace(/^0(?=\d:)/, '');

  function load() {
    try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}')}; }
    catch { return {...DEFAULTS}; }
  }

  function save(patch={}) {
    const v = {...load(), ...patch};
    localStorage.setItem(STORE, JSON.stringify(v));
    return v;
  }

  function status(msg) {
    console.log('[KEY DIRECT]', msg);
    const el = document.getElementById('__ke_direct_status');
    if (el) el.textContent = msg;
  }

  function showResult(kind, title, detail='') {
    let box = document.getElementById('__ke_direct_result');
    if (!box) {
      box = document.createElement('div');
      box.id = '__ke_direct_result';
      Object.assign(box.style, {
        position:'fixed',
        left:'12px',
        right:'12px',
        top:'calc(env(safe-area-inset-top, 0px) + 12px)',
        zIndex:'2147483647',
        padding:'18px 16px',
        borderRadius:'17px',
        boxShadow:'0 10px 36px rgba(0,0,0,.36)',
        fontFamily:'-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif',
        textAlign:'center',
        whiteSpace:'pre-wrap'
      });
      document.documentElement.appendChild(box);
    }

    const map = {
      success:{bg:'#0b7a3a', icon:'✅'},
      grabbed:{bg:'#0c63ce', icon:'🎯'},
      warn:{bg:'#9a5b00', icon:'⚠️'},
      error:{bg:'#a61c1c', icon:'❌'}
    };
    const p = map[kind] || map.warn;
    box.style.background = p.bg;
    box.style.color = '#fff';
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-size:23px;font-weight:900">${p.icon} ${escapeHtml(title)}</div>
      <div style="font-size:13px;line-height:1.5;margin-top:8px">${escapeHtml(detail)}</div>
      <button id="__ke_result_close" type="button"
        style="margin-top:12px;border:0;border-radius:999px;padding:8px 18px;background:#fff;color:#111;font-weight:800">
        닫기
      </button>`;
    box.querySelector('#__ke_result_close').onclick = () => box.style.display='none';
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function parseTargetUrl(url) {
    let u;
    try { u = new URL(url, ORIGIN); }
    catch { throw new Error('STEP1 URL 형식을 확인해주세요.'); }

    const branch = u.searchParams.get('zizum_num') || u.searchParams.get('zizumNum') || '';
    const themeNum = u.searchParams.get('theme_num') || u.searchParams.get('themeNum') || '';
    const themeInfoNum = u.searchParams.get('theme_info_num') || u.searchParams.get('themeInfoNum') || '';

    if (!branch || !themeNum || !themeInfoNum) {
      throw new Error('URL에서 zizum_num / theme_num / theme_info_num을 찾지 못했습니다.');
    }
    return {branch, themeNum, themeInfoNum};
  }

  function splitPhone(v) {
    const d = String(v || '').replace(/\D/g,'');
    if (d.length === 11) return [d.slice(0,3), d.slice(3,7), d.slice(7)];
    if (d.length === 10) return [d.slice(0,3), d.slice(3,6), d.slice(6)];
    throw new Error('전화번호는 10~11자리로 입력해주세요.');
  }

  async function postUrlEncoded(url, obj) {
    const body = new URLSearchParams();
    for (const [k,v] of Object.entries(obj)) body.set(k, String(v ?? ''));

    const res = await fetch(url, {
      method:'POST',
      credentials:'include',
      cache:'no-store',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Cache-Control':'no-cache, no-store, max-age=0',
        'Pragma':'no-cache'
      },
      body:body.toString()
    });
    return res;
  }



  // 키이스케이프 공식 예약 페이지의 지점별 예약 오픈 시간
  // 2026-10-14 확인 기준.
  function officialBranchOpenTime(branchName) {
    const raw = clean(branchName);
    const n = raw
      .replace(/\s+/g, '')
      .replace(/_/g, '')
      .toUpperCase();

    if (
      n.includes('더오름') ||
      n.includes('우주라이크') ||
      n.includes('LOGIN1') ||
      n.includes('LOGIN2')
    ) return '10:00:00';

    if (n.includes('메모리컴퍼니')) return '10:30:00';
    if (n.includes('후즈데어')) return '11:00:00';
    if (n.includes('STATION')) return '11:30:00';

    // 공식 안내에는 "무비무드"만 13:30으로 표기되어 있어
    // 별도 지점명이 붙은 변형은 임의 추정하지 않는다.
    if (n === '무비무드' || n === '무비무드점') return '13:30:00';

    if (n === '강남점' || n === '강남') return '18:00:00';
    if (n === '부산점' || n === '부산') return '18:00:00';
    if (n === '전주점' || n === '전주') return '18:00:00';
    if (n === '홍대점' || n === '홍대') return '20:00:00';

    return '';
  }

  function addDaysYmd(ymd, deltaDays) {
    const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
    d.setDate(d.getDate() + Number(deltaDays || 0));
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }

  function computeAutoOpenAt(cfg) {
    const targetDate = String(cfg?.targetDate || '');
    const doing = Number(cfg?.doing || 0);
    const branchOpenTime =
      String(cfg?.branchOpenTime || '') ||
      officialBranchOpenTime(cfg?.branchName || '');

    if (!targetDate || !Number.isFinite(doing) || doing < 1 || !branchOpenTime) {
      return '';
    }

    // STEP1 달력은 서버 기준 오늘 ~ 오늘+(doing-1) 범위를 예약 가능 범위로 사용한다.
    // 따라서 목표 날짜가 처음 범위에 들어오는 날은 targetDate-(doing-1).
    const openDate = addDaysYmd(targetDate, -(doing - 1));
    if (!openDate) return '';

    return `${openDate}T${branchOpenTime}`;
  }

  function refreshAutoOpenTime(showStatus=true) {
    const autoEl = document.getElementById('__ke_auto_open_time');
    if (autoEl && !autoEl.checked) return false;

    const branchSel = document.getElementById('__ke_branch');
    const themeSel = document.getElementById('__ke_theme');
    const dateEl = document.getElementById('__ke_date');
    const openEl = document.getElementById('__ke_open');
    const noteEl = document.getElementById('__ke_open_note');

    if (!branchSel || !themeSel || !dateEl || !openEl) return false;

    const branchOpt = branchSel.selectedOptions?.[0];
    const themeOpt = themeSel.selectedOptions?.[0];
    const branchName = clean(branchOpt?.textContent || '');
    const branchOpenTime = officialBranchOpenTime(branchName);
    const doing = String(themeOpt?.dataset?.doing || '');
    const targetDate = dateEl.value || '';

    const cfg = {
      branchName,
      branchOpenTime,
      doing,
      targetDate
    };
    const auto = computeAutoOpenAt(cfg);

    save({
      branchName,
      branchOpenTime,
      doing,
      autoOpenTime: autoEl ? !!autoEl.checked : true
    });

    if (auto) {
      openEl.value = auto;
      save({openAt:auto});
      const display = auto.replace('T', ' ');
      if (noteEl) {
        noteEl.textContent =
          `✅ 자동: ${branchName} ${branchOpenTime.slice(0,5)} · 예약 가능범위 ${doing}일 → ${display}`;
        noteEl.style.color = '#087a37';
      }
      if (showStatus) status(`오픈시각 자동설정\n${display}`);
      return true;
    }

    if (noteEl) {
      if (!branchOpenTime && branchName) {
        noteEl.textContent =
          `⚠️ ${branchName}은 공식 오픈시간 표에서 자동 매칭되지 않습니다. 오픈 시각을 직접 입력해주세요.`;
      } else if (!doing && themeSel.value) {
        noteEl.textContent = '⚠️ 이 테마의 예약 가능 일수(doing)를 확인하지 못했습니다.';
      } else {
        noteEl.textContent = '지점·테마·예약 날짜를 선택하면 오픈 시각을 자동 계산합니다.';
      }
      noteEl.style.color = '#a45100';
    }
    return false;
  }

  async function fetchBranchList() {
    const r = await fetch('/reservation1.php?_branches=' + Date.now(), {
      credentials:'include',
      cache:'no-store',
      headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
    });
    if (!r.ok) throw new Error(`지점목록 HTTP ${r.status}`);

    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sel = doc.querySelector('#zizum, select[name="zizum"], select[name="zizum_num"]');
    if (!sel) throw new Error('지점 선택 목록을 찾지 못했습니다.');

    return [...sel.options]
      .map(o => {
        const name = clean(o.textContent);
        return {
          value: String(o.value || '').trim(),
          name,
          phone: o.dataset?.phone || '',
          openTime: officialBranchOpenTime(name)
        };
      })
      .filter(x => x.value && x.name && !/지점\s*선택/.test(x.name));
  }

  async function fetchThemeList(branch) {
    const r = await postUrlEncoded(RUN_PROC, {
      t:'get_theme_info_list',
      zizum_num:branch
    });
    if (!r.ok) throw new Error(`테마목록 HTTP ${r.status}`);
    const data = await r.json();

    if (!data?.status || !Array.isArray(data?.data)) {
      throw new Error(data?.msg || '테마 목록을 불러오지 못했습니다.');
    }

    return data.data
      .map(item => ({
        themeInfoNum:String(item?.info_num ?? ''),
        themeNum:String(item?.theme_num ?? ''),
        themeName:clean(item?.info_name),
        doing:String(item?.doing ?? '')
      }))
      .filter(x => x.themeInfoNum && x.themeNum && x.themeName);
  }

  async function getThemeMeta(branch, themeInfoNum) {
    const r = await postUrlEncoded(RUN_PROC, {
      t:'get_theme_info_list',
      zizum_num:branch
    });
    if (!r.ok) throw new Error(`테마정보 HTTP ${r.status}`);
    const data = await r.json();
    if (!data?.status || !Array.isArray(data?.data)) {
      throw new Error(data?.msg || '테마 목록 응답 형식을 확인할 수 없습니다.');
    }

    const item = data.data.find(x => String(x?.info_num) === String(themeInfoNum));
    if (!item) throw new Error(`theme_info_num=${themeInfoNum} 테마를 찾지 못했습니다.`);

    return {
      themeInfoNum:String(item.info_num),
      themeNum:String(item.theme_num),
      themeName:clean(item.info_name),
      doing:String(item.doing ?? '')
    };
  }

  // ---------- CAPTCHA ----------
  function readCaptcha() {
    const el =
      document.querySelector('textarea[name="g-recaptcha-response"]') ||
      document.querySelector('[name="g-recaptcha-response"]');
    return clean(el?.value);
  }

  function watchCaptcha() {
    setInterval(() => {
      const token = readCaptcha();
      if (token && token !== currentCaptchaToken) {
        currentCaptchaToken = token;
        captchaSeenAt = Date.now();
        save({captchaSeenAt});
        loadBranchesUI().then(() => {
      if (cfg.branch && [...branchSel.options].some(o => o.value === cfg.branch)) {
        branchSel.value = cfg.branch;
        return loadThemesUI(cfg.branch);
      }
    }).then(() => {
      if (cfg.themeInfoNum && [...themeSel.options].some(o => o.value === cfg.themeInfoNum)) {
        themeSel.value = cfg.themeInfoNum;
      }
      refreshAutoOpenTime(false);
    }).catch(e => {
      status(`지점/테마 자동 불러오기 실패: ${e?.message || e}`);
    });

    updateCaptchaState();
      } else if (!token && currentCaptchaToken) {
        currentCaptchaToken = '';
        captchaSeenAt = 0;
        save({captchaSeenAt:0});
        updateCaptchaState();
      }
    }, 250);
  }

  function updateCaptchaState() {
    const el = document.getElementById('__ke_captcha_state');
    if (!el) return;
    const token = readCaptcha();
    if (token) {
      const sec = captchaSeenAt ? Math.round((Date.now()-captchaSeenAt)/1000) : 0;
      el.textContent = `✅ reCAPTCHA 확인됨 · 약 ${sec}초 경과`;
      el.style.color = '#087a37';
    } else {
      el.textContent = location.pathname.includes('reservation2.php')
        ? '⚠️ 아래 사이트의 “로봇이 아닙니다”를 직접 체크해주세요.'
        : 'STEP 2(reservation2.php)에서 reCAPTCHA를 직접 체크해야 합니다.';
      el.style.color = '#a45100';
    }
  }

  // ---------- server clock ----------
  function median(a) {
    if (!a.length) return 0;
    const b = [...a].sort((x,y)=>x-y);
    const m = Math.floor(b.length/2);
    return b.length % 2 ? b[m] : (b[m-1]+b[m])/2;
  }

  const serverNow = () => Date.now() + clockOffset;

  async function calibrateClock(samples=5, quiet=false) {
    const rows = [];
    if (!quiet) status('키이스케이프 서버시간 보정 중…');

    for (let i=0; i<samples; i++) {
      try {
        const t0 = Date.now();
        const r = await fetch(`/reservation1.php?_clock=${t0}_${i}`, {
          credentials:'include',
          cache:'no-store',
          headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
        });
        const t1 = Date.now();
        const d = r.headers.get('Date');
        if (d) {
          const serverSec = Date.parse(d);
          if (Number.isFinite(serverSec)) {
            rows.push({
              rtt:t1-t0,
              // HTTP Date는 초 단위이므로 해당 초 중앙값으로 보정
              offset:(serverSec+500)-((t0+t1)/2)
            });
          }
        }
      } catch {}
      if (i+1 < samples) await sleep(35);
    }

    if (!rows.length) {
      if (!quiet) status(`서버 Date 미수신 · 기존 보정 ${clockOffset>=0?'+':''}${Math.round(clockOffset)}ms`);
      return false;
    }

    rows.sort((a,b)=>a.rtt-b.rtt);
    const keep = rows.slice(0, Math.min(5, rows.length));
    clockOffset = Math.round(median(keep.map(x=>x.offset)));
    const rtt = Math.round(median(keep.map(x=>x.rtt)));
    save({offsetMs:clockOffset, rttMs:rtt});

    if (!quiet) status(`서버시간 보정 ${clockOffset>=0?'+':''}${clockOffset}ms · RTT 약 ${rtt}ms`);
    return true;
  }

  // ---------- theme time parsing v1.5 ----------
  function timeParts(targetTime) {
    const m = String(targetTime || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? {h:String(Number(m[1])), hh:String(m[1]).padStart(2,'0'), mm:m[2]} : {h:'',hh:'',mm:''};
  }

  function stringHasTargetTime(s, targetTime) {
    if (typeof s !== 'string') return false;
    const wanted = normTime(targetTime);
    const ns = normTime(s);
    if (ns.includes(wanted)) return true;

    const p = timeParts(targetTime);
    if (!p.hh) return false;
    const re = new RegExp(`(^|\\D)0?${Number(p.hh)}\\s*:\\s*${p.mm}(\\D|$)`);
    return re.test(s);
  }

  const TIME_ID_KEYS = [
    'theme_time_num','themeTimeNum','theme_time_id','themeTimeId',
    'theme_time_idx','themeTimeIdx','time_num','timeNum','time_id','timeId',
    'time_idx','timeIdx','schedule_num','scheduleNum','schedule_id','scheduleId',
    'reserve_time_num','reserveTimeNum','reservation_time_num','reservationTimeNum',
    'seq','idx','value','num','id'
  ];

  function numericString(v) {
    const s = String(v ?? '').trim();
    return /^\d+$/.test(s) ? s : '';
  }

  function likelyTimeComponentNumber(v, targetTime) {
    const s = numericString(v);
    if (!s) return true;
    const p = timeParts(targetTime);
    const n = Number(s);
    return (
      s === p.h || s === p.hh || s === p.mm ||
      s === `${p.hh}${p.mm}` ||
      n === Number(p.h) || n === Number(p.mm)
    );
  }

  function chooseIdFromObjectV15(obj, targetTime) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';

    // First: exact semantic keys.
    for (const k of TIME_ID_KEYS) {
      if (obj[k] !== undefined) {
        const s = numericString(obj[k]);
        if (s && !likelyTimeComponentNumber(s, targetTime)) return s;
      }
    }

    // Second: unknown key names that still look like an ID/sequence/value.
    for (const [k,v] of Object.entries(obj)) {
      const s = numericString(v);
      if (!s || likelyTimeComponentNumber(s, targetTime)) continue;
      const lk = String(k).toLowerCase();
      if (/(time.*(num|id|idx|seq)|(?:num|id|idx|seq|value)$)/i.test(lk)) return s;
    }
    return '';
  }

  function likelyUnavailableV15(value) {
    const text = JSON.stringify(value ?? '').toLowerCase();
    return (
      text.includes('마감') ||
      text.includes('예약불가') ||
      text.includes('예약 불가') ||
      text.includes('"available":false') ||
      text.includes('"disabled":true') ||
      text.includes('"status":false') ||
      text.includes('"use_yn":"n"') ||
      text.includes('"possible":"n"')
    );
  }

  // KEYESCAPE production UI uses .selThemeTimeNum and reads its .value(),
  // then reads the immediately following element text as the displayed time.
  function parseHtmlTimePickerString(s, targetTime) {
    if (typeof s !== 'string' || !stringHasTargetTime(s, targetTime)) return null;

    // Real HTML first.
    try {
      const doc = new DOMParser().parseFromString(`<div id="r">${s}</div>`, 'text/html');
      const root = doc.querySelector('#r');
      for (const el of root?.querySelectorAll('.selThemeTimeNum') || []) {
        const label = clean(
          el.nextElementSibling?.textContent ||
          el.parentElement?.textContent ||
          ''
        );
        const val = numericString(el.value || el.getAttribute('value') || '');
        if (val && stringHasTargetTime(label, targetTime)) {
          return {timeNum:val, row:{source:'html.selThemeTimeNum', label}};
        }
      }

      // Generic input/button value immediately next to the target time.
      const candidates = root?.querySelectorAll('input[value],button[value],option[value]') || [];
      for (const el of candidates) {
        const val = numericString(el.getAttribute('value') || '');
        if (!val || likelyTimeComponentNumber(val, targetTime)) continue;
        const label = clean(
          el.nextElementSibling?.textContent ||
          el.parentElement?.textContent ||
          ''
        );
        if (stringHasTargetTime(label, targetTime)) {
          return {timeNum:val, row:{source:'html.value-near-time', label}};
        }
      }
    } catch {}

    // Escaped/minified HTML or JS snippets.
    const escapedTime = String(targetTime).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const compact = s.replace(/\\"/g,'"').replace(/\\'/g,"'");

    // Tag containing selThemeTimeNum + value, then nearby target time.
    const tagRe = /<[^>]*class=["'][^"']*selThemeTimeNum[^"']*["'][^>]*>/ig;
    let m;
    while ((m = tagRe.exec(compact))) {
      const tag = m[0];
      const vm = tag.match(/\bvalue=["']?(\d+)["']?/i);
      if (!vm) continue;
      const near = compact.slice(m.index, Math.min(compact.length, m.index + 500));
      if (new RegExp(escapedTime).test(near)) {
        return {timeNum:vm[1], row:{source:'regex.selThemeTimeNum'}};
      }
    }

    // value="1234" near 17:30, both directions.
    const pos = compact.search(new RegExp(escapedTime));
    if (pos >= 0) {
      const near = compact.slice(Math.max(0,pos-700), Math.min(compact.length,pos+700));
      const vals = [...near.matchAll(/\bvalue=["']?(\d+)["']?/ig)]
        .map(x => x[1])
        .filter(x => !likelyTimeComponentNumber(x, targetTime));
      if (vals.length === 1) return {timeNum:vals[0], row:{source:'regex.value-near-time'}};
    }

    return null;
  }

  function objectContainsTargetTimeV15(obj, targetTime) {
    try {
      for (const v of Object.values(obj || {})) {
        if (typeof v === 'string' && stringHasTargetTime(v, targetTime)) return true;
      }
    } catch {}
    return false;
  }


  // KEYESCAPE 실제 get_theme_time 응답 구조:
  // { num:2057, theme_num:63, hh:"09", mm:"30", enable:"Y", ... }
  // 화면의 시간은 hh:mm으로 조합되고, 실제 선택값(themeTimeNum)은 num이다.
  function parseKeyescapeHhMmRow(obj, targetTime) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

    const hhRaw = obj.hh ?? obj.hour ?? obj.HH;
    const mmRaw = obj.mm ?? obj.minute ?? obj.MM;
    const idRaw = obj.num ?? obj.theme_time_num ?? obj.themeTimeNum;

    if (hhRaw == null || mmRaw == null || idRaw == null) return null;

    const hh = String(Number(hhRaw)).padStart(2, '0');
    const mm = String(Number(mmRaw)).padStart(2, '0');
    const rowTime = `${hh}:${mm}`;

    if (rowTime !== normTime(targetTime)) return null;

    const id = numericString(idRaw);
    if (!id) return null;

    // 현재 서버 응답의 enable=Y가 사용 가능 슬롯을 뜻함.
    // 명시적으로 N/false인 경우만 제외한다.
    const enable = obj.enable;
    if (
      enable === false ||
      String(enable ?? '').toUpperCase() === 'N' ||
      String(enable ?? '').toLowerCase() === 'false'
    ) {
      return null;
    }

    return {
      timeNum:id,
      row:{
        source:'keyescape.hh-mm-num',
        hh:String(hhRaw),
        mm:String(mmRaw),
        enable:String(enable ?? ''),
        gubun:String(obj.gubun ?? ''),
        theme_num:String(obj.theme_num ?? obj.themeNum ?? '')
      }
    };
  }

  function walkForTimeV15(value, targetTime, seen=new Set()) {
    if (value == null) return null;

    // KEYESCAPE의 실제 hh/mm/num 구조를 최우선으로 처리.
    if (typeof value === 'object' && !Array.isArray(value)) {
      const exactRow = parseKeyescapeHhMmRow(value, targetTime);
      if (exactRow) return exactRow;
    }

    // HTML/JS string can itself contain both target time and ID.
    if (typeof value === 'string') {
      return parseHtmlTimePickerString(value, targetTime);
    }
    if (typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (!likelyUnavailableV15(value)) {
      if (!Array.isArray(value) && objectContainsTargetTimeV15(value, targetTime)) {
        const id = chooseIdFromObjectV15(value, targetTime);
        if (id) return {timeNum:id, row:value};
      }

      // Some APIs use compact arrays such as [timeNum, "17:30", ...].
      if (Array.isArray(value)) {
        const directHasTime = value.some(v =>
          typeof v === 'string' && stringHasTargetTime(v, targetTime)
        );
        if (directHasTime) {
          const nums = value
            .map(v => (typeof v === 'number' || typeof v === 'string') ? numericString(v) : '')
            .filter(v => v && !likelyTimeComponentNumber(v, targetTime));
          // Prefer IDs >= 100 because time parts / booleans / statuses are usually small.
          const preferred = nums.find(v => Number(v) >= 100) || (nums.length === 1 ? nums[0] : '');
          if (preferred) return {timeNum:preferred, row:{source:'array-sibling', raw:value}};
        }
      }
    }

    // Recurse.
    if (Array.isArray(value)) {
      for (const x of value) {
        const r = walkForTimeV15(x, targetTime, seen);
        if (r) return r;
      }
    } else {
      for (const x of Object.values(value)) {
        const r = walkForTimeV15(x, targetTime, seen);
        if (r) return r;
      }
    }
    return null;
  }

  function flattenLeaves(value, path=[], out=[], seen=new Set()) {
    if (value == null) return out;
    if (typeof value !== 'object') {
      out.push({path:[...path], key:String(path[path.length-1] ?? ''), value});
      return out;
    }
    if (seen.has(value)) return out;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((v,i)=>flattenLeaves(v,[...path,i],out,seen));
    } else {
      Object.entries(value).forEach(([k,v])=>flattenLeaves(v,[...path,k],out,seen));
    }
    return out;
  }

  function commonPrefixLen(a,b) {
    let n=0;
    while (n<a.length && n<b.length && String(a[n])===String(b[n])) n++;
    return n;
  }

  function pathScoredFallback(data, targetTime) {
    const leaves = flattenLeaves(data);
    const timeLeaves = leaves.filter(x =>
      typeof x.value === 'string' && stringHasTargetTime(x.value, targetTime)
    );
    if (!timeLeaves.length) return null;

    let best=null;
    for (const t of timeLeaves) {
      for (const c of leaves) {
        const num = numericString(c.value);
        if (!num || likelyTimeComponentNumber(num,targetTime)) continue;

        let score = commonPrefixLen(t.path,c.path)*20;
        const key = String(c.key||'');
        if (TIME_ID_KEYS.includes(key)) score += 160;
        if (/(time.*(num|id|idx|seq)|(?:num|id|idx|seq|value)$)/i.test(key)) score += 90;
        if (Number(num) >= 100) score += 20;
        if (Number(num) >= 1000) score += 10;

        // Penalize obvious dates / phone-ish / price-ish fields if they appear.
        if (/(date|year|month|day|price|phone|mobile|zizum|theme_num$|themeNum$)/i.test(key)) score -= 100;

        if (!best || score > best.score) best={score,timeNum:num,row:{source:'path-score',timePath:t.path,idPath:c.path,key}};
      }
    }
    return best && best.score >= 40 ? best : null;
  }

  function fallbackRegexTimeV15(data, targetTime) {
    const s = JSON.stringify(data);
    const wanted = String(targetTime).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pos = s.search(new RegExp(wanted));
    if (pos < 0) return null;
    const chunk = s.slice(Math.max(0,pos-1200), Math.min(s.length,pos+1200));

    const patterns = [
      /"theme_time_num"\s*:\s*"?(\d+)"?/i,
      /"themeTimeNum"\s*:\s*"?(\d+)"?/i,
      /"theme_time_id"\s*:\s*"?(\d+)"?/i,
      /"themeTimeId"\s*:\s*"?(\d+)"?/i,
      /"time_num"\s*:\s*"?(\d+)"?/i,
      /"timeNum"\s*:\s*"?(\d+)"?/i,
      /"time_id"\s*:\s*"?(\d+)"?/i,
      /"timeId"\s*:\s*"?(\d+)"?/i,
      /"value"\s*:\s*"?(\d+)"?/i,
      /"seq"\s*:\s*"?(\d+)"?/i,
      /"idx"\s*:\s*"?(\d+)"?/i,
      /"num"\s*:\s*"?(\d+)"?/i,
      /"id"\s*:\s*"?(\d+)"?/i
    ];
    for (const re of patterns) {
      const m = chunk.match(re);
      if (m && !likelyTimeComponentNumber(m[1],targetTime)) {
        return {timeNum:m[1], row:{source:'regex-json'}};
      }
    }

    // Last chance: HTML in JSON string.
    return parseHtmlTimePickerString(chunk, targetTime);
  }

  function summarizeResponseShape(data) {
    const leaves = flattenLeaves(data).slice(0,80);
    const rows = leaves.map(x => {
      let v = String(x.value ?? '');
      if (v.length > 80) v = v.slice(0,80)+'…';
      return `${x.path.join('.') || '(root)'}=${v}`;
    });
    return rows.slice(0,30).join(' | ');
  }

  async function fetchTargetTime(cfg) {
    const r = await postUrlEncoded(RUN_PROC, {
      t:'get_theme_time',
      date:cfg.targetDate,
      zizumNum:cfg.branch,
      themeNum:cfg.themeNum
    });

    if (r.status === 403 || r.status === 429) {
      throw new Error(`요청 제한 HTTP ${r.status}`);
    }
    if (!r.ok) throw new Error(`시간조회 HTTP ${r.status}`);

    const data = await r.json();
    if (!data?.status) return {
      found:false,
      msg:data?.msg || '아직 오픈되지 않음',
      debug:summarizeResponseShape(data?.data)
    };

    let found = null;

    // 서버가 배열로 내려주는 현재 KEYESCAPE 구조를 가장 먼저 정확히 검사.
    if (Array.isArray(data?.data)) {
      for (const row of data.data) {
        const hit = parseKeyescapeHhMmRow(row, cfg.targetTime);
        if (hit) {
          found = hit;
          break;
        }
      }
    }

    if (!found) found = walkForTimeV15(data?.data, cfg.targetTime);
    if (!found) found = pathScoredFallback(data?.data, cfg.targetTime);
    if (!found) found = fallbackRegexTimeV15(data?.data, cfg.targetTime);

    if (!found) {
      const tp = timeParts(cfg.targetTime);
      const hasTarget = stringHasTargetTime(JSON.stringify(data?.data), cfg.targetTime) ||
        (Array.isArray(data?.data) && data.data.some(row => {
          if (!row || typeof row !== 'object') return false;
          const hh = String(Number(row.hh ?? row.hour ?? -1)).padStart(2,'0');
          const mm = String(Number(row.mm ?? row.minute ?? -1)).padStart(2,'0');
          return `${hh}:${mm}` === `${tp.hh}:${tp.mm}`;
        }));
      return {
        found:false,
        msg:hasTarget
          ? '목표 시간 행은 응답에 있으나 시간 ID 추출 실패'
          : '목표 시간이 아직 응답에 없음/미오픈',
        debug:summarizeResponseShape(data?.data),
        raw:JSON.stringify(data?.data).slice(0,1800)
      };
    }
    return {
      found:true,
      timeNum:String(found.timeNum),
      source:found?.row?.source || 'object',
      raw:data
    };
  }

  // ---------- target STEP2 HTML ----------
  async function fetchTargetStep2(cfg, timeNum) {
    const r = await postUrlEncoded(STEP2, {
      zizumNum:cfg.branch,
      themeNum:cfg.themeNum,
      themeInfoNum:cfg.themeInfoNum,
      revDays:cfg.targetDate,
      themeTimeNum:timeNum,
      revTimes:cfg.targetTime,
      themeName:cfg.themeName
    });

    if (!r.ok) throw new Error(`STEP2 준비 HTTP ${r.status}`);
    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const form = doc.querySelector('#form');
    if (!form) throw new Error('STEP2 예약 폼을 찾지 못했습니다.');

    const hidden = {};
    for (const el of form.querySelectorAll('input[name]')) {
      hidden[el.name] = el.value || '';
    }

    const personSelect = form.querySelector('select[name="person"]');
    if (!personSelect) throw new Error('STEP2 인원 선택 항목을 찾지 못했습니다.');

    const opt = [...personSelect.options].find(o => String(o.value) === String(cfg.people));
    if (!opt) throw new Error(`${cfg.people}명 예약 옵션이 없습니다.`);

    const revPrice =
      opt.getAttribute('data-rev_price') ||
      opt.getAttribute('data-rev-price') ||
      hidden.rev_price ||
      '';

    if (!revPrice) throw new Error('예약금(rev_price)을 확인하지 못했습니다.');

    return {
      hidden,
      revPrice:String(revPrice),
      person:String(cfg.people)
    };
  }

  // ---------- final direct reservation ----------
  async function sendFinalReservation(cfg, timeNum, targetStep2, captchaToken) {
    const [p1,p2,p3] = splitPhone(cfg.phone);

    const fd = new FormData();
    const data = {
      device:'mobile',
      t:'ins_rev',
      theme_info_num:cfg.themeInfoNum,
      zizum_num:cfg.branch,
      theme_num:cfg.themeNum,
      rev_days:cfg.targetDate,
      theme_time_num:timeNum,
      rev_price:targetStep2.revPrice,
      person:cfg.people,
      name:cfg.name,
      mobile1:p1,
      mobile2:p2,
      mobile3:p3,
      'g-recaptcha-response':captchaToken,
      payment:'D',
      agree_1:'on',
      agree_2:'on'
    };
    for (const [k,v] of Object.entries(data)) fd.append(k, String(v));

    const t0 = performance.now();
    const r = await fetch(RUN_PROC, {
      method:'POST',
      credentials:'include',
      cache:'no-store',
      headers:{
        'Cache-Control':'no-cache, no-store, max-age=0',
        'Pragma':'no-cache'
      },
      body:fd
    });
    const elapsed = performance.now()-t0;

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); }
    catch {
      throw new Error(`최종 서버 응답 JSON 해석 실패 (HTTP ${r.status})`);
    }

    if (!r.ok) throw new Error(`최종 예약 HTTP ${r.status}`);
    if (!json?.status) {
      throw new Error(json?.msg || '예약 서버가 실패 응답을 반환했습니다.');
    }

    const num = String(json?.data?.num || '');
    const ckCode = String(json?.data?.ck_code || '');

    if (!num || !ckCode) {
      throw new Error('성공 응답이지만 num/ck_code가 없습니다.');
    }

    return {
      num,
      ckCode,
      msg:clean(json?.msg || '예약이 처리되었습니다.'),
      elapsed
    };
  }

  async function reserveOnce(cfg, timeNum) {
    const captchaToken = readCaptcha();
    if (!captchaToken) {
      throw new Error('reCAPTCHA 토큰이 없습니다. STEP2에서 “로봇이 아닙니다”를 직접 체크해주세요.');
    }

    // 일반적으로 reCAPTCHA 토큰은 짧게 유효하므로 너무 오래된 토큰은 사용하지 않음.
    const ageMs = captchaSeenAt ? Date.now()-captchaSeenAt : 0;
    if (ageMs > 105000) {
      throw new Error('reCAPTCHA를 체크한 지 오래되었습니다. 다시 체크한 뒤 재시도해주세요.');
    }

    status(`목표 시간 ID ${timeNum} 확보\nSTEP2 값 서버에서 직접 준비 중…`);
    const step2 = await fetchTargetStep2(cfg, timeNum);

    status(
      `STEP2 준비 완료 · 예약금 ${Number(step2.revPrice).toLocaleString()}원\n` +
      `최종 예약 API 직접 전송…`
    );

    const result = await sendFinalReservation(cfg, timeNum, step2, captchaToken);
    save({armed:false});

    showResult(
      'success',
      '예약 완료',
      `${cfg.themeName}\n${cfg.targetDate} ${cfg.targetTime}\n` +
      `예약번호: ${result.num}\n서버 처리 ${result.elapsed.toFixed(0)}ms\n${result.msg}`
    );
    status(
      `✅ 예약 완료\n${cfg.targetDate} ${cfg.targetTime}\n` +
      `예약번호 ${result.num}`
    );

    if (cfg.autoOpenResult) {
      setTimeout(() => {
        location.href =
          `/reservation3.php?num=${encodeURIComponent(result.num)}` +
          `&ck_code=${encodeURIComponent(result.ckCode)}`;
      }, 900);
    }
    return result;
  }

  async function burst(cfg) {
    const started = serverNow();
    let attempt = 0;
    status('오픈 도달 → 목표 시간 서버 직접조회 시작');

    while (!stopped && load().armed) {
      attempt++;
      const cycle = performance.now();

      try {
        const r = await fetchTargetTime(cfg);
        if (r.found) {
          showResult(
            'grabbed',
            '목표 슬롯 감지',
            `${cfg.themeName}\n${cfg.targetDate} ${cfg.targetTime}\n` +
            `time ID: ${r.timeNum}\n추출: ${r.source || '자동'}\n즉시 예약 전송 중`
          );
          status(`${cfg.targetTime} 감지 · time ID ${r.timeNum}\n최종 예약 직송`);
          await reserveOnce(cfg, r.timeNum);
          return;
        }

        if (attempt === 1 || attempt % 10 === 0) {
          status(`시간조회 ${attempt}회 · 아직 미오픈/슬롯 미검출\n${clean(r.msg).slice(0,90)}`);
        }
      } catch (e) {
        const msg = String(e?.message || e);
        if (/403|429|요청 제한|reCAPTCHA|예약 서버가 실패/.test(msg)) {
          save({armed:false});
          throw e;
        }
        if (attempt === 1 || attempt % 8 === 0) status(`조회 ${attempt}회 · ${msg.slice(0,90)}`);
      }

      const elapsed = serverNow()-started;
      // 서버 응답이 돌아온 뒤 다음 요청을 보내는 순차 폴링.
      // 정각 첫 2.5초만 촘촘하게, 이후 완화.
      let gap = elapsed < 2500 ? 55 : elapsed < 8000 ? 140 : 450;
      const used = performance.now()-cycle;
      if (used < gap) await sleep(gap-used);
    }
  }

  async function waitUntilOpen(cfg) {
    stopped = false;
    save({armed:true});

    const target = new Date(cfg.openAt).getTime();
    if (!Number.isFinite(target)) {
      status('오픈시각이 없어서 즉시 DIRECT 조회를 시작합니다.');
      return burst(cfg);
    }

    await calibrateClock(5);

    let sync8=false, sync3=false, prewarm=false;
    const tick = async () => {
      if (stopped || !load().armed) return;

      let remain = target-serverNow();

      if (!sync8 && remain <= 9000 && remain > 4500) {
        sync8 = true;
        await calibrateClock(7, true);
        remain = target-serverNow();
      }
      if (!prewarm && remain <= 6000 && remain > 3200) {
        prewarm = true;
        fetch('/reservation1.php?_prewarm='+Date.now(), {
          credentials:'include', cache:'no-store'
        }).catch(()=>{});
      }
      if (!sync3 && remain <= 3500 && remain > 900) {
        sync3 = true;
        await calibrateClock(5, true);
        remain = target-serverNow();
      }

      if (remain <= 0) {
        status(`서버시간 오픈 도달\n보정 ${clockOffset>=0?'+':''}${clockOffset}ms`);
        try { await burst(cfg); }
        catch (e) {
          save({armed:false});
          const msg = String(e?.message || e);
          status(`❌ ${msg}`);
          showResult('error', '예약 실패/오류', msg);
        }
        return;
      }

      const cap = readCaptcha();
      const capMsg = cap ? 'reCAPTCHA ✅' : 'reCAPTCHA ❌';
      status(
        `서버시간 기준 대기\n` +
        `오픈까지 ${(remain/1000).toFixed(remain<3000?3:1)}초\n` +
        `보정 ${clockOffset>=0?'+':''}${clockOffset}ms · ${capMsg}`
      );

      setTimeout(tick, remain<3000 ? 5 : remain<10000 ? 100 : 700);
    };
    tick();
  }

  // ---------- UI ----------
  async function loadBranchesUI() {
    const sel = document.getElementById('__ke_branch');
    if (!sel) return;
    const old = sel.value || load().branch || '';

    sel.innerHTML = '<option value="">지점 불러오는 중…</option>';
    const rows = await fetchBranchList();

    sel.innerHTML = '<option value="">지점 선택</option>';
    for (const b of rows) {
      const o = document.createElement('option');
      o.value = b.value;
      o.textContent = b.name;
      o.dataset.branchName = b.name;
      o.dataset.openTime = b.openTime || '';
      sel.appendChild(o);
    }

    if ([...sel.options].some(o => o.value === old)) sel.value = old;

    if (sel.value) {
      await loadThemesUI(sel.value);
    } else {
      document.getElementById('__ke_theme').innerHTML =
        '<option value="">먼저 지점을 선택하세요</option>';
    }

    status(`지점 ${rows.length}개 불러옴`);
  }

  async function loadThemesUI(branch) {
    const sel = document.getElementById('__ke_theme');
    if (!sel) return;

    const cfg = load();
    const oldInfo = sel.value || cfg.themeInfoNum || '';

    sel.innerHTML = '<option value="">테마 불러오는 중…</option>';
    const rows = await fetchThemeList(branch);

    sel.innerHTML = '<option value="">테마 선택</option>';
    for (const t of rows) {
      const o = document.createElement('option');
      o.value = t.themeInfoNum;
      o.textContent = t.themeName;
      o.dataset.themeNum = t.themeNum;
      o.dataset.themeName = t.themeName;
      o.dataset.doing = t.doing;
      sel.appendChild(o);
    }

    if ([...sel.options].some(o => o.value === oldInfo)) sel.value = oldInfo;
    status(`테마 ${rows.length}개 불러옴`);
  }

  async function resolveTargetFromUI() {
    const branchSel = document.getElementById('__ke_branch');
    const themeSel = document.getElementById('__ke_theme');

    const branch = branchSel.value;
    const opt = themeSel.selectedOptions[0];

    if (!branch) throw new Error('지점을 선택해주세요.');
    if (!opt || !themeSel.value) throw new Error('테마를 선택해주세요.');

    const branchOpt = branchSel.selectedOptions[0];
    const branchName = clean(branchOpt?.dataset?.branchName || branchOpt?.textContent || '');
    const branchOpenTime =
      String(branchOpt?.dataset?.openTime || '') ||
      officialBranchOpenTime(branchName);

    const patch = {
      branch,
      branchName,
      branchOpenTime,
      themeInfoNum:String(themeSel.value),
      themeNum:String(opt.dataset.themeNum || ''),
      themeName:clean(opt.dataset.themeName || opt.textContent),
      doing:String(opt.dataset.doing || '')
    };

    if (!patch.themeNum || !patch.themeInfoNum || !patch.themeName) {
      throw new Error('선택한 테마의 내부 ID를 확인하지 못했습니다.');
    }

    save(patch);

    document.getElementById('__ke_target_info').textContent =
      `✅ ${patch.themeName} · 지점ID ${patch.branch} · theme ${patch.themeNum} · info ${patch.themeInfoNum}`;

    status('대상 지점/테마 확인 완료');
    return {...load(), ...patch};
  }

  function readUiCfg() {
    const cfg = load();
    return {
      ...cfg,
      targetDate:document.getElementById('__ke_date').value,
      targetTime:document.getElementById('__ke_time').value,
      openAt:document.getElementById('__ke_open').value,
      autoOpenTime:!!document.getElementById('__ke_auto_open_time').checked,
      name:clean(document.getElementById('__ke_name').value),
      phone:clean(document.getElementById('__ke_phone').value),
      people:document.getElementById('__ke_people').value,
      autoOpenResult:document.getElementById('__ke_auto_result').checked
    };
  }

  function validateCfg(cfg) {
    const miss = [];
    if (!cfg.branch || !cfg.themeNum || !cfg.themeInfoNum || !cfg.themeName) miss.push('지점/테마 선택');
    if (!cfg.targetDate) miss.push('예약 날짜');
    if (!cfg.targetTime) miss.push('희망 시간');
    if (!cfg.openAt) miss.push('오픈 시각');
    if (!cfg.name) miss.push('예약자 이름');
    if (!/^\d{10,11}$/.test(cfg.phone.replace(/\D/g,''))) miss.push('전화번호');
    if (miss.length) throw new Error('확인 필요: ' + miss.join(', '));

    if (!location.pathname.includes('reservation2.php')) {
      throw new Error('DIRECT 대기는 STEP2(reservation2.php) 페이지에서 실행해주세요.');
    }
    if (!readCaptcha()) {
      throw new Error('먼저 STEP2의 “로봇이 아닙니다” reCAPTCHA를 직접 체크해주세요.');
    }
  }

  function makePanel() {
    if (!document.body || document.getElementById('__ke_direct_panel')) return;

    const cfg = load();

    const st = document.createElement('style');
    st.textContent = `
      #__ke_direct_panel{position:fixed!important;right:9px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 9px)!important;z-index:2147483647!important;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#111}
      #__ke_direct_toggle{display:block!important;visibility:visible!important;opacity:1!important;border:0;border-radius:999px;padding:11px 15px;background:#111;color:#fff;font-weight:900;font-size:14px;box-shadow:0 5px 18px #0005}
      #__ke_direct_box{display:none;width:min(370px,calc(100vw - 18px));max-height:82vh;overflow:auto;margin-top:7px;padding:14px;border-radius:16px;background:#fff;box-shadow:0 10px 32px #0006}
      #__ke_direct_box.open{display:block}
      #__ke_direct_box label{display:block;margin:7px 0;font-size:12px;font-weight:800}
      #__ke_direct_box input,#__ke_direct_box select{box-sizing:border-box;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:9px;background:#fff;font-size:16px}
      .ke2{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .ke-title{font-size:18px;font-weight:900}
      .ke-sub{font-size:11px;color:#666;line-height:1.45;margin:5px 0 8px}
      .ke-btn{width:100%;border:0;border-radius:9px;padding:11px;font-weight:900}
      #__ke_check{background:#ededed;color:#111}
      #__ke_time_test{background:#e8f1ff;color:#063e86;margin-top:7px}
      #__ke_start{background:#111;color:#fff}
      #__ke_stop{background:#eee;color:#111}
      .ke-actions{display:grid;grid-template-columns:1.35fr .65fr;gap:7px;margin-top:9px}
      #__ke_direct_status{white-space:pre-wrap;background:#f3f3f3;border-radius:10px;padding:10px;margin-top:10px;font-size:12px;line-height:1.45}
      #__ke_target_info,#__ke_captcha_state{font-size:11px;line-height:1.45;margin-top:5px}
      .ke-warn{font-size:11px;line-height:1.45;color:#9c1d1d;margin-top:8px}
    `;
    document.documentElement.appendChild(st);

    const p = document.createElement('div');
    p.id = '__ke_direct_panel';
    p.innerHTML = `
      <button id="__ke_direct_toggle" type="button">⚡ KEY DIRECT</button>
      <div id="__ke_direct_box">
        <div class="ke-title">KEYESCAPE DIRECT FAST</div>
        <div class="ke-sub">
          지점·테마·예약일을 선택하면 내부 ID와 공식 오픈시각까지 자동으로 계산하고, 정각에 서버로 직접 예약합니다.
        </div>

        <div class="ke2">
          <label>지점
            <select id="__ke_branch"><option value="">지점 불러오는 중…</option></select>
          </label>
          <label>테마
            <select id="__ke_theme"><option value="">먼저 지점을 선택하세요</option></select>
          </label>
        </div>
        <button id="__ke_check" class="ke-btn" type="button">지점/테마 다시 불러오기</button>
        <button id="__ke_time_test" class="ke-btn" type="button">🔎 시간 ID 테스트 (예약 안 함)</button>
        <div id="__ke_target_info"></div>

        <div class="ke2">
          <label>예약 날짜<input id="__ke_date" type="date"></label>
          <label>희망 시간<input id="__ke_time" type="time" step="60"></label>
        </div>

        <label>예약 오픈 시각
          <input id="__ke_open" type="datetime-local" step="1">
        </label>
        <label style="font-weight:700">
          <input id="__ke_auto_open_time" type="checkbox" style="width:auto;margin-right:6px">
          지점/테마/예약일 기준 오픈 시각 자동설정
        </label>
        <div id="__ke_open_note" style="font-size:11px;line-height:1.45;margin-top:3px"></div>

        <label>예약자 이름<input id="__ke_name" type="text"></label>
        <label>전화번호<input id="__ke_phone" type="tel" inputmode="tel" placeholder="010-1234-5678"></label>

        <label>인원
          <select id="__ke_people">
            <option value="1">1명</option><option value="2">2명</option>
            <option value="3">3명</option><option value="4">4명</option>
            <option value="5">5명</option><option value="6">6명</option>
          </select>
        </label>

        <label style="font-weight:700">
          <input id="__ke_auto_result" type="checkbox" style="width:auto;margin-right:6px">
          성공하면 예약완료(STEP3) 화면 자동 이동
        </label>

        <div id="__ke_captcha_state"></div>

        <div class="ke-actions">
          <button id="__ke_start" class="ke-btn" type="button">DIRECT 예약 대기 시작</button>
          <button id="__ke_stop" class="ke-btn" type="button">중지</button>
        </div>

        <div id="__ke_direct_status">준비됨</div>

        <div class="ke-warn">
          reCAPTCHA는 자동으로 풀거나 우회하지 않습니다.
          STEP2에서 직접 “로봇이 아닙니다”를 체크한 뒤 실행하세요.
          경쟁 예약 시에는 오픈 약 30~60초 전에 체크하는 것을 권장합니다.
        </div>
      </div>`;
    document.body.appendChild(p);

    document.getElementById('__ke_direct_toggle').onclick =
      () => document.getElementById('__ke_direct_box').classList.toggle('open');

    document.getElementById('__ke_date').value = cfg.targetDate || '';
    document.getElementById('__ke_time').value = cfg.targetTime || '';
    document.getElementById('__ke_open').value = cfg.openAt || '';
    document.getElementById('__ke_auto_open_time').checked = cfg.autoOpenTime !== false;
    document.getElementById('__ke_name').value = cfg.name || '';
    document.getElementById('__ke_phone').value = cfg.phone || '';
    document.getElementById('__ke_people').value = cfg.people || '2';
    document.getElementById('__ke_auto_result').checked = cfg.autoOpenResult !== false;

    const branchSel = document.getElementById('__ke_branch');
    const themeSel = document.getElementById('__ke_theme');

    branchSel.onchange = async () => {
      try {
        const branch = branchSel.value;
        if (!branch) {
          themeSel.innerHTML = '<option value="">먼저 지점을 선택하세요</option>';
          return;
        }
        await loadThemesUI(branch);
        refreshAutoOpenTime(false);
      } catch (e) {
        status(`❌ 테마 불러오기 실패: ${e?.message || e}`);
      }
    };

    themeSel.onchange = () => {
      const opt = themeSel.selectedOptions[0];
      if (!themeSel.value || !opt) return;
      const branchOpt = branchSel.selectedOptions[0];
      const branchName = clean(branchOpt?.dataset?.branchName || branchOpt?.textContent || '');
      const patch = {
        branch:branchSel.value,
        branchName,
        branchOpenTime:String(branchOpt?.dataset?.openTime || '') || officialBranchOpenTime(branchName),
        themeInfoNum:String(themeSel.value),
        themeNum:String(opt.dataset.themeNum || ''),
        themeName:clean(opt.dataset.themeName || opt.textContent),
        doing:String(opt.dataset.doing || '')
      };
      save(patch);
      document.getElementById('__ke_target_info').textContent =
        `✅ ${patch.themeName} · 지점ID ${patch.branch} · theme ${patch.themeNum} · info ${patch.themeInfoNum}`;
      refreshAutoOpenTime();
    };

    document.getElementById('__ke_date').addEventListener('change', () => {
      save({targetDate:document.getElementById('__ke_date').value});
      refreshAutoOpenTime();
    });

    document.getElementById('__ke_auto_open_time').addEventListener('change', e => {
      save({autoOpenTime:!!e.target.checked});
      if (e.target.checked) refreshAutoOpenTime();
      else {
        const note = document.getElementById('__ke_open_note');
        if (note) {
          note.textContent = '자동설정 OFF · 오픈 시각을 직접 입력할 수 있습니다.';
          note.style.color = '#666';
        }
      }
    });

    if (cfg.themeName) {
      document.getElementById('__ke_target_info').textContent =
        `✅ ${cfg.themeName} · 지점ID ${cfg.branch} · theme ${cfg.themeNum} · info ${cfg.themeInfoNum}`;
    }

    document.getElementById('__ke_check').onclick = async () => {
      try {
        await loadBranchesUI();
        if (branchSel.value) await loadThemesUI(branchSel.value);
        refreshAutoOpenTime();
      } catch (e) {
        status(`❌ ${e?.message || e}`);
        showResult('error','목록 불러오기 실패',String(e?.message || e));
      }
    };

    document.getElementById('__ke_time_test').onclick = async () => {
      try {
        await resolveTargetFromUI();
        const target = await resolveTargetFromUI();
        const ui = readUiCfg();
        const cfg2 = {...target, ...ui};

        const miss = [];
        if (!cfg2.branch) miss.push('지점');
        if (!cfg2.themeNum || !cfg2.themeInfoNum) miss.push('테마');
        if (!cfg2.targetDate) miss.push('예약 날짜');
        if (!cfg2.targetTime) miss.push('희망 시간');
        if (miss.length) throw new Error('테스트 전 확인: ' + miss.join(', '));

        status(`🔎 ${cfg2.targetDate} ${cfg2.targetTime}\n시간 ID 조회 테스트 중…`);
        const r = await fetchTargetTime(cfg2);

        if (!r.found) {
          const detail =
            `${r.msg}\n\n응답 구조 요약:\n${String(r.debug || '').slice(0,900)}`;
          status(`❌ 시간 ID 테스트 실패\n${r.msg}`);
          showResult('error','시간 ID 테스트 실패',detail);
          return;
        }

        // ID가 실제 STEP2를 만들 수 있는지도 예약 전송 없이 확인.
        status(`✅ time ID ${r.timeNum} 추출\nSTEP2 유효성 확인 중…`);
        const s2 = await fetchTargetStep2(cfg2, r.timeNum);

        status(
          `✅ 시간 ID 테스트 성공\n` +
          `${cfg2.targetTime} → ID ${r.timeNum}\n` +
          `예약금 ${Number(s2.revPrice).toLocaleString()}원`
        );
        showResult(
          'grabbed',
          '시간 ID 테스트 성공',
          `${cfg2.themeName}\n${cfg2.targetDate} ${cfg2.targetTime}\n` +
          `time ID: ${r.timeNum}\n` +
          `추출 방식: ${r.source || '자동'}\n` +
          `STEP2 예약금: ${Number(s2.revPrice).toLocaleString()}원\n` +
          `※ 실제 예약은 전송하지 않았습니다.`
        );
      } catch (e) {
        const msg = String(e?.message || e);
        status(`❌ 테스트 오류\n${msg}`);
        showResult('error','시간 ID 테스트 오류',msg);
      }
    };

    document.getElementById('__ke_stop').onclick = () => {
      stopped = true;
      save({armed:false});
      status('DIRECT 예약 중지됨');
    };

    document.getElementById('__ke_start').onclick = async () => {
      try {
        await resolveTargetFromUI();
        refreshAutoOpenTime(false);
        let current = await resolveTargetFromUI();
        let ui = readUiCfg();
        current = {...current, ...ui};
        validateCfg(current);

        save({...current, armed:true});
        status(
          `DIRECT 예약 준비\n${current.themeName}\n` +
          `${current.targetDate} ${current.targetTime}`
        );
        await waitUntilOpen(current);
      } catch (e) {
        save({armed:false});
        const msg = String(e?.message || e);
        status(`❌ ${msg}`);
        showResult('error','시작할 수 없음',msg);
      }
    };

    updateCaptchaState();
    watchCaptcha();
    setInterval(updateCaptchaState, 1000);

    clockOffset = Number(cfg.offsetMs || 0);
  }

  function __keSafeMakePanel() {
    try {
      makePanel();
      if (document.getElementById('__ke_direct_panel')) {
        __keAliveState('ready');
        return true;
      }
    } catch (e) {
      __keLastInitError = String((e && e.message) || e || '패널 초기화 오류');
      __keAliveState('error', __keLastInitError);
    }
    return false;
  }

  let __keInitTry = 0;
  function __keRetryInit() {
    __keMountAlive();
    if (__keSafeMakePanel()) return;
    __keInitTry += 1;
    if (__keInitTry < 40) setTimeout(__keRetryInit, 250);
    else __keAliveState('error', __keLastInitError || '10초 동안 패널 생성 실패');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __keRetryInit, {once:true});
    setTimeout(__keRetryInit, 350);
  } else {
    __keRetryInit();
  }
})();
  } catch (e) {
    console.error('[ESCAPE PASS][KEYESCAPE engine]', e);
  }
}


if (/(^|\.)zeroworldkorea\.com$/i.test(location.hostname)) {
  const __epRun_zeroworld = () => {
    try {
(() => {
  'use strict';

  const ORIGIN = location.origin;
  const HOME = '/layout/res/home.php';
  const SELECT_URL = '/core/res/rev.make.sel.php';
  const ACT_URL = '/core/res/rev.act.php';
  const MUTONG_URL = '/core/res/rev.make.mutong.php';
  const KEY = 'zw_direct_fast_v1';

  const BRANCHES = {
    A: [
      ['1', '김포본점'],
      ['4', '강남점'],
      ['5', '홍대점'],
    ],
    B: [
      ['2', '다이브 건대점'],
    ]
  };

  const DEFAULTS = {
    sSubj: 'A',
    branch: '5',
    targetDate: '',
    themeNum: '',
    themeName: '',
    targetTime: '',
    openAt: '',
    name: '',
    phone: '',
    people: '2',
    armed: false,
    serverOffsetMs: 0,
    serverRttMs: 0,
    lastClockSync: 0,
    phase: '',
    lastNum: '',
    lastCkCode: '',
    lastLayout: 'layout/res'
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

  function loadCfg() {
    try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; }
    catch { return {...DEFAULTS}; }
  }
  function saveCfg(patch={}) {
    const cfg = {...loadCfg(), ...patch};
    localStorage.setItem(KEY, JSON.stringify(cfg));
    return cfg;
  }

  function fmtPhone(v) {
    const d = String(v || '').replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
    return v;
  }

  function status(msg) {
    const el = document.getElementById('zw-status');
    if (el) el.textContent = msg;
    console.log('[ZEROWORLD FAST]', msg);
  }

  function toast(msg, keep=false) {
    let el = document.getElementById('zw-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zw-toast';
      Object.assign(el.style, {
        position:'fixed', left:'12px', right:'12px', bottom:'18px',
        zIndex:'2147483647', padding:'13px 14px', borderRadius:'12px',
        background:'rgba(0,0,0,.92)', color:'#fff', fontSize:'14px',
        lineHeight:'1.45', whiteSpace:'pre-wrap',
        boxShadow:'0 6px 24px rgba(0,0,0,.4)'
      });
      document.documentElement.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    if (!keep) setTimeout(() => el.style.display='none', 3200);
  }


  function showResult(kind, title, detail='') {
    let box = document.getElementById('zw-result-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'zw-result-box';
      Object.assign(box.style, {
        position:'fixed',
        left:'12px',
        right:'12px',
        top:'calc(env(safe-area-inset-top, 0px) + 14px)',
        zIndex:'2147483647',
        padding:'18px 16px',
        borderRadius:'16px',
        boxShadow:'0 10px 35px rgba(0,0,0,.35)',
        fontFamily:'-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif',
        textAlign:'center',
        whiteSpace:'pre-wrap'
      });
      document.documentElement.appendChild(box);
    }

    const palettes = {
      success: {bg:'#0f7b3d', fg:'#fff', icon:'✅'},
      grabbed: {bg:'#0b63ce', fg:'#fff', icon:'🎯'},
      warning: {bg:'#a15c00', fg:'#fff', icon:'⚠️'},
      error:   {bg:'#a11b1b', fg:'#fff', icon:'❌'}
    };
    const p = palettes[kind] || palettes.warning;

    Object.assign(box.style, {
      background:p.bg,
      color:p.fg,
      display:'block'
    });

    box.innerHTML = `
      <div style="font-size:23px;font-weight:900;line-height:1.25">${p.icon} ${title}</div>
      <div style="font-size:13px;line-height:1.5;margin-top:8px">${String(detail || '').replace(/</g,'&lt;')}</div>
      <button id="zw-result-close" type="button"
        style="margin-top:12px;border:0;border-radius:999px;padding:8px 18px;font-weight:800;background:#fff;color:#111">
        닫기
      </button>
    `;
    box.querySelector('#zw-result-close').onclick = () => box.style.display='none';

    // 패널 상태도 같이 강조
    const statusEl = document.getElementById('zw-status');
    if (statusEl) {
      statusEl.textContent = `${title}\n${detail}`;
      statusEl.style.fontWeight = '800';
      statusEl.style.background = kind === 'success' ? '#e7f7ed'
        : kind === 'grabbed' ? '#eaf3ff'
        : kind === 'error' ? '#ffecec' : '#fff4df';
    }
  }

  async function postForm(url, data, options={}) {
    const body = new URLSearchParams();
    for (const [k,v] of Object.entries(data)) body.set(k, String(v ?? ''));
    const res = await fetch(url, {
      method:'POST',
      credentials:'include',
      cache:'no-store',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Cache-Control':'no-cache, no-store, max-age=0',
        'Pragma':'no-cache'
      },
      body: body.toString(),
      ...(options.signal ? {signal: options.signal} : {})
    });
    const text = await res.text();
    return {res, text};
  }

  // ---------- 서버시간 보정 ----------
  let serverOffsetMs = Number(loadCfg().serverOffsetMs || 0);
  const serverNowMs = () => Date.now() + serverOffsetMs;

  function median(arr) {
    if (!arr.length) return 0;
    const a = [...arr].sort((x,y)=>x-y);
    const m = Math.floor(a.length/2);
    return a.length % 2 ? a[m] : (a[m-1]+a[m])/2;
  }

  async function calibrateClock(samples=5, quiet=false) {
    const got = [];
    if (!quiet) status('제로월드 서버시간 동기화 중…');

    for (let i=0; i<samples; i++) {
      try {
        const t0 = Date.now();
        const r = await fetch(`${HOME}?go=main&_zwclock=${t0}_${i}`, {
          credentials:'include',
          cache:'no-store',
          headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
        });
        const t1 = Date.now();
        const date = r.headers.get('Date');
        if (date) {
          const serverSec = Date.parse(date);
          if (Number.isFinite(serverSec)) {
            const rtt = t1 - t0;
            // Date 헤더는 초 단위 → 해당 초의 중앙(+500ms)로 추정.
            const offset = (serverSec + 500) - ((t0+t1)/2);
            got.push({rtt, offset});
          }
        }
      } catch {}
      if (i+1 < samples) await sleep(35);
    }

    if (!got.length) {
      if (!quiet) status(`서버시간 응답 없음 · 기존 보정 ${serverOffsetMs>=0?'+':''}${Math.round(serverOffsetMs)}ms`);
      return false;
    }
    got.sort((a,b)=>a.rtt-b.rtt);
    const keep = got.slice(0, Math.min(5, got.length));
    serverOffsetMs = Math.round(median(keep.map(x=>x.offset)));
    const rtt = Math.round(median(keep.map(x=>x.rtt)));
    saveCfg({serverOffsetMs, serverRttMs:rtt, lastClockSync:Date.now()});
    if (!quiet) status(`서버시간 보정 ${serverOffsetMs>=0?'+':''}${serverOffsetMs}ms · RTT 약 ${rtt}ms`);
    return true;
  }

  // ---------- 테마/시간 조회 ----------
  async function fetchThemes(sSubj, branch, date) {
    const {res, text} = await postForm(SELECT_URL, {
      act:'theme_list',
      zizum_num:branch,
      rev_days:date || '',
      theme_num:'',
      s_subj:sSubj
    });
    if (!res.ok) throw new Error(`테마 목록 HTTP ${res.status}`);

    const holder = document.createElement('div');
    holder.innerHTML = text;
    const themes = [];
    for (const a of holder.querySelectorAll('a')) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/fun_theme_select\(['"]?(\d+)['"]?/);
      if (!m) continue;
      const name = clean(a.textContent);
      if (name) themes.push({num:m[1], name});
    }
    return themes;
  }

  function parseTimeList(raw, wantedTime) {
    if (!raw || clean(raw) === '9999') return null;
    const html = raw.split('{@}')[0] || '';
    const holder = document.createElement('div');
    holder.innerHTML = html;

    for (const a of holder.querySelectorAll('a')) {
      const txt = clean(a.textContent);
      if (!txt.includes(wantedTime)) continue;
      if (a.classList.contains('disable') || a.classList.contains('disabled')) continue;
      const href = a.getAttribute('href') || '';
      const m = href.match(/fun_theme_time_select\(['"]?(\d+)['"]?/);
      if (m) return {timeNum:m[1], text:txt};
    }

    // 구조가 바뀐 경우 HTML 문자열에서 보조 검색.
    const escaped = wantedTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `href=["'][^"']*fun_theme_time_select\\(['"]?(\\d+)['"]?[^"']*["'][^>]*>(?:.|\\n)*?${escaped}`,
      'i'
    );
    const m = html.match(re);
    return m ? {timeNum:m[1], text:wantedTime} : null;
  }

  async function fetchTargetTime(cfg, signal=null) {
    const {res, text} = await postForm(SELECT_URL, {
      act:'theme_time_list',
      zizum_num:cfg.branch,
      rev_days:cfg.targetDate,
      theme_num:cfg.themeNum
    }, {signal});
    if (res.status === 403 || res.status === 429) {
      throw new Error(`서버 요청 제한 HTTP ${res.status} · 즉시 중단`);
    }
    if (!res.ok) throw new Error(`시간목록 HTTP ${res.status}`);
    return parseTimeList(text, cfg.targetTime);
  }

  function hiddenValue(html, name) {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    return holder.querySelector(`input[name="${CSS.escape(name)}"]`)?.value || '';
  }

  function paymentOptions(html) {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    return [...holder.querySelectorAll('select[name="payment"] option')]
      .map(o => o.value).filter(Boolean);
  }

  function extractAlerts(html) {
    const out = [];
    const re = /alert\s*\(\s*(['"])(.*?)\1\s*\)/gis;
    let m;
    while ((m = re.exec(html))) out.push(m[2].replace(/\\n/g,' '));
    return out;
  }

  function extractRedirect(html) {
    const patterns = [
      /(?:parent|top|window)?\.?location(?:\.href)?\s*=\s*(['"])(.*?)\1/i,
      /location\.replace\s*\(\s*(['"])(.*?)\1\s*\)/i
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[2]) return m[2].replace(/&amp;/g,'&');
    }
    return '';
  }


  function appendHidden(form, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value ?? '');
    form.appendChild(input);
  }

  function directHoldNavigate(cfg, captcha, timeNum) {
    status(`시간 ID ${timeNum} 확보 → rev.act.php DIRECT 선점 POST`);

    // 기존 v1.1과 같은 서버 예약값이지만 fetch로 끝내지 않고,
    // 브라우저의 실제 HTML form POST로 rev.act.php를 연다.
    // 서버가 num/ck_code를 생성한 결제확인 페이지가 그대로 브라우저에 로드되므로
    // 그 다음부터는 사이트의 정상 fun_payment() 흐름을 탈 수 있다.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = ACT_URL;
    form.target = '_self';
    form.style.display = 'none';

    const payload = {
      name: cfg.name,
      mobile: fmtPhone(cfg.phone),
      person: cfg.people,
      input_captcha: captcha,
      zizum_num: cfg.branch,
      rev_days: cfg.targetDate,
      theme_num: cfg.themeNum,
      theme_time_num: timeNum,
      act: 'make',
      s_subj: cfg.sSubj
    };

    for (const [k,v] of Object.entries(payload)) appendHidden(form, k, v);
    document.body.appendChild(form);

    saveCfg({
      armed:true,
      phase:'payment_pending',
      lastNum:'',
      lastCkCode:'',
      lastLayout:'layout/res'
    });

    showResult(
      'grabbed',
      'DIRECT 선점 전송',
      `${cfg.targetDate} ${cfg.targetTime}\n` +
      `${cfg.themeName || '테마 #'+cfg.themeNum}\n` +
      `예약정보를 서버에 즉시 전송합니다.\n` +
      `다음 결제 단계는 사이트 정상 흐름으로 이어집니다.`
    );

    form.submit();
  }

  function findPaymentPage() {
    const form = document.querySelector('form[name="register"]');
    if (!form) return null;

    const num = form.querySelector('input[name="num"]')?.value || '';
    const ck = form.querySelector('input[name="ck_code"]')?.value || '';
    const layout = form.querySelector('input[name="layout_folder"]')?.value || 'layout/res';
    const payment = form.querySelector('select[name="payment"]');

    if (!num || !ck || !payment) return null;
    return {form, num, ck, layout, payment};
  }

  function pageText() {
    return clean(document.body?.innerText || document.body?.textContent || '');
  }

  function detectServerError() {
    const t = pageText();
    if (!t) return '';

    if (/자동등록방지|보안문자|captcha|코드가 일치/i.test(t)) {
      return '자동등록방지 코드가 틀렸거나 만료되었습니다.';
    }
    if (/예약불가|예약 불가|이미 예약|예약마감|마감되었습니다/i.test(t)) {
      return '예약이 마감되었거나 이미 다른 예약이 처리되었습니다.';
    }
    return '';
  }

  async function resumeNormalFinish() {
    const cfg = loadCfg();
    if (!cfg.armed || !cfg.phase) return;

    const err = detectServerError();
    if (err && cfg.phase === 'payment_pending') {
      saveCfg({armed:false, phase:''});
      status(`예약 실패/오류 ❌\n${err}`);
      showResult('error', '예약 실패/오류', err);
      return;
    }

    // 1) rev.act.php 응답의 실제 결제확인 페이지
    if (cfg.phase === 'payment_pending') {
      const p = findPaymentPage();
      if (!p) return;

      saveCfg({
        phase:'complete_pending',
        lastNum:p.num,
        lastCkCode:p.ck,
        lastLayout:p.layout
      });

      status(
        `예약 선점 성공 🎯\n` +
        `예약건 ${p.num}\n` +
        `정상 결제하기 진행 중`
      );

      showResult(
        'grabbed',
        '예약 선점 성공',
        `${cfg.targetDate} ${cfg.targetTime}\n` +
        `${cfg.themeName || '테마 #'+cfg.themeNum}\n` +
        `예약건 번호(num): ${p.num}\n` +
        `검증코드(ck_code): ${p.ck}\n` +
        `아직 송금하지 말고 예약완료 화면까지 기다려주세요.`
      );

      const values = [...p.payment.options].map(o => String(o.value || ''));
      if (values.includes('D')) p.payment.value = 'D';
      else if (values.includes('A')) p.payment.value = 'A';
      else {
        saveCfg({armed:false, phase:''});
        showResult(
          'warning',
          '결제 수동 진행 필요',
          `예약건 번호: ${p.num}\n` +
          `DIRECT 선점은 됐지만 자동으로 처리 가능한 결제방식(D/A)을 찾지 못했습니다.`
        );
        return;
      }
      p.payment.dispatchEvent(new Event('change', {bubbles:true}));

      // 서버에 예약건 번호가 생성된 직후 실제 사이트의 원래 결제 함수를 실행.
      // v1.1처럼 MUTONG_URL을 fetch로 직접 호출하지 않는다.
      await sleep(80);
      try {
        if (typeof window.fun_payment === 'function') {
          window.fun_payment();
          return;
        }
      } catch {}

      const link = [...document.querySelectorAll('a,button,input[type="button"],input[type="submit"]')]
        .find(el =>
          String(el.getAttribute('href') || '').includes('fun_payment') ||
          String(el.getAttribute('onclick') || '').includes('fun_payment') ||
          clean(el.textContent || el.value).includes('결제하기')
        );

      if (link) {
        link.click();
        return;
      }

      saveCfg({armed:false, phase:''});
      showResult(
        'warning',
        '결제 수동 진행 필요',
        `예약건 번호: ${p.num}\n결제하기 버튼을 직접 눌러주세요.`
      );
      return;
    }

    // 2) fun_payment() 이후 예약완료 페이지
    if (cfg.phase === 'complete_pending') {
      const text = pageText();
      const completed =
        /(예약완료|예약 완료|예약이 완료|예약되었습니다|예약번호|예약 성공|정상적으로 예약)/.test(text);

      if (!completed) return;

      saveCfg({armed:false, phase:'done'});

      status(
        `예약 완료 ✅\n` +
        `예약건 ${cfg.lastNum || '-'}`
      );

      showResult(
        'success',
        '예약 완료',
        `${cfg.targetDate} ${cfg.targetTime}\n` +
        `${cfg.themeName || '테마 #'+cfg.themeNum}\n` +
        `${cfg.lastNum ? '예약건 번호(num): '+cfg.lastNum+'\\n' : ''}` +
        `${cfg.lastCkCode ? '검증코드(ck_code): '+cfg.lastCkCode+'\\n' : ''}` +
        `사이트 정상 결제/예약완료 흐름까지 확인했습니다.\n` +
        `이제 예약완료 화면의 입금 안내를 확인하고 송금하세요.`
      );
    }
  }


  // ---------- 오픈런 혼잡 대응 v1.3 ----------
  async function prewarmReservationPath(cfg) {
    // 실제 예약/선점 요청은 보내지 않는다.
    // HOME + 동일 SELECT PHP의 theme_list만 가볍게 호출해 세션/TLS/서버 경로를 미리 데운다.
    const jobs = [
      fetch(`${HOME}?go=rev.make&s_subj=${encodeURIComponent(cfg.sSubj)}&_zwarm=${Date.now()}`, {
        credentials:'include',
        cache:'no-store',
        headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
      }).catch(()=>null),
      postForm(SELECT_URL, {
        act:'theme_list',
        zizum_num:cfg.branch,
        rev_days:cfg.targetDate,
        theme_num:'',
        s_subj:cfg.sSubj
      }).catch(()=>null)
    ];
    await Promise.allSettled(jobs);
  }

  function makeAbortController() {
    try { return new AbortController(); } catch { return null; }
  }

  async function fetchTargetTimeWithTimeout(cfg, timeoutMs, controller) {
    let timerId = null;
    try {
      if (controller) {
        timerId = setTimeout(() => {
          try { controller.abort(); } catch {}
        }, timeoutMs);
      }
      return await fetchTargetTime(cfg, controller?.signal || null);
    } finally {
      if (timerId) clearTimeout(timerId);
    }
  }

  async function burst(cfg, captcha) {
    const begin = serverNowMs();
    let won = false;
    let stoppedByLimit = false;
    let totalAttempts = 0;
    const activeControllers = new Set();

    status(
      '오픈 감지 시작 → 혼잡 대응 시간조회\n' +
      '최대 2개 워커 · DIRECT 선점은 1회만 전송'
    );

    const abortAll = () => {
      for (const c of activeControllers) {
        try { c?.abort(); } catch {}
      }
      activeControllers.clear();
    };

    const worker = async (workerId, initialDelayMs) => {
      if (initialDelayMs > 0) await sleep(initialDelayMs);

      let localAttempts = 0;
      while (loadCfg().armed && !won && !stoppedByLimit) {
        localAttempts++;
        totalAttempts++;
        const reqStart = performance.now();
        const controller = makeAbortController();
        if (controller) activeControllers.add(controller);

        try {
          // 서버가 순간적으로 느려도 즉시 포기하지 않고 최대 5초까지 응답을 기다린다.
          // 동시에 살아있는 시간조회 요청은 워커당 1개, 전체 최대 2개.
          const found = await fetchTargetTimeWithTimeout(cfg, 5000, controller);
          const rtt = Math.round(performance.now() - reqStart);

          if (controller) activeControllers.delete(controller);
          if (won || stoppedByLimit || !loadCfg().armed) return;

          if (found) {
            won = true;
            abortAll();
            status(
              `${cfg.targetTime} 감지 · time_num=${found.timeNum}\n` +
              `워커 ${workerId} 응답 ${rtt}ms → DIRECT 선점 POST`
            );
            directHoldNavigate(cfg, captcha, found.timeNum);
            return;
          }

          if (localAttempts === 1 || localAttempts % 5 === 0) {
            status(
              `혼잡 대응 조회 ${totalAttempts}회\n` +
              `워커 ${workerId} 최근 응답 ${rtt}ms · 아직 미오픈/마감`
            );
          }
        } catch (e) {
          if (controller) activeControllers.delete(controller);
          const msg = String(e?.message || e);

          if (/403|429|요청 제한/.test(msg)) {
            stoppedByLimit = true;
            saveCfg({armed:false});
            abortAll();
            throw e;
          }

          // AbortError는 서버 지연으로 5초 timeout된 경우. 다른 워커/다음 회차로 이어간다.
          if (localAttempts === 1 || localAttempts % 4 === 0) {
            status(
              `혼잡 대응 조회 ${totalAttempts}회\n` +
              `워커 ${workerId}: ${msg.includes('Abort') ? '응답 지연(5초 초과)' : msg.slice(0,80)}`
            );
          }
        }

        if (won || stoppedByLimit || !loadCfg().armed) return;

        const since = serverNowMs() - begin;
        // 기존 40ms 연타보다 요청량을 크게 낮추되 2개 워커로 '한 요청이 대기열에 묶이는' 위험을 분산.
        // 워커 각각 순차 요청만 하므로 동시 시간조회는 최대 2개.
        const gap = since < 4000 ? 260 : since < 12000 ? 500 : 900;
        await sleep(gap);
      }
    };

    try {
      // A는 오픈 즉시, B는 650ms 뒤 시작.
      // 서버가 한 요청을 오래 붙잡아도 다른 워커가 별도 응답 기회를 가짐.
      await Promise.all([
        worker('A', 0),
        worker('B', 650)
      ]);
    } finally {
      abortAll();
    }
  }

  let timer = null;
  async function waitForOpen(cfg, captcha) {
    const openMs = new Date(cfg.openAt).getTime();
    if (!Number.isFinite(openMs)) {
      status('오픈시각 미입력 → 즉시 시간 조회 시작');
      return burst(cfg, captcha);
    }

    await calibrateClock(5);
    let sync8 = false, sync3 = false, prewarm12 = false, prewarm5 = false;

    const tick = async () => {
      if (!loadCfg().armed) return;
      let remain = openMs - serverNowMs();

      if (!sync8 && remain <= 9000 && remain > 4500) {
        sync8 = true;
        await calibrateClock(7, true);
        remain = openMs - serverNowMs();
      }
      if (!prewarm12 && remain <= 12000 && remain > 7500) {
        prewarm12 = true;
        prewarmReservationPath(cfg).catch(()=>{});
      }
      if (!prewarm5 && remain <= 5500 && remain > 3200) {
        prewarm5 = true;
        prewarmReservationPath(cfg).catch(()=>{});
      }
      if (!sync3 && remain <= 3500 && remain > 1000) {
        sync3 = true;
        await calibrateClock(5, true);
        remain = openMs - serverNowMs();
      }

      if (remain <= 0) {
        status(`서버시간 오픈 도달 → 직접 조회 시작\n보정 ${serverOffsetMs>=0?'+':''}${serverOffsetMs}ms`);
        burst(cfg, captcha).catch(e => {
          saveCfg({armed:false});
          toast(`예약 오류: ${e?.message || e}`, true);
          status(`오류: ${e?.message || e}`);
          showResult('error', '예약 실패/오류', String(e?.message || e));
        });
        return;
      }

      status(
        `서버시간 기준 대기\n` +
        `오픈까지 ${(remain/1000).toFixed(remain < 3000 ? 3 : 1)}초\n` +
        `현재 보정 ${serverOffsetMs>=0?'+':''}${serverOffsetMs}ms`
      );

      timer = setTimeout(tick, remain < 3000 ? 5 : remain < 10000 ? 100 : 600);
    };
    tick();
  }

  // ---------- UI ----------
  function isBookingPage() {
    return location.pathname.includes('/layout/res/home.php') &&
           new URLSearchParams(location.search).get('go') === 'rev.make';
  }

  function syncCaptchaImage() {
    const src = document.querySelector('#captcha_img')?.src || '';
    const img = document.getElementById('zw-captcha-img');
    if (img && src) img.src = src;
  }

  function populateBranches(sSubj, selected) {
    const sel = document.getElementById('zw-branch');
    if (!sel) return;
    sel.innerHTML = '';
    for (const [value,label] of (BRANCHES[sSubj] || [])) {
      const o = document.createElement('option');
      o.value = value; o.textContent = label;
      sel.appendChild(o);
    }
    if ([...sel.options].some(o=>o.value===selected)) sel.value = selected;
  }

  async function loadThemesUI() {
    const sSubj = document.getElementById('zw-kind').value;
    const branch = document.getElementById('zw-branch').value;
    const date = document.getElementById('zw-date').value;
    const themeSel = document.getElementById('zw-theme');
    const old = themeSel.value;

    themeSel.innerHTML = '<option value="">불러오는 중…</option>';
    try {
      const themes = await fetchThemes(sSubj, branch, date);
      themeSel.innerHTML = '';
      for (const t of themes) {
        const o = document.createElement('option');
        o.value = t.num; o.textContent = `${t.name} (#${t.num})`;
        o.dataset.name = t.name;
        themeSel.appendChild(o);
      }
      const cfg = loadCfg();
      const preferred = old || cfg.themeNum;
      if ([...themeSel.options].some(o=>o.value===preferred)) themeSel.value = preferred;
      status(`테마 ${themes.length}개 불러옴`);
    } catch (e) {
      themeSel.innerHTML = '<option value="">테마 불러오기 실패</option>';
      status(`테마 불러오기 실패: ${e?.message || e}`);
    }
  }

  function createPanel() {
    if (document.getElementById('zw-panel')) return;
    const cfg = loadCfg();

    const style = document.createElement('style');
    style.textContent = `
      #zw-panel{position:fixed;right:9px;bottom:9px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#111}
      #zw-toggle{border:0;border-radius:999px;padding:11px 15px;background:#111;color:#fff;font-weight:800;font-size:14px;box-shadow:0 5px 18px #0005}
      #zw-box{display:none;width:min(365px,calc(100vw - 18px));max-height:82vh;overflow:auto;margin-top:7px;padding:14px;border-radius:16px;background:#fff;box-shadow:0 10px 32px #0006}
      #zw-box.open{display:block}
      #zw-box label{display:block;margin:7px 0;font-size:12px;font-weight:800}
      #zw-box input,#zw-box select{box-sizing:border-box;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:9px;background:#fff;font-size:16px}
      .zw-grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .zw-title{font-size:18px;font-weight:900;margin-bottom:7px}
      .zw-sub{font-size:11px;color:#666;line-height:1.4;margin:4px 0 8px}
      .zw-actions{display:grid;grid-template-columns:1.3fr .8fr;gap:7px;margin-top:9px}
      .zw-actions button,#zw-load-theme,#zw-cap-refresh,#zw-go-book{border:0;border-radius:9px;padding:11px;font-weight:800}
      #zw-start{background:#111;color:#fff} #zw-stop{background:#eee}
      #zw-load-theme,#zw-cap-refresh,#zw-go-book{width:100%;background:#efefef}
      #zw-status{white-space:pre-wrap;background:#f4f4f4;border-radius:10px;padding:10px;margin-top:10px;font-size:12px;line-height:1.45}
      .zw-cap-row{display:grid;grid-template-columns:130px 1fr;gap:8px;align-items:center}
      #zw-captcha-img{width:120px;height:50px;object-fit:contain;border:1px solid #ddd;background:#fff}
      .zw-warn{font-size:11px;color:#a00;line-height:1.45;margin-top:7px}
    `;
    document.documentElement.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'zw-panel';

    if (!isBookingPage()) {
      panel.innerHTML = `
        <button id="zw-toggle" type="button">⚡ 제로월드 DIRECT</button>
        <div id="zw-box">
          <div class="zw-title">제로월드 DIRECT FAST</div>
          <div class="zw-sub">예약 페이지에서 캡차를 직접 입력한 뒤 서버 직접예약을 사용합니다.</div>
          <button id="zw-go-book" type="button">일반 제로월드 예약페이지로 이동</button>
          <div id="zw-status">예약페이지로 이동해 주세요.</div>
        </div>`;
      document.body.appendChild(panel);
      document.getElementById('zw-toggle').onclick = () => document.getElementById('zw-box').classList.toggle('open');
      document.getElementById('zw-go-book').onclick = () => location.href = `${HOME}?go=rev.make&s_subj=A`;
      return;
    }

    panel.innerHTML = `
      <button id="zw-toggle" type="button">⚡ 제로월드 DIRECT</button>
      <div id="zw-box">
        <div class="zw-title">제로월드 DIRECT FAST</div>
        <div class="zw-sub">시간 ID를 서버에서 바로 감지한 뒤 화면 단계 없이 예약 POST를 전송합니다.</div>

        <div class="zw-grid2">
          <label>구분
            <select id="zw-kind"><option value="A">제로월드</option><option value="B">DIVE</option></select>
          </label>
          <label>지점<select id="zw-branch"></select></label>
        </div>

        <label>희망 날짜<input id="zw-date" type="date"></label>
        <button id="zw-load-theme" type="button">테마 목록 불러오기</button>
        <label>테마<select id="zw-theme"><option value="">먼저 테마 불러오기</option></select></label>

        <div class="zw-grid2">
          <label>희망 시간<input id="zw-time" type="time" step="60"></label>
          <label>인원
            <select id="zw-people">
              <option value="2">2명</option><option value="3">3명</option>
              <option value="4">4명</option><option value="5">5명</option>
              <option value="6">6명</option>
            </select>
          </label>
        </div>

        <label>예약 오픈 시각
          <input id="zw-open" type="datetime-local" step="1">
        </label>

        <label>예약자 이름<input id="zw-name" type="text"></label>
        <label>전화번호<input id="zw-phone" type="tel" inputmode="tel" placeholder="010-1234-5678"></label>

        <label>자동등록방지 — 직접 입력 필수</label>
        <div class="zw-cap-row">
          <img id="zw-captcha-img" alt="자동등록방지">
          <input id="zw-captcha" type="tel" inputmode="numeric" maxlength="5" placeholder="5자리 코드">
        </div>
        <button id="zw-cap-refresh" type="button">자동등록방지 이미지 새로고침</button>

        <div class="zw-actions">
          <button id="zw-start" type="button">DIRECT 선점 + 정상완료 시작</button>
          <button id="zw-stop" type="button">중지</button>
        </div>
        <div id="zw-status">준비됨</div>
        <div class="zw-warn">
          자동등록방지 코드는 자동으로 해독/우회하지 않습니다. 반드시 화면의 코드를 직접 입력하세요.
          선점 후 결제는 사이트 정상 흐름으로 진행합니다. '예약 완료'가 뜬 뒤 입금 안내를 확인하세요.
        </div>
      </div>`;

    document.body.appendChild(panel);

    const kind = document.getElementById('zw-kind');
    kind.value = cfg.sSubj;
    populateBranches(cfg.sSubj, cfg.branch);

    document.getElementById('zw-date').value = cfg.targetDate || '';
    document.getElementById('zw-time').value = cfg.targetTime || '';
    document.getElementById('zw-open').value = cfg.openAt || '';
    document.getElementById('zw-name').value = cfg.name || '';
    document.getElementById('zw-phone').value = cfg.phone || '';
    document.getElementById('zw-people').value = cfg.people || '2';

    kind.onchange = () => {
      populateBranches(kind.value, '');
      document.getElementById('zw-theme').innerHTML = '<option value="">테마 불러오기</option>';
    };

    document.getElementById('zw-toggle').onclick = () => document.getElementById('zw-box').classList.toggle('open');
    document.getElementById('zw-load-theme').onclick = loadThemesUI;

    document.getElementById('zw-cap-refresh').onclick = async () => {
      const orig = document.querySelector('#captcha_img');
      if (!orig) {
        toast('페이지의 자동등록방지 이미지를 찾지 못했습니다.', true);
        return;
      }
      orig.click();
      document.getElementById('zw-captcha').value = '';
      await sleep(150);
      syncCaptchaImage();
    };

    document.getElementById('zw-stop').onclick = () => {
      saveCfg({armed:false, phase:''});
      if (timer) clearTimeout(timer);
      status('DIRECT 예약 중지됨');
    };

    document.getElementById('zw-start').onclick = async () => {
      const themeSel = document.getElementById('zw-theme');
      const captcha = clean(document.getElementById('zw-captcha').value);
      const cfg2 = {
        sSubj: kind.value,
        branch: document.getElementById('zw-branch').value,
        targetDate: document.getElementById('zw-date').value,
        themeNum: themeSel.value,
        themeName: themeSel.selectedOptions[0]?.dataset?.name || clean(themeSel.selectedOptions[0]?.textContent),
        targetTime: document.getElementById('zw-time').value,
        openAt: document.getElementById('zw-open').value,
        name: clean(document.getElementById('zw-name').value),
        phone: clean(document.getElementById('zw-phone').value),
        people: document.getElementById('zw-people').value
      };

      const missing = [];
      if (!cfg2.branch) missing.push('지점');
      if (!cfg2.targetDate) missing.push('날짜');
      if (!cfg2.themeNum) missing.push('테마');
      if (!cfg2.targetTime) missing.push('시간');
      if (!cfg2.name) missing.push('이름');
      if (!/^\d{10,11}$/.test(cfg2.phone.replace(/\D/g,''))) missing.push('전화번호');
      if (!/^\d{4,5}$/.test(captcha)) missing.push('자동등록방지 코드');

      if (missing.length) {
        alert('확인해 주세요: ' + missing.join(', '));
        return;
      }

      // 페이지의 캡차 입력에도 동일하게 넣어 사용자에게 상태가 보이게 함.
      const capEl = document.querySelector('input[name="input_captcha"]');
      if (capEl) capEl.value = captcha;
      const nameEl = document.querySelector('#name');
      const phoneEl = document.querySelector('#mobile');
      const personEl = document.querySelector('#person');
      if (nameEl) nameEl.value = cfg2.name;
      if (phoneEl) phoneEl.value = fmtPhone(cfg2.phone);
      if (personEl && [...personEl.options].some(o=>o.value===cfg2.people)) personEl.value = cfg2.people;

      saveCfg({...cfg2, armed:true, phase:'waiting', lastNum:'', lastCkCode:'', lastLayout:'layout/res'});
      status(`DIRECT 예약 준비\n${cfg2.targetDate} ${cfg2.targetTime}\n${cfg2.themeName || '#'+cfg2.themeNum}`);

      try {
        await waitForOpen(cfg2, captcha);
      } catch (e) {
        saveCfg({armed:false});
        status(`오류: ${e?.message || e}`);
        toast(`예약 오류: ${e?.message || e}`, true);
      }
    };

    syncCaptchaImage();
    setTimeout(syncCaptchaImage, 500);

    // 저장된 테마가 있으면 자동으로 목록을 불러와 복원 시도
    if (cfg.targetDate) {
      loadThemesUI().then(() => {
        const sel = document.getElementById('zw-theme');
        if ([...sel.options].some(o=>o.value===cfg.themeNum)) sel.value = cfg.themeNum;
      }).catch(()=>{});
    }
  }

  if (document.body) createPanel();
  else document.addEventListener('DOMContentLoaded', createPanel, {once:true});

  // rev.act.php / 결제 / 예약완료 페이지로 네비게이션된 뒤 이어서 정상 마무리.
  setTimeout(() => resumeNormalFinish().catch(e => {
    saveCfg({armed:false, phase:''});
    status(`오류: ${e?.message || e}`);
    showResult('error', '예약 완료 처리 오류', String(e?.message || e));
  }), 60);
})();
    } catch (e) {
      console.error('[ESCAPE PASS][zeroworld engine]', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __epRun_zeroworld, {once:true});
  } else {
    __epRun_zeroworld();
  }
}


if (/(^|\.)doomescape\.com$/i.test(location.hostname)) {
  const __epRun_doomescape = () => {
    try {
(() => {
'use strict';

const STORE='__doomescape_hybrid_fast_v1__';
const HOME='/layout/res/home.php';
const RES=HOME+'?go=rev.make';

const POLICY={
  '1':{name:'1호점',open:'00:00:00',days:14,display:'24:00'},
  '2':{name:'2호점',open:'23:00:00',days:14,display:'23:00'},
  '3':{name:'DTH점(부평)',open:'23:30:00',days:7,display:'23:30'},
  '4':{name:'FEAR점(수원)',open:'23:45:00',days:5,display:'23:45'}
};

const DEFAULTS={
  branch:'1',branchName:'1호점',theme:'',targetDate:'',targetTime:'',
  openAt:'',name:'',phone:'',people:'2',autoOpen:true,
  armed:false,phase:'',slotUrl:'',offsetMs:0,rttMs:0
};

let stopped=false,running=false,offsetMs=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/\s+/g,'').toLowerCase();

function load(){try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{return {...DEFAULTS}}}
function save(p={}){const v={...load(),...p};localStorage.setItem(STORE,JSON.stringify(v));return v}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function status(s){console.log('[DOOM HYBRID]',s);const e=document.getElementById('__doom_status');if(e)e.textContent=s}

function banner(kind,title,detail=''){
  let b=document.getElementById('__doom_result');
  if(!b){b=document.createElement('div');b.id='__doom_result';Object.assign(b.style,{
    position:'fixed',left:'12px',right:'12px',top:'calc(env(safe-area-inset-top,0px) + 12px)',
    zIndex:'2147483647',padding:'18px 15px',borderRadius:'17px',boxShadow:'0 10px 36px #0006',
    fontFamily:'-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif',
    color:'#fff',textAlign:'center',whiteSpace:'pre-wrap'});document.documentElement.appendChild(b)}
  const m={ok:['#08783b','✅'],grab:['#075fbf','🎯'],warn:['#9a5b00','⚠️'],err:['#a61c1c','❌']}[kind]||['#9a5b00','⚠️'];
  b.style.background=m[0];b.style.display='block';
  b.innerHTML=`<div style="font-size:22px;font-weight:900">${m[1]} ${esc(title)}</div>
  <div style="margin-top:7px;font-size:13px;line-height:1.55">${esc(detail)}</div>
  <button id="__doom_close" type="button" style="margin-top:11px;border:0;border-radius:999px;padding:8px 18px;background:#fff;color:#111;font-weight:800">닫기</button>`;
  b.querySelector('#__doom_close').onclick=()=>b.style.display='none';
}

function splitPhone(v){
  const d=String(v||'').replace(/\D/g,'');
  if(d.length===11)return[d.slice(0,3),d.slice(3,7),d.slice(7)];
  if(d.length===10)return[d.slice(0,3),d.slice(3,6),d.slice(6)];
  throw new Error('전화번호는 10~11자리로 입력해주세요.');
}
function addDays(ymd,n){
  const m=String(ymd||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return'';
  const d=new Date(+m[1],+m[2]-1,+m[3],12);d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function autoOpenAt(branch,date){
  const p=POLICY[String(branch)];if(!p||!date)return'';
  const od=addDays(date,-p.days);return od?`${od}T${p.open}`:'';
}
function refreshAuto(show=true){
  const b=document.getElementById('__doom_branch')?.value||load().branch;
  const d=document.getElementById('__doom_date')?.value||'';
  const a=document.getElementById('__doom_auto')?.checked??true;
  const out=document.getElementById('__doom_open'),note=document.getElementById('__doom_open_note');
  if(!a||!out)return;
  const p=POLICY[String(b)],v=autoOpenAt(b,d);
  if(v){out.value=v;save({openAt:v});if(note){note.style.color='#08783b';note.textContent=`✅ ${p.name}: ${p.display} 오픈 · ${p.days}일 뒤까지 → ${v.replace('T',' ')}`};if(show)status(`오픈시각 자동설정\n${v.replace('T',' ')}`)}
  else if(note){note.style.color='#a45100';note.textContent='지점과 목표 날짜를 선택하면 오픈 시각을 자동 계산합니다.'}
}

async function getText(url){
  const r=await fetch(url,{credentials:'include',cache:'no-store',headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}});
  if(r.status===403||r.status===429)throw new Error(`요청 제한 HTTP ${r.status}`);
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return {text:await r.text(),response:r};
}
const parseDoc=html=>new DOMParser().parseFromString(html,'text/html');

async function branches(){
  try{
    const {text}=await getText(RES+'&_b='+Date.now());const d=parseDoc(text),s=d.querySelector('select[name="s_zizum"]');
    if(s){const a=[...s.options].map(o=>({id:String(o.value||''),name:clean(o.textContent)})).filter(x=>x.id&&x.name);if(a.length)return a}
  }catch{}
  return Object.entries(POLICY).map(([id,p])=>({id,name:p.name}));
}
async function themes(branch){
  const {text}=await getText(`${RES}&s_zizum=${encodeURIComponent(branch)}&_t=${Date.now()}`),d=parseDoc(text),out=[];
  for(const e of [...d.querySelectorAll('.tm_box .tit .name'),...d.querySelectorAll('.tm_box p.name'),...d.querySelectorAll('p.name')]){
    const n=clean(e.textContent);if(n&&!out.includes(n))out.push(n)
  }
  if(!out.length)throw new Error('테마 목록을 읽지 못했습니다.');
  return out;
}
function findBox(d,name){
  const boxes=[...d.querySelectorAll('.tm_box')],t=norm(name);
  for(const b of boxes){const e=b.querySelector('.tit .name,p.name,.name');if(e&&norm(e.textContent)===t)return b}
  for(const b of boxes){const e=b.querySelector('.tit .name,p.name,.name'),c=e?norm(e.textContent):'';if(c&&(c.includes(t)||t.includes(c)))return b}
  return null;
}
function hhmm(s){const m=String(s||'').match(/\b(\d{1,2}):(\d{2})\b/);return m?`${String(+m[1]).padStart(2,'0')}:${m[2]}`:''}
function findSlot(html,theme,time,date){
  const d=parseDoc(html),shown=d.querySelector('input[name="rev_days"]')?.value||'';
  if(shown&&date&&shown!==date)return{ready:false,state:`목표 날짜 미오픈 · 서버표시 ${shown}`};
  const box=findBox(d,theme);if(!box)return{ready:false,state:'테마 미표시'};
  for(const li of box.querySelectorAll('.time li,li')){
    const tx=clean(li.textContent),tm=hhmm(tx);if(!tm||tm!==time)continue;
    const a=li.querySelector('a[href]'),href=a?.getAttribute('href')||'';
    const ok=!!href&&href.includes('theme_time_num=')&&(tx.includes('예약가능')||li.classList.contains('on'));
    return{ready:ok,state:ok?'예약가능':(tx.includes('예약마감')?'예약마감':tx),href:ok?href:''}
  }
  return{ready:false,state:'희망시간 미표시'};
}
const reservationUrl=c=>`${RES}&rev_days=${encodeURIComponent(c.targetDate)}&s_zizum=${encodeURIComponent(c.branch)}`;

function median(a){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2}
const serverNow=()=>Date.now()+offsetMs;
async function calibrate(samples=5,quiet=false){
  const a=[];if(!quiet)status('둠이스케이프 서버시간 보정 중…');
  for(let i=0;i<samples;i++){
    try{const t0=Date.now(),r=await fetch(`${RES}&_clock=${t0}_${i}`,{credentials:'include',cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}}),t1=Date.now(),h=r.headers.get('Date');
      if(h){const s=Date.parse(h);if(Number.isFinite(s))a.push({rtt:t1-t0,off:(s+500)-((t0+t1)/2)})}}catch{}
    if(i+1<samples)await sleep(35)
  }
  if(!a.length){if(!quiet)status('서버 Date 미수신 · 기기 시각으로 대기');return false}
  a.sort((x,y)=>x.rtt-y.rtt);const k=a.slice(0,Math.min(5,a.length));offsetMs=Math.round(median(k.map(x=>x.off)));const rtt=Math.round(median(k.map(x=>x.rtt)));save({offsetMs,rttMs:rtt});
  if(!quiet)status(`서버시간 보정 ${offsetMs>=0?'+':''}${offsetMs}ms · RTT ${rtt}ms`);return true
}


function collectHidden(form){
  const out={};
  for(const e of form.querySelectorAll('input[name]')){
    const type=(e.getAttribute('type')||'text').toLowerCase();
    if(type==='hidden') out[e.name]=e.value||'';
  }
  return out;
}

function availablePeople(form){
  const s=form.querySelector('select[name="person"]');
  if(!s)return[];
  return [...s.options].map(o=>String(o.value||'').trim()).filter(Boolean);
}

async function directHoldToPayment(cfg, slotUrl){
  status('🎯 슬롯 감지 → STEP2 데이터만 DIRECT 조회');
  const {text}=await getText(slotUrl);
  const doc=parseDoc(text);
  const form=doc.querySelector('form[name="register"][action*="rev.act.php"]');
  if(!form)throw new Error('STEP2 예약정보 form을 찾지 못했습니다.');

  const people=availablePeople(form);
  if(people.length && !people.includes(String(cfg.people))){
    throw new Error(`${cfg.people}명 예약 불가. 가능한 인원: ${people.join(', ')}명`);
  }

  const hidden=collectHidden(form);
  const priceKey=`price${cfg.people}`;
  if(hidden[priceKey]) hidden.price=hidden[priceKey];

  const required=['rev_days','theme_time_num','price','act','layout_folder'];
  const missing=required.filter(k=>!hidden[k]);
  if(missing.length)throw new Error('DIRECT 선점 필수값 누락: '+missing.join(', '));

  const [p1,p2,p3]=splitPhone(cfg.phone);

  // STEP2 페이지를 실제로 렌더링하지 않고, 그 form과 동일한 값을 현재 브라우저에서
  // 정상 HTML form POST로 rev.act.php에 제출한다.
  // 서버가 이 POST를 처리하는 시점에 num/ck_code가 생성되므로 선점 속도를 확보하면서,
  // 응답은 실제 결제 페이지로 브라우저가 이동해 이후 fun_payment() 정상 흐름을 유지한다.
  const post=document.createElement('form');
  post.method='POST';
  post.action=new URL(form.getAttribute('action')||'/core/res/rev.act.php',slotUrl).href;
  post.style.display='none';

  const payload={
    ...hidden,
    name:cfg.name,
    mobile1:p1,
    mobile2:p2,
    mobile3:p3,
    person:String(cfg.people),
    ck_agree:'on'
  };

  for(const [k,v] of Object.entries(payload)){
    const i=document.createElement('input');
    i.type='hidden';
    i.name=k;
    i.value=String(v??'');
    post.appendChild(i);
  }

  document.body.appendChild(post);

  // 브라우저 URL을 STEP2 주소로만 바꿔 referer/상대경로 맥락을 최대한 정상 흐름에 가깝게 유지.
  // 네트워크 요청은 발생하지 않는다.
  try{
    const u=new URL(slotUrl);
    history.replaceState(null,'',u.pathname+u.search+u.hash);
  }catch{}

  save({phase:'payment',slotUrl,armed:true});
  banner(
    'grab',
    'DIRECT 선점 전송',
    `${cfg.theme}\n${cfg.targetDate} ${cfg.targetTime}\n`+
    `STEP2 화면 로딩 없이 예약정보 POST를 즉시 전송합니다.\n`+
    `이후 결제는 사이트 정상 흐름으로 진행됩니다.`
  );
  status('⚡ rev.act.php DIRECT 선점 POST → 결제 페이지 이동');
  post.submit();
}

async function poll(cfg){
  const start=serverNow();let n=0;status('오픈 도달 → 목표 슬롯 확인 시작');
  while(!stopped&&load().armed){
    n++;const t=performance.now();
    try{
      const {text}=await getText(reservationUrl(cfg)+`&_p=${Date.now()}_${n}`),s=findSlot(text,cfg.theme,cfg.targetTime,cfg.targetDate);
      if(s.ready&&s.href){
        const u=new URL(s.href,location.href).href;
        await directHoldToPayment(cfg,u);
        return
      }
      if(n===1||n%10===0)status(`슬롯 확인 ${n}회\n${s.state}`)
    }catch(e){
      const m=String(e?.message||e);if(/403|429|요청 제한/.test(m)){save({armed:false});throw e}
      if(n===1||n%8===0)status(`확인 ${n}회 · ${m}`)
    }
    const el=serverNow()-start,gap=el<3000?180:el<10000?350:700,used=performance.now()-t;if(used<gap)await sleep(gap-used)
  }
}
async function waitOpen(cfg){
  stopped=false;save({armed:true,phase:'waiting'});await calibrate(5);
  const target=new Date(cfg.openAt).getTime();if(!Number.isFinite(target))throw new Error('오픈 시각을 확인해주세요.');
  let a=false,b=false,w=false;
  const tick=async()=>{
    if(stopped||!load().armed)return;let rem=target-serverNow();
    if(!a&&rem<=9000&&rem>4500){a=true;await calibrate(7,true);rem=target-serverNow()}
    if(!w&&rem<=6000&&rem>2500){w=true;fetch(reservationUrl(cfg)+'&_warm='+Date.now(),{credentials:'include',cache:'no-store'}).catch(()=>{})}
    if(!b&&rem<=3500&&rem>700){b=true;await calibrate(5,true);rem=target-serverNow()}
    if(rem<=0){try{await poll(cfg)}catch(e){save({armed:false,phase:''});banner('err','예약 시도 중단',String(e?.message||e))}return}
    status(`서버시간 기준 대기\n오픈까지 ${(rem/1000).toFixed(rem<3000?3:1)}초\n보정 ${offsetMs>=0?'+':''}${offsetMs}ms`);
    setTimeout(tick,rem<3000?5:rem<10000?100:650)
  };tick()
}

function setField(e,v){if(!e)return false;e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true}

async function step2(){
  const c=load();if(!c.armed||c.phase!=='step2')return false;
  const f=document.querySelector('form[name="register"][action*="rev.act.php"]'),name=f?.querySelector('input[name="name"]'),person=f?.querySelector('select[name="person"]');
  if(!f||!name||!person)return false;
  status('정상 STEP2 → 예약정보 자동입력');const[p1,p2,p3]=splitPhone(c.phone);setField(name,c.name);
  const m1=f.querySelector('select[name="mobile1"],input[name="mobile1"]');if(m1?.tagName==='SELECT'){m1.value=p1;m1.dispatchEvent(new Event('change',{bubbles:true}))}else setField(m1,p1);
  setField(f.querySelector('input[name="mobile2"]'),p2);setField(f.querySelector('input[name="mobile3"]'),p3);
  const vals=[...person.options].map(o=>String(o.value));if(!vals.includes(String(c.people)))throw new Error(`${c.people}명 예약 옵션이 없습니다. 가능한 인원: ${vals.filter(Boolean).join(', ')}명`);
  person.value=String(c.people);person.dispatchEvent(new Event('change',{bubbles:true}));
  const src=f.querySelector(`input[name="price${c.people}"]`),dst=f.querySelector('input[name="price"]');if(src&&dst)dst.value=src.value;
  const agrees=[...f.querySelectorAll('input[name="ck_agree"]')];if(agrees.length){const x=agrees.find(x=>/^(1|Y|yes|on)$/i.test(String(x.value||'')))||agrees[0];x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))}
  save({phase:'payment'});status('예약정보 입력 완료 → 사이트 정상 예약하기');await sleep(30);
  try{if(typeof window.fun_person_update==='function')window.fun_person_update()}catch{}
  try{if(typeof window.fun_submit==='function'){window.fun_submit();return true}}catch{}
  const btn=[...document.querySelectorAll('a,button,input[type="button"],input[type="submit"]')].find(e=>clean(e.textContent||e.value).includes('예약하기')||String(e.getAttribute('href')||'').includes('fun_submit')||String(e.getAttribute('onclick')||'').includes('fun_submit'));
  if(btn){btn.click();return true}f.submit();return true
}

async function payment(){
  const c=load();if(!c.armed||c.phase!=='payment')return false;
  const f=document.querySelector('form[name="register"]'),pay=f?.querySelector('select[name="payment"]'),num=f?.querySelector('input[name="num"]')?.value||'',ck=f?.querySelector('input[name="ck_code"]')?.value||'',body=clean(document.body?.innerText);
  if(!f||!pay||!num||!ck||!body.includes('결제하기'))return false;
  const vals=[...pay.options].map(o=>String(o.value));if(vals.includes('D'))pay.value='D';else if(vals.includes('A'))pay.value='A';else throw new Error('자동 진행 가능한 무통장(D)/현장(A) 옵션이 없습니다.');
  pay.dispatchEvent(new Event('change',{bubbles:true}));save({phase:'complete'});status('정상 결제 페이지 → 사이트 결제하기');banner('grab','결제 단계 진입',`예약 객체 생성 완료\n내부 예약번호 ${num}`);await sleep(30);
  try{if(typeof window.fun_payment==='function'){window.fun_payment();return true}}catch{}
  const btn=[...document.querySelectorAll('a,button,input[type="button"],input[type="submit"]')].find(e=>clean(e.textContent||e.value).includes('결제하기')||String(e.getAttribute('href')||'').includes('fun_payment')||String(e.getAttribute('onclick')||'').includes('fun_payment'));
  if(btn){btn.click();return true}throw new Error('사이트 결제하기 동작을 찾지 못했습니다.')
}

function complete(){
  const c=load();if(!c.armed||c.phase!=='complete')return false;const body=clean(document.body?.innerText);
  if(!/(04\.?\s*예약완료|예약\s*완료|예약이\s*완료|예약번호)/.test(body))return false;
  save({armed:false,phase:'done'});status('✅ 예약완료 화면 확인');banner('ok','예약 완료 화면 확인',`${c.branchName} · ${c.theme}\n${c.targetDate} ${c.targetTime}\n사이트 정상 흐름 완료\n예약번호 문자는 입력한 전화번호로 발송되는 사이트 정책입니다.`);return true
}
async function pending(){
  const c=load();if(!c.armed)return;
  try{if(complete())return;if(await payment())return}catch(e){save({armed:false,phase:''});banner('err','자동 진행 오류',String(e?.message||e));status(`❌ ${e?.message||e}`)}
}

async function fillBranches(){
  const s=document.getElementById('__doom_branch');if(!s)return;const c=load();s.innerHTML='<option>불러오는 중…</option>';const a=await branches();s.innerHTML='';
  for(const b of a){const o=document.createElement('option');o.value=b.id;o.textContent=b.name;s.appendChild(o)}
  if([...s.options].some(o=>o.value===c.branch))s.value=c.branch;await fillThemes(s.value)
}
async function fillThemes(b){
  const s=document.getElementById('__doom_theme');if(!s)return;const c=load();s.innerHTML='<option>불러오는 중…</option>';
  const a=await themes(b);s.innerHTML='<option value="">테마 선택</option>';for(const t of a){const o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)}
  if([...s.options].some(o=>o.value===c.theme))s.value=c.theme;status(`테마 ${a.length}개 불러옴`)
}
function readCfg(){
  const b=document.getElementById('__doom_branch').value;
  return {...load(),branch:b,branchName:clean(document.getElementById('__doom_branch').selectedOptions[0]?.textContent||POLICY[b]?.name||''),theme:document.getElementById('__doom_theme').value,targetDate:document.getElementById('__doom_date').value,targetTime:document.getElementById('__doom_time').value,openAt:document.getElementById('__doom_open').value,name:clean(document.getElementById('__doom_name').value),phone:clean(document.getElementById('__doom_phone').value),people:document.getElementById('__doom_people').value,autoOpen:document.getElementById('__doom_auto').checked}
}
function validate(c){
  const m=[];if(!c.branch)m.push('지점');if(!c.theme)m.push('테마');if(!c.targetDate)m.push('예약날짜');if(!c.targetTime)m.push('희망시간');if(!c.openAt)m.push('오픈시각');if(!c.name)m.push('이름');if(!/^\d{10,11}$/.test(c.phone.replace(/\D/g,'')))m.push('전화번호');if(m.length)throw new Error('확인 필요: '+m.join(', '))
}

function panel(){
  if(!document.body||document.getElementById('__doom_panel'))return;const c=load();offsetMs=Number(c.offsetMs||0);
  const st=document.createElement('style');st.textContent=`
  #__doom_panel{position:fixed;right:9px;bottom:9px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#111}
  #__doom_toggle{border:0;border-radius:999px;padding:11px 15px;background:#7e0000;color:#fff;font-weight:900;font-size:14px;box-shadow:0 5px 18px #0005}
  #__doom_box{display:none;width:min(370px,calc(100vw - 18px));max-height:82vh;overflow:auto;margin-top:7px;padding:14px;border-radius:16px;background:#fff;box-shadow:0 10px 32px #0006}
  #__doom_box.open{display:block}#__doom_box label{display:block;margin:7px 0;font-size:12px;font-weight:800}
  #__doom_box input,#__doom_box select{box-sizing:border-box;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:9px;background:#fff;font-size:16px}
  .d2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.dt{font-size:18px;font-weight:900}.ds{font-size:11px;color:#666;line-height:1.45;margin:5px 0 8px}
  .db{width:100%;border:0;border-radius:9px;padding:11px;font-weight:900}#__doom_start{background:#7e0000;color:#fff}#__doom_stop,#__doom_reload{background:#eee;color:#111}
  .da{display:grid;grid-template-columns:1.35fr .65fr;gap:7px;margin-top:9px}#__doom_status{white-space:pre-wrap;background:#f3f3f3;border-radius:10px;padding:10px;margin-top:10px;font-size:12px;line-height:1.45}
  #__doom_open_note{font-size:11px;line-height:1.45}.dw{font-size:11px;line-height:1.5;color:#8a2929;margin-top:8px}`;document.documentElement.appendChild(st);
  const p=document.createElement('div');p.id='__doom_panel';p.innerHTML=`
  <button id="__doom_toggle" type="button">⚡ DOOM 예약</button><div id="__doom_box">
  <div class="dt">DOOM HYBRID FAST</div><div class="ds">슬롯 감지 후 예약정보 POST까지 DIRECT로 선점하고, 결제부터는 사이트 정상 흐름으로 진행합니다.</div>
  <div class="d2"><label>지점<select id="__doom_branch"><option>불러오는 중…</option></select></label><label>테마<select id="__doom_theme"><option>불러오는 중…</option></select></label></div>
  <button id="__doom_reload" class="db" type="button">지점/테마 다시 불러오기</button>
  <div class="d2"><label>예약 날짜<input id="__doom_date" type="date"></label><label>희망 시간<input id="__doom_time" type="time" step="60"></label></div>
  <label>예약 오픈 시각<input id="__doom_open" type="datetime-local" step="1"></label>
  <label style="font-weight:700"><input id="__doom_auto" type="checkbox" style="width:auto;margin-right:6px">공식 지점별 오픈시간 자동설정</label><div id="__doom_open_note"></div>
  <label>예약자 이름<input id="__doom_name" type="text"></label><label>전화번호<input id="__doom_phone" type="tel" inputmode="tel" placeholder="010-1234-5678"></label>
  <label>인원<select id="__doom_people"><option value="1">1명</option><option value="2">2명</option><option value="3">3명</option><option value="4">4명</option><option value="5">5명</option><option value="6">6명</option></select></label>
  <div class="da"><button id="__doom_start" class="db" type="button">예약 대기 시작</button><button id="__doom_stop" class="db" type="button">중지</button></div>
  <div id="__doom_status">준비됨</div><div class="dw">문자 도착 자체는 100% 보장할 수 없지만, 선점 POST는 사이트의 실제 rev.act.php form 값을 그대로 사용하고 결제는 정상 fun_payment() 흐름으로 진행합니다.</div>
  </div>`;document.body.appendChild(p);
  document.getElementById('__doom_toggle').onclick=()=>document.getElementById('__doom_box').classList.toggle('open');
  document.getElementById('__doom_date').value=c.targetDate||'';document.getElementById('__doom_time').value=c.targetTime||'';document.getElementById('__doom_open').value=c.openAt||'';
  document.getElementById('__doom_name').value=c.name||'';document.getElementById('__doom_phone').value=c.phone||'';document.getElementById('__doom_people').value=c.people||'2';document.getElementById('__doom_auto').checked=c.autoOpen!==false;
  const b=document.getElementById('__doom_branch');
  b.onchange=async()=>{const id=b.value;save({branch:id,branchName:clean(b.selectedOptions[0]?.textContent||POLICY[id]?.name||''),theme:''});try{await fillThemes(id);refreshAuto()}catch(e){status(`❌ ${e?.message||e}`)}};
  document.getElementById('__doom_theme').onchange=e=>save({theme:e.target.value});
  document.getElementById('__doom_date').onchange=e=>{save({targetDate:e.target.value});refreshAuto()};
  document.getElementById('__doom_auto').onchange=e=>{save({autoOpen:!!e.target.checked});if(e.target.checked)refreshAuto();else{const n=document.getElementById('__doom_open_note');n.textContent='자동설정 OFF · 직접 입력 가능';n.style.color='#666'}};
  document.getElementById('__doom_reload').onclick=async()=>{try{await fillBranches();refreshAuto()}catch(e){status(`❌ ${e?.message||e}`)}};
  document.getElementById('__doom_stop').onclick=()=>{stopped=true;running=false;save({armed:false,phase:''});status('예약 대기 중지됨')};
  document.getElementById('__doom_start').onclick=async()=>{if(running)return;try{refreshAuto(false);const x=readCfg();validate(x);save({...x,armed:true,phase:'waiting'});running=true;stopped=false;status(`예약 준비\n${x.branchName} · ${x.theme}\n${x.targetDate} ${x.targetTime}`);await waitOpen(x)}catch(e){running=false;save({armed:false,phase:''});banner('err','시작할 수 없음',String(e?.message||e));status(`❌ ${e?.message||e}`)}};
  fillBranches().then(()=>refreshAuto(false)).catch(e=>status(`목록 로딩 실패: ${e?.message||e}`))
}

if(document.body)panel();else document.addEventListener('DOMContentLoaded',panel,{once:true});
setTimeout(pending,50);
})();
    } catch (e) {
      console.error('[ESCAPE PASS][doomescape engine]', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __epRun_doomescape, {once:true});
  } else {
    __epRun_doomescape();
  }
}


if (/(^|\.)play33\.kr$/i.test(location.hostname)) {
  const __epRun_play33 = () => {
    try {
(() => {
  'use strict';

  const KEY = 'play33_fast_booking_v1';

  // 지점별 예약 오픈 규칙
  // branch 1 = 건대점: 7일 전 20:00
  // branch 4 = 홍대점: 7일 전 20:00
  // branch 5 = 대전점: 7일 전 10:00
  // branch 7 = 수원점: 7일 전 22:00
  const BRANCH_OPEN_RULES = {
    '1': { rangeDay: 7, openTime: '20:00:00', label: '건대점' },
    '4': { rangeDay: 7, openTime: '20:00:00', label: '홍대점' },
    '5': { rangeDay: 7, openTime: '10:00:00', label: '대전점' },
    '7': { rangeDay: 7, openTime: '22:00:00', label: '수원점' }
  };

  function applyBranchOpenRule(branch, cfg={}) {
    const rule = BRANCH_OPEN_RULES[String(branch)];
    if (!rule) return cfg;
    return {...cfg, rangeDay: rule.rangeDay, openTime: rule.openTime};
  }

  // ULTRA FAST 네트워크 튜닝
  const PREWARM_BEFORE_MS = 10000;       // 10초 전 첫 연결 예열
  const SECOND_PREWARM_BEFORE_MS = 3000; // 3초 전 한 번 더 예열
  const BURST_START_BEFORE_MS = 2000;    // 2초 전부터 초고속 확인
  const BURST_END_AFTER_MS = 3000;       // 오픈 후 3초까지
  const BURST_CYCLE_MS = 50;             // 목표 주기 (실제 요청 시간이 더 길면 추가 대기 없음)
  const FAST_END_AFTER_MS = 10000;       // 오픈 후 10초까지
  const FAST_CYCLE_MS = 120;
  const NORMAL_CYCLE_MS = 300;
  const STATUS_EVERY_ATTEMPTS = 20;      // 화면 갱신 부담 최소화

  const DEFAULTS = {
    branch: '',
    theme: '',
    date: '',
    time: '',
    name: '',
    phone: '',
    people: '2',
    rangeDay: 7,
    openTime: '20:00:00',
    phase: 'idle'
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();

  function loadCfg() {
    try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; }
    catch { return {...DEFAULTS}; }
  }
  function saveCfg(patch={}) {
    const cfg = {...loadCfg(), ...patch};
    localStorage.setItem(KEY, JSON.stringify(cfg));
    return cfg;
  }
  function formatPhone(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
    return raw.trim();
  }
  function validDate(v){ return /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function validTime(v){ return /^\d{2}:\d{2}$/.test(v); }

  function toast(msg, ms=5000) {
    let el = document.getElementById('p33-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'p33-toast';
      Object.assign(el.style, {
        position:'fixed', left:'12px', right:'12px', bottom:'18px', zIndex:'2147483647',
        padding:'12px 14px', borderRadius:'12px', background:'rgba(0,0,0,.88)',
        color:'#fff', fontSize:'14px', lineHeight:'1.45', whiteSpace:'pre-wrap',
        boxShadow:'0 4px 18px rgba(0,0,0,.3)'
      });
      document.documentElement.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    if (ms) setTimeout(() => { if (el) el.style.display='none'; }, ms);
  }

  // 예약정보 입력 페이지: 저장된 정보를 채우고 사이트의 실제 예약 버튼을 누릅니다.
  async function handleInputPage() {
    const form = $('form[action*="/reservation/create"]');
    const nameEl = $('input[name="name"]', form);
    const phoneEl = $('input[name="phone"]', form);
    const peopleEl = $('select[name="people"]', form);
    const policyEl = $('input[name="policy"]', form);
    const btn = $('#eveReservationBtn', form || document);

    if (!form || !nameEl || !phoneEl || !peopleEl || !policyEl || !btn) return false;

    const cfg = loadCfg();
    if (!['awaiting_info','filled'].includes(cfg.phase)) return true;

    nameEl.value = cfg.name;
    phoneEl.value = formatPhone(cfg.phone);
    peopleEl.value = String(cfg.people);
    policyEl.checked = true;

    for (const el of [nameEl, phoneEl, peopleEl, policyEl]) {
      el.dispatchEvent(new Event('input', {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
    }

    // FAST Native 모드:
    // 재검증/추가 대기 없이 값 입력 이벤트가 끝나는 즉시
    // PLAY33 사이트의 실제 예약하기 버튼을 한 번만 클릭합니다.
    // 최종 예약 요청을 임의로 직접 만들지 않으므로 사이트의 정상 후속 처리 흐름은 유지합니다.
    saveCfg({phase:'final_clicked'});
    toast(`FAST 정상 예약 흐름\n${cfg.name} / ${formatPhone(cfg.phone)} / ${cfg.people}명\n즉시 PLAY33 실제 '예약하기' 버튼을 클릭합니다.`, 2200);
    btn.click();
    return true;
  }

  if (handleInputPage()) {
    // Promise이므로 아래 UI 생성도 실행되지만 입력 페이지에서는 createPanel이 스스로 종료합니다.
  }

  const isReservationListPage = /^\/reservation\/?$/.test(location.pathname);

  // PLAY33의 다른 페이지에서 실행된 경우에도 Userscripts가 정상 동작 중인지
  // 바로 확인할 수 있도록 예약 페이지 이동 버튼을 항상 표시합니다.
  if (!isReservationListPage) {
    const boot = () => {
      if (document.getElementById('p33-global-launcher')) return;
      const b = document.createElement('button');
      b.id = 'p33-global-launcher';
      b.type = 'button';
      b.textContent = '⚡ PLAY33 예약 열기';
      Object.assign(b.style, {
        position:'fixed', right:'12px', bottom:'14px', zIndex:'2147483647',
        border:'0', borderRadius:'999px', padding:'12px 16px',
        background:'#111', color:'#fff', fontWeight:'800', fontSize:'14px',
        boxShadow:'0 5px 18px rgba(0,0,0,.35)'
      });
      b.addEventListener('click', () => { location.href = 'https://play33.kr/reservation'; });
      (document.body || document.documentElement).appendChild(b);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
    return;
  }

  let running = false;
  let stopped = false;
  let serverOffset = 0;

  function getPageDefaults() {
    const range = parseInt($('#reservation_range_day')?.value || '7', 10);
    const open = $('#reservation_range_open_time')?.value || '20:00:00';
    return {
      rangeDay: Number.isFinite(range) ? range : 7,
      openTime: /^\d{2}:\d{2}:\d{2}$/.test(open) ? open : '20:00:00'
    };
  }

  async function estimateServerOffset() {
    try {
      const res = await fetch(`/reservation?_clock=${Date.now()}`, {
        method:'GET', credentials:'same-origin', cache:'no-store',
        headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
      });
      const d = res.headers.get('Date');
      if (!d) return 0;
      const server = new Date(d).getTime();
      const local = Date.now();
      return server - local;
    } catch {
      return 0;
    }
  }

  function serverNowMs(){ return Date.now() + serverOffset; }

  function parseOpenMoment(targetDate, rangeDay, openTime) {
    const [y,m,d] = targetDate.split('-').map(Number);
    const [hh,mm,ss] = openTime.split(':').map(Number);
    const target = new Date(y, m-1, d, 0,0,0,0);
    target.setDate(target.getDate() - rangeDay);
    target.setHours(hh,mm,ss,0);
    return target.getTime();
  }

  function parseBranchesFrom(doc=document) {
    const sel = $('select[name="branch"]', doc);
    if (!sel) return [];
    return $$('option', sel)
      .filter(o => o.value && clean(o.textContent) !== '테스트')
      .map(o => ({value:o.value, text:clean(o.textContent)}));
  }

  function parseThemesFrom(doc) {
    const sel = $('select[name="theme"]', doc);
    if (!sel) return [];
    return $$('option', sel)
      .filter(o => o.value)
      .map(o => ({value:o.value, text:clean(o.textContent)}));
  }

  function buildReservationURL(cfg) {
    const u = new URL('/reservation', location.origin);
    if (cfg.branch) u.searchParams.set('branch', cfg.branch);
    if (cfg.date) u.searchParams.set('date', cfg.date);
    if (cfg.theme) u.searchParams.set('theme', cfg.theme);
    u.searchParams.set('_fast', String(Date.now()));
    return u;
  }

  async function fetchReservationHTML(cfg) {
    const res = await fetch(buildReservationURL(cfg).toString(), {
      credentials:'same-origin',
      cache:'no-store',
      headers:{
        'Cache-Control':'no-cache, no-store, max-age=0',
        'Pragma':'no-cache',
        'Accept':'text/html,application/xhtml+xml'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  // 설정 화면에서 테마 목록을 불러올 때만 DOMParser를 사용합니다.
  // 경쟁 예약 루프에서는 이 함수를 사용하지 않습니다.
  async function fetchReservationDocument(cfg) {
    const html = await fetchReservationHTML(cfg);
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function extractHiddenInputValue(html, name) {
    const tags = html.match(/<input\b[^>]*>/gi) || [];
    for (const tag of tags) {
      const nm = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
      if (nm !== name) continue;
      return tag.match(/\bvalue\s*=\s*["']([^"']*)["']/i)?.[1] || '';
    }
    return '';
  }

  function decodeHtmlForScan(html) {
    return String(html || '')
      .replace(/&quot;|&#34;|&#x22;/gi, '"')
      .replace(/&#39;|&#x27;|&apos;/gi, "'")
      .replace(/&amp;/gi, '&');
  }

  function exactReservationPayloadPresent(html, cfg) {
    // 예약 가능한 슬롯에는 PLAY33가 branch/theme/date/time 데이터를 함께 출력합니다.
    // 속도와 정확도를 위해 이 네 값이 모두 일치하는 예약 payload를 최우선으로 찾습니다.
    const s = decodeHtmlForScan(html);
    const b = escapeRegExp(String(cfg.branch));
    const th = escapeRegExp(String(cfg.theme));
    const d = escapeRegExp(String(cfg.date));
    const tm = escapeRegExp(String(cfg.time));

    // JSON key 순서가 달라도 잡도록 작은 객체 후보를 순회합니다.
    const objects = s.match(/\{[^{}]{0,500}\}/g) || [];
    for (const obj of objects) {
      const hasBranch = new RegExp(`["']branch["']\\s*:\\s*["']?${b}["']?`, 'i').test(obj);
      const hasTheme  = new RegExp(`["']theme["']\\s*:\\s*["']?${th}["']?`, 'i').test(obj);
      const hasDate   = new RegExp(`["']date["']\\s*:\\s*["']?${d}["']?`, 'i').test(obj);
      const hasTime   = new RegExp(`["']time["']\\s*:\\s*["']?${tm}["']?`, 'i').test(obj);
      if (hasBranch && hasTheme && hasDate && hasTime) return true;
    }
    return false;
  }

  function inspectAvailabilityDOM(html, cfg) {
    // 직접 payload 검사가 실패했을 때의 안전한 보조 판정.
    // 이미 열린 슬롯 테스트에서는 속도보다 정확성이 중요하므로 DOMParser fallback을 사용합니다.
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const themeOpt = doc.querySelector(`select[name="theme"] option[value="${CSS.escape(String(cfg.theme))}"]`);
      const targetThemeName = clean(themeOpt?.textContent || cfg.themeName || '');
      let sections = [...doc.querySelectorAll('section.reslist')];
      if (targetThemeName) {
        const matched = sections.filter(sec => clean(sec.querySelector('.reslist-text > strong')?.textContent) === targetThemeName);
        if (matched.length) sections = matched;
      }

      for (const sec of sections) {
        for (const btn of sec.querySelectorAll('.restimes button')) {
          const t = clean(btn.querySelector('span')?.textContent);
          if (t !== cfg.time) continue;
          if (!btn.disabled && !btn.hasAttribute('disabled') && !/예약\s*불가/.test(clean(btn.textContent))) {
            return true;
          }
        }
      }
    } catch {}
    return false;
  }

  function inspectAvailabilityHTML(html, cfg) {
    // 1) 가장 신뢰도 높은 판정: PLAY33가 예약 가능 슬롯에 넣은 정확한 예약 payload
    if (exactReservationPayloadPresent(html, cfg)) {
      const token = extractHiddenInputValue(html, '_token');
      if (!token) return {available:false, status:'예약 가능 데이터 감지 / CSRF 토큰 미검출'};
      return {available:true, token, themeName:cfg.themeName || '', status:`${cfg.time} 예약 가능(payload)`};
    }

    // 2) 보조 판정: 실제 버튼 DOM 상태 확인
    if (inspectAvailabilityDOM(html, cfg)) {
      const token = extractHiddenInputValue(html, '_token');
      if (!token) return {available:false, status:'활성 버튼 감지 / CSRF 토큰 미검출'};
      return {available:true, token, themeName:cfg.themeName || '', status:`${cfg.time} 예약 가능(button)`};
    }

    // 3) 상태 메시지용 가벼운 검사
    const decoded = decodeHtmlForScan(html);
    const timeRe = new RegExp(`<span[^>]*>\\s*${escapeRegExp(cfg.time)}\\s*</span>`, 'i');
    if (!timeRe.test(decoded)) return {available:false, status:`${cfg.time} 시간 미표시`};
    return {available:false, status:`${cfg.time} 표시됨 / 현재 예약가능 데이터 미검출`};
  }

  function postToNativeInput(cfg, token) {
    saveCfg({phase:'awaiting_info'});

    const form = document.createElement('form');
    form.method = 'post';
    form.action = '/reservation/create#content';
    form.style.display = 'none';

    const data = {
      branch: cfg.branch,
      theme: cfg.theme,
      date: cfg.date,
      time: cfg.time,
      _token: token
    };
    for (const [name, value] of Object.entries(data)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  function setStatus(text) {
    const el = $('#p33-status');
    if (el) el.textContent = text;
  }

  async function startBooking() {
    if (running) return;
    let cfg = collectConfig();
    if (!cfg) return;
    cfg = applyBranchOpenRule(cfg.branch, cfg);
    saveCfg(cfg);

    running = true;
    stopped = false;
    $('#p33-start').disabled = true;
    $('#p33-stop').disabled = false;

    saveCfg({...cfg, phase:'armed'});
    serverOffset = await estimateServerOffset();
    const offsetSec = serverOffset / 1000;
    setStatus(`ULTRA FAST 준비 · 서버 시각 보정 ${offsetSec >= 0 ? '+' : ''}${offsetSec.toFixed(2)}초`);

    const openMs = parseOpenMoment(cfg.date, cfg.rangeDay, cfg.openTime);
    const prewarmMs = openMs - PREWARM_BEFORE_MS;
    const secondPrewarmMs = openMs - SECOND_PREWARM_BEFORE_MS;
    const burstStartMs = openMs - BURST_START_BEFORE_MS;

    // 이미 열려 있는 날짜/시간이면 대기하지 않고 즉시 1회 확인합니다.
    try {
      const firstHTML = await fetchReservationHTML(cfg);
      const firstInfo = inspectAvailabilityHTML(firstHTML, cfg);
      if (firstInfo.available) {
        setStatus(`이미 예약 가능 · ${cfg.time}\n즉시 예약정보 페이지로 이동합니다.`);
        postToNativeInput(cfg, firstInfo.token);
        return;
      }
    } catch (e) {
      setStatus(`초기 예약가능 확인 오류 · ${e.message}`);
    }

    if (serverNowMs() < prewarmMs) {
      setStatus(`대기 중 · ${new Date(openMs).toLocaleString()} 오픈 예정`);
      while (!stopped && serverNowMs() < prewarmMs) {
        await sleep(Math.min(500, Math.max(50, prewarmMs - serverNowMs())));
      }
    }
    if (stopped) return finishStopped();

    // 10초 전 첫 예열
    try {
      setStatus('ULTRA FAST · 서버 연결 1차 예열');
      await fetchReservationHTML(cfg);
    } catch {}

    if (serverNowMs() < secondPrewarmMs) {
      while (!stopped && serverNowMs() < secondPrewarmMs) {
        await sleep(Math.min(100, Math.max(10, secondPrewarmMs - serverNowMs())));
      }
    }
    if (stopped) return finishStopped();

    // 3초 전 두 번째 예열: 오픈 직전 keep-alive 연결을 한 번 더 활성화
    try {
      setStatus('ULTRA FAST · 서버 연결 2차 예열');
      await fetchReservationHTML(cfg);
    } catch {}

    if (serverNowMs() < burstStartMs) {
      setStatus(`${cfg.openTime} 2초 전부터 50ms 버스트 시작`);
      while (!stopped && serverNowMs() < burstStartMs) {
        const remain = burstStartMs - serverNowMs();
        await sleep(remain > 100 ? 20 : 2);
      }
    }
    if (stopped) return finishStopped();

    let attempt = 0;
    while (!stopped) {
      attempt++;
      const cycleStart = performance.now();
      try {
        const html = await fetchReservationHTML(cfg);
        const info = inspectAvailabilityHTML(html, cfg);

        if (info.available) {
          setStatus(`예약 가능 감지! ${cfg.time} · ${attempt}회차\n즉시 정상 예약정보 페이지로 이동합니다.`);
          postToNativeInput(cfg, info.token);
          return;
        }

        if (attempt === 1 || attempt % STATUS_EVERY_ATTEMPTS === 0) {
          setStatus(`ULTRA FAST · ${info.status} · ${attempt}회 확인`);
        }
      } catch (e) {
        if (attempt === 1 || attempt % STATUS_EVERY_ATTEMPTS === 0) {
          setStatus(`ULTRA FAST 재시도 ${attempt}회 · ${e.message}`);
        }
      }

      const rel = serverNowMs() - openMs;
      let targetCycle;
      if (rel >= -BURST_START_BEFORE_MS && rel <= BURST_END_AFTER_MS) {
        targetCycle = BURST_CYCLE_MS;
      } else if (rel <= FAST_END_AFTER_MS) {
        targetCycle = FAST_CYCLE_MS;
      } else {
        targetCycle = NORMAL_CYCLE_MS;
      }

      const elapsed = performance.now() - cycleStart;
      if (elapsed < targetCycle) await sleep(targetCycle - elapsed);
    }
    finishStopped();
  }

  function finishStopped() {
    running = false;
    $('#p33-start').disabled = false;
    $('#p33-stop').disabled = true;
    setStatus('중지됨');
    saveCfg({phase:'idle'});
  }

  function collectConfig() {
    let cfg = {
      ...loadCfg(),
      branch: $('#p33-branch').value,
      theme: $('#p33-theme').value,
      themeName: clean($('#p33-theme').selectedOptions?.[0]?.textContent || '').replace(/\s*\(ID\s*\d+\)\s*$/, ''),
      date: $('#p33-date').value.trim(),
      time: $('#p33-time').value.trim(),
      name: $('#p33-name').value.trim(),
      phone: $('#p33-phone').value.trim(),
      people: $('#p33-people').value,
      rangeDay: parseInt($('#p33-range').value || '7', 10),
      openTime: $('#p33-open').value.trim()
    };

    cfg = applyBranchOpenRule(cfg.branch, cfg);
    const errs = [];
    if (!cfg.branch) errs.push('지점');
    if (!cfg.theme) errs.push('테마');
    if (!validDate(cfg.date)) errs.push('날짜(YYYY-MM-DD)');
    if (!validTime(cfg.time)) errs.push('시간(HH:MM)');
    if (!cfg.name) errs.push('성함');
    if (!/^\d{10,11}$/.test(cfg.phone.replace(/\D/g,''))) errs.push('연락처');
    if (!cfg.people) errs.push('인원');
    if (!/^\d{2}:\d{2}:\d{2}$/.test(cfg.openTime)) errs.push('오픈시각(HH:MM:SS)');

    if (errs.length) {
      alert('확인해 주세요: ' + errs.join(', '));
      return null;
    }
    saveCfg(cfg);
    return cfg;
  }


  function syncOpenRuleUI() {
    const branch = $('#p33-branch')?.value || '';
    const rule = BRANCH_OPEN_RULES[String(branch)];
    if (!rule) return;
    if ($('#p33-range')) $('#p33-range').value = rule.rangeDay;
    if ($('#p33-open')) $('#p33-open').value = rule.openTime;
    saveCfg({branch, rangeDay: rule.rangeDay, openTime: rule.openTime});
    setStatus(`${rule.label}: ${rule.rangeDay}일 전 ${rule.openTime} 오픈`);
  }

  async function refreshThemes() {
    const branch = $('#p33-branch').value;
    const date = $('#p33-date').value.trim();
    const old = $('#p33-theme').value;
    setStatus('테마 목록 불러오는 중…');

    try {
      const doc = await fetchReservationDocument({...loadCfg(), branch, date, theme:''});
      const themes = parseThemesFrom(doc);
      const sel = $('#p33-theme');
      sel.innerHTML = '<option value="">테마 선택</option>';
      for (const t of themes) {
        const o = document.createElement('option');
        o.value = t.value;
        o.textContent = `${t.text} (ID ${t.value})`;
        sel.appendChild(o);
      }
      if (themes.some(t => t.value === old)) sel.value = old;
      else if (themes.length === 1) sel.value = themes[0].value;
      setStatus(`${themes.length}개 테마 불러옴`);
    } catch (e) {
      setStatus(`테마 목록 오류: ${e.message}`);
    }
  }

  function createPanel() {
    if ($('#p33-panel')) return;

    const cfg0 = {...loadCfg(), ...getPageDefaults()};
    saveCfg({rangeDay:cfg0.rangeDay, openTime:cfg0.openTime});

    const branches = parseBranchesFrom();
    const wrap = document.createElement('div');
    wrap.id = 'p33-panel';
    wrap.innerHTML = `
      <button id="p33-toggle" type="button">⚡ PLAY33 예약</button>
      <div id="p33-box">
        <div class="p33-title">PLAY33 ULTRA FAST 예약</div>
        <label>지점<select id="p33-branch"></select></label>
        <label>테마<div class="p33-inline"><select id="p33-theme"></select><button id="p33-theme-load" type="button">불러오기</button></div></label>
        <label>희망 날짜<input id="p33-date" type="date"></label>
        <label>희망 시간<input id="p33-time" type="time"></label>
        <label>예약자 이름<input id="p33-name" type="text" autocomplete="name"></label>
        <label>전화번호<input id="p33-phone" type="tel" inputmode="tel" placeholder="010-1234-5678"></label>
        <label>인원<select id="p33-people">
          <option value="2">2명</option><option value="3">3명</option>
          <option value="4">4명</option><option value="5">5명</option>
        </select></label>
        <details>
          <summary>고급 설정</summary>
          <label>예약 범위 일수<input id="p33-range" type="number" min="1" max="30"></label>
          <label>사이트 오픈 시각<input id="p33-open" type="text" inputmode="numeric"></label>
        </details>
        <div class="p33-native">⚡ ULTRA FAST OPEN-FIX: 예약 payload 우선 감지 + 실제 예약하기 버튼</div>
        <div class="p33-actions">
          <button id="p33-start" type="button">예약 대기 시작</button>
          <button id="p33-stop" type="button" disabled>중지</button>
        </div>
        <div id="p33-status">준비됨</div>
        <div class="p33-note">Safari를 화면에 띄운 상태로 유지하세요. 백그라운드/화면잠금 시 타이머가 지연될 수 있습니다.</div>
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      #p33-panel{position:fixed;right:10px;bottom:10px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#111}
      #p33-toggle{border:0;border-radius:999px;padding:11px 15px;background:#111;color:#fff;font-weight:700;box-shadow:0 4px 16px #0004}
      #p33-box{display:none;width:min(350px,calc(100vw - 20px));max-height:78vh;overflow:auto;margin-top:8px;padding:14px;border-radius:16px;background:#fff;box-shadow:0 8px 30px #0005}
      #p33-box.open{display:block}
      .p33-title{font-size:18px;font-weight:800;margin-bottom:10px}
      #p33-box label{display:block;font-size:12px;font-weight:700;margin:8px 0}
      #p33-box input,#p33-box select{box-sizing:border-box;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:9px;background:#fff;font-size:16px}
      .p33-inline{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}
      .p33-inline button,.p33-actions button{border:0;border-radius:9px;padding:10px 12px;font-weight:700}
      #p33-theme-load{background:#eee}
      .p33-actions{display:grid;grid-template-columns:1fr .6fr;gap:7px;margin-top:10px}
      #p33-start{background:#111;color:#fff} #p33-stop{background:#eee}
      #p33-status{margin-top:10px;padding:10px;border-radius:9px;background:#f3f3f3;font-size:12px;line-height:1.45;white-space:pre-wrap}
      .p33-note{margin-top:8px;font-size:11px;line-height:1.4;color:#666}
      .p33-native{margin-top:9px;padding:9px;border-radius:9px;background:#eef7ff;font-size:11px;font-weight:700;line-height:1.4}
      #p33-box details{margin-top:8px;padding:8px;border-radius:9px;background:#f8f8f8}
      #p33-box summary{font-size:12px;font-weight:700}
    `;
    document.documentElement.appendChild(style);
    document.body.appendChild(wrap);

    const branchSel = $('#p33-branch');
    branchSel.innerHTML = '<option value="">지점 선택</option>';
    for (const b of branches) {
      const o = document.createElement('option');
      o.value = b.value; o.textContent = `${b.text} (ID ${b.value})`;
      branchSel.appendChild(o);
    }
    if (cfg0.branch) branchSel.value = cfg0.branch;

    const themeSel = $('#p33-theme');
    themeSel.innerHTML = '<option value="">테마 선택</option>';
    const currentThemes = parseThemesFrom(document);
    for (const t of currentThemes) {
      const o = document.createElement('option');
      o.value=t.value; o.textContent=`${t.text} (ID ${t.value})`;
      themeSel.appendChild(o);
    }
    if (cfg0.theme) themeSel.value = cfg0.theme;

    $('#p33-date').value = cfg0.date;
    $('#p33-time').value = cfg0.time;
    $('#p33-name').value = cfg0.name;
    $('#p33-phone').value = cfg0.phone;
    $('#p33-people').value = cfg0.people;
    $('#p33-range').value = cfg0.rangeDay;
    $('#p33-open').value = cfg0.openTime;
    syncOpenRuleUI();

    $('#p33-toggle').addEventListener('click', () => $('#p33-box').classList.toggle('open'));
    $('#p33-theme-load').addEventListener('click', refreshThemes);
    branchSel.addEventListener('change', async () => {
      syncOpenRuleUI();
      await refreshThemes();
    });
    $('#p33-start').addEventListener('click', startBooking);
    $('#p33-stop').addEventListener('click', () => { stopped = true; });

    document.addEventListener('visibilitychange', () => {
      if (running && document.hidden) setStatus('⚠️ Safari가 백그라운드로 이동했습니다. 빠른 확인이 지연될 수 있습니다.');
    });
  }

  const bootPanel = () => {
    try {
      createPanel();
      console.log('[PLAY33 Userscripts] v1.6 ULTRA FAST loaded:', location.href);
    } catch (e) {
      console.error('[PLAY33 Userscripts] panel error:', e);
      toast('PLAY33 스크립트 로딩 오류: ' + (e?.message || e), 0);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootPanel, {once:true});
  else bootPanel();
})();
    } catch (e) {
      console.error('[ESCAPE PASS][play33 engine]', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __epRun_play33, {once:true});
  } else {
    __epRun_play33();
  }
}


if (/(^|\.)dpsnnn\.com$/i.test(location.hostname)) {
  const __epRun_dps = () => {
    try {
(() => {
  'use strict';

  function installEarlyBadge() {
    if (!document.body || document.getElementById('dps-script-alive')) return;
    const b = document.createElement('button');
    b.id = 'dps-script-alive';
    b.type = 'button';
    b.textContent = '⚡ 단편선 예약';
    Object.assign(b.style, {
      position: 'fixed',
      right: '10px',
      bottom: '10px',
      zIndex: '2147483647',
      border: '0',
      borderRadius: '999px',
      padding: '11px 15px',
      background: '#111',
      color: '#fff',
      fontWeight: '800',
      fontSize: '13px',
      boxShadow: '0 4px 18px rgba(0,0,0,.35)'
    });
    b.addEventListener('click', () => {
      const panel = document.getElementById('dps-fast-panel');
      if (panel) {
        document.getElementById('dps-fast-box')?.classList.toggle('open');
      } else {
        alert(
          '단편선 Userscript는 현재 페이지에 정상 주입되었습니다.\n' +
          '예약 패널 초기화 전입니다. 페이지를 한 번 새로고침해 주세요.\n\n' +
          location.href
        );
      }
    });
    document.body.appendChild(b);
  }

  if (document.body) installEarlyBadge();
  else document.addEventListener('DOMContentLoaded', installEarlyBadge, {once:true});


  const KEY = 'dps_gangnam_fast_booking_v1';
  const DEFAULTS = {
    targetDate: '',
    theme: '상자',
    targetTime: '10:00',
    name: '',
    phone: '',
    depositor: '',
    phase: 'idle',
    armed: false,
    autoPay: true,
    reloadCount: 0,
    lastAction: '',
    serverOffsetMs: 0,
    serverRttMs: 0,
    lastClockSync: 0
  };

  const TIME_TABLE = {
    '상자': ['10:00','11:30','13:00','14:30','16:00','17:30','19:00','20:30','22:00'],
    '행복': ['10:20','11:50','13:20','14:50','16:20','17:50','19:20','20:50','22:20']
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = (sel, root=document) => root?.querySelector?.(sel) || null;
  const $$ = (sel, root=document) => root?.querySelectorAll ? [...root.querySelectorAll(sel)] : [];
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  function loadCfg() {
    try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; }
    catch { return {...DEFAULTS}; }
  }
  function saveCfg(patch={}) {
    const cfg = {...loadCfg(), ...patch};
    localStorage.setItem(KEY, JSON.stringify(cfg));
    return cfg;
  }

  // Navyism이 보여주는 대상과 같은 www.dpsnnn.com 서버 시각을
  // 현재 사이트의 HTTP Date 헤더로 직접 측정해 기기 시계와의 차이를 보정합니다.
  // HTTP Date는 초 단위이므로 +500ms를 적용해 해당 초의 중앙값으로 추정하고,
  // 왕복지연(RTT)이 짧은 샘플들의 중앙값을 사용합니다.
  let serverOffsetMs = Number(loadCfg().serverOffsetMs || 0);

  function serverNowMs() {
    return Date.now() + serverOffsetMs;
  }

  function median(nums) {
    if (!nums.length) return 0;
    const a = [...nums].sort((x,y) => x-y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
  }

  async function calibrateServerClock(sampleCount=5, quiet=false) {
    const samples = [];
    if (!quiet) status('단편선 서버시간 동기화 중…');

    for (let i=0; i<sampleCount; i++) {
      try {
        const t0 = Date.now();
        const res = await fetch(`/reserve_g?_clock=${t0}_${i}_${Math.random().toString(36).slice(2)}`, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0',
            'Pragma': 'no-cache'
          }
        });
        const t1 = Date.now();
        const raw = res.headers.get('Date');
        if (!raw) continue;

        const serverSec = Date.parse(raw);
        if (!Number.isFinite(serverSec)) continue;

        const rtt = t1 - t0;
        const midpoint = (t0 + t1) / 2;
        const offset = (serverSec + 500) - midpoint;
        samples.push({offset, rtt});
      } catch {}
      if (i + 1 < sampleCount) await sleep(35);
    }

    if (!samples.length) {
      const old = loadCfg();
      serverOffsetMs = Number(old.serverOffsetMs || 0);
      if (!quiet) status(`서버시간 응답 미확인 · 기존 보정 ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms 사용`);
      return {ok:false, offset:serverOffsetMs, rtt:Number(old.serverRttMs || 0)};
    }

    samples.sort((a,b) => a.rtt - b.rtt);
    const keep = samples.slice(0, Math.min(5, samples.length));
    const offset = Math.round(median(keep.map(x => x.offset)));
    const rtt = Math.round(median(keep.map(x => x.rtt)));

    serverOffsetMs = offset;
    saveCfg({
      serverOffsetMs: offset,
      serverRttMs: rtt,
      lastClockSync: Date.now()
    });

    if (!quiet) {
      status(`단편선 서버시간 보정 ${offset >= 0 ? '+' : ''}${offset}ms · RTT 약 ${rtt}ms`);
    }
    return {ok:true, offset, rtt};
  }
  function fmtPhone(raw) {
    const d = String(raw || '').replace(/\D/g,'');
    if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
    return raw;
  }
  function dateParts(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? {y:+m[1], m:+m[2], d:+m[3]} : null;
  }

  // 공식 FAQ 예시 기준:
  // 월→화 자정에 다음 주 월요일 슬롯 오픈 = 목표일 6일 전 00:00.
  function calcOpenMoment(targetDate) {
    const p = dateParts(targetDate);
    if (!p) return NaN;
    const target = new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0);
    const open = new Date(target);
    open.setDate(open.getDate() - 6);
    open.setHours(0,0,0,0);
    return open.getTime();
  }

  function status(msg) {
    const el = document.getElementById('dps-fast-status');
    if (el) el.textContent = msg;
  }
  function toast(msg, keep=false) {
    let el = document.getElementById('dps-fast-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dps-fast-toast';
      Object.assign(el.style, {
        position:'fixed', left:'12px', right:'12px', bottom:'18px', zIndex:'2147483647',
        padding:'12px 14px', borderRadius:'12px', background:'rgba(0,0,0,.9)',
        color:'#fff', fontSize:'14px', lineHeight:'1.45', whiteSpace:'pre-wrap',
        boxShadow:'0 5px 22px rgba(0,0,0,.35)'
      });
      document.documentElement.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    if (!keep) setTimeout(() => { el.style.display='none'; }, 3000);
  }

  function setNativeValue(el, value) {
    if (!el) return;
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function deepAll(root) {
    const result = [];
    function walk(node) {
      if (!node) return;
      if (node.querySelectorAll) {
        for (const el of node.querySelectorAll('*')) {
          result.push(el);
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      }
    }
    walk(root);
    return result;
  }

  function bookingShadow() {
    return document.getElementById('bookingWidget')?.shadowRoot || null;
  }

  function normalizeDateVariants(date) {
    const p = dateParts(date);
    if (!p) return [];
    return [
      date,
      `${p.y}-${p.m}-${p.d}`,
      `${p.y}.${p.m}.${p.d}`,
      `${p.y}. ${p.m}. ${p.d}.`,
      `${p.y}년 ${p.m}월 ${p.d}일`,
      `${p.m}월 ${p.d}일`,
      `${p.m}/${p.d}`,
      String(p.d)
    ];
  }

  function elementDateScore(el, targetDate) {
    const p = dateParts(targetDate);
    if (!p) return 0;
    const attrs = [
      el.getAttribute?.('data-date'),
      el.getAttribute?.('data-day'),
      el.getAttribute?.('data-value'),
      el.getAttribute?.('aria-label'),
      el.getAttribute?.('title'),
      el.getAttribute?.('datetime'),
      el.getAttribute?.('value')
    ].filter(Boolean).map(clean);
    const text = clean(el.textContent);
    const fullVariants = normalizeDateVariants(targetDate).slice(0,7);

    let score = 0;
    for (const s of attrs) {
      if (fullVariants.some(v => s.includes(v))) score = Math.max(score, 100);
    }
    if (fullVariants.some(v => text === v || text.includes(v))) score = Math.max(score, 80);

    // 마지막 수단: 캘린더가 날짜 숫자만 렌더링하는 경우.
    // 너무 광범위한 오클릭을 피하려고 button/role=button만 허용.
    if ((el.tagName === 'BUTTON' || el.getAttribute?.('role') === 'button') && text === String(p.d)) {
      score = Math.max(score, 20);
    }
    return score;
  }

  async function openCalendarAndSelectDate(targetDate) {
    const sr = bookingShadow();
    if (!sr) return {ok:false, reason:'예약 위젯 Shadow DOM 미검출'};

    // 현재 선택 날짜가 이미 목표 날짜로 표시되는지 먼저 확인
    const all0 = deepAll(sr);
    const currentText = all0.map(e => clean(e.textContent)).join(' ');
    const p = dateParts(targetDate);
    if (currentText.includes(`${p.y}년 ${String(p.m).padStart(2,'0')}월 ${String(p.d).padStart(2,'0')}일`) ||
        currentText.includes(`${p.y}년 ${p.m}월 ${p.d}일`)) {
      return {ok:true, reason:'목표 날짜가 이미 선택됨'};
    }

    // 상단 캘린더 선택 영역 열기
    const prompt = all0.find(e => {
      const t = clean(e.textContent);
      return t.includes('캘린더에서 예약 날짜를 선택') ||
             (/^\d{4}년.*월.*일/.test(t) && (e.tagName === 'P' || e.tagName === 'DIV'));
    });
    if (prompt) {
      (prompt.closest?.('button,[role="button"]') || prompt.parentElement || prompt).click?.();
      await sleep(60);
    }

    for (let round=0; round<8; round++) {
      const all = deepAll(sr);
      let best = null, bestScore = 0;
      for (const el of all) {
        const sc = elementDateScore(el, targetDate);
        if (sc > bestScore) { best = el; bestScore = sc; }
      }
      if (best && bestScore >= 20) {
        const clickable = best.closest?.('button,[role="button"]') || best;
        if (!clickable.disabled && clickable.getAttribute?.('aria-disabled') !== 'true') {
          clickable.click();
          await sleep(70);
          return {ok:true, reason:`날짜 선택(score=${bestScore})`};
        }
      }
      await sleep(50);
    }
    return {ok:false, reason:'목표 날짜를 캘린더에서 찾지 못함'};
  }

  function findSlot(theme, targetTime) {
    const sr = bookingShadow();
    if (!sr) return null;
    const wanted = `${theme} / ${targetTime}`;
    const all = deepAll(sr);

    // 정확한 제목 텍스트를 먼저 찾고, 같은 예약 아이템 안의 '예약' 버튼을 사용
    for (const el of all) {
      if (clean(el.textContent) !== wanted) continue;
      let box = el;
      for (let i=0; i<6 && box; i++, box=box.parentElement) {
        const btns = $$('button', box);
        const btn = btns.find(b => clean(b.textContent) === '예약');
        if (btn) return {title:el, button:btn, box};
      }
    }

    // 이미지 alt 기반 보조 검색
    const img = all.find(el => el.tagName === 'IMG' && clean(el.getAttribute('alt')) === wanted);
    if (img) {
      let box = img;
      for (let i=0; i<6 && box; i++, box=box.parentElement) {
        const btn = $$('button', box).find(b => clean(b.textContent) === '예약');
        if (btn) return {title:img, button:btn, box};
      }
    }
    return null;
  }

  async function tryNormalSlotFlow(cfg) {
    const dateRes = await openCalendarAndSelectDate(cfg.targetDate);
    if (!dateRes.ok) return {ok:false, reason:dateRes.reason};

    // 날짜 클릭 후 React 위젯 상태가 갱신되는 짧은 구간
    for (let i=0; i<12; i++) {
      const slot = findSlot(cfg.theme, cfg.targetTime);
      if (slot?.button) {
        const btn = slot.button;
        const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
        if (!disabled) {
          saveCfg({phase:'slot_clicked', lastAction:`${cfg.theme}/${cfg.targetTime} 예약 버튼 클릭`});
          status(`${cfg.theme} ${cfg.targetTime} 슬롯 감지 → 실제 '예약' 버튼 클릭`);
          btn.click();
          return {ok:true, reason:'slot clicked'};
        }
      }
      await sleep(50);
    }
    return {ok:false, reason:`${cfg.theme} ${cfg.targetTime} 예약 버튼을 활성 상태로 찾지 못함`};
  }

  function targetMatchesDetail(cfg) {
    const title = clean(document.querySelector('.booking_content .title')?.textContent ||
                        document.querySelector('.shop_item_title')?.textContent ||
                        document.title);
    const startDay = document.querySelector('#booking_f input[name="start_day"]')?.value || '';
    return (!title || title.includes(cfg.theme)) &&
           (!title || title.includes(cfg.targetTime)) &&
           (!startDay || startDay === cfg.targetDate);
  }

  async function handleBookingDetail() {
    const form = document.getElementById('booking_f');
    const addBtn = document.querySelector('._book_btn a[onclick*="addBooking"]');
    if (!form || !addBtn) return false;

    const cfg = loadCfg();
    if (!cfg.armed || !['slot_clicked','detail'].includes(cfg.phase)) return true;

    if (!targetMatchesDetail(cfg)) {
      toast(`자동 진행 중단\n열린 예약 상세가 목표와 다릅니다.\n목표: ${cfg.targetDate} ${cfg.theme} ${cfg.targetTime}`, true);
      saveCfg({phase:'error'});
      return true;
    }

    saveCfg({phase:'detail', lastAction:'실제 예약하기 버튼 클릭'});
    toast(`예약 상세 확인\n${cfg.targetDate} / ${cfg.theme} / ${cfg.targetTime}\n즉시 실제 '예약하기' 버튼 클릭`);
    queueMicrotask(() => addBtn.click());
    return true;
  }

  async function handlePaymentPage() {
    const form = document.getElementById('order_payment');
    const payBtn = document.querySelector('._btn_start_payment');
    if (!form || !payBtn) return false;

    const cfg = loadCfg();
    if (!cfg.armed || !['detail','payment'].includes(cfg.phase)) return true;

    const itemTitle = clean(document.querySelector('.shop_item_title')?.textContent);
    const itemSchedule = clean(document.querySelector('.shop_item_opt')?.textContent);
    if (itemTitle && (!itemTitle.includes(cfg.theme) || !itemTitle.includes(cfg.targetTime))) {
      toast(`결제 자동진행 중단\n상품이 목표와 다릅니다.\n현재: ${itemTitle}\n목표: ${cfg.theme} / ${cfg.targetTime}`, true);
      saveCfg({phase:'error'});
      return true;
    }
    if (itemSchedule && !itemSchedule.includes(cfg.targetDate)) {
      toast(`결제 자동진행 중단\n날짜가 목표와 다릅니다.\n현재: ${itemSchedule}\n목표: ${cfg.targetDate}`, true);
      saveCfg({phase:'error'});
      return true;
    }

    setNativeValue(document.querySelector('input[name="orderer_name"]'), cfg.name);
    setNativeValue(document.querySelector('input[name="orderer_call"]'), fmtPhone(cfg.phone));

    // 무통장입금: 사이트 안내상 알림톡 후 예약금 입금 흐름을 유지
    const cash = document.querySelector('input[name="pay_type"][value="cash"]');
    if (cash && !cash.checked) cash.click();

    await Promise.resolve();

    const depositor = document.querySelector('input[name="depositor_name"]');
    if (depositor) setNativeValue(depositor, cfg.depositor || cfg.name);

    const refundAgree = document.querySelector('input[name="agree_cancel"]');
    if (refundAgree && !refundAgree.checked) refundAgree.click();

    // 구매조건 동의(사이트 자체 체크박스)
    for (const agree of document.querySelectorAll('input._agree')) {
      if (!agree.checked) agree.click();
    }

    // 전체 동의가 별도로 있고 아직 해제 상태면 클릭
    const allCheck = document.getElementById('paymentAllCheck');
    if (allCheck && !allCheck.checked) allCheck.click();

    saveCfg({phase:'payment', lastAction:'결제 페이지 정보입력 완료'});

    if (!cfg.autoPay) {
      toast(`결제 정보 자동입력 완료\n${cfg.name} / ${fmtPhone(cfg.phone)}\n'결제하기'는 직접 눌러주세요.`, true);
      return true;
    }

    // 네트워크 추가 요청 없이 현재 DOM 값만 확인
    const phoneEl = document.querySelector('input[name="orderer_call"]');
    const cashEl = document.querySelector('input[name="pay_type"][value="cash"]');
    const cancelEl = document.querySelector('input[name="agree_cancel"]');
    const agreeEls = [...document.querySelectorAll('input._agree')];
    const ready =
      !!phoneEl?.value &&
      !!cashEl?.checked &&
      (!cancelEl || cancelEl.checked) &&
      agreeEls.every(x => x.checked);

    if (!ready) {
      toast(`결제 자동진행 중단\n필수값/동의 반영이 완료되지 않았습니다.\n화면에서 확인 후 결제하기를 눌러주세요.`, true);
      saveCfg({phase:'payment'});
      return true;
    }

    await Promise.resolve();
    saveCfg({phase:'payment_clicked', lastAction:'실제 결제하기 버튼 클릭'});
    toast(`정상 예약 흐름\n무통장입금 + 약관 동의 완료\n사이트 실제 '결제하기' 버튼을 클릭합니다.`);
    payBtn.click();
    return true;
  }


  // ===== ULTRA FAST: 페이지가 렌더링되는 즉시 반응 =====
  function onceMutation(target, fn, timeoutMs=2500) {
    return new Promise(resolve => {
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        try { obs.disconnect(); } catch {}
        clearTimeout(timer);
        resolve(v);
      };
      const obs = new MutationObserver(() => {
        try {
          const v = fn();
          if (v) finish(v);
        } catch {}
      });
      obs.observe(target, {subtree:true, childList:true, attributes:true});
      const timer = setTimeout(() => finish(null), timeoutMs);
      try {
        const v = fn();
        if (v) finish(v);
      } catch {}
    });
  }

  function fastFindDateAndClick(targetDate) {
    const sr = bookingShadow();
    if (!sr) return false;
    const p = dateParts(targetDate);
    if (!p) return false;

    const candidates = deepAll(sr);
    let best = null, bestScore = 0;
    for (const el of candidates) {
      const sc = elementDateScore(el, targetDate);
      if (sc > bestScore) { best = el; bestScore = sc; }
    }
    if (!best || bestScore < 20) return false;

    const clickable = best.closest?.('button,[role="button"]') || best;
    if (clickable.disabled || clickable.getAttribute?.('aria-disabled') === 'true') return false;
    clickable.click();
    return true;
  }

  function fastFindSlotAndClick(cfg) {
    const slot = findSlot(cfg.theme, cfg.targetTime);
    if (!slot?.button) return false;
    const btn = slot.button;
    if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return false;
    saveCfg({phase:'slot_clicked', lastAction:`${cfg.theme}/${cfg.targetTime} 예약 버튼 클릭`});
    status(`${cfg.theme} ${cfg.targetTime} 감지 → 즉시 예약 클릭`);
    btn.click();
    return true;
  }

  async function ultraFastNormalFlow(cfg) {
    // 이미 목표 슬롯이 현재 선택 날짜에 떠 있으면 날짜 조작 없이 즉시 클릭
    if (fastFindSlotAndClick(cfg)) {
      return {ok:true, reason:'slot already visible'};
    }

    // 예약 위젯이 붙는 즉시 날짜 선택
    let sr = bookingShadow();
    if (!sr) {
      await onceMutation(document.documentElement, () => bookingShadow(), 2200);
      sr = bookingShadow();
    }
    if (!sr) return {ok:false, reason:'예약 위젯 미검출'};

    // 캘린더 열기
    const all = deepAll(sr);
    const prompt = all.find(e => {
      const t = clean(e.textContent);
      return t.includes('캘린더에서 예약 날짜를 선택') ||
             (/^\d{4}년.*월.*일/.test(t) && (e.tagName === 'P' || e.tagName === 'DIV'));
    });
    if (prompt) {
      (prompt.closest?.('button,[role="button"]') || prompt.parentElement || prompt).click?.();
    }

    // 날짜 셀이 생성되는 즉시 클릭
    if (!fastFindDateAndClick(cfg.targetDate)) {
      const dateClicked = await onceMutation(sr, () => fastFindDateAndClick(cfg.targetDate), 1800);
      if (!dateClicked) return {ok:false, reason:'목표 날짜 미검출'};
    }

    // 날짜 클릭 후 슬롯이 렌더링되는 순간 바로 클릭
    if (!fastFindSlotAndClick(cfg)) {
      const slotClicked = await onceMutation(sr, () => fastFindSlotAndClick(cfg), 1800);
      if (!slotClicked) return {ok:false, reason:'목표 슬롯 미검출'};
    }

    return {ok:true, reason:'ultra slot clicked'};
  }

  async function autoResume() {
    const cfg = loadCfg();
    if (!cfg.armed) return;

    if (document.getElementById('order_payment')) {
      await handlePaymentPage();
      return;
    }
    if (document.getElementById('booking_f')) {
      await handleBookingDetail();
      return;
    }
    if (!location.pathname.startsWith('/reserve_g')) return;

    const openMs = calcOpenMoment(cfg.targetDate);
    if (!Number.isFinite(openMs)) return;

    if (serverNowMs() < openMs) {
      scheduleUntilOpen(cfg, openMs);
      return;
    }

    // 이미 오픈된 날짜면 렌더링 순간 즉시 반응
    status('이미 오픈 시각 경과 → ULTRA FAST 슬롯 확인');
    const fast = await ultraFastNormalFlow(cfg);
    if (fast.ok) return;

    // 정상 UI에서 아직 목표 날짜/슬롯이 반영되지 않은 경우 새로고침.
    // 직링/date 파라미터 조작은 하지 않음.
    const count = (cfg.reloadCount || 0) + 1;
    saveCfg({phase:'armed', reloadCount:count, lastAction:'정상 예약 페이지 새로고침'});
    status(`아직 슬롯 미감지 → 정상 페이지 새로고침 (${count})`);
    await sleep(count < 8 ? 120 : 350);
    location.reload();
  }

  let openTimer = null;
  async function scheduleUntilOpen(cfg, openMs) {
    if (openTimer) clearTimeout(openTimer);

    let synced15 = false;
    let synced4 = false;

    const showWaiting = () => {
      const remain = openMs - serverNowMs();
      const openDate = new Date(openMs);
      status(
        `서버시간 기준 대기\n` +
        `오픈 예정: ${openDate.toLocaleString('ko-KR')}\n` +
        `현재 보정: ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms`
      );
      return remain;
    };

    showWaiting();

    const tick = async () => {
      if (!loadCfg().armed) return;

      let remain = openMs - serverNowMs();

      // 오픈 15초 전: 여러 샘플로 1차 정밀 동기화
      if (!synced15 && remain <= 15000 && remain > 6000) {
        synced15 = true;
        await calibrateServerClock(7, true);
        remain = openMs - serverNowMs();
        status(`1차 서버시간 동기화 완료 · 보정 ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms\n오픈까지 ${(remain/1000).toFixed(2)}초`);
      }

      // 오픈 약 8초 전: 연결 1회 예열(TCP/TLS/세션)
      if (remain <= 8000 && remain > 6000 && !window.__dpsPrewarmed) {
        window.__dpsPrewarmed = true;
        fetch('/reserve_g?_prewarm=' + Date.now(), {
          credentials:'same-origin',
          cache:'no-store',
          headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
        }).catch(()=>{});
      }

      // 오픈 4초 전: 짧게 한 번 더 재동기화
      if (!synced4 && remain <= 4500 && remain > 1500) {
        synced4 = true;
        await calibrateServerClock(5, true);
        remain = openMs - serverNowMs();
        status(`최종 서버시간 동기화 완료 · 보정 ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms\n오픈까지 ${(remain/1000).toFixed(3)}초`);
      }

      if (remain <= 0) {
        status(`단편선 서버시간 자정 도달 → 정상 예약 페이지 새로고침\n보정 ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms`);
        saveCfg({phase:'armed', reloadCount:0});
        location.reload();
        return;
      }

      if (remain <= 3000) {
        status(`서버시간 오픈 대기 ${(remain/1000).toFixed(3)}초 · 보정 ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms`);
        openTimer = setTimeout(tick, 5);
      } else if (remain <= 16000) {
        openTimer = setTimeout(tick, 100);
      } else {
        openTimer = setTimeout(tick, Math.min(1000, Math.max(100, remain - 14500)));
      }
    };

    tick();
  }

  function collectPanel() {
    const targetDate = document.getElementById('dps-target-date')?.value || '';
    const theme = document.getElementById('dps-theme')?.value || '';
    const targetTime = document.getElementById('dps-time')?.value || '';
    const name = clean(document.getElementById('dps-name')?.value);
    const phone = clean(document.getElementById('dps-phone')?.value);
    const depositor = clean(document.getElementById('dps-depositor')?.value);
    const autoPay = !!document.getElementById('dps-autopay')?.checked;

    const errors = [];
    if (!dateParts(targetDate)) errors.push('날짜');
    if (!TIME_TABLE[theme]?.includes(targetTime)) errors.push('테마/시간');
    if (!name) errors.push('예약자 이름');
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g,''))) errors.push('전화번호');

    if (errors.length) {
      alert('확인해 주세요: ' + errors.join(', '));
      return null;
    }
    return {targetDate, theme, targetTime, name, phone, depositor: depositor || name, autoPay};
  }

  function fillTimeOptions(theme, selected) {
    const sel = document.getElementById('dps-time');
    if (!sel) return;
    sel.innerHTML = '';
    for (const t of (TIME_TABLE[theme] || [])) {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    }
    if ((TIME_TABLE[theme] || []).includes(selected)) sel.value = selected;
  }

  function createPanel() {
    if (document.getElementById('dps-fast-panel')) return;
    const cfg = loadCfg();

    const style = document.createElement('style');
    style.textContent = `
      #dps-fast-panel{position:fixed;right:10px;bottom:10px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;color:#111}
      #dps-fast-toggle{border:0;border-radius:999px;padding:11px 15px;background:#111;color:white;font-weight:800;box-shadow:0 4px 16px #0004}
      #dps-fast-box{display:none;width:min(350px,calc(100vw - 20px));max-height:80vh;overflow:auto;margin-top:8px;padding:14px;border-radius:16px;background:#fff;box-shadow:0 8px 30px #0005}
      #dps-fast-box.open{display:block}
      #dps-fast-box label{display:block;margin:8px 0;font-size:12px;font-weight:700}
      #dps-fast-box input,#dps-fast-box select{box-sizing:border-box;width:100%;margin-top:4px;padding:10px;border:1px solid #ccc;border-radius:9px;background:white;font-size:16px}
      .dps-title{font-size:18px;font-weight:800;margin-bottom:8px}
      .dps-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .dps-actions{display:grid;grid-template-columns:1fr .7fr;gap:7px;margin-top:10px}
      .dps-actions button{border:0;border-radius:9px;padding:11px;font-weight:800}
      #dps-start{background:#111;color:#fff} #dps-stop{background:#eee}
      #dps-fast-status{white-space:pre-wrap;margin-top:10px;padding:10px;border-radius:9px;background:#f3f3f3;font-size:12px;line-height:1.45}
      .dps-note{font-size:11px;color:#666;line-height:1.45;margin-top:8px}
      .dps-check{display:flex!important;gap:8px;align-items:center}
      .dps-check input{width:auto!important;margin:0!important}
    `;
    document.documentElement.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'dps-fast-panel';
    panel.innerHTML = `
      <button id="dps-fast-toggle" type="button">⚡ 단편선 예약</button>
      <div id="dps-fast-box">
        <div class="dps-title">단편선 강남 빠른 예약</div>
        <label>희망 날짜<input id="dps-target-date" type="date"></label>
        <div class="dps-grid">
          <label>테마<select id="dps-theme"><option value="상자">상자</option><option value="행복">행복</option></select></label>
          <label>시간<select id="dps-time"></select></label>
        </div>
        <label>예약자 이름<input id="dps-name" type="text" autocomplete="name"></label>
        <label>전화번호<input id="dps-phone" type="tel" inputmode="tel" placeholder="010-1234-5678"></label>
        <label>입금자명<input id="dps-depositor" type="text" placeholder="비우면 예약자 이름 사용"></label>
        <label class="dps-check"><input id="dps-autopay" type="checkbox"> 결제 페이지에서 무통장입금/동의 후 실제 '결제하기' 버튼도 자동 클릭</label>
        <div class="dps-actions">
          <button id="dps-start" type="button">예약 대기 시작</button>
          <button id="dps-stop" type="button">자동예약 중지</button>
        </div>
        <div id="dps-fast-status">준비됨</div>
        <div class="dps-note">
          목표 날짜는 6일 전 자정 오픈으로 계산합니다.
          아이폰 시계 대신 www.dpsnnn.com 서버시간을 여러 번 측정해 자정을 보정합니다.
          직링/날짜 파라미터 조작 없이 사이트의 실제 달력과 버튼을 사용합니다.
          정각 예약 시 Safari를 전면에 두고 화면 잠금을 하지 마세요.
        </div>
      </div>`;
    document.body.appendChild(panel);
    document.getElementById('dps-script-alive')?.remove();

    const themeEl = document.getElementById('dps-theme');
    document.getElementById('dps-target-date').value = cfg.targetDate || '';
    themeEl.value = cfg.theme || '상자';
    fillTimeOptions(themeEl.value, cfg.targetTime);
    document.getElementById('dps-name').value = cfg.name || '';
    document.getElementById('dps-phone').value = cfg.phone || '';
    document.getElementById('dps-depositor').value = cfg.depositor || '';
    document.getElementById('dps-autopay').checked = cfg.autoPay !== false;

    themeEl.addEventListener('change', () => fillTimeOptions(themeEl.value, ''));

    document.getElementById('dps-fast-toggle').addEventListener('click', () =>
      document.getElementById('dps-fast-box').classList.toggle('open'));

    document.getElementById('dps-start').addEventListener('click', async () => {
      const v = collectPanel();
      if (!v) return;
      const openMs = calcOpenMoment(v.targetDate);
      saveCfg({...v, armed:true, phase:'armed', reloadCount:0, lastAction:'예약 대기 시작'});

      const localRemain = openMs - Date.now();

      // 오픈이 임박했거나 아직 미래라면 먼저 서버시간을 맞춥니다.
      // 이미 충분히 지난 예약일은 시간 동기화 때문에 예약 진입을 늦추지 않습니다.
      if (localRemain > -3000) {
        await calibrateServerClock(localRemain < 20000 ? 5 : 3);
      }

      const remain = openMs - serverNowMs();
      if (remain > 0) {
        scheduleUntilOpen(loadCfg(), openMs);
      } else {
        status(`이미 서버 오픈시각 경과 → 즉시 예약 시도
보정 ${serverOffsetMs >= 0 ? '+' : ''}${Math.round(serverOffsetMs)}ms`);
        await autoResume();
      }
    });

    document.getElementById('dps-stop').addEventListener('click', () => {
      saveCfg({armed:false, phase:'idle', reloadCount:0, lastAction:'사용자 중지'});
      if (openTimer) clearTimeout(openTimer);
      status('자동예약 중지됨');
    });
  }

  // 로그인 페이지라면 자동 클릭 대신 안내만 표시
  function looksLoggedOut() {
    return !!document.querySelector('a[href*="/login"], .btn_login') && !document.body.classList.contains('loggedin');
  }

  try {
    createPanel();

    if (looksLoggedOut() && loadCfg().armed) {
      toast('로그인이 필요합니다.\n단편선 강남 계정으로 로그인 후 예약 페이지로 돌아오면 자동으로 이어집니다.', true);
    } else {
      setTimeout(autoResume, 20);
    }

    document.addEventListener('visibilitychange', () => {
      if (loadCfg().armed && document.hidden) {
        status('⚠️ Safari가 백그라운드로 이동했습니다. 정각 예약이 지연될 수 있습니다.');
      }
    });
  } catch (e) {
    console.error('[DPS Userscript]', e);
    let b = document.getElementById('dps-script-alive');
    if (!b && document.body) {
      b = document.createElement('button');
      b.id = 'dps-script-alive';
      document.body.appendChild(b);
    }
    if (b) {
      b.textContent = '⚠️ 단편선 스크립트 오류';
      Object.assign(b.style, {
        position:'fixed', right:'10px', bottom:'10px', zIndex:'2147483647',
        border:'0', borderRadius:'999px', padding:'11px 15px',
        background:'#991b1b', color:'#fff', fontWeight:'800'
      });
      b.onclick = () => alert('스크립트 오류: ' + (e?.message || e));
    }
  }
})();
    } catch (e) {
      console.error('[ESCAPE PASS][dps engine]', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __epRun_dps, {once:true});
  } else {
    __epRun_dps();
  }
}


if (/(^|\.)ledasquare\.com$/i.test(location.hostname)) {
  const __epRun_ledasquare = () => {
    try {
(() => {
  'use strict';

  const BASE = 'https://ledasquare.com';
  const BOOKING_URL = BASE + '/layout/res/home.php?go=rev.make';
  const INPUT_URL = BASE + '/layout/res/home.php';
  const SELECT_URL = BASE + '/core/res/rev.make.sel.php';
  const FINAL_URL = BASE + '/core/res/rev.act.php';
  const RESERVATION_CHECK_URL = BASE + '/layout/res/home.php?go=rev.login';

  // 현재 레다스퀘어 예약 페이지 기준 홍대점 store id.
  // 지점이 추가되어 번호가 달라질 경우 패널에서 직접 변경 가능.
  const DEFAULT_STORE_NUM = '1';

  // Python V2와 동일한 타이밍 계열 설정
  const PREWARM_BEFORE_SECONDS = 5.0;
  const FAST_START_BEFORE_SECONDS = 2.5;
  const FAST_CYCLE_MS = 150;
  const NORMAL_CYCLE_MS = 500;
  const FAST_WINDOW_AFTER_OPEN_SECONDS = 8.0;

  const STORAGE_KEY = 'leda_fast_booker_ios_v1';

  function bookingUrl(storeNum) {
    return `${BOOKING_URL}&zizum_num=${encodeURIComponent(String(storeNum || DEFAULT_STORE_NUM))}`;
  }

  let cancelled = false;
  let running = false;
  let serverOffsetMs = 0;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  const nowPerf = () => performance.now();

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  function normalizeDate(raw) {
    const s = String(raw || '').trim().replace(/[./]/g, '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      throw new Error('날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
    }
    const d = new Date(`${s}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error('올바른 날짜를 입력해 주세요.');
    return s;
  }

  function normalizeTime(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 3) digits = '0' + digits;
    if (digits.length !== 4) throw new Error('시간은 HH:MM 형식으로 입력해 주세요. 예: 22:20');
    const hh = Number(digits.slice(0, 2));
    const mm = Number(digits.slice(2));
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) throw new Error('올바른 시간을 입력해 주세요.');
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  function splitPhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    let p1, p2, p3;
    if (digits.length === 11) {
      p1 = digits.slice(0, 3); p2 = digits.slice(3, 7); p3 = digits.slice(7);
    } else if (digits.length === 10) {
      p1 = digits.slice(0, 3); p2 = digits.slice(3, 6); p3 = digits.slice(6);
    } else {
      throw new Error('전화번호는 10~11자리로 입력해 주세요.');
    }
    if (!['010', '011', '016', '017', '018', '019'].includes(p1)) {
      throw new Error('지원되는 번호 앞자리는 010/011/016/017/018/019 입니다.');
    }
    return [p1, p2, p3];
  }

  function serverNow() {
    return new Date(Date.now() + serverOffsetMs);
  }

  function openingTimeToday() {
    const n = serverNow();
    const d = new Date(n);
    d.setHours(21, 0, 0, 0);
    return d;
  }

  function fmtClock(date = serverNow()) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  async function fetchNoCache(url, options = {}) {
    const opt = {
      credentials: 'include',
      cache: 'no-store',
      redirect: 'follow',
      ...options,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache',
        ...(options.headers || {})
      }
    };
    return fetch(url, opt);
  }

  async function requestGet(url = BOOKING_URL) {
    const sep = url.includes('?') ? '&' : '?';
    return fetchNoCache(`${url}${sep}_=${Date.now()}_${Math.random().toString(36).slice(2)}`);
  }

  async function requestTimeList(targetDate, themeNum, storeNum) {
    const body = new URLSearchParams({
      act: 'theme_time_list',
      zizum_num: String(storeNum),
      rev_days: targetDate,
      theme_num: String(themeNum)
    });

    const r = await fetchNoCache(SELECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body
    });
    if (!r.ok) throw new Error(`시간목록 HTTP ${r.status}`);
    return r.text();
  }

  function estimateServerOffset(response) {
    try {
      const raw = response.headers.get('date');
      if (!raw) return 0;
      const server = new Date(raw).getTime();
      if (!Number.isFinite(server)) return 0;
      return server - Date.now();
    } catch (_) {
      return 0;
    }
  }

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function cleanText(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeThemeName(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\u00a0·ㆍ._\-–—:：()\[\]{}]/g, '');
  }

  function parseTheme(pageHtml, query) {
    const rawQuery = String(query || '').trim();

    // 테마 ID를 직접 입력해도 사용 가능
    if (/^\d+$/.test(rawQuery)) {
      return [rawQuery, `테마 ID ${rawQuery}`];
    }

    const doc = parseHtml(pageHtml);
    const q = normalizeThemeName(rawQuery);
    const found = [];
    const allNames = [];
    const seen = new Set();

    // 실제 페이지의 #theme_list를 우선 보고, Safari 차이를 고려해 href/onclick 모두 확인
    const anchors = doc.querySelectorAll(
      '#theme_list a, a[href*="fun_theme_select"], a[onclick*="fun_theme_select"]'
    );

    for (const a of anchors) {
      const js = `${a.getAttribute('href') || ''} ${a.getAttribute('onclick') || ''}`;
      const m = js.match(/fun_theme_select\(\s*['"]?(\d+)['"]?\s*,/i);
      if (!m) continue;

      const themeNum = m[1];
      const imgAlt = [...a.querySelectorAll('img[alt]')]
        .map(x => x.getAttribute('alt') || '')
        .join(' ');
      const text = cleanText([a.textContent, a.getAttribute('title'), imgAlt].filter(Boolean).join(' '));
      if (!text) continue;

      const key = `${themeNum}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      allNames.push(text);

      const n = normalizeThemeName(text);
      if (n === q) found.unshift([themeNum, text]);
      else if (n.includes(q) || q.includes(n)) found.push([themeNum, text]);
    }

    // DOMParser에서 href가 달라지는 경우를 위한 원문 HTML fallback
    if (!found.length) {
      const re = /<a\b[^>]*(?:href|onclick)=["'][^"']*fun_theme_select\(\s*["']?(\d+)["']?\s*,[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(pageHtml))) {
        const themeNum = m[1];
        const tmp = document.createElement('div');
        tmp.innerHTML = m[2];
        const text = cleanText(tmp.textContent || '');
        if (!text) continue;
        if (!allNames.includes(text)) allNames.push(text);
        const n = normalizeThemeName(text);
        if (n === q) found.unshift([themeNum, text]);
        else if (n.includes(q) || q.includes(n)) found.push([themeNum, text]);
      }
    }

    if (!found.length) {
      throw new Error(
        `'${query}' 테마를 찾지 못했습니다. 현재 테마: ` +
        `${allNames.join(', ') || '테마 목록을 불러오지 못함'}. ` +
        `지점 ID를 확인하거나 테마 ID 숫자를 직접 입력해 주세요.`
      );
    }
    return found[0];
  }

  function findTime(pageHtml, targetTime) {
    const doc = parseHtml(pageHtml);
    for (const a of doc.querySelectorAll('a')) {
      const text = cleanText(a.textContent);
      if (!text.includes(targetTime)) continue;

      const href = a.getAttribute('href') || '';
      const classes = [...a.classList];
      const m = href.match(/fun_theme_time_select\(['\"]?(\d+)['\"]?/i);
      return {
        found: true,
        available: !classes.includes('none') && !!m && href.includes('fun_theme_time_select'),
        timeNum: m ? m[1] : '',
        text
      };
    }
    return { found: false, available: false, timeNum: '', text: '' };
  }

  function parseHiddenInputs(pageHtml) {
    const doc = parseHtml(pageHtml);
    const out = {};
    for (const input of doc.querySelectorAll('input[type="hidden"][name]')) {
      out[input.name] = input.value || '';
    }
    return out;
  }

  function parsePeopleOptions(pageHtml) {
    const doc = parseHtml(pageHtml);
    const sel = doc.querySelector('select[name="person"]');
    if (!sel) return [];
    return [...sel.querySelectorAll('option[value]')].map(o => o.value);
  }

  function extractAlerts(pageHtml) {
    const list = [];
    const re = /alert\s*\(\s*(["'])(.*?)\1\s*\)/gis;
    let m;
    while ((m = re.exec(pageHtml))) list.push(m[2]);
    return list;
  }


  function extractReservationCode(pageHtml) {
    const html = String(pageHtml || '');
    const doc = parseHtml(html);

    // 1) 이름/id가 예약번호 계열인 input의 5자리 값 우선
    for (const input of doc.querySelectorAll('input[value]')) {
      const meta = `${input.name || ''} ${input.id || ''} ${input.getAttribute('class') || ''}`.toLowerCase();
      const value = String(input.value || '').trim();
      if (/(rev|reserve|reservation|confirm|code|num|no)/i.test(meta) && /^\d{5}$/.test(value)) {
        return value;
      }
    }

    // 2) 화면 문구에서 "예약번호/예약확인번호" 주변의 5자리 숫자
    const text = cleanText(doc.body?.textContent || '');
    const textPatterns = [
      /예약\s*확인\s*번호\s*[:：]?\s*(\d{5})/i,
      /예약\s*번호\s*[:：]?\s*(\d{5})/i,
      /확인\s*번호\s*[:：]?\s*(\d{5})/i,
      /예약\s*코드\s*[:：]?\s*(\d{5})/i
    ];
    for (const re of textPatterns) {
      const m = text.match(re);
      if (m) return m[1];
    }

    // 3) 스크립트/HTML 속성 안의 예약번호 변수 패턴
    const htmlPatterns = [
      /(?:rev(?:ervation)?[_-]?(?:num|no|code)|reserve[_-]?(?:num|no|code)|confirm[_-]?(?:num|no|code))\s*[=:]\s*["']?(\d{5})["']?/i,
      /(?:예약확인번호|예약번호|확인번호)[^0-9]{0,20}(\d{5})/i
    ];
    for (const re of htmlPatterns) {
      const m = html.match(re);
      if (m) return m[1];
    }
    return '';
  }

  function extractResponseSummary(pageHtml) {
    const html = String(pageHtml || '');
    const alerts = extractAlerts(html).map(cleanText).filter(Boolean);
    const doc = parseHtml(html);
    const text = cleanText(doc.body?.textContent || '');
    const preferred = [];

    for (const el of doc.querySelectorAll('[class*="rev"], [id*="rev"], [class*="complete"], [id*="complete"], [class*="result"], [id*="result"]')) {
      const t = cleanText(el.textContent || '');
      if (t && t.length <= 500 && /예약|완료|확인|번호|실패|마감/.test(t)) preferred.push(t);
    }

    const merged = [...alerts, ...preferred, text].filter(Boolean).join(' / ');
    return merged.slice(0, 900);
  }

  function setResultPanel(result, cfg) {
    const box = qs('#leda-result');
    if (!box) return;

    const state = result.success === true ? '성공' : result.success === false ? '실패' : '확인 필요';
    const code = result.reservationCode || '응답에서 찾지 못함';
    const phone = result.phone || cfg.phone;
    const summary = result.responseSummary || result.message || '-';
    const finalUrl = result.responseUrl || '-';

    box.style.display = 'block';
    box.innerHTML = `
      <div class="leda-result-title">예약 결과: ${escapeHtml(state)}</div>
      <div><b>전송 전화번호</b>: ${escapeHtml(phone)}</div>
      <div><b>예약확인번호</b>: ${escapeHtml(code)}</div>
      <div><b>HTTP</b>: ${escapeHtml(String(result.httpStatus ?? '-'))}${result.redirected ? ' / 리다이렉트됨' : ''}</div>
      <div><b>최종 응답 URL</b>: <span class="leda-break">${escapeHtml(finalUrl)}</span></div>
      <div><b>서버 메시지</b>: ${escapeHtml(summary)}</div>
      <div class="leda-result-links">
        <a href="${RESERVATION_CHECK_URL}" target="_blank" rel="noopener">예약확인 페이지 열기</a>
        <button type="button" id="leda-copy-result">결과 복사</button>
      </div>
      <div class="leda-result-note">※ 이 화면은 서버 예약 응답을 확인하는 용도입니다. 문자(SMS) 발송 성공 여부는 서버가 별도 결과를 응답하지 않는 한 이 스크립트만으로 확정할 수 없습니다.</div>`;

    qs('#leda-copy-result')?.addEventListener('click', async () => {
      const lines = [
        `예약 결과: ${state}`,
        `전송 전화번호: ${phone}`,
        `예약확인번호: ${code}`,
        `HTTP: ${result.httpStatus ?? '-'}`,
        `최종 응답 URL: ${finalUrl}`,
        `서버 메시지: ${summary}`
      ].join('\n');
      try {
        await navigator.clipboard.writeText(lines);
        addLog('[복사] 예약 결과를 클립보드에 복사했습니다.');
      } catch (_) {
        prompt('아래 내용을 복사해 주세요.', lines);
      }
    });
  }

  function addLog(message, kind = '') {
    const box = qs('#leda-log');
    const line = `[${fmtClock()}] ${message}`;
    console.log('[LEDA]', line);
    if (!box) return;
    const div = document.createElement('div');
    div.textContent = line;
    if (kind === 'ok') div.style.fontWeight = '700';
    if (kind === 'err') div.style.fontWeight = '700';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  async function preciseWaitUntil(targetMs) {
    while (!cancelled) {
      const remain = targetMs - serverNow().getTime();
      if (remain <= 0) return;
      if (remain > 1000) await sleep(Math.min(500, remain / 2));
      else if (remain > 200) await sleep(Math.min(50, remain / 2));
      else if (remain > 30) await sleep(10);
      else await sleep(2);
    }
    throw new Error('사용자가 중지했습니다.');
  }

  async function waitForFastWindow(targetDate, themeNum, storeNum) {
    const now = serverNow();
    const opening = openingTimeToday();
    if (now >= opening) return;

    const prewarmAt = opening.getTime() - PREWARM_BEFORE_SECONDS * 1000;
    const fastStart = opening.getTime() - FAST_START_BEFORE_SECONDS * 1000;

    if (serverNow().getTime() < prewarmAt) {
      addLog(`[대기] ${new Date(prewarmAt).toLocaleTimeString('ko-KR', { hour12: false })}까지 대기 후 연결 예열`);
      await preciseWaitUntil(prewarmAt);
    }

    try {
      const t0 = nowPerf();
      await requestGet(bookingUrl(storeNum));
      await requestTimeList(targetDate, themeNum, storeNum);
      addLog(`[예열] 서버 연결 준비 완료 (${Math.round(nowPerf() - t0)}ms)`);
    } catch (e) {
      addLog(`[예열] 오류가 있었지만 계속 진행: ${e.message}`);
    }

    if (serverNow().getTime() < fastStart) {
      addLog(`[대기] 21:00:00 기준 ${FAST_START_BEFORE_SECONDS}초 전부터 고속 확인 시작`);
      await preciseWaitUntil(fastStart);
    }
  }

  async function detectTimeNum(cfg, themeNum) {
    let first = await requestTimeList(cfg.date, themeNum, cfg.storeNum);
    let info = findTime(first, cfg.time);
    if (info.available) {
      addLog(`[시간] ${cfg.time}가 이미 열려 있습니다. 즉시 예약합니다.`, 'ok');
      return info.timeNum;
    }

    addLog(info.found
      ? `[준비] ${cfg.time}은 표시되지만 아직 예약 불가입니다.`
      : `[준비] ${cfg.time} 시간이 아직 표시되지 않습니다.`);

    await waitForFastWindow(cfg.date, themeNum, cfg.storeNum);

    let attempt = 0;
    while (!cancelled) {
      attempt += 1;
      const cycleStart = nowPerf();
      try {
        const refresh = await requestGet(bookingUrl(cfg.storeNum));
        if (!refresh.ok) throw new Error(`새로고침 GET HTTP ${refresh.status}`);

        const html = await requestTimeList(cfg.date, themeNum, cfg.storeNum);
        info = findTime(html, cfg.time);
        const elapsed = nowPerf() - cycleStart;

        if (info.available) {
          addLog(`[오픈감지] ${cfg.time} 예약 가능! ${attempt}회차 / ${Math.round(elapsed)}ms`, 'ok');
          return info.timeNum;
        }

        if (attempt === 1 || attempt % 5 === 0) {
          addLog(`[확인] ${cfg.time} ${info.found ? '막힘' : '미표시'} / ${attempt}회`);
        }

        const fastUntil = openingTimeToday().getTime() + FAST_WINDOW_AFTER_OPEN_SECONDS * 1000;
        const targetCycle = serverNow().getTime() <= fastUntil ? FAST_CYCLE_MS : NORMAL_CYCLE_MS;
        const remain = targetCycle - elapsed;
        if (remain > 0) await sleep(remain);
      } catch (e) {
        if (attempt === 1 || attempt % 5 === 0) addLog(`[재시도] ${e.message}`);
        await sleep(100);
      }
    }
    throw new Error('사용자가 중지했습니다.');
  }

  async function directReserve(cfg, themeNum, timeNum) {
    const [p1, p2, p3] = splitPhone(cfg.phone);
    const normalizedPhone = `${p1}-${p2}-${p3}`;
    const started = nowPerf();

    addLog('[전송] 시간 ID 확보 → 예약정보 POST');
    const step2Body = new URLSearchParams({
      zizum_num: String(cfg.storeNum),
      rev_days: cfg.date,
      theme_num: String(themeNum),
      theme_time_num: String(timeNum),
      go: 'rev.make.input'
    });

    const step2 = await fetchNoCache(INPUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: step2Body
    });
    if (!step2.ok) throw new Error(`예약정보 POST HTTP ${step2.status}`);

    const step2Html = await step2.text();
    const step2Alerts = extractAlerts(step2Html);
    if (step2Alerts.length) {
      const msg = step2Alerts.join(' / ');
      if (['예약불가', '이미 완료', '마감'].some(x => msg.includes(x))) {
        return {
          success: false, message: msg, body: step2Html,
          reservationCode: '', phone: normalizedPhone,
          httpStatus: step2.status, responseUrl: step2.url, redirected: step2.redirected,
          responseSummary: extractResponseSummary(step2Html)
        };
      }
    }

    const hidden = parseHiddenInputs(step2Html);
    const peopleOptions = parsePeopleOptions(step2Html);
    if (peopleOptions.length && !peopleOptions.includes(String(cfg.people))) {
      return {
        success: false,
        message: `${cfg.people}명 선택 불가. 가능한 인원: ${peopleOptions.join(', ')}`,
        body: step2Html,
        reservationCode: '', phone: normalizedPhone,
        httpStatus: step2.status, responseUrl: step2.url, redirected: step2.redirected,
        responseSummary: extractResponseSummary(step2Html)
      };
    }

    const priceKey = `price${cfg.people}`;
    if (hidden[priceKey]) hidden.price = hidden[priceKey];

    const form = {
      ...hidden,
      name: cfg.name,
      mobile1: p1,
      mobile2: p2,
      mobile3: p3,
      person: String(cfg.people),
      payment: 'D',
      memo: '',
      ck_agree: 'on'
    };

    const required = ['rev_days', 'theme_time_num', 'price', 'act', 'layout_folder'];
    const missing = required.filter(k => !form[k]);
    if (missing.length) throw new Error(`최종 예약 필수값 누락: ${missing.join(', ')}`);

    // 실제 최종 POST 직전에 사용자가 입력한 전화번호가 세 필드에 정확히 들어갔는지 검증
    if (form.mobile1 !== p1 || form.mobile2 !== p2 || form.mobile3 !== p3) {
      throw new Error('최종 POST 전화번호 검증 실패');
    }
    addLog(`[전화검증] 최종 POST → mobile1=${form.mobile1}, mobile2=${form.mobile2}, mobile3=${form.mobile3}`, 'ok');
    addLog(`[전화검증] 실제 전송 번호: ${normalizedPhone}`, 'ok');

    addLog(`[전송] 예약정보 응답 ${Math.round(nowPerf() - started)}ms → 최종 예약 POST 1회`);

    const finalBody = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => finalBody.append(k, v == null ? '' : String(v)));

    // 디버깅용: 민감한 hidden 값 전체가 아니라 실제 예약 핵심 전송값만 저장
    window.__LEDA_LAST_SENT__ = {
      name: form.name,
      phone: normalizedPhone,
      mobile1: form.mobile1,
      mobile2: form.mobile2,
      mobile3: form.mobile3,
      date: form.rev_days,
      themeNum: String(themeNum),
      timeNum: form.theme_time_num,
      people: form.person
    };

    const final = await fetchNoCache(FINAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: finalBody
    });

    const body = await final.text();
    const alerts = extractAlerts(body);
    const msg = alerts.join(' / ');
    const reservationCode = extractReservationCode(body);
    const responseSummary = extractResponseSummary(body);

    addLog(`[응답] 최종 서버 응답 ${Math.round(nowPerf() - started)}ms / HTTP ${final.status}`);
    addLog(`[응답] 최종 URL: ${final.url}${final.redirected ? ' (redirect)' : ''}`);
    if (reservationCode) {
      addLog(`[예약번호] ${reservationCode}`, 'ok');
    } else {
      addLog('[예약번호] 서버 응답에서 5자리 예약확인번호를 찾지 못했습니다.');
    }

    const baseResult = {
      body,
      reservationCode,
      phone: normalizedPhone,
      httpStatus: final.status,
      responseUrl: final.url,
      redirected: final.redirected,
      responseSummary
    };

    const failureText = `${msg} ${responseSummary}`;
    const failureTerms = ['[예약불가]', '예약이 이미 완료되었습니다', '예약불가', '실패', '오류', '마감'];
    if (failureTerms.some(x => failureText.includes(x))) {
      return { ...baseResult, success: false, message: msg || responseSummary || '예약 실패 응답을 확인했습니다.' };
    }

    // "완료" 한 단어만으로 성공 처리하지 않고 예약 관련 성공 표현만 인정
    const successText = `${msg} ${responseSummary}`;
    const successPatterns = [
      /예약\s*완료/i,
      /예약이\s*완료/i,
      /예약이\s*정상적으로\s*(?:완료|접수|등록)/i,
      /예약\s*(?:신청|접수|등록)이?\s*완료/i,
      /예약되었습니다/i
    ];
    if (successPatterns.some(re => re.test(successText))) {
      const codeText = reservationCode ? ` / 예약확인번호 ${reservationCode}` : '';
      return { ...baseResult, success: true, message: (msg || '예약 완료 응답을 확인했습니다.') + codeText };
    }

    // 예약번호가 명시적으로 반환되고 응답에 예약 관련 문맥이 있으면 강한 성공 신호로 취급
    if (reservationCode && /예약|reservation/i.test(successText)) {
      return { ...baseResult, success: true, message: `예약 응답과 예약확인번호 ${reservationCode}를 확인했습니다.` };
    }

    return {
      ...baseResult,
      success: null,
      message: `HTTP ${final.status}, 서버 응답에서 명확한 예약완료 문구를 찾지 못했습니다.`
    };
  }

  function saveConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (_) {}
  }

  function loadConfig() {
    const fallback = {
      storeNum: DEFAULT_STORE_NUM,
      name: '', phone: '', date: '', theme: '6', time: '22:20', people: 3
    };
    try {
      const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...fallback, ...x };
    } catch (_) {
      return fallback;
    }
  }

  function getFormConfig() {
    const cfg = {
      storeNum: qs('#leda-store').value.trim() || DEFAULT_STORE_NUM,
      name: qs('#leda-name').value.trim(),
      phone: qs('#leda-phone').value.trim(),
      date: normalizeDate(qs('#leda-date').value),
      theme: qs('#leda-theme').value.trim(),
      time: normalizeTime(qs('#leda-time').value),
      people: Number(qs('#leda-people').value)
    };
    if (!cfg.name) throw new Error('예약자 이름을 입력해 주세요.');
    if (!cfg.theme) throw new Error('테마를 선택해 주세요.');
    if (!Number.isInteger(cfg.people) || cfg.people < 1) throw new Error('예약 인원을 올바르게 입력해 주세요.');
    splitPhone(cfg.phone);
    return cfg;
  }

  async function runBooking() {
    if (running) return;
    cancelled = false;
    running = true;
    qs('#leda-start').disabled = true;
    qs('#leda-stop').disabled = false;
    qs('#leda-log').innerHTML = '';
    const resultBox = qs('#leda-result');
    if (resultBox) { resultBox.style.display = 'none'; resultBox.innerHTML = ''; }

    try {
      const cfg = getFormConfig();
      saveConfig(cfg);

      addLog(`[준비] 지점 ID ${cfg.storeNum} 예약 페이지/세션 초기화`);
      const first = await requestGet(bookingUrl(cfg.storeNum));
      if (!first.ok) throw new Error(`예약 페이지 HTTP ${first.status}`);
      const mainHtml = await first.text();

      serverOffsetMs = estimateServerOffset(first);
      addLog(`[시계] 서버 Date 기준 보정값 약 ${(serverOffsetMs / 1000).toFixed(2)}초`);

      const [themeNum, themeText] = parseTheme(mainHtml, cfg.theme);
      addLog(`[준비] 테마 확인: ${themeText} (id=${themeNum})`);
      addLog(`[준비] ${cfg.name} / ${cfg.phone} / ${cfg.people}명 입력값 준비 완료`);

      const timeNum = await detectTimeNum(cfg, themeNum);
      addLog(`[예약시작] time id=${timeNum} 확보 → UI 없이 즉시 전송`);

      const result = await directReserve(cfg, themeNum, timeNum);
      window.__LEDA_LAST_RESPONSE__ = result.body;
      window.__LEDA_LAST_RESULT__ = result;
      setResultPanel(result, cfg);

      if (result.success === true) {
        addLog(`[성공] ${result.message}`, 'ok');
        const codeLine = result.reservationCode ? `\n예약확인번호: ${result.reservationCode}` : '\n예약확인번호: 응답에서 미검출';
        alert(`레다스퀘어 예약 성공\n${result.message}${codeLine}\n전송 번호: ${result.phone}`);
      } else if (result.success === false) {
        addLog(`[실패] ${result.message}`, 'err');
        alert(`예약 실패\n${result.message}\n전송 번호: ${result.phone || cfg.phone}`);
      } else {
        addLog(`[확인필요] ${result.message}`, 'err');
        alert(`예약 결과 확인 필요\n${result.message}\n전송 번호: ${result.phone || cfg.phone}\n\n패널의 서버 응답과 예약확인 페이지를 확인해 주세요.`);
      }
    } catch (e) {
      addLog(`[오류] ${e?.message || e}`, 'err');
      alert(`오류: ${e?.message || e}`);
    } finally {
      running = false;
      qs('#leda-start').disabled = false;
      qs('#leda-stop').disabled = true;
    }
  }

  function injectUi() {
    if (qs('#leda-fast-panel')) return;
    const cfg = loadConfig();

    const style = document.createElement('style');
    style.textContent = `
      #leda-fast-toggle{position:fixed;right:14px;bottom:20px;z-index:2147483647;border:0;border-radius:999px;padding:12px 15px;font-size:14px;font-weight:700;box-shadow:0 3px 16px rgba(0,0,0,.25);background:#111;color:#fff}
      #leda-fast-panel{position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;max-width:520px;margin:auto;background:#fff;color:#111;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;overflow:hidden;display:none}
      #leda-fast-panel *{box-sizing:border-box}
      #leda-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#111;color:#fff;font-weight:800}
      #leda-close{border:0;background:transparent;color:#fff;font-size:22px;padding:0 4px}
      #leda-body{padding:12px;max-height:78vh;overflow:auto}
      .leda-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .leda-field{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700}
      .leda-field input,.leda-field select{width:100%;height:40px;border:1px solid #bbb;border-radius:9px;padding:0 10px;font-size:16px;background:#fff;color:#111}
      .leda-wide{grid-column:1/-1}
      .leda-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      .leda-actions button{height:44px;border:0;border-radius:10px;font-size:15px;font-weight:800}
      #leda-start{background:#111;color:#fff}
      #leda-stop{background:#ddd;color:#111}
      #leda-log{margin-top:10px;height:150px;overflow:auto;background:#f4f4f4;border-radius:10px;padding:9px;font-size:11px;line-height:1.45;white-space:pre-wrap;-webkit-overflow-scrolling:touch}
      #leda-result{display:none;margin-top:10px;padding:10px;background:#eef7ee;border:1px solid #bdd8bd;border-radius:10px;font-size:11px;line-height:1.55}\n      .leda-result-title{font-size:14px;font-weight:800;margin-bottom:5px}\n      .leda-result-links{display:flex;gap:7px;margin-top:8px;align-items:center;flex-wrap:wrap}\n      .leda-result-links a,.leda-result-links button{display:inline-flex;align-items:center;justify-content:center;min-height:34px;border:0;border-radius:8px;padding:7px 10px;background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:700}\n      .leda-break{word-break:break-all}\n      .leda-result-note{margin-top:7px;color:#555}\n      #leda-note{margin-top:8px;font-size:11px;line-height:1.45;color:#555}
    `;
    document.documentElement.appendChild(style);

    const toggle = document.createElement('button');
    toggle.id = 'leda-fast-toggle';
    toggle.textContent = '⚡ 예약 자동화';
    document.body.appendChild(toggle);

    const panel = document.createElement('div');
    panel.id = 'leda-fast-panel';
    panel.innerHTML = `
      <div id="leda-head"><span>레다스퀘어 빠른 예약 v1.3</span><button id="leda-close">×</button></div>
      <div id="leda-body">
        <div class="leda-grid">
          <label class="leda-field"><span>지점 ID</span><input id="leda-store" inputmode="numeric" value="${escapeHtml(cfg.storeNum)}"></label>
          <label class="leda-field"><span>인원</span><input id="leda-people" type="number" min="1" inputmode="numeric" value="${escapeHtml(cfg.people)}"></label>
          <label class="leda-field leda-wide"><span>예약자 이름</span><input id="leda-name" autocomplete="name" value="${escapeHtml(cfg.name)}"></label>
          <label class="leda-field leda-wide"><span>전화번호</span><input id="leda-phone" inputmode="tel" autocomplete="tel" placeholder="010-1234-5678" value="${escapeHtml(cfg.phone)}"></label>
          <label class="leda-field"><span>희망 날짜</span><input id="leda-date" type="date" value="${escapeHtml(cfg.date)}"></label>
          <label class="leda-field"><span>희망 시간</span><input id="leda-time" inputmode="numeric" placeholder="22:20" value="${escapeHtml(cfg.time)}"></label>
          <label class="leda-field leda-wide"><span>테마</span><select id="leda-theme">
            <option value="4" ${String(cfg.theme) === '4' ? 'selected' : ''}>세진마 (ID 4)</option>
            <option value="6" ${String(cfg.theme) === '6' ? 'selected' : ''}>아바타 (ID 6)</option>
            <option value="9" ${String(cfg.theme) === '9' ? 'selected' : ''}>사진상 (ID 9)</option>
          </select></label>
        </div>
        <div class="leda-actions">
          <button id="leda-start">예약 대기 시작</button>
          <button id="leda-stop" disabled>중지</button>
        </div>
        <div id="leda-log"></div>
        <div id="leda-result"></div>
        <div id="leda-note">21시 예약 오픈 전에는 Safari를 화면에 계속 띄워 두세요. iPhone이 잠기거나 Safari가 백그라운드로 가면 타이머가 지연될 수 있습니다. 최종 예약 POST는 한 번만 전송합니다.</div>
      </div>`;
    document.body.appendChild(panel);

    toggle.addEventListener('click', () => { panel.style.display = 'block'; toggle.style.display = 'none'; });
    qs('#leda-close').addEventListener('click', () => { panel.style.display = 'none'; toggle.style.display = 'block'; });
    qs('#leda-start').addEventListener('click', runBooking);
    qs('#leda-stop').addEventListener('click', () => {
      cancelled = true;
      addLog('[중지] 사용자가 예약 대기를 중지했습니다.');
    });
  }

  injectUi();
})();
    } catch (e) {
      console.error('[ESCAPE PASS][ledasquare engine]', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __epRun_ledasquare, {once:true});
  } else {
    __epRun_ledasquare();
  }
}


if (/(^|\.)oasismuseum\.com$/i.test(location.hostname)) {
  const __epRun_oasis = () => {
    try {
(() => {
  'use strict';

  const ORIGIN = location.origin;
  const TICKET = `${ORIGIN}/ticket`;
  const SCHEDULE = `${ORIGIN}/ticket/getSchedule`;
  const RESERVE_INFO = `${ORIGIN}/ticket/reserveInfo`;
  const STORE = '__oasis_auto_reserve_v1';
  const PANEL_ID = '__oasis_panel';
  const BADGE_ID = '__oasis_alive';

  let serverOffsetMs = 0;
  let running = false;
  let stopRequested = false;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function safeJson(s, fallback={}) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  function loadCfg() {
    return {
      themeId:'',
      targetDate:'',
      targetTime:'',
      name:'',
      phone:'',
      people:'2',
      autoSubmit:true,
      paymentMethod:'cash',
      autoContinuePayment:true,
      phase:'idle',
      ...safeJson(localStorage.getItem(STORE) || '{}', {})
    };
  }

  function saveCfg(patch) {
    const v = {...loadCfg(), ...patch};
    localStorage.setItem(STORE, JSON.stringify(v));
    return v;
  }

  function normPhone(v) {
    const d = String(v || '').replace(/\D/g,'').slice(0,11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
  }

  function normTime(v) {
    const m = String(v || '').match(/(\d{1,2}):(\d{2})/);
    return m ? `${String(Number(m[1])).padStart(2,'0')}:${m[2]}` : '';
  }

  function showAlive(text='✅ OASIS 실행됨') {
    let el = document.getElementById(BADGE_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = BADGE_ID;
      el.style.cssText = [
        'position:fixed','top:8px','right:8px','z-index:2147483647',
        'background:#0a7f38','color:#fff','padding:7px 10px','border-radius:10px',
        'font:700 12px -apple-system,BlinkMacSystemFont,sans-serif',
        'box-shadow:0 2px 10px rgba(0,0,0,.28)'
      ].join(';');
      (document.documentElement || document.body).appendChild(el);
    }
    el.textContent = text;
  }

  function status(msg) {
    const el = $('#__oasis_status');
    if (el) el.textContent = msg;
  }

  function setBadge(text, ok=true) {
    showAlive(text);
    const el = document.getElementById(BADGE_ID);
    if (el) el.style.background = ok ? '#0a7f38' : '#a21717';
  }

  function themeOptions() {
    const sel = $('#res_tm');
    if (!sel) return [];
    return [...sel.options]
      .filter(o => o.value)
      .map(o => ({id:o.value, name:(o.textContent || '').trim()}));
  }

  function timeOptions(themeId) {
    return $$(`.room_btn[data-tm="${CSS.escape(String(themeId))}"]`)
      .map(btn => ({
        time: normTime(btn.dataset.time || btn.textContent),
        scheduleId: String(btn.value || ''),
        discount: String(btn.dataset.discount || '0')
      }))
      .filter(x => x.time && x.scheduleId);
  }

  function targetButton(cfg) {
    const wanted = normTime(cfg.targetTime);
    return $$(`.room_btn[data-tm="${CSS.escape(String(cfg.themeId))}"]`)
      .find(b => normTime(b.dataset.time || b.textContent) === wanted) || null;
  }

  function computedOpenMs(targetDate) {
    // 사이트 공지: 목표일 6일 전 자정에 오픈. 한국 사이트이므로 KST 고정.
    const d = new Date(`${targetDate}T00:00:00+09:00`);
    return d.getTime() - 6 * 24 * 60 * 60 * 1000;
  }

  function formatKst(ms) {
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone:'Asia/Seoul',
        year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit',
        hour12:false
      }).format(new Date(ms));
    } catch {
      return new Date(ms).toLocaleString();
    }
  }

  function serverNowMs() {
    return Date.now() + serverOffsetMs;
  }

  async function calibrateClock(samples=4) {
    const offsets = [];
    for (let i=0; i<samples; i++) {
      const t0 = Date.now();
      try {
        const r = await fetch(`${TICKET}?_clock=${Date.now()}_${i}`, {
          method:'GET',
          credentials:'include',
          cache:'no-store',
          headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
        });
        const t1 = Date.now();
        const dh = r.headers.get('Date');
        if (dh) {
          // HTTP Date는 보통 1초 단위라 중앙값(+500ms)을 사용.
          const server = Date.parse(dh) + 500;
          offsets.push(server - ((t0+t1)/2));
        }
      } catch {}
      await sleep(90);
    }
    if (offsets.length) {
      offsets.sort((a,b)=>a-b);
      serverOffsetMs = offsets[Math.floor(offsets.length/2)];
    }
    return serverOffsetMs;
  }

  async function postForm(url, data) {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([k,v]) => body.set(k, String(v ?? '')));
    const r = await fetch(url, {
      method:'POST',
      credentials:'include',
      cache:'no-store',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Cache-Control':'no-cache, no-store, max-age=0',
        'Pragma':'no-cache'
      },
      body:body.toString()
    });
    return r;
  }

  async function getClosedScheduleIds(cfg) {
    const r = await postForm(SCHEDULE, {
      tm:cfg.themeId,
      date:cfg.targetDate
    });

    if (r.status === 403 || r.status === 429) {
      throw new Error(`요청 제한 HTTP ${r.status}`);
    }
    if (!r.ok) throw new Error(`스케줄 조회 HTTP ${r.status}`);

    let data;
    try { data = await r.json(); }
    catch { throw new Error('스케줄 JSON 해석 실패'); }

    if (!Array.isArray(data)) {
      throw new Error('예상하지 못한 getSchedule 응답');
    }
    return data.map(x => String(x));
  }

  async function prewarm(cfg) {
    const jobs = [
      fetch(`${TICKET}?date=${encodeURIComponent(cfg.targetDate)}&id=${encodeURIComponent(cfg.themeId)}&_warm=${Date.now()}`, {
        credentials:'include',
        cache:'no-store',
        headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
      }).catch(()=>null),
      fetch(`${ORIGIN}/?_warm=${Date.now()}`, {
        credentials:'include',
        cache:'no-store',
        headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
      }).catch(()=>null)
    ];
    await Promise.allSettled(jobs);
  }

  function validateCfg(cfg) {
    const miss = [];
    if (!cfg.themeId) miss.push('테마');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.targetDate || '')) miss.push('날짜');
    if (!/^\d{2}:\d{2}$/.test(normTime(cfg.targetTime))) miss.push('시간');
    if (!cfg.name.trim()) miss.push('이름');
    if (cfg.phone.replace(/\D/g,'').length < 10) miss.push('전화번호');
    if (!cfg.people) miss.push('인원');
    const btn = targetButton(cfg);
    if (!btn) miss.push('해당 테마의 시간');
    if (miss.length) throw new Error(`입력 확인: ${miss.join(', ')}`);
    return btn;
  }

  function setNativeValue(el, value) {
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }

  async function enterStep2AndMaybeSubmit(cfg, btn) {
    const scheduleId = String(btn.value);
    const discount = Number(btn.dataset.discount || 0);

    // 실제 사이트의 room_btn 클릭 로직과 같은 값들을 세팅.
    const fTm = $('#f_tm');
    const fSdN = $('#f_sd_n');
    const fSdTime = $('#f_sd_time');
    const fDate = $('#f_date');
    const fDiscount = $('#f_discount');
    const fPrice = $('#f_price');
    const fPerson = $('#f_person');

    if (!fTm || !fSdN || !fSdTime || !fDate || !fPrice || !fPerson) {
      throw new Error('예약 정보 폼을 찾지 못했습니다.');
    }

    setNativeValue(fTm, cfg.themeId);
    setNativeValue(fSdN, scheduleId);
    setNativeValue(fSdTime, normTime(cfg.targetTime));
    setNativeValue(fDate, cfg.targetDate);
    setNativeValue(fDiscount, String(discount));

    // 테마별 허용 인원/가격은 사이트가 페이지에 올린 price_info를 사용.
    const pinfo = window.price_info?.[String(cfg.themeId)];
    if (!pinfo || pinfo[String(cfg.people)] == null) {
      throw new Error(`${cfg.people}명 가격정보를 찾지 못했습니다. 테마 허용인원을 확인하세요.`);
    }

    // person 옵션을 실제 테마의 허용 인원으로 다시 구성.
    fPerson.innerHTML = '';
    for (const person of Object.keys(pinfo)) {
      const o = document.createElement('option');
      o.value = person;
      o.textContent = `${person} 명`;
      fPerson.appendChild(o);
    }
    if (![...fPerson.options].some(o => o.value === String(cfg.people))) {
      throw new Error(`${cfg.people}명은 이 테마에서 선택할 수 없습니다.`);
    }
    setNativeValue(fPerson, String(cfg.people));

    const price = Number(pinfo[String(cfg.people)]) - discount * Number(cfg.people);
    setNativeValue(fPrice, String(price));

    if ($('#input_time')) $('#input_time').textContent = normTime(cfg.targetTime);
    if ($('#input_theme')) {
      const src = $(`#tm_name${CSS.escape(String(cfg.themeId))}`);
      $('#input_theme').innerHTML = src ? src.innerHTML : '';
    }
    if ($('#input_date')) $('#input_date').textContent = cfg.targetDate;
    if ($('#v_price')) $('#v_price').textContent = `${price.toLocaleString()} 원`;

    setNativeValue($('#f_name'), cfg.name.trim());
    setNativeValue($('#f_tel'), normPhone(cfg.phone));

    const agree = $('#f_agree');
    if (agree) {
      agree.checked = true;
      agree.dispatchEvent(new Event('change', {bubbles:true}));
    }

    $('#step1')?.style && ($('#step1').style.display='none');
    $('#step2')?.style && ($('#step2').style.display='block');
    window.scrollTo(0,0);

    // 사이트가 시간 클릭 때 호출하는 reserveInfo를 정상 순서로 1회 호출.
    const ri = await postForm(RESERVE_INFO, {
      date:cfg.targetDate,
      sd_n:scheduleId
    });
    if (!ri.ok) throw new Error(`reserveInfo HTTP ${ri.status}`);

    saveCfg({
      phase:'step2_ready',
      lastScheduleId:scheduleId,
      lastDetectedAt:new Date().toISOString()
    });

    if (!cfg.autoSubmit) {
      status(`✅ ${cfg.targetTime} 확보 감지\n정보 입력 완료 · 예약하기 버튼을 직접 눌러주세요.`);
      setBadge('✅ OASIS 정보입력 완료');
      return;
    }

    const form = $('#ticket_form');
    if (!form) throw new Error('ticket_form을 찾지 못했습니다.');

    // 사이트의 formCheck가 그대로 실행되는 정상 제출.
    saveCfg({phase:'payment_pending'});
    status(`🎯 ${cfg.targetTime} 확보 감지\n정상 /ticket/payment 제출 중…`);
    setBadge('🎯 OASIS 결제단계 이동');
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.submit();
  }

  async function detectAndReserve(cfg) {
    const btn = validateCfg(cfg);
    const scheduleId = String(btn.value);
    const started = serverNowMs();

    let won = false;
    let stoppedByLimit = false;
    let totalAttempts = 0;

    status(
      `⚡ FAST OPEN 시작\n` +
      `${cfg.targetTime} · schedule ID ${scheduleId}\n` +
      `최대 2개 순차 워커`
    );

    async function worker(name, initialDelay) {
      if (initialDelay > 0) await sleep(initialDelay);
      let localAttempts = 0;

      while (running && !stopRequested && !won && !stoppedByLimit) {
        localAttempts++;
        totalAttempts++;
        const t0 = performance.now();

        try {
          const closed = await getClosedScheduleIds(cfg);
          const rtt = Math.round(performance.now() - t0);

          if (won || stopRequested || stoppedByLimit || !running) return;

          if (!closed.includes(scheduleId)) {
            won = true;
            running = false;
            status(
              `🎯 ${cfg.targetTime} 오픈 감지\n` +
              `${name} · ${rtt}ms → 예약정보 제출`
            );
            await enterStep2AndMaybeSubmit(cfg, btn);
            return;
          }

          if (localAttempts === 1 || localAttempts % 5 === 0) {
            status(
              `FAST OPEN 조회 ${totalAttempts}회\n` +
              `${name} 최근 ${rtt}ms · 아직 미오픈/마감`
            );
          }
        } catch (e) {
          const msg = String(e?.message || e);

          if (/403|429|요청 제한/.test(msg)) {
            stoppedByLimit = true;
            running = false;
            stopRequested = true;
            status(`❌ ${msg}\n서버 제한 감지 → 자동 중단`);
            setBadge('❌ OASIS 요청제한', false);
            return;
          }

          if (localAttempts === 1 || localAttempts % 4 === 0) {
            status(`FAST OPEN ${name} · ${msg}`);
          }
        }

        if (won || stopRequested || stoppedByLimit || !running) return;

        const elapsed = serverNowMs() - started;
        const gap = elapsed < 3000 ? 180 : elapsed < 8000 ? 320 : elapsed < 15000 ? 550 : 900;
        await sleep(gap);
      }
    }

    await Promise.all([
      worker('A', 0),
      worker('B', 420)
    ]);
  }

  async function start(cfg) {
    if (running) return;
    stopRequested = false;
    validateCfg(cfg);
    saveCfg({...cfg, phase:'armed'});
    running = true;

    status('서버시간 동기화 중…');
    await calibrateClock(5);

    const openMs = computedOpenMs(cfg.targetDate);
    let synced8 = false;
    let synced2 = false;
    let warmed15 = false;
    let warmed6 = false;
    let warmed2 = false;

    while (running && !stopRequested) {
      const now = serverNowMs();
      const remain = openMs - now;

      if (remain <= 0) break;

      if (!warmed15 && remain <= 15000) {
        warmed15 = true;
        prewarm(cfg);
      }
      if (!synced8 && remain <= 8000) {
        synced8 = true;
        await calibrateClock(3);
      }
      if (!warmed6 && remain <= 6000) {
        warmed6 = true;
        prewarm(cfg);
      }
      if (!synced2 && remain <= 2200) {
        synced2 = true;
        await calibrateClock(2);
      }
      if (!warmed2 && remain <= 1600) {
        warmed2 = true;
        prewarm(cfg);
      }

      status(
        `⚡ FAST OPEN 대기\n` +
        `오픈: ${formatKst(openMs)}\n` +
        `남은 시간: ${(Math.max(0,remain)/1000).toFixed(remain < 5000 ? 3 : 0)}초`
      );

      await sleep(
        remain > 15000 ? 500 :
        remain > 5000 ? 120 :
        remain > 1500 ? 35 :
        remain > 300 ? 10 : 4
      );
    }

    if (!running || stopRequested) return;

    status(`🚀 오픈시각 도달\n${cfg.targetTime} 조회 시작`);
    await detectAndReserve(cfg);
  }

  async function testOnly(cfg) {
    const btn = validateCfg(cfg);
    await calibrateClock(3);
    const openMs = computedOpenMs(cfg.targetDate);

    if (serverNowMs() < openMs) {
      status(
        `🧪 설정 확인 OK\n` +
        `schedule ID: ${btn.value}\n` +
        `오픈 전이라 실제 가능여부 조회는 생략\n` +
        `오픈: ${formatKst(openMs)}`
      );
      return;
    }

    const closed = await getClosedScheduleIds(cfg);
    const isOpen = !closed.includes(String(btn.value));
    status(
      `🧪 테스트 완료\n` +
      `${cfg.targetTime} / schedule ID ${btn.value}\n` +
      (isOpen ? '현재 응답상 예약 가능' : '현재 응답상 마감/예약불가')
    );
  }


  function paymentPageDetected() {
    return location.pathname.startsWith('/ticket/payment') &&
      !!document.forms.order_info &&
      !!document.getElementById('f_payment') &&
      !!document.getElementById('f_submit');
  }

  async function continuePaymentPage() {
    if (!paymentPageDetected()) return false;

    const cfg = loadCfg();
    saveCfg({
      phase:'payment',
      paymentMethod:'cash',
      autoContinuePayment:true
    });
    setBadge('✅ OASIS 결제단계');

    const sel = document.getElementById('f_payment');
    const btn = document.getElementById('f_submit');
    if (!sel || !btn) {
      throw new Error('현금 결제 선택 요소를 찾지 못했습니다.');
    }

    // v1.2는 무조건 현금/무통장(0)으로 진행.
    sel.value = '0';
    sel.dispatchEvent(new Event('change', {bubbles:true}));

    status(
      '✅ 결제단계 진입\n' +
      '현금/무통장 자동 선택 완료\n' +
      '예약신청 전송 중…'
    );

    saveCfg({
      phase:'cash_submit',
      paymentMethod:'cash',
      autoContinuePayment:true
    });

    await sleep(120);

    // 사이트 원래 버튼 이벤트를 그대로 사용.
    btn.click();
    return true;
  }

  function panelHtml() {
    return `
      <div class="oz-head">
        <b>🏜️ OASIS FAST</b>
        <button id="__oasis_min" type="button">−</button>
      </div>
      <div id="__oasis_body">
        <label>테마<select id="__oasis_theme"></select></label>
        <label>예약일<input id="__oasis_date" type="date"></label>
        <label>희망시간<select id="__oasis_time"></select></label>
        <div class="oz-two">
          <label>이름<input id="__oasis_name" type="text" autocomplete="name"></label>
          <label>인원<select id="__oasis_people">
            <option value="2">2명</option><option value="3">3명</option>
            <option value="4">4명</option><option value="5">5명</option>
            <option value="6">6명</option>
          </select></label>
        </div>
        <label>전화번호<input id="__oasis_phone" type="tel" inputmode="tel" placeholder="010-1234-5678"></label>
        <div class="oz-cash-fixed">💵 현금/무통장 자동 · ⚡ FAST OPEN</div>
        <label class="oz-check"><input id="__oasis_auto" type="checkbox" checked> 시간 확보 시 예약정보 제출 → 현금 예약신청까지 자동</label>
        <div id="__oasis_open"></div>
        <button id="__oasis_start" class="oz-primary" type="button">⚡ FAST 자동예약 시작</button>
        <div class="oz-two-btn">
          <button id="__oasis_test" type="button">🧪 테스트</button>
          <button id="__oasis_stop" type="button">■ 중지</button>
        </div>
        <pre id="__oasis_status">설정을 입력해주세요.</pre>
      </div>
    `;
  }

  function makePanel() {
    if (document.getElementById(PANEL_ID)) return;
    if (!document.body) return;

    const style = document.createElement('style');
    style.textContent = `
      #${PANEL_ID}{
        position:fixed;right:9px;bottom:9px;z-index:2147483646;
        width:min(340px,calc(100vw - 18px));max-height:86vh;overflow:auto;
        background:rgba(255,255,255,.97);color:#111;border:1px solid #aaa;
        border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.27);
        padding:10px;font:13px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif
      }
      #${PANEL_ID} .oz-head{display:flex;align-items:center;justify-content:space-between;font-size:15px;margin-bottom:8px}
      #${PANEL_ID} label{display:block;font-weight:650;margin:7px 0 3px}
      #${PANEL_ID} input,#${PANEL_ID} select,#${PANEL_ID} button{
        box-sizing:border-box;width:100%;font:14px -apple-system,BlinkMacSystemFont,sans-serif
      }
      #${PANEL_ID} input,#${PANEL_ID} select{padding:9px;border:1px solid #bbb;border-radius:8px;background:#fff}
      #${PANEL_ID} button{padding:10px;border:0;border-radius:9px;font-weight:750}
      #${PANEL_ID} .oz-primary{background:#111;color:#fff;margin-top:8px}
      #${PANEL_ID} .oz-two{display:grid;grid-template-columns:1fr 90px;gap:7px}
      #${PANEL_ID} .oz-two-btn{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}
      #${PANEL_ID} .oz-two-btn button{background:#e9e9e9}
      #${PANEL_ID} .oz-check{display:flex;gap:7px;align-items:flex-start;font-weight:500;line-height:1.35}
      #${PANEL_ID} .oz-check input{width:auto;margin-top:2px}
      #${PANEL_ID} .oz-cash-fixed{font-size:12px;background:#eef8ee;padding:9px;border-radius:8px;margin-top:7px;font-weight:750}
      #__oasis_open{font-size:12px;background:#f3f5f7;padding:7px;border-radius:8px;margin-top:7px;line-height:1.4}
      #__oasis_status{white-space:pre-wrap;margin:8px 0 0;background:#111;color:#eaffea;padding:8px;border-radius:8px;min-height:42px;font-size:11px}
      #__oasis_min{width:32px!important;padding:3px!important;background:#eee!important;color:#111!important}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = panelHtml();
    document.body.appendChild(panel);

    const cfg = loadCfg();
    const themeSel = $('#__oasis_theme');
    const themes = themeOptions();

    themeSel.innerHTML = '<option value="">테마 선택</option>' +
      themes.map(x => `<option value="${x.id}">${x.name}</option>`).join('');

    if (cfg.themeId && themes.some(x => x.id === cfg.themeId)) themeSel.value = cfg.themeId;
    $('#__oasis_date').value = cfg.targetDate || '';
    $('#__oasis_name').value = cfg.name || '';
    $('#__oasis_phone').value = cfg.phone || '';
    $('#__oasis_people').value = String(cfg.people || '2');
    $('#__oasis_auto').checked = cfg.autoSubmit !== false;

    const refreshTimes = () => {
      const tid = themeSel.value;
      const ts = timeOptions(tid);
      const tsel = $('#__oasis_time');
      tsel.innerHTML = ts.length
        ? ts.map(x => `<option value="${x.time}">${x.time}</option>`).join('')
        : '<option value="">시간 없음/준비중</option>';
      if (cfg.targetTime && ts.some(x => x.time === normTime(cfg.targetTime))) {
        tsel.value = normTime(cfg.targetTime);
      }
      refreshOpenText();
    };

    const readUi = () => ({
      themeId:themeSel.value,
      targetDate:$('#__oasis_date').value,
      targetTime:$('#__oasis_time').value,
      name:$('#__oasis_name').value,
      phone:$('#__oasis_phone').value,
      people:$('#__oasis_people').value,
      autoSubmit:$('#__oasis_auto').checked,
      paymentMethod:'cash',
      autoContinuePayment:true
    });

    const refreshOpenText = () => {
      const d = $('#__oasis_date').value;
      const el = $('#__oasis_open');
      if (!d) { el.textContent = '예약일을 선택하면 자동 오픈시각을 계산합니다.'; return; }
      el.textContent = `자동 오픈시각: ${formatKst(computedOpenMs(d))} (목표일 6일 전 00:00)`;
    };

    themeSel.addEventListener('change', refreshTimes);
    $('#__oasis_date').addEventListener('change', refreshOpenText);
    $('#__oasis_phone').addEventListener('input', e => {
      const pos = e.target.selectionStart;
      e.target.value = normPhone(e.target.value);
    });

    $('#__oasis_start').onclick = async () => {
      try {
        const ui = readUi();
        saveCfg(ui);
        await start(ui);
      } catch(e) {
        running = false;
        const msg = String(e?.message || e);
        status(`❌ ${msg}`);
        setBadge('❌ OASIS 오류', false);
      }
    };

    $('#__oasis_test').onclick = async () => {
      try {
        const ui = readUi();
        saveCfg(ui);
        await testOnly(ui);
      } catch(e) {
        status(`❌ 테스트 오류\n${String(e?.message || e)}`);
      }
    };

    $('#__oasis_stop').onclick = () => {
      stopRequested = true;
      running = false;
      saveCfg({phase:'stopped'});
      status('중지됨');
    };

    $('#__oasis_min').onclick = () => {
      const b = $('#__oasis_body');
      b.style.display = b.style.display === 'none' ? 'block' : 'none';
    };

    refreshTimes();

    // 결제단계 도착 후 사용자가 미리 선택한 결제방식으로 정상 흐름 이어가기
    if (paymentPageDetected()) {
      continuePaymentPage().catch(e => {
        status(`❌ 결제단계 자동진행 오류\n${String(e?.message || e)}`);
        setBadge('❌ OASIS 결제진행 오류', false);
      });
    }
  }

  function boot() {
    showAlive();

    if (location.pathname.startsWith('/ticket/order_result')) {
      saveCfg({phase:'order_result'});
      setTimeout(() => {
        const txt = (document.body?.innerText || '').replace(/\s+/g,' ');
        if (/예약.*완료|예약번호|예약신청|입금/.test(txt)) {
          setBadge('✅ OASIS 현금예약 결과');
        }
      }, 300);
    }

    if (location.pathname === '/ticket' || location.pathname.startsWith('/ticket/')) {
      makePanel();
    } else {
      // 다른 페이지에서도 실행 여부는 보이게 하고, 예약페이지로 빠르게 이동 가능.
      const small = document.createElement('button');
      small.textContent = '🏜️ OASIS 예약페이지';
      small.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483646;padding:9px 12px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:700';
      small.onclick = () => location.href = '/ticket';
      document.body?.appendChild(small);
    }
  }

  if (document.body) boot();
  else window.addEventListener('DOMContentLoaded', boot, {once:true});

})();
// ==/UserScript==
    } catch (e) {
      console.error('[ESCAPE PASS][oasis engine]', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __epRun_oasis, {once:true});
  } else {
    __epRun_oasis();
  }
}


// -----------------------------------------------------------------------------
// ESCAPE PASS v2 bridge
// Receives config from the PWA using #ep=<base64url JSON>, stores it on the
// target origin, removes it from the address bar, fills the site's native panel,
// then starts the existing site engine.
// -----------------------------------------------------------------------------
(() => {
  'use strict';

  const PENDING = '__escape_pass_pending_v2__';
  const LAST_RUN = '__escape_pass_last_run_v2__';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

  function b64urlDecode(s) {
    try {
      s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch { return ''; }
  }

  function readIncoming() {
    const m = location.hash.match(/(?:^#|[&#])ep=([^&]+)/);
    if (!m) return null;
    try {
      const cfg = JSON.parse(b64urlDecode(decodeURIComponent(m[1])));
      if (!cfg || cfg.v !== 2 || !cfg.site) return null;
      localStorage.setItem(PENDING, JSON.stringify(cfg));

      // Fragment is not sent to the server; remove it promptly from visible URL/history.
      const cleanUrl = location.pathname + location.search;
      history.replaceState(null, document.title, cleanUrl);
      return cfg;
    } catch (e) {
      console.error('[ESCAPE PASS] config parse error', e);
      return null;
    }
  }

  function pending() {
    try { return JSON.parse(localStorage.getItem(PENDING) || 'null'); }
    catch { return null; }
  }

  function clearPending(runId) {
    const cfg = pending();
    if (!cfg || !runId || cfg.runId === runId) localStorage.removeItem(PENDING);
  }

  function markRun(cfg, state) {
    localStorage.setItem(LAST_RUN, JSON.stringify({
      runId:cfg.runId, site:cfg.site, state, at:Date.now()
    }));
  }

  function fire(el) {
    if (!el) return;
    ['input','change','blur'].forEach(t => el.dispatchEvent(new Event(t,{bubbles:true})));
  }

  function setInput(sel, value) {
    const el = document.querySelector(sel);
    if (!el || value === undefined || value === null || value === '') return false;
    el.value = String(value);
    fire(el);
    return true;
  }

  function setCheck(sel, checked=true) {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.checked = !!checked;
    fire(el);
    return true;
  }

  function norm(s) {
    return clean(s).toLowerCase().replace(/[\s·ㆍ._\-–—:：()\[\]{}]/g,'');
  }

  function selectBest(sel, wanted) {
    const el = document.querySelector(sel);
    if (!el || !wanted) return false;
    const w = norm(wanted);
    const opts = [...el.options].filter(o => o.value !== '');
    let o = opts.find(x => String(x.value) === String(wanted));
    if (!o) o = opts.find(x => norm(x.textContent) === w);
    if (!o) o = opts.find(x => w && (norm(x.textContent).includes(w) || w.includes(norm(x.textContent))));
    if (!o) return false;
    el.value = o.value;
    fire(el);
    return true;
  }

  async function waitFor(sel, timeout=20000) {
    const end = Date.now()+timeout;
    while (Date.now()<end) {
      const el = document.querySelector(sel);
      if (el) return el;
      await sleep(100);
    }
    throw new Error(`요소 대기시간 초과: ${sel}`);
  }

  async function waitOption(sel, wanted, timeout=15000) {
    const end=Date.now()+timeout;
    while (Date.now()<end) {
      if (selectBest(sel,wanted)) return true;
      await sleep(150);
    }
    return false;
  }

  function overlay(text, kind='info') {
    let box=document.getElementById('__escape_pass_bridge');
    if(!box){
      box=document.createElement('div');
      box.id='__escape_pass_bridge';
      Object.assign(box.style,{
        position:'fixed',left:'10px',right:'10px',
        top:'calc(env(safe-area-inset-top,0px) + 10px)',
        zIndex:'2147483647',padding:'12px 14px',borderRadius:'15px',
        background:'rgba(9,16,32,.94)',color:'#fff',
        fontFamily:'-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif',
        fontSize:'12px',lineHeight:'1.5',boxShadow:'0 10px 30px rgba(0,0,0,.35)',
        border:'1px solid rgba(255,255,255,.12)',whiteSpace:'pre-wrap'
      });
      document.documentElement.appendChild(box);
    }
    box.style.borderColor = kind==='err' ? '#ef4444' : kind==='ok' ? '#22c55e' : 'rgba(255,255,255,.12)';
    box.textContent='ESCAPE PASS\n'+text;
  }

  function validSite(cfg) {
    const h=location.hostname;
    const checks={
      keyescape:/keyescape\.com$/i,
      zeroworld:/zeroworldkorea\.com$/i,
      doomescape:/doomescape\.com$/i,
      play33:/play33\.kr$/i,
      dps:/dpsnnn\.com$/i,
      ledasquare:/ledasquare\.com$/i,
      oasis:/oasismuseum\.com$/i
    };
    return checks[cfg.site]?.test(h);
  }

  async function keyescape(cfg) {
    await waitFor('#__ke_direct_panel');
    document.querySelector('#__ke_direct_box')?.classList.add('open');
    overlay('KEYESCAPE 설정 수신 · 예약정보 자동입력 중');

    await waitOption('#__ke_branch', cfg.branch, 20000);
    const b=document.querySelector('#__ke_branch'); if(b) fire(b);
    await sleep(650);
    await waitOption('#__ke_theme', cfg.theme, 20000);

    setInput('#__ke_date',cfg.date);
    setInput('#__ke_time',cfg.time);
    setInput('#__ke_name',cfg.name);
    setInput('#__ke_phone',cfg.phone);
    setInput('#__ke_people',cfg.people);

    if(cfg.openAt){
      setCheck('#__ke_auto_open_time',false);
      setInput('#__ke_open',cfg.openAt.replace(' ','T'));
    }

    if(!location.pathname.includes('reservation2.php')){
      overlay(
        'KEYESCAPE 설정 저장 완료.\n' +
        'reCAPTCHA는 KEYESCAPE 사이트 구조상 STEP2에서만 표시됩니다.\n' +
        'STEP2에 진입하면 ESCAPE PASS가 자동으로 CAPTCHA 대기 상태로 전환됩니다.\n' +
        'reCAPTCHA를 직접 체크하면 FAST 예약 대기가 자동 시작됩니다.'
      );
      const box=document.querySelector('#__ke_direct_box');
      if(box) box.classList.add('open');
      return;
    }

    document.querySelector('#__ke_direct_box')?.classList.add('open');
    overlay('KEYESCAPE STEP2 · reCAPTCHA를 직접 체크해주세요.\n확인되면 FAST 예약 대기가 자동 시작됩니다.');
    const end=Date.now()+6*60*60*1000;
    while(Date.now()<end){
      const token=clean(document.querySelector('textarea[name="g-recaptcha-response"]')?.value ||
                        document.querySelector('[name="g-recaptcha-response"]')?.value);
      if(token){
        overlay('reCAPTCHA 확인됨 · FAST 예약 시작','ok');
        document.querySelector('#__ke_start')?.click();
        markRun(cfg,'started');
        clearPending(cfg.runId);
        return;
      }
      await sleep(250);
    }
  }

  async function zeroworld(cfg) {
    await waitFor('#zw-panel');
    document.querySelector('#zw-box')?.classList.add('open');
    overlay('ZEROWORLD 설정 자동입력 중');

    if(cfg.branch && /다이브/i.test(cfg.branch)) {
      const kind=document.querySelector('#zw-kind');
      if(kind){ kind.value='B'; fire(kind); await sleep(250); }
    }
    await waitOption('#zw-branch',cfg.branch,12000);
    setInput('#zw-date',cfg.date);
    document.querySelector('#zw-load-theme')?.click();
    await sleep(500);
    await waitOption('#zw-theme',cfg.theme,20000);

    setInput('#zw-time',cfg.time);
    setInput('#zw-name',cfg.name);
    setInput('#zw-phone',cfg.phone);
    setInput('#zw-people',cfg.people);
    if(cfg.openAt) setInput('#zw-open',cfg.openAt.replace(' ','T'));

    document.querySelector('#zw-box')?.classList.add('open');
    document.querySelector('#zw-captcha')?.focus();
    overlay('ZEROWORLD 준비 완료 · 화면의 자동등록방지 숫자를 직접 입력해주세요.\n입력이 확인되면 FAST 예약 대기가 자동 시작됩니다.');
    const end=Date.now()+6*60*60*1000;
    while(Date.now()<end){
      const cap=clean(document.querySelector('#zw-captcha')?.value);
      if(/^\d{4,5}$/.test(cap)){
        overlay('자동등록방지 코드 확인 · FAST 예약 시작','ok');
        document.querySelector('#zw-start')?.click();
        markRun(cfg,'started');
        clearPending(cfg.runId);
        return;
      }
      await sleep(250);
    }
  }

  async function doomescape(cfg) {
    await waitFor('#__doom_panel');
    overlay('DOOMESCAPE 설정 자동입력 중');

    await waitOption('#__doom_branch',cfg.branch,16000);
    const b=document.querySelector('#__doom_branch'); if(b) fire(b);
    await sleep(650);
    await waitOption('#__doom_theme',cfg.theme,16000);

    setInput('#__doom_date',cfg.date);
    setInput('#__doom_time',cfg.time);
    setInput('#__doom_name',cfg.name);
    setInput('#__doom_phone',cfg.phone);
    setInput('#__doom_people',cfg.people);
    if(cfg.openAt){
      setCheck('#__doom_auto',false);
      setInput('#__doom_open',cfg.openAt.replace(' ','T'));
    }
    overlay('DOOMESCAPE FAST 예약 시작','ok');
    document.querySelector('#__doom_start')?.click();
    markRun(cfg,'started'); clearPending(cfg.runId);
  }

  async function play33(cfg) {
    await waitFor('#p33-panel');
    overlay('PLAY33 설정 자동입력 중');

    await waitOption('#p33-branch',cfg.branch,16000);
    const b=document.querySelector('#p33-branch'); if(b) fire(b);
    setInput('#p33-date',cfg.date);
    document.querySelector('#p33-theme-load')?.click();
    await sleep(600);
    await waitOption('#p33-theme',cfg.theme,20000);

    setInput('#p33-time',cfg.time);
    setInput('#p33-name',cfg.name);
    setInput('#p33-phone',cfg.phone);
    setInput('#p33-people',cfg.people);
    if(cfg.openAt){
      const tm=clean(cfg.openAt).replace('T',' ').split(' ').pop();
      setInput('#p33-open',tm);
    }
    overlay('PLAY33 FAST 예약 시작','ok');
    document.querySelector('#p33-start')?.click();
    markRun(cfg,'started'); clearPending(cfg.runId);
  }

  async function dps(cfg) {
    await waitFor('#dps-fast-panel');
    overlay('단편선 설정 자동입력 중');

    setInput('#dps-target-date',cfg.date);
    await waitOption('#dps-theme',cfg.theme,15000);
    const th=document.querySelector('#dps-theme'); if(th) fire(th);
    await sleep(350);
    await waitOption('#dps-time',cfg.time,12000);

    setInput('#dps-name',cfg.name);
    setInput('#dps-phone',cfg.phone);
    setInput('#dps-depositor',cfg.depositor || cfg.name);
    setCheck('#dps-autopay',true);

    overlay('단편선 FAST 예약 시작','ok');
    document.querySelector('#dps-start')?.click();
    markRun(cfg,'started'); clearPending(cfg.runId);
  }

  async function ledasquare(cfg) {
    await waitFor('#leda-fast-panel');
    overlay('LEDASQUARE 설정 자동입력 중');

    const store = /^\d+$/.test(clean(cfg.branch)) ? clean(cfg.branch) : '1';
    setInput('#leda-store',store);
    setInput('#leda-date',cfg.date);
    setInput('#leda-time',cfg.time);
    setInput('#leda-name',cfg.name);
    setInput('#leda-phone',cfg.phone);
    setInput('#leda-people',cfg.people);
    await waitOption('#leda-theme',cfg.theme,10000);

    overlay('LEDASQUARE FAST 예약 시작','ok');
    document.querySelector('#leda-start')?.click();
    markRun(cfg,'started'); clearPending(cfg.runId);
  }

  async function oasis(cfg) {
    await waitFor('#__oasis_theme');
    overlay('OASIS FAST 설정 자동입력 중');

    await waitOption('#__oasis_theme',cfg.theme,16000);
    const th=document.querySelector('#__oasis_theme'); if(th) fire(th);
    await sleep(250);
    setInput('#__oasis_date',cfg.date);
    await sleep(100);
    await waitOption('#__oasis_time',cfg.time,10000);
    setInput('#__oasis_name',cfg.name);
    setInput('#__oasis_phone',cfg.phone);
    setInput('#__oasis_people',cfg.people);
    setCheck('#__oasis_auto',true);

    overlay('OASIS FAST + 현금/무통장 자동예약 시작','ok');
    document.querySelector('#__oasis_start')?.click();
    markRun(cfg,'started'); clearPending(cfg.runId);
  }

  async function run() {
    const incoming=readIncoming();
    const cfg=incoming || pending();
    if(!cfg || !cfg.autoStart || !validSite(cfg)) return;

    // Avoid duplicate start on a result/navigation page after the same run has already fired.
    try{
      const last=JSON.parse(localStorage.getItem(LAST_RUN)||'null');
      if(last && last.runId===cfg.runId && last.state==='started' && cfg.site!=='keyescape') return;
    }catch{}

    try {
      const fns={keyescape,zeroworld,doomescape,play33,dps,ledasquare,oasis};
      await fns[cfg.site](cfg);
    } catch(e) {
      console.error('[ESCAPE PASS bridge]',e);
      overlay(`자동연결 오류\n${String(e?.message||e)}`,'err');
    }
  }

  // Keyescape needs the bridge on every step; others can start once the DOM exists.
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(run,80),{once:true});
  else setTimeout(run,80);
})();
