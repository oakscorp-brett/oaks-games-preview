/* Shared game "meta" core: save, sound, juice, modals, store (pretend on web),
   reward-ad hooks, daily calendar, daily tasks, achievements, monthly pass,
   weekend event ladder, vault. Each game calls Core.bind(state, config). */
(function(){
'use strict';
const C = window.Core = {};
let S, cfg;
const LS = window.localStorage;

/* ---------- tiny DOM helper ---------- */
function h(tag, a, ...kids){
  const e = document.createElement(tag);
  if (a) for (const k in a){
    const v = a[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e[k.toLowerCase()] = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
C.h = h;
C.$ = s => document.querySelector(s);

/* ---------- time ---------- */
C.now = () => Date.now();
C.dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
C.monthKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1); };
C.fmt = n => { n = Math.floor(n); return n >= 1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,'')+'M' : n >= 1e4 ? (n/1e3).toFixed(1).replace(/\.0$/,'')+'K' : String(n); };
C.fmtTime = ms => { let s = Math.max(0, Math.ceil(ms/1000)); const d = Math.floor(s/86400); s -= d*86400; const hh = Math.floor(s/3600); s -= hh*3600; const m = Math.floor(s/60); s -= m*60;
  return d ? d+'d '+hh+'h' : hh ? hh+'h '+m+'m' : m ? m+'m '+(s<10?'0':'')+s+'s' : s+'s'; };
C.param = k => new URLSearchParams(location.search).get(k);

/* ---------- save ---------- */
C.load = key => { try { return JSON.parse(LS.getItem(key) || 'null'); } catch(e){ return null; } };
let saveT = 0;
C.save = () => { if (!cfg || C._wipe) return; S.savedAt = Date.now(); try { LS.setItem(cfg.key, JSON.stringify(S)); } catch(e){} };
C.saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(C.save, 300); };
document.addEventListener('visibilitychange', () => { if (document.hidden) C.save(); });
window.addEventListener('pagehide', () => C.save());

/* ---------- sound (WebAudio synth, no files) ---------- */
let ac = null;
function audio(){ if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
window.addEventListener('pointerdown', audio, {once:false, passive:true});
function tone(f, d, type, vol, when, slide){
  const a = audio(); if (!a || (S && S.meta && S.meta.settings.mute)) return;
  const t = a.currentTime + (when||0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f*slide), t+d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol||0.12, t+0.01); g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+d+0.02);
}
C.tone = tone;
C.sfx = (name, p) => {
  p = p || 0;
  switch(name){
    case 'tap': tone(520,.06,'triangle',.08); break;
    case 'pick': tone(700,.05,'sine',.07); break;
    case 'drop': tone(300,.07,'triangle',.08,0,.7); break;
    case 'spawn': tone(440+p*20,.08,'sine',.09,0,1.6); break;
    case 'merge': { const b = 330*Math.pow(1.12, p); tone(b,.12,'sine',.13); tone(b*1.5,.14,'triangle',.08,.06); tone(b*2,.18,'sine',.06,.12); break; }
    case 'coin': tone(1320,.05,'square',.04); tone(1760,.09,'square',.04,.05); break;
    case 'win': [523,659,784,1047].forEach((f,i)=>tone(f,.18,'triangle',.11,i*.09)); break;
    case 'big': [392,523,659,784,1047,1319].forEach((f,i)=>tone(f,.22,'triangle',.12,i*.08)); break;
    case 'err': tone(200,.14,'sawtooth',.06,0,.7); break;
    case 'chop': tone(160,.08,'square',.09,0,.5); tone(90,.1,'triangle',.08,.03); break;
    case 'harvest': tone(600,.08,'sine',.09,0,1.5); tone(900,.1,'triangle',.06,.06); break;
    case 'level': [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,.2,'triangle',.12,i*.1)); break;
  }
};
C.haptic = (kind) => {
  try {
    const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    if (H) { H.impact({style: kind === 'heavy' ? 'HEAVY' : kind === 'med' ? 'MEDIUM' : 'LIGHT'}); return; }
    if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 30 : kind === 'med' ? 18 : 8);
  } catch(e){}
};

/* ---------- particles / juice ---------- */
let fx, fctx, parts = [], raf = 0;
function fxInit(){
  fx = h('canvas', {id:'fxc', style:'position:fixed;inset:0;pointer-events:none;z-index:60'});
  document.body.append(fx); fctx = fx.getContext('2d'); size(); window.addEventListener('resize', size);
}
function size(){ const d = Math.min(2, window.devicePixelRatio||1); fx.width = innerWidth*d; fx.height = innerHeight*d; fx.style.width = innerWidth+'px'; fx.style.height = innerHeight+'px'; fctx.setTransform(d,0,0,d,0,0); }
function loop(){
  fctx.clearRect(0,0,innerWidth,innerHeight);
  parts = parts.filter(p => (p.life -= 1/60) > 0);
  for (const p of parts){
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    const a = Math.min(1, p.life/p.max*2);
    fctx.save(); fctx.globalAlpha = a; fctx.translate(p.x,p.y); fctx.rotate(p.rot);
    if (p.emoji){ fctx.font = p.s+'px serif'; fctx.textAlign='center'; fctx.textBaseline='middle'; fctx.fillText(p.emoji,0,0); }
    else if (p.star){ fctx.fillStyle = p.c; star(fctx, p.s); }
    else { fctx.fillStyle = p.c; fctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); }
    fctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
}
function star(c, r){ c.beginPath(); for (let i=0;i<10;i++){ const rr = i%2 ? r*.45 : r; const an = i*Math.PI/5 - Math.PI/2; c.lineTo(Math.cos(an)*rr, Math.sin(an)*rr); } c.closePath(); c.fill(); }
function kick(){ if (!raf) raf = requestAnimationFrame(loop); }
C.burst = (x, y, o) => {
  o = o || {}; const n = o.n || 14, cols = o.colors || ['#ffd34d','#fff3b0','#ff9f43','#7bed9f'];
  for (let i=0;i<n;i++){ const an = Math.random()*Math.PI*2, sp = (o.speed||4)*(0.4+Math.random());
    parts.push({x, y, vx:Math.cos(an)*sp, vy:Math.sin(an)*sp-(o.up||1.5), g:o.g!=null?o.g:0.15, life:o.life||0.9, max:o.life||0.9, s:(o.size||7)*(0.6+Math.random()*0.8), c:cols[i%cols.length], rot:Math.random()*6, vr:(Math.random()-.5)*.3, star:o.star!==false&&i%2===0, emoji:o.emoji}); }
  if (parts.length > 400) parts.splice(0, parts.length-400);
  kick();
};
C.confetti = () => { for (let k=0;k<5;k++) setTimeout(()=>C.burst(innerWidth*(0.15+0.7*Math.random()), innerHeight*0.25, {n:30, speed:7, up:3, life:1.6, size:9, colors:['#ff6b6b','#ffd34d','#48dbfb','#1dd1a1','#f368e0','#ff9f43'], star:false}), k*120); };
C.center = el => { const r = el.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; };
C.floatText = (x, y, text, color) => {
  const e = h('div', {class:'floattx', style:`left:${x}px;top:${y}px;color:${color||'#fff'}`}, text);
  document.body.append(e); setTimeout(()=>e.remove(), 1100);
};
C.flyTo = (from, toSel, emoji, n, done) => {
  const to = typeof toSel === 'string' ? document.querySelector(toSel) : toSel;
  const a = from.x != null ? from : C.center(from), b = to ? C.center(to) : {x:innerWidth/2, y:30};
  n = Math.min(n||6, 10); let left = n;
  for (let i=0;i<n;i++){
    const e = h('div', {class:'flyer', style:`left:${a.x}px;top:${a.y}px`}, emoji); document.body.append(e);
    const dx = (Math.random()-.5)*80, dy = (Math.random()-.5)*80;
    const an = e.animate([{transform:'translate(-50%,-50%) scale(.6)'},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.2)`, offset:.3},{transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) scale(.7)`}], {duration:650+i*60, easing:'cubic-bezier(.5,0,.6,1)'});
    an.onfinish = () => { e.remove(); if (to){ to.classList.remove('bump'); void to.offsetWidth; to.classList.add('bump'); } if (i%2===0) C.sfx('coin'); if (--left === 0 && done) done(); };
  }
};
C.shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

/* ---------- toast + modal stack ---------- */
C.toast = (msg, ms) => {
  let t = document.getElementById('toast'); if (!t){ t = h('div',{id:'toast'}); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('on'), ms||1800);
};
const stack = [];
C.modal = (o) => {
  const box = h('div', {class:'mbox'+(o.wide?' wide':'')});
  const back = h('div', {class:'mback', onclick: e => { if (e.target === back && o.dismiss !== false) C.closeModal(back); }}, box);
  back._o = o; back._box = box; document.body.append(back); stack.push(back); renderModal(back);
  requestAnimationFrame(()=>back.classList.add('on'));
  return back;
};
function renderModal(back){
  const o = back._o, box = back._box, sc = box.querySelector('.mbody') ? box.querySelector('.mbody').scrollTop : 0;
  box.innerHTML = '';
  const head = h('div',{class:'mhead'}, h('div',{class:'mtitle'}, o.title||''), o.dismiss===false?null:h('button',{class:'mx', onclick:()=>C.closeModal(back)},'✕'));
  const body = h('div',{class:'mbody'}); const r = o.render ? o.render() : o.body; if (r != null) body.append(r.nodeType ? r : h('div',{html:String(r)}));
  box.append(head, body);
  if (o.buttons) box.append(h('div',{class:'mbtns'}, o.buttons.filter(Boolean).map(b => h('button',{class:'btn '+(b.cls||''), onclick:()=>{ if (b.close!==false) C.closeModal(back); b.fn && b.fn(); }}, b.t))));
  body.scrollTop = sc;
}
C.closeModal = (back) => {
  back = back || stack[stack.length-1]; if (!back) return;
  const i = stack.indexOf(back); if (i >= 0) stack.splice(i,1);
  back.classList.remove('on'); setTimeout(()=>back.remove(), 180);
  back._o.onClose && back._o.onClose();
};
C.refreshModals = (liveOnly) => { for (const b of stack) if (!liveOnly || b._o.live) renderModal(b); };
C.modalOpen = () => stack.length > 0;

/* ---------- coach marks (non-blocking tutorial pointer) ---------- */
let coachEl = null, coachTarget = null;
C.coach = (target, text) => {
  C.coachOff(); if (!target) return;
  coachTarget = target;
  coachEl = h('div',{class:'coach'}, h('div',{class:'cring'}), h('div',{class:'chand'},'👆'), h('div',{class:'cbub'}, text));
  document.body.append(coachEl); placeCoach();
};
function placeCoach(){
  if (!coachEl || !coachTarget) return;
  const t = typeof coachTarget === 'function' ? coachTarget() : coachTarget; if (!t || !t.getBoundingClientRect){ coachEl.style.display='none'; return; }
  const r = t.getBoundingClientRect(); coachEl.style.display = r.width ? '' : 'none';
  const ring = coachEl.children[0], hand = coachEl.children[1], bub = coachEl.children[2];
  Object.assign(ring.style, {left:r.left-6+'px', top:r.top-6+'px', width:r.width+12+'px', height:r.height+12+'px'});
  Object.assign(hand.style, {left:r.left+r.width/2-8+'px', top:r.top+r.height/2+4+'px'});
  const above = r.top > innerHeight*0.55;
  bub.style.left = Math.max(10, Math.min(innerWidth-250, r.left+r.width/2-120))+'px';
  bub.style.top = above ? '' : (r.bottom+44)+'px'; bub.style.bottom = above ? (innerHeight-r.top+14)+'px' : '';
}
C.coachOff = () => { if (coachEl) coachEl.remove(); coachEl = null; coachTarget = null; };
setInterval(placeCoach, 250);

/* ---------- give / rewards ---------- */
C.give = (g, from) => {
  if (!g) return;
  for (const k in g) cfg.grant(k, g[k], from);
  C.saveSoon(); cfg.onChange && cfg.onChange();
};
const lab = (k, v) => (cfg.label && cfg.label(k, v)) || ((cfg.icons[k]||k)+' '+(typeof v==='number'?C.fmt(v):v));
C.giveText = g => Object.keys(g||{}).map(k => lab(k, g[k])).join('  ');
C.rewardChips = g => h('div',{class:'chips'}, Object.keys(g||{}).map(k => h('span',{class:'chip'}, lab(k, g[k]))));
C.celebrate = (title, g, sub) => {
  C.sfx('win'); C.confetti(); C.haptic('med');
  C.modal({title, render:()=>h('div',{class:'center'}, sub?h('p',null,sub):null, C.rewardChips(g)), buttons:[{t:'Collect!', cls:'g', fn:()=>C.give(g)}], dismiss:false});
};

/* ---------- meta state ---------- */
function ensureMeta(){
  const m = S.meta = S.meta || {};
  m.stats = m.stats || {}; m.today = m.today || {day:''}; m.bought = m.bought || {};
  m.daily = m.daily || {last:'', idx:0}; m.ach = m.ach || {}; m.pass = m.pass || {month:'', xp:0, free:{}, paid:{}, gold:false};
  m.event = m.event || {key:'', tok:0, got:{}}; m.vault = m.vault || {gems:0, broke:0}; m.ads = m.ads || {day:'', n:0};
  m.tasks = m.tasks || {day:'', ids:[], got:{}, bonus:false, told:{}}; m.settings = m.settings || {mute:false};
  m.offers = m.offers || {};
}
C.bind = (state, config) => { S = state; cfg = config; ensureMeta(); rollDay(); if (!fx) fxInit(); setInterval(tick, 1000); };
C.meta = () => S.meta;

function seeded(seed){ return () => { seed = (seed*9301+49297)%233280; return seed/233280; }; }
function rollDay(){
  const m = S.meta, d = C.dayKey();
  if (m.today.day !== d) m.today = {day:d};
  if (m.tasks.day !== d){
    const rnd = seeded(Math.floor(Date.now()/864e5)+7), pool = cfg.tasks.slice(), picks = [], used = {};
    while (picks.length < 3 && pool.length){ const t = pool.splice(Math.floor(rnd()*pool.length),1)[0]; if (used[t.stat]) continue; used[t.stat]=1; picks.push(t.id); }
    m.tasks = {day:d, ids:picks, got:{}, bonus:false, told:{}};
  }
  const mk = C.monthKey(); if (m.pass.month !== mk) m.pass = {month:mk, xp:0, free:{}, paid:{}, gold:false};
  const ev = C.eventInfo(); if (ev.active && m.event.key !== ev.key) m.event = {key:ev.key, tok:0, got:{}};
  if (m.ads.day !== d) m.ads = {day:d, n:0};
}
function tick(){ rollDay(); placeCoach(); C.refreshModals(true); cfg.onTick && cfg.onTick(); C.updateBadges(); }

C.track = (stat, n) => {
  n = n == null ? 1 : n; const m = S.meta; rollDay();
  m.stats[stat] = (m.stats[stat]||0) + n; m.today[stat] = (m.today[stat]||0) + n;
  for (const id of m.tasks.ids){ const t = taskDef(id); if (t && t.stat === stat && !m.tasks.told[id] && (m.today[stat]||0) >= t.n){ m.tasks.told[id] = 1; C.toast('✅ Daily task done: '+t.txt+' — claim it!'); C.sfx('coin'); } }
  for (const a of cfg.ach){ if (a.stat === stat && !m.ach[a.id+'_seen'] && (m.stats[stat]||0) >= a.n){ m.ach[a.id+'_seen'] = 1; C.toast('🏆 Trophy earned: '+a.name+'!'); } }
  C.updateBadges(); C.saveSoon();
};
C.stat = s => S.meta.stats[s] || 0;
C.todayStat = s => S.meta.today[s] || 0;

/* ---------- reward ads (placeholder hook) ---------- */
C.rewardAd = (label, fn) => {
  const m = S.meta;
  if (m.noAds){ C.toast('⭐ Ad-Free Pass: bonus without an ad!'); fn(); return; }
  if (m.ads.n >= (cfg.adsPerDay||12)){ C.toast('No more bonus videos today. Come back tomorrow!'); return; }
  const go = () => { m.ads.n++; C.saveSoon(); fn(); };
  if (window.GameAds && window.GameAds.showRewarded){ window.GameAds.showRewarded(label).then(ok => ok && go()).catch(()=>{}); return; }
  let left = 3;
  const md = C.modal({title:'📺 Bonus video', dismiss:false, live:true, render:()=>h('div',{class:'center'}, h('div',{class:'adph'}, 'Ad placeholder', h('small',null,'(real ads not set up yet)')), h('p',null, left>0?'Your reward in '+left+'…':'Done!'))});
  const iv = setInterval(()=>{ left--; if (left <= 0){ clearInterval(iv); C.closeModal(md); go(); } else C.refreshModals(true); }, 1000);
};
C.adsLeft = () => S.meta.noAds ? 99 : Math.max(0, (cfg.adsPerDay||12) - S.meta.ads.n);

/* ---------- store (pretend purchases on web; native hook later) ---------- */
C.product = id => cfg.products[id];
C.owned = id => (S.meta.bought[id]||0) > 0;
C.buy = (id, after) => {
  const p = cfg.products[id]; if (!p) return;
  if (p.once && C.owned(id)){ C.toast('You already own this.'); return; }
  const grant = () => {
    S.meta.bought[id] = (S.meta.bought[id]||0) + 1;
    if (p.onBuy) p.onBuy(); else C.give(p.give);
    C.track('purchases'); C.sfx('big'); C.confetti(); C.haptic('heavy');
    C.toast('🎉 '+p.name+' unlocked!'); C.save(); C.refreshModals(); cfg.onChange && cfg.onChange(); after && after();
  };
  const native = window.GameStore && window.GameStore.purchase;
  C.modal({title:p.icon+' '+p.name, render:()=>h('div',{class:'center'},
      p.desc?h('p',null,p.desc):null, p.give?C.rewardChips(p.give):null,
      h('div',{class:'price'}, p.price),
      h('p',{class:'small'}, native ? '' : '🧪 Test version: this is a pretend purchase. No money is charged.')),
    buttons:[{t:'Not now'}, {t:'Buy '+p.price, cls:'g', fn:()=>{ if (native) window.GameStore.purchase(cfg.bundle+'.'+id).then(ok=>ok&&grant()).catch(()=>{}); else grant(); }}]});
};

/* ---------- daily calendar ---------- */
C.dailyReady = () => S.meta.daily.last !== C.dayKey();
C.openDaily = () => {
  const m = S.meta;
  C.modal({title:'📅 Daily Gifts', render:()=>{
    const ready = C.dailyReady(), cur = m.daily.idx % 7;
    return h('div',null, h('p',{class:'small center'},'Come back every day! Missing a day never resets your progress.'),
      h('div',{class:'cal'}, cfg.daily.map((g,i)=>{
        const done = i < cur || (i === cur && !ready), today = i === cur && ready;
        return h('div',{class:'calday'+(done?' done':'')+(today?' today':'')+(i===6?' big':'')}, h('b',null,'Day '+(i+1)), h('div',{class:'calg'}, C.giveText(g)), done?h('span',{class:'tick'},'✔'):null);
      })),
      h('div',{class:'center'}, ready ? h('button',{class:'btn g', onclick:e=>{
          const g = cfg.daily[cur]; m.daily.last = C.dayKey(); m.daily.idx++; C.track('dailyClaims');
          C.flyTo(e.target, cfg.hudFor(g), Object.keys(g).map(k=>cfg.icons[k])[0], 8); C.give(g); C.sfx('win'); C.confetti(); C.refreshModals(); C.save();
        }}, 'Claim Day '+(cur+1)+'!') : h('p',{class:'small'}, 'Next gift in '+C.fmtTime(nextMidnight()-Date.now()))));
  }, live:true});
};
function nextMidnight(){ const d = new Date(); d.setHours(24,0,0,0); return d.getTime(); }

/* ---------- daily tasks ---------- */
function taskDef(id){ return cfg.tasks.find(t => t.id === id); }
C.tasksClaimable = () => { const m = S.meta; return m.tasks.ids.some(id => { const t = taskDef(id); return t && !m.tasks.got[id] && C.todayStat(t.stat) >= t.n; }) || (!m.tasks.bonus && m.tasks.ids.every(id => m.tasks.got[id])); };
C.openTasks = () => {
  const m = S.meta;
  C.modal({title:'📋 Daily Tasks', live:true, render:()=>{
    rollDay();
    const rows = m.tasks.ids.map(id => { const t = taskDef(id); if (!t) return null; const v = Math.min(t.n, C.todayStat(t.stat)), done = v >= t.n, got = m.tasks.got[id];
      return h('div',{class:'row'}, h('div',{class:'grow'}, h('div',null,t.txt), bar(v/t.n, v+' / '+t.n)), C.rewardChips(t.give),
        got ? h('span',{class:'tick'},'✔') : h('button',{class:'btn s '+(done?'g':''), disabled:done?null:'', onclick:e=>{ m.tasks.got[id]=1; C.flyTo(e.target, cfg.hudFor(t.give), cfg.icons[Object.keys(t.give)[0]], 6); C.give(t.give); C.track('tasksDone'); C.addPassXP(5); C.sfx('win'); C.refreshModals(); }}, done?'Claim':'…'));
    });
    const all = m.tasks.ids.every(id => m.tasks.got[id]);
    return h('div',null, rows, h('div',{class:'row bonus'}, h('div',{class:'grow'}, h('b',null,'🎁 Finish all 3: Bonus Chest'), h('div',{class:'small'},'Always the same great prize — no surprises.')), C.rewardChips(cfg.taskBonus),
        m.tasks.bonus ? h('span',{class:'tick'},'✔') : h('button',{class:'btn s '+(all?'g':''), disabled:all?null:'', onclick:()=>{ m.tasks.bonus = true; C.celebrate('Bonus Chest!', cfg.taskBonus); C.refreshModals(); }}, 'Open')),
      h('p',{class:'small center'}, 'New tasks in '+C.fmtTime(nextMidnight()-Date.now())));
  }});
};
function bar(f, label){ return h('div',{class:'bar'}, h('div',{class:'fill', style:'width:'+Math.round(Math.min(1,f)*100)+'%'}), label?h('span',null,label):null); }
C.bar = bar;

/* ---------- achievements ---------- */
C.achClaimable = () => cfg.ach.some(a => !S.meta.ach[a.id] && C.stat(a.stat) >= a.n);
C.openAch = () => {
  const m = S.meta;
  C.modal({title:'🏆 Trophies', render:()=>h('div',null, cfg.ach.map(a => { const v = Math.min(a.n, C.stat(a.stat)), done = v >= a.n;
    return h('div',{class:'row'+(m.ach[a.id]?' dim':'')}, h('div',{class:'ach'}, done?'🏆':'🔒'), h('div',{class:'grow'}, h('b',null,a.name), h('div',{class:'small'},a.txt), bar(v/a.n, C.fmt(v)+' / '+C.fmt(a.n))),
      m.ach[a.id] ? h('span',{class:'tick'},'✔') : h('button',{class:'btn s '+(done?'g':''), disabled:done?null:'', onclick:e=>{ m.ach[a.id]=1; C.flyTo(e.target, cfg.hudFor(a.give), cfg.icons[Object.keys(a.give)[0]], 6); C.give(a.give); C.sfx('win'); C.refreshModals(); }}, done?C.giveText(a.give):'🔒'));
  }))});
};

/* ---------- monthly pass (free + paid placeholder) ---------- */
const PASS_TIERS = 30;
C.passTier = () => Math.min(PASS_TIERS, Math.floor(S.meta.pass.xp / cfg.pass.per));
C.addPassXP = n => { const before = C.passTier(); S.meta.pass.xp += n; if (C.passTier() > before){ C.toast('🎖️ '+cfg.pass.name+' tier '+C.passTier()+' reached!'); C.sfx('coin'); } C.saveSoon(); };
C.passClaimable = () => { const p = S.meta.pass, t = C.passTier(); for (let i=1;i<=t;i++){ if (!p.free[i]) return true; if (p.gold && !p.paid[i]) return true; } return false; };
C.openPass = () => {
  const p = S.meta.pass;
  const eom = (()=>{ const d = new Date(); return new Date(d.getFullYear(), d.getMonth()+1, 1).getTime(); })();
  C.modal({title:'🎖️ '+cfg.pass.name, wide:true, render:()=>{
    const t = C.passTier(), into = p.xp % cfg.pass.per;
    return h('div',null,
      h('div',{class:'center small'}, 'Earn points by finishing orders and daily tasks. Resets in '+C.fmtTime(eom-Date.now())+'.'),
      h('div',{class:'row'}, h('b',null,'Tier '+t+' / '+PASS_TIERS), h('div',{class:'grow'}, bar(t>=PASS_TIERS?1:into/cfg.pass.per, t>=PASS_TIERS?'MAX':into+' / '+cfg.pass.per))),
      p.gold ? h('div',{class:'center gold'},'✨ '+cfg.pass.paidName+' active — double rewards this month!') :
        h('div',{class:'offer'}, h('div',{class:'grow'}, h('b',null,'✨ '+cfg.pass.paidName), h('div',{class:'small'}, 'Unlock the gold row: '+cfg.pass.paidPitch+' Rewards you already passed are yours to claim right away.')), h('button',{class:'btn g', onclick:()=>C.buy('pass')}, C.product('pass').price)),
      h('div',{class:'passgrid'}, h('div',{class:'ph'},'Tier'), h('div',{class:'ph'},'Free'), h('div',{class:'ph gold'},'Gold'),
        Array.from({length:PASS_TIERS}, (_,k)=>{ const i = k+1, g = cfg.pass.tier(i), reached = i <= t;
          const cell = (row, gift, owned) => { const got = p[row][i];
            return h('div',{class:'pcell'+(reached?' on':'')+(got?' got':'')+(row==='paid'?' goldc':'')}, h('div',null,C.giveText(gift)),
              got ? '✔' : reached && owned ? h('button',{class:'btn s g', onclick:e=>{ p[row][i]=1; C.flyTo(e.target, cfg.hudFor(gift), cfg.icons[Object.keys(gift)[0]], 5); C.give(gift); C.sfx('coin'); C.refreshModals(); }},'Claim') : (!owned ? '🔒' : '')); };
          return [h('div',{class:'pnum'+(reached?' on':'')}, i), cell('free', g.free, true), cell('paid', g.paid, p.gold)];
        })));
  }, live:false});
};

/* ---------- weekend event with guaranteed ladder ---------- */
C.eventInfo = () => {
  const now = new Date(), dow = now.getDay(), forced = C.param('weekend') === '1';
  const fri = new Date(now); fri.setHours(0,0,0,0); fri.setDate(fri.getDate() - ((dow+2)%7));
  const end = new Date(fri); end.setDate(end.getDate()+3);
  let active = dow === 5 || dow === 6 || dow === 0;
  if (forced){ active = true; }
  const nextFri = new Date(fri); if (!(dow===5||dow===6||dow===0)) nextFri.setDate(fri.getDate()+7);
  const key = 'ev'+fri.getFullYear()+'-'+(fri.getMonth()+1)+'-'+fri.getDate();
  return {active, key, endsIn: forced && !(dow===5||dow===6||dow===0) ? (nextMidnight()-Date.now()) : end.getTime()-Date.now(), startsIn: nextFri.getTime()-Date.now()};
};
C.addEventTokens = (n, fromEl) => {
  const ev = C.eventInfo(); if (!ev.active) return; rollDay();
  S.meta.event.tok += n; if (fromEl) C.flyTo(fromEl, '#evbtn', cfg.event.icon, Math.min(4,n));
  C.saveSoon();
};
C.eventClaimable = () => { const ev = C.eventInfo(); if (!ev.active) return false; const m = S.meta.event; return cfg.event.ladder.some((s,i)=> !m.got[i] && m.tok >= s.need); };
C.openEvent = () => {
  const ev = C.eventInfo(), m = S.meta.event;
  C.modal({title:cfg.event.icon+' '+cfg.event.name, live:true, render:()=>{
    const e2 = C.eventInfo();
    if (!e2.active) return h('div',{class:'center'}, h('p',null, cfg.event.blurb), h('p',null,'Next event starts in '+C.fmtTime(e2.startsIn)+' (every Friday–Sunday).'));
    const last = cfg.event.ladder[cfg.event.ladder.length-1].need;
    return h('div',null, h('p',{class:'small center'}, cfg.event.blurb+' Every prize is guaranteed — no luck involved. Ends in '+C.fmtTime(e2.endsIn)+'.'),
      h('div',{class:'row'}, h('b',null, cfg.event.icon+' '+m.tok), h('div',{class:'grow'}, bar(m.tok/last))),
      cfg.event.ladder.map((s,i)=>{ const ok = m.tok >= s.need;
        return h('div',{class:'row'+(m.got[i]?' dim':'')}, h('div',{class:'ach'}, i===cfg.event.ladder.length-1?'👑':(ok?'🎁':'🔒')), h('div',{class:'grow'}, h('b',null, s.need+' '+cfg.event.icon), C.rewardChips(s.give)),
          m.got[i] ? h('span',{class:'tick'},'✔') : h('button',{class:'btn s '+(ok?'g':''), disabled:ok?null:'', onclick:e=>{ m.got[i]=1; C.flyTo(e.target, cfg.hudFor(s.give), cfg.icons[Object.keys(s.give)[0]], 6); C.give(s.give); C.track('eventPrizes'); C.sfx('win'); C.refreshModals(); }}, ok?'Claim':'…'));
      }),
      cfg.products.eventpack && !(S.meta.offers[m.key]) ? h('div',{class:'offer'}, h('div',{class:'grow'}, h('b',null,'⏳ Weekend-only: '+cfg.products.eventpack.name), h('div',{class:'small'}, C.giveText(cfg.products.eventpack.give)+' — only sold during this event, one per weekend.')),
        h('button',{class:'btn g', onclick:()=>C.buy('eventpack', ()=>{ S.meta.offers[m.key]=1; })}, cfg.products.eventpack.price)) : null);
  }});
};

/* ---------- piggy-bank vault ---------- */
C.vaultAdd = n => { const v = S.meta.vault, before = v.gems; v.gems = Math.min(cfg.vault.cap, v.gems + n); if (before < cfg.vault.cap && v.gems >= cfg.vault.cap) C.toast(cfg.vault.icon+' '+cfg.vault.name+' is FULL!'); C.saveSoon(); };
C.openVault = () => {
  const v = S.meta.vault;
  C.modal({title:cfg.vault.icon+' '+cfg.vault.name, render:()=>{
    const can = v.gems >= cfg.vault.min;
    return h('div',{class:'center'}, h('div',{class:'vaultbig'+(v.gems>=cfg.vault.cap?' full':'')}, cfg.vault.icon),
      h('p',null, cfg.vault.blurb),
      bar(v.gems/cfg.vault.cap, C.fmt(v.gems)+' / '+C.fmt(cfg.vault.cap)+' '+cfg.icons.gems),
      h('p',{class:'small'}, can ? 'Open it any time to keep everything inside.' : 'Fill it to '+cfg.vault.min+' '+cfg.icons.gems+' to open it.'),
      h('button',{class:'btn g', disabled:can?null:'', onclick:()=>{ const amt = v.gems; cfg.products.vault.give = {gems:amt}; C.buy('vault', ()=>{ v.gems = 0; v.broke++; C.refreshModals(); }); }}, 'Open for '+C.product('vault').price));
  }});
};

/* ---------- shop ---------- */
C.openShop = (focus) => {
  C.modal({title:'🛒 Shop', wide:true, render:()=>h('div',null,
    h('p',{class:'small center'}, '🧪 Test version: purchases are pretend and free. Nothing here is random — you always see exactly what you get.'),
    cfg.shop().map(sec => sec.items.length ? h('div',null, h('div',{class:'shsec'}, sec.title), h('div',{class:'shgrid'}, sec.items.map(id => {
      const p = cfg.products[id]; if (!p) return null; const own = p.once && C.owned(id);
      return h('div',{class:'shcard'+(p.tag?' hot':'')+(own?' dim':'')}, p.tag?h('div',{class:'tag'},p.tag):null, h('div',{class:'shicon'}, p.icon), h('b',null,p.name), h('div',{class:'small'}, p.desc || C.giveText(p.give)),
        own ? h('div',{class:'tick'},'Owned ✔') : h('button',{class:'btn s g', onclick:()=>p.free ? p.free() : C.buy(id)}, p.price));
    }))) : null),
    h('div',{class:'center'}, h('button',{class:'btn s', onclick:()=>C.toast(window.GameStore&&window.GameStore.restore?'Restoring…':'Restore Purchases works in the App Store version.')}, 'Restore Purchases')))});
};

/* ---------- badges ---------- */
C.updateBadges = () => {
  const set = (id, on) => { const e = document.getElementById(id); if (e) e.classList.toggle('dot', !!on); };
  set('dailybtn', C.dailyReady()); set('taskbtn', C.tasksClaimable()); set('achbtn', C.achClaimable()); set('passbtn', C.passClaimable());
  set('evbtn', C.eventClaimable()); set('vaultbtn', S.meta.vault.gems >= cfg.vault.min);
  const ev = document.getElementById('evbtn'); if (ev) ev.style.display = C.eventInfo().active ? '' : 'none';
  const vb = document.querySelector('#vaultbtn small'); if (vb) vb.textContent = C.fmt(S.meta.vault.gems);
};

/* ---------- settings ---------- */
C.openSettings = (extra) => {
  C.modal({title:'⚙️ Settings', render:()=>h('div',null,
    h('div',{class:'row'}, h('div',{class:'grow'},'Sound'), h('button',{class:'btn s', onclick:()=>{ S.meta.settings.mute = !S.meta.settings.mute; C.save(); C.refreshModals(); }}, S.meta.settings.mute?'🔇 Off':'🔊 On')),
    extra ? extra() : null,
    h('div',{class:'row'}, h('div',{class:'grow'},'Start over (erases progress)'), h('button',{class:'btn s', onclick:()=>C.modal({title:'Erase progress?', body:'This deletes your saved game on this device.', buttons:[{t:'Cancel'},{t:'Erase', fn:()=>{ C._wipe = true; localStorage.removeItem(cfg.key); location.reload(); }}]})}, 'Reset')),
    h('p',{class:'small center'}, cfg.title+' • test build • Oaks Corp'))});
};
})();
