/* Timberline Merge — merge-2 town restoration game. */
(function(){
'use strict';
const C = Core, h = C.h, $ = C.$;
const KEY = 'timberline-merge-v1', COLS = 7, ROWS = 8, N = COLS*ROWS;
const MAXL = 8, EMAX = 100, EREGEN = 60e3, WAGON_MS = 15*60e3;

/* ---------- content ---------- */
const CH = {
  tools:{name:'Tools', gen:'shed', it:[['🔩','Bolt'],['🔨','Hammer'],['🪚','Hand Saw'],['🪓','Axe'],['🧰','Toolbox'],['⚙️','Gear Set'],['🛠️','Workbench'],['🚜','Tractor']]},
  wood:{name:'Lumber', gen:'shed', it:[['🌰','Pinecone'],['🌱','Seedling'],['🌲','Fir Tree'],['🪵','Log'],['🪜','Ladder'],['🚪','Door'],['🛖','Cabin'],['🏡','Homestead']]},
  food:{name:'Pantry', gen:'pantry', it:[['🫐','Huckleberries'],['🍎','Apple'],['🥕','Carrots'],['🍞','Bread'],['🥧','Berry Pie'],['🍲','Camp Stew'],['🧺','Picnic Basket'],['🎂','Big Cake']]},
  gear:{name:'Supplies', gen:'post', it:[['🧵','Thread'],['🧶','Yarn'],['🧤','Work Gloves'],['🧣','Scarf'],['🧥','Flannel Coat'],['🎒','Backpack'],['⛺','Tent'],['🛶','Canoe']]},
};
const GEN = {
  shed:{e:'🏚️', name:'Tool Shed', makes:['tools','wood'], unlock:1},
  pantry:{e:'🥫', name:"Grandma's Pantry", makes:['food'], unlock:3},
  post:{e:'🧳', name:"Trader's Trunk", makes:['gear'], unlock:5},
};
const FOLK = [['👵','Grandma June'],['🧔','Uncle Walt'],['👧','Cousin Mia'],['🤠','Sheriff Dale'],['👩‍⚕️','Doc Rosa'],['👴','Old Pete'],['👨‍🌾','Farmer Ray'],['👩‍🏫','Ms. Hart']];
const CHAPTERS = [
  {name:'The Old Sawmill', e:'🏭', who:0, tasks:[
    ['Clear the brambles',1,"Grandpa Gus built this mill with his own two hands. Let's clear the weeds first!"],
    ['Patch the roof',2,'No more leaks! Grandpa would be proud.'],
    ['Fix the water wheel',2,'Hear that? The wheel is turning again!'],
    ['Sharpen the big saw',3,"Uncle Walt says it's sharp enough to slice a sunbeam."],
    ['Paint the walls red',3,'Barn red, just like the old photos.'],
    ['Open the mill!',4,'The Timberline Sawmill is open! The whole family came to cheer.']]},
  {name:'General Store', e:'🏪', who:2, tasks:[
    ['Sweep the porch',2,"Mia found Grandpa's old store sign under the porch!"],
    ['Fix the shelves',2,'Shelves fixed. Time to stock up!'],
    ['Fix the front door',3,'The bell over the door still rings. Ding!'],
    ['Stock the shelves',3,'Huckleberry jam, flannel shirts, and penny candy.'],
    ['Hang the sign',4,'"TIMBERLINE MERCANTILE" — looking sharp!'],
    ['Grand reopening',4,'Neighbors drove in from all over the county!']]},
  {name:'Schoolhouse', e:'🏫', who:7, tasks:[
    ['Fix the bell tower',2,'Ms. Hart rang the bell for the first time in 40 years.'],
    ['New desks',3,'Built from Timberline fir, of course.'],
    ['Paint the chalkboard',3,'Ready for spelling bees!'],
    ['Build a playground',4,'A tire swing and a slide made from cedar.'],
    ['Plant a garden',4,'The kids will grow their own pumpkins.'],
    ['First day of school',5,"The kids made a thank-you card for you!"]]},
  {name:'Fire Lookout', e:'🗼', who:3, tasks:[
    ['Fix the trail',3,'The trail up the ridge is safe again.'],
    ['Repair the stairs',3,'All 112 steps, counted twice by Sheriff Dale.'],
    ['New windows',4,'You can see Mount Rainier from up here!'],
    ['Fix the radio',4,'"Lookout to Timberline, do you read?"'],
    ['Stock supplies',5,'Ready for fire season.'],
    ['Light the beacon',5,'The lookout keeps the whole valley safe.']]},
  {name:'Train Depot', e:'🚉', who:5, tasks:[
    ['Clear the tracks',3,'Old Pete still knows every rail by heart.'],
    ['Fix the platform',4,'Sturdy planks from the sawmill.'],
    ['Paint the station',4,'Forest green with gold trim.'],
    ['Fix the clock',5,'Right on time!'],
    ['Restore the old engine',5,'CHOO CHOO! Old No. 9 rolls again.'],
    ['Welcome visitors',6,'Tourists are coming to see Timberline!']]},
  {name:'Town Hall', e:'🏛️', who:0, tasks:[
    ['Repair the steps',4,'Grandma June cried happy tears.'],
    ['Hang the flags',4,'They wave proudly in the mountain breeze.'],
    ['Build the gazebo',5,'Perfect for summer music nights.'],
    ['Plant the square',5,'Rhododendrons, Washington\'s state flower.'],
    ['Carve the town sign',6,'"TIMBERLINE — Est. 1898"'],
    ['Timberline Day!',6,"The whole town is alive again. Grandpa Gus would be so proud of you."]]},
];
const DECOR = [
  {id:'flowers', e:'🌻', name:'Sunflowers', cost:150},
  {id:'bench', e:'🪑', name:'Porch Chair', cost:250},
  {id:'mailbox', e:'📮', name:'Mailbox', cost:300},
  {id:'tulips', e:'🌷', name:'Tulip Bed', cost:400},
  {id:'deer', e:'🦌', name:'Deer Statue', cost:600},
  {id:'well', e:'⛲', name:'Fountain', cost:900},
  {id:'pine', e:'🎄', name:'Lit Pine', cost:1200},
  {id:'bear', e:'🐻', name:'Bear Carving', cost:1600},
  {id:'canoe', e:'🛶', name:'Canoe Rack', cost:2200},
  {id:'eagle', e:'🦅', name:'Eagle Totem', gems:40},
  {id:'rainbow', e:'🌈', name:'Rainbow Arch', gems:80},
  {id:'arch', e:'🎪', name:'Festival Tent', event:true},
];
const DECOR_POS = [[8,62],[86,66],[20,78],[72,80],[4,46],[90,44],[34,84],[60,86],[14,90],[80,90],[46,70],[28,64]];

/* ---------- state ---------- */
function fresh(){
  const board = Array(N).fill(null), lock = Array(N).fill(false);
  for (let i=0;i<N;i++){ const r = Math.floor(i/COLS), c = i%COLS; if (r >= 5 || (r === 4 && (c < 2 || c > 4))) lock[i] = true; }
  board[COLS*2+3] = {g:'shed'}; board[COLS*2+1] = {k:'tools', l:1}; board[COLS*1+5] = {k:'wood', l:1}; board[COLS*3+5] = {k:'wood', l:1};
  return {v:1, board, lock, coins:100, gems:20, stars:0, energy:EMAX, eAt:Date.now(), xp:0, lvl:1, seq:{}, orders:[], oSeq:0,
    chapter:0, ctask:0, decor:[], disc:{'tools:1':1,'wood:1':1}, albumGot:{}, rbar:[], wagonAt:Date.now()+WAGON_MS, idleAt:Date.now(), tut:0, gens:{shed:1}, created:Date.now(), offerShown:{}, lastClose:0};
}
let S = C.load(KEY) || fresh();
const cfg = {
  key:KEY, title:'Timberline Merge', bundle:'com.brettjohnson.timberlinemerge', adsPerDay:12,
  icons:{coins:'🪙', gems:'💎', energy:'⚡', stars:'⭐', xp:'✨', item:'📦', decor:'🎪'},
  hudFor: g => { const k = Object.keys(g||{})[0]; return {coins:'#hcoin', gems:'#hgem', energy:'#hen', stars:'#hstar'}[k] || '#hlvl'; },
  grant(k, v){
    if (k === 'coins'){ S.coins += v; C.track('coinsEarned', v); }
    else if (k === 'gems') S.gems += v;
    else if (k === 'energy') S.energy += v;
    else if (k === 'stars') S.stars += v;
    else if (k === 'xp') addXP(v);
    else if (k === 'item') (Array.isArray(v)?v:[v]).forEach(x => S.rbar.push(x));
    else if (k === 'decor'){ if (!S.decor.includes(v)) S.decor.push(v); C.track('decor'); }
  },
  label: (k, v) => k === 'item' ? (Array.isArray(v)?v:[v]).map(x => /^\w+:\d$/.test(x) ? it(...(a=>[a[0],+a[1]])(x.split(':')))[0]+' '+it(...(a=>[a[0],+a[1]])(x.split(':')))[1] : '📦 '+x).join(' + ') : k === 'decor' ? '🎪 Festival Tent' : null,
  onChange: () => { renderHUD(); renderRbar(); },
  onTick: tick,
  daily:[{coins:100},{energy:40},{gems:10},{coins:300},{energy:80},{gems:20},{gems:50, energy:100, coins:500}],
  tasks:[
    {id:'m30', txt:'Merge 30 times', stat:'merges', n:30, give:{coins:150}},
    {id:'m60', txt:'Merge 60 times', stat:'merges', n:60, give:{gems:8}},
    {id:'o5', txt:'Finish 5 orders', stat:'orders', n:5, give:{energy:40}},
    {id:'o8', txt:'Finish 8 orders', stat:'orders', n:8, give:{gems:10}},
    {id:'t40', txt:'Tap generators 40 times', stat:'taps', n:40, give:{coins:200}},
    {id:'h4', txt:'Make 3 items of level 4+', stat:'hiMerge', n:3, give:{energy:50}},
    {id:'s4', txt:'Earn 4 stars', stat:'starsEarned', n:4, give:{gems:6}},
    {id:'b6', txt:'Clear 3 bramble patches', stat:'brambles', n:3, give:{coins:120}},
  ],
  taskBonus:{gems:15, energy:60},
  ach:[
    {id:'mg1', name:'First Merge', txt:'Merge two items', stat:'merges', n:1, give:{gems:5}},
    {id:'mg2', name:'Merge Maker', txt:'Merge 250 times', stat:'merges', n:250, give:{gems:20}},
    {id:'mg3', name:'Merge Master', txt:'Merge 2,500 times', stat:'merges', n:2500, give:{gems:60}},
    {id:'or1', name:'Good Neighbor', txt:'Finish 10 orders', stat:'orders', n:10, give:{gems:10}},
    {id:'or2', name:'Town Favorite', txt:'Finish 100 orders', stat:'orders', n:100, give:{gems:40}},
    {id:'or3', name:'Timberline Legend', txt:'Finish 1,000 orders', stat:'orders', n:1000, give:{gems:120}},
    {id:'tp', name:'Top Shelf', txt:'Make a level 8 item', stat:'maxItems', n:1, give:{gems:30}},
    {id:'ch1', name:'Sawmill Saved', txt:'Restore the Sawmill', stat:'chapters', n:1, give:{gems:25}},
    {id:'ch3', name:'Town Builder', txt:'Restore 3 buildings', stat:'chapters', n:3, give:{gems:50}},
    {id:'dc', name:'Decorator', txt:'Own 5 decorations', stat:'decor', n:5, give:{gems:20}},
    {id:'al', name:'Collector', txt:'Discover 24 items', stat:'discovered', n:24, give:{gems:30}},
    {id:'br', name:'Bramble Buster', txt:'Clear 20 bramble patches', stat:'brambles', n:20, give:{gems:15}},
    {id:'dy', name:'Regular', txt:'Claim 7 daily gifts', stat:'dailyClaims', n:7, give:{gems:25}},
  ],
  pass:{name:'Timberline Trail', paidName:'Gold Trail', per:20, paidPitch:'extra gems, energy and rare items every tier.',
    tier: i => ({free: i%5===0 ? {gems:10} : i%2 ? {coins:60+i*10} : {energy:20}, paid: i%5===0 ? {gems:30, item:'tools:5'} : i%3===0 ? {item:(i%2?'wood:':'food:')+Math.min(6,2+Math.floor(i/6))} : i%2 ? {gems:8} : {energy:50}})},
  event:{name:'Timber Days Festival', icon:'🍁', blurb:'Deliver orders this weekend to collect maple leaves.',
    ladder:[{need:5,give:{coins:150}},{need:15,give:{energy:40}},{need:30,give:{gems:10}},{need:50,give:{item:'tools:4'}},{need:75,give:{coins:600}},{need:105,give:{energy:100}},{need:140,give:{gems:25}},{need:180,give:{item:'food:6'}},{need:225,give:{gems:40}},{need:275,give:{decor:'arch', gems:50}}]},
  vault:{name:"Grandpa's Strongbox", icon:'🔐', cap:300, min:60, blurb:'Every order you finish drops 2 💎 into the Strongbox. Open it to keep them all!'},
  products:{
    starter:{name:'Timberline Starter Pack', icon:'🎁', price:'$2.99', once:true, tag:'BEST DEAL • 1 per player', desc:'1,000 🪙, 80 💎, 200 ⚡ and a Toolbox', give:{coins:1000, gems:80, energy:200, item:'tools:5'}},
    noads:{name:'Ad-Free Pass', icon:'🚫', price:'$2.99', once:true, desc:'Get every video bonus instantly, forever — no ads.', onBuy:()=>{ C.meta().noAds = true; }},
    pass:{name:'Gold Trail (this month)', icon:'✨', price:'$4.99', tag:'2X REWARDS', desc:'Unlock the gold row of the Timberline Trail', onBuy:()=>{ C.meta().pass.gold = true; }},
    vault:{name:"Grandpa's Strongbox", icon:'🔐', price:'$1.99', give:{gems:0}},
    energy:{name:'Energy Crate', icon:'⚡', price:'$0.99', give:{energy:150}},
    g1:{name:'Pouch of Gems', icon:'💎', price:'$0.99', give:{gems:80}},
    g2:{name:'Chest of Gems', icon:'💎', price:'$4.99', tag:'POPULAR', give:{gems:500}},
    g3:{name:'Vault of Gems', icon:'💎', price:'$9.99', tag:'BEST VALUE', give:{gems:1200}},
    b1:{name:'Lumberjack Bundle', icon:'🪓', price:'$4.99', give:{coins:3000, gems:150, energy:300}},
    b2:{name:'Builder Bundle', icon:'🏗️', price:'$9.99', tag:'MOST STUFF', give:{coins:8000, gems:400, energy:600, item:['tools:6','wood:6']}},
    eventpack:{name:'Timber Days Bundle', icon:'🍁', price:'$4.99', tag:'WEEKEND ONLY', desc:'200 💎, 250 ⚡, 1,500 🪙 + 30 🍁 — sold only during the festival, 1 per weekend', give:{gems:200, energy:250, coins:1500}, onBuy:()=>{ C.give(cfg.products.eventpack.give); C.meta().offers[C.meta().event.key] = 1; C.addEventTokens(30); }},
  },
  shop: () => [
    {title:'⭐ Special', items:[!C.owned('starter')?'starter':null, C.eventInfo().active && !C.meta().offers[C.meta().event.key]?'eventpack':null, !C.meta().pass.gold?'pass':null, !C.owned('noads')?'noads':null].filter(Boolean)},
    {title:'🆓 Free', items:['freeEnergy','freeCoins']},
    {title:'⚡ Energy', items:['energy','gemEnergy']},
    {title:'💎 Gems', items:['g1','g2','g3']},
    {title:'📦 Bundles', items:['b1','b2']},
  ],
};
cfg.products.freeEnergy = {name:'Free Energy', icon:'📺', price:'Watch', desc:'Watch a short video for +25 ⚡', free:()=>C.rewardAd('energy', ()=>{ C.give({energy:25}); C.toast('+25 ⚡'); })};
cfg.products.freeCoins = {name:'Trade Gems', icon:'🪙', price:'10 💎', desc:'Swap 10 💎 for 400 🪙', free:()=>{ if (S.gems < 10) return needGems(); S.gems -= 10; C.give({coins:400}); C.sfx('coin'); C.refreshModals(); }};
cfg.products.gemEnergy = {name:'Refill Energy', icon:'🔋', price:'15 💎', desc:'+100 ⚡ for 15 gems', free:()=>{ if (S.gems < 15) return needGems(); S.gems -= 15; C.give({energy:100}); C.sfx('coin'); C.refreshModals(); }};
C.bind(S, cfg);

/* ---------- helpers ---------- */
const it = (k, l) => CH[k].it[l-1];
const parseItem = s => { const [k, l] = s.split(':'); return {k, l:+l}; };
const itemName = o => o.g ? GEN[o.g].name : it(o.k, o.l)[1];
const itemEmoji = o => o.g ? GEN[o.g].e : it(o.k, o.l)[0];
const xpNeed = l => 20 + l*15;
const coinBoost = () => 1 + S.decor.length*0.02;
function needGems(){ C.toast('Not enough 💎'); C.openShop(); }
function cellEl(i){ return document.querySelector('.cell[data-i="'+i+'"]'); }

function addXP(v){
  S.xp += v; let ups = 0;
  while (S.xp >= xpNeed(S.lvl)){ S.xp -= xpNeed(S.lvl); S.lvl++; ups++; }
  if (ups) setTimeout(levelUp, 500);
}
function levelUp(){
  const g = {gems:5+S.lvl, energy:40, coins:50*S.lvl};
  const unlock = Object.keys(GEN).find(k => GEN[k].unlock === S.lvl && !S.gens[k]);
  if (unlock){ S.gens[unlock] = 1; S.rbar.push('gen:'+unlock); }
  C.sfx('level'); C.confetti(); C.haptic('heavy');
  C.modal({title:'Level Up!', dismiss:false, render:()=>h('div',{class:'center'}, h('div',{class:'lvlbig'}, S.lvl), unlock?h('p',null,'New generator unlocked: '+GEN[unlock].e+' '+GEN[unlock].name+'! Find it in your gift bar.'):h('p',null,'Timberline is growing!'), C.rewardChips(g)),
    buttons:[{t:'Collect!', cls:'g', fn:()=>{ C.give(g); C.vaultAdd(3); maybeStarter(); }}]});
}
function maybeStarter(){
  if (S.lvl >= 3 && !S.offerShown.starter && !C.owned('starter') && S.tut >= 99){ S.offerShown.starter = 1; setTimeout(()=>{
    const p = cfg.products.starter;
    C.modal({title:'🎁 Welcome Gift Offer', render:()=>h('div',{class:'center'}, h('p',null,'A one-time pack to help rebuild Timberline faster. Only one per player — it will stay in the Shop if you want it later.'), C.rewardChips(p.give), h('div',{class:'price'}, p.price)),
      buttons:[{t:'Maybe later'}, {t:'Get it '+p.price, cls:'g', fn:()=>C.buy('starter')}]});
  }, 800); }
}

/* ---------- energy / wagon / idle ---------- */
function regen(){
  const now = Date.now();
  if (S.energy >= EMAX){ S.eAt = now; return; }
  const n = Math.floor((now - S.eAt)/EREGEN);
  if (n > 0){ S.energy = Math.min(EMAX, S.energy + n); S.eAt += n*EREGEN; if (S.energy >= EMAX) S.eAt = now; }
}
const idleRate = () => S.chapter*30; // coins per hour once buildings are restored
function idlePending(){ return Math.floor(Math.min(8*3600e3, Date.now()-S.idleAt)/3600e3*idleRate()); }
function tick(){
  regen(); renderHUD();
  const w = S.wagonAt - Date.now(), wt = $('#wgt');
  if (wt) wt.textContent = w <= 0 ? 'Ready!' : C.fmtTime(w);
  $('#wagonbtn').classList.toggle('dot', w <= 0);
  if (Math.random() < 0.1) C.save();
}

/* ---------- board ---------- */
function emptyCells(from){
  const out = [];
  for (let i=0;i<N;i++) if (!S.board[i] && !S.lock[i]) out.push(i);
  if (from != null){ const fr = Math.floor(from/COLS), fc = from%COLS; out.sort((a,b)=>(Math.abs(Math.floor(a/COLS)-fr)+Math.abs(a%COLS-fc)) - (Math.abs(Math.floor(b/COLS)-fr)+Math.abs(b%COLS-fc))); }
  return out;
}
let sel = -1;
function wanted(){ const w = {}; for (const o of S.orders) for (const n of o.need) w[n] = 1; return w; }
function renderBoard(pop){
  const b = $('#board'); b.innerHTML = ''; const w = wanted();
  const selO = sel >= 0 ? S.board[sel] : null;
  for (let i=0;i<N;i++){
    const o = S.board[i];
    const cls = ['cell'];
    if (S.lock[i]) cls.push('lock');
    if (o && o.g) cls.push('gen');
    if (i === sel) cls.push('sel');
    else if (selO && o && !o.g && selO.k === o.k && selO.l === o.l && o.l < MAXL) cls.push('match');
    if (o && !o.g && w[o.k+':'+o.l]) cls.push('want');
    if (pop && pop.includes(i)) cls.push('pop');
    const c = h('div',{class:cls.join(' '), 'data-i':i}, o ? h('span',{class:'it'}, itemEmoji(o)) : null, o && !o.g ? h('span',{class:'lv'}, o.l) : null);
    b.append(c);
  }
  renderInfo(); renderOrders();
}
function renderInfo(){
  const o = sel >= 0 ? S.board[sel] : null, el = $('#info'); el.innerHTML = '';
  if (!o){ el.append(h('div',{class:'grow small'}, '💡 Drag matching items together to merge them. Tap a generator to make items.')); return; }
  if (o.g){ el.append(h('div',{class:'grow'}, GEN[o.g].e+' '+GEN[o.g].name+' — tap to make '+GEN[o.g].makes.map(k=>CH[k].name).join(' & ')+' (1 ⚡)')); return; }
  const nx = o.l < MAXL ? it(o.k, o.l+1) : null;
  el.append(h('div',{class:'grow'}, itemEmoji(o)+' '+itemName(o)+' · Lv '+o.l+(nx?' → merge 2 for '+nx[0]+' '+nx[1]:' · MAX!')),
    h('button',{class:'btn s', onclick:()=>sellSel()}, 'Sell 🪙'+sellValue(o)));
}
const sellValue = o => Math.max(1, Math.round(Math.pow(2, o.l-1)));
function sellSel(){
  const o = S.board[sel]; if (!o || o.g) return;
  const doIt = () => { const at = C.center(cellEl(sel)); S.board[sel] = null; S.coins += sellValue(o); C.floatText(at.x, at.y, '+'+sellValue(o)+' 🪙', '#ffd34d'); C.sfx('coin'); C.track('sold'); sel = -1; renderBoard(); renderHUD(); C.saveSoon(); };
  if (o.l >= 5) C.modal({title:'Sell '+itemName(o)+'?', body:'You will get '+sellValue(o)+' 🪙.', buttons:[{t:'Keep'},{t:'Sell', fn:doIt}]}); else doIt();
}

function tapGen(i){
  const o = S.board[i]; regen();
  if (S.energy < 1){ outOfEnergy(); return; }
  const spots = emptyCells(i);
  if (!spots.length){ C.toast('Board is full! Merge or sell items.'); C.sfx('err'); C.shake($('#board')); return; }
  const g = GEN[o.g]; S.seq[o.g] = (S.seq[o.g]||0) + 1; const n = S.seq[o.g];
  const k = g.makes[(n-1) % g.makes.length], l = n % 6 === 0 ? 2 : 1;   // fixed pattern: every 6th tap is a bonus level-2 item
  if (S.energy >= EMAX) S.eAt = Date.now();
  S.energy--; const to = spots[0]; S.board[to] = {k, l}; discover(k, l);
  C.track('taps'); C.sfx('spawn', l); C.haptic('light');
  const a = C.center(cellEl(i)); renderBoard([to]);
  const b = C.center(cellEl(to)); C.burst(b.x, b.y, {n:6, speed:2, size:5, life:.5});
  C.floatText(a.x, a.y-10, '-1 ⚡', '#ffe066');
  if (S.tut === 1 && countItem('tools',1) >= 2) tutStep(2);
  if (S.energy === 0) setTimeout(outOfEnergy, 400);
  renderHUD(); C.saveSoon();
}
function countItem(k, l){ return S.board.filter(o => o && !o.g && o.k === k && o.l === l).length; }
function discover(k, l){
  const id = k+':'+l; if (S.disc[id]) return; S.disc[id] = 1; C.track('discovered');
  if (l > 1){ C.toast('📖 New discovery: '+it(k,l)[0]+' '+it(k,l)[1]+'! +1 💎'); S.gems += 1; }
}
function neighbors(i){ const r = Math.floor(i/COLS), c = i%COLS, o = []; if (r>0) o.push(i-COLS); if (r<ROWS-1) o.push(i+COLS); if (c>0) o.push(i-1); if (c<COLS-1) o.push(i+1); return o; }
function merge(from, to){
  const a = S.board[from], b = S.board[to]; const l = a.l + 1;
  S.board[from] = null; S.board[to] = {k:a.k, l}; discover(a.k, l);
  C.track('merges'); if (l >= 4) C.track('hiMerge'); if (l === MAXL) C.track('maxItems');
  C.addPassXP(l >= 5 ? 1 : 0);
  let cleared = 0;
  for (const nb of neighbors(to)) if (S.lock[nb]){ S.lock[nb] = false; cleared++; }
  sel = to; renderBoard([to]);
  const p = C.center(cellEl(to));
  C.sfx('merge', l); C.haptic(l >= 5 ? 'med' : 'light');
  C.burst(p.x, p.y, {n:10+l*3, speed:2.5+l*.4, size:6+l});
  if (l >= 6){ C.floatText(p.x, p.y-20, ['','','','','','Wow!','Amazing!','LEGENDARY!'][l-1], '#ffd34d'); }
  if (cleared){ C.track('brambles', cleared); S.coins += cleared*3; C.floatText(p.x, p.y+10, '+'+cleared*3+' 🪙 brambles cleared!', '#b8f5a0'); C.burst(p.x, p.y, {n:12, emoji:'🍃', star:false, size:14, speed:4}); }
  if (S.tut === 2) tutStep(3);
  renderHUD(); C.saveSoon();
}

/* drag & tap */
let drag = null;
function onDown(e){
  const c = e.target.closest('.cell'); if (!c) return; const i = +c.dataset.i;
  if (S.lock[i]){ C.toast('🌿 Merge items next to brambles to clear them!'); C.sfx('err'); return; }
  const o = S.board[i];
  drag = {i, x:e.clientX, y:e.clientY, moved:false, has:!!o};
  if (o) try { c.setPointerCapture(e.pointerId); } catch(_){}
}
function onMove(e){
  if (!drag || !drag.has) return;
  if (!drag.moved && Math.hypot(e.clientX-drag.x, e.clientY-drag.y) > 8){
    drag.moved = true; const g = h('div',{id:'ghost'}, itemEmoji(S.board[drag.i])); document.body.append(g); cellEl(drag.i).classList.add('drag'); C.sfx('pick');
    sel = drag.i; document.querySelectorAll('.cell').forEach(c => { const o = S.board[+c.dataset.i], s = S.board[sel]; c.classList.toggle('match', !!(o && s && !o.g && !s.g && +c.dataset.i !== sel && o.k===s.k && o.l===s.l && o.l<MAXL)); });
  }
  if (drag.moved){ const g = $('#ghost'); g.style.left = e.clientX+'px'; g.style.top = e.clientY+'px'; }
}
function onUp(e){
  if (!drag) return; const d = drag; drag = null; const g = $('#ghost'); if (g) g.remove();
  if (!d.moved){ tapCell(d.i); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest('.cell');
  if (!c){ renderBoard(); return; }
  dropOn(d.i, +c.dataset.i);
}
function dropOn(from, to){
  if (from === to || S.lock[to]){ renderBoard(); return; }
  const a = S.board[from], b = S.board[to];
  if (b && !a.g && !b.g && a.k === b.k && a.l === b.l && a.l < MAXL) return merge(from, to);
  if (b && !a.g && !b.g && a.k === b.k && a.l === b.l && a.l >= MAXL) C.toast('That item is already at max level!');
  S.board[to] = a; S.board[from] = b || null; sel = to; C.sfx('drop'); renderBoard([to]); C.saveSoon();
}
function tapCell(i){
  const o = S.board[i];
  if (sel >= 0 && sel !== i && S.board[sel] && !S.board[sel].g){
    const s = S.board[sel];
    if (o && !o.g && s.k === o.k && s.l === o.l && o.l < MAXL) return merge(sel, i);
    if (!o){ return dropOn(sel, i); }
  }
  if (o && o.g){ sel = i; tapGen(i); return; }
  sel = o ? i : -1; if (o) C.sfx('tap'); renderBoard();
}

/* ---------- orders ---------- */
function unlockedChains(){ const out = []; for (const g in GEN) if (S.gens[g] && S.board.some(o => o && o.g === g)) out.push(...GEN[g].makes); return out.length ? out : ['tools','wood']; }
function newOrder(){
  S.oSeq++;
  if (S.oSeq === 1) return {id:S.oSeq, who:0, need:['tools:2']};
  if (S.oSeq === 2) return {id:S.oSeq, who:1, need:['wood:2']};
  const ch = unlockedChains(), maxL = Math.min(7, 2 + Math.floor(S.lvl/1.5));
  const cnt = S.lvl >= 4 && S.oSeq % 3 === 0 ? 2 : 1, need = [];
  for (let j=0;j<cnt;j++){ const k = ch[Math.floor(Math.random()*ch.length)]; const l = Math.max(1, maxL - Math.floor(Math.random()*Math.random()*maxL)); need.push(k+':'+Math.max(2,l)); }
  return {id:S.oSeq, who:Math.floor(Math.random()*FOLK.length), need};
}
function orderReward(o){
  let v = 0, st = 0; for (const n of o.need){ const {l} = parseItem(n); v += Math.pow(2, l)*4; st += l >= 5 ? 2 : 1; }
  return {coins:Math.round(v*coinBoost()), stars:st, xp:Math.round(v/3)+2};
}
function haveFor(o){
  const used = {}, have = [];
  for (const n of o.need){ const {k, l} = parseItem(n); let found = -1;
    for (let i=0;i<N;i++){ const b = S.board[i]; if (b && !b.g && b.k === k && b.l === l && !used[i]){ found = i; break; } }
    if (found >= 0) used[found] = 1; have.push(found); }
  return have;
}
function fillOrders(){ const max = S.lvl >= 6 ? 4 : 3; while (S.orders.length < max) S.orders.push(newOrder()); }
function renderOrders(){
  fillOrders(); const el = $('#orders'); el.innerHTML = '';
  for (const o of S.orders){
    const have = haveFor(o), ready = have.every(x => x >= 0), missing = have.filter(x => x < 0).length;
    const close = !ready && o.need.length > 1 && missing === 1;
    const r = orderReward(o), f = FOLK[o.who];
    el.append(h('div',{class:'ord'+(ready?' ready':'')+(close?' close':''), 'data-o':o.id},
      h('div',{class:'who'}, h('span',null,f[0]), f[1]),
      h('div',{class:'need'}, o.need.map((n,j)=>{ const {k,l} = parseItem(n); return h('div',{class:'ni'+(have[j]>=0?' have':''), onclick:()=>hint(k,l)}, it(k,l)[0]); })),
      h('div',{class:'rw'}, '🪙'+r.coins+' ⭐'+r.stars+(C.eventInfo().active?' 🍁'+(o.need.length+1):'')),
      ready ? h('button',{class:'btn s g', onclick:e=>deliver(o, e.target)}, 'Deliver') : null));
  }
}
function hint(k, l){
  const path = CH[k].it.slice(0, l).map(x=>x[0]).join('→');
  C.toast(it(k,l)[1]+': '+path+' (from '+GEN[CH[k].gen].e+' '+GEN[CH[k].gen].name+')', 2600);
}
function deliver(o, btn){
  const have = haveFor(o); if (!have.every(x => x >= 0)) return;
  const card = btn.closest('.ord'), dst = C.center(card);
  for (const i of have){ const p = C.center(cellEl(i)); C.flyTo(p, card, itemEmoji(S.board[i]), 1); S.board[i] = null; }
  if (have.includes(sel)) sel = -1;
  const r = orderReward(o);
  C.track('orders'); C.track('starsEarned', r.stars); C.addPassXP(4 + o.need.length*2); C.vaultAdd(2);
  C.addEventTokens(o.need.length+1, card);
  C.sfx('win'); C.haptic('med'); C.burst(dst.x, dst.y, {n:30, speed:5, size:9});
  setTimeout(()=>{ C.flyTo(dst, '#hcoin', '🪙', 6); C.flyTo(dst, '#hstar', '⭐', Math.min(4, r.stars)); C.give(r); }, 250);
  card.classList.add('out');
  setTimeout(()=>{ S.orders = S.orders.filter(x => x !== o); renderBoard(); C.saveSoon(); }, 380);
  if (S.tut === 3) setTimeout(()=>tutStep(4), 900);
}

/* ---------- "so close" / energy offers ---------- */
function outOfEnergy(){
  if (C.modalOpen()) return;
  const close = S.orders.some(o => { const hv = haveFor(o); return hv.filter(x=>x<0).length === 1 && hv.length > 1; }) || S.orders.some(o => o.need.length === 1 && S.board.some(b => b && !b.g && o.need[0] === b.k+':'+(b.l+1)));
  const next = EREGEN - (Date.now() - S.eAt);
  C.modal({title: close ? '⚡ So close!' : '⚡ Out of energy', live:true, render:()=>h('div',{class:'center'},
    h('p',null, close ? 'You are one item away from finishing an order! Grab some energy to finish it.' : 'Energy refills by itself — 1 ⚡ every minute.'),
    h('p',{class:'small'}, S.energy >= EMAX ? 'Full!' : '+1 ⚡ in '+C.fmtTime(EREGEN - (Date.now() - S.eAt))),
    h('div',{class:'row'}, h('div',{class:'grow'}, '📺 Watch a video: +25 ⚡'), h('button',{class:'btn s b', onclick:()=>{ C.closeModal(); C.rewardAd('energy', ()=>{ C.give({energy:25}); C.toast('+25 ⚡'); }); }}, 'Watch')),
    h('div',{class:'row'}, h('div',{class:'grow'}, '🔋 Refill +100 ⚡'), h('button',{class:'btn s', onclick:()=>{ if (S.gems < 15) return needGems(); S.gems -= 15; C.give({energy:100}); C.closeModal(); C.sfx('coin'); }}, '15 💎')),
    h('div',{class:'row'}, h('div',{class:'grow'}, '⚡ Energy Crate +150 ⚡'), h('button',{class:'btn s g', onclick:()=>{ C.closeModal(); C.buy('energy'); }}, '$0.99'))),
    buttons:[{t:'I\'ll wait'}]});
}

/* ---------- reward (gift) bar ---------- */
function renderRbar(){
  const el = $('#rbar'); el.innerHTML = ''; el.classList.toggle('on', S.rbar.length > 0);
  if (!S.rbar.length) return;
  el.append(h('span',{class:'small'}, '🎁 Gifts:'));
  S.rbar.slice(0, 6).forEach((x, j) => el.append(h('div',{class:'ri', onclick:()=>placeGift(j)}, x.startsWith('gen:') ? GEN[x.slice(4)].e : itemEmoji(parseItem(x)))));
  if (S.rbar.length > 6) el.append(h('span',{class:'small'}, '+'+(S.rbar.length-6)));
  el.append(h('span',{class:'small grow', style:'text-align:right'}, 'Tap to place'));
}
function placeGift(j){
  const x = S.rbar[j], spot = emptyCells(Math.floor(N/2))[0];
  if (spot == null){ C.toast('Board is full! Merge or sell items first.'); C.sfx('err'); return; }
  S.rbar.splice(j, 1);
  if (x.startsWith('gen:')) S.board[spot] = {g:x.slice(4)}; else { const p = parseItem(x); S.board[spot] = p; discover(p.k, p.l); }
  C.sfx('spawn', 3); renderBoard([spot]); renderRbar(); const c = C.center(cellEl(spot)); C.burst(c.x, c.y, {n:14}); C.saveSoon();
}

/* ---------- wagon (timed free delivery + speed-up) ---------- */
function openWagon(){
  C.modal({title:'🛻 Supply Wagon', live:true, render:()=>{
    const w = S.wagonAt - Date.now();
    if (w <= 0) return h('div',{class:'center'}, h('p',null,'Uncle Walt\'s wagon is here with free supplies!'), C.rewardChips({coins:60, energy:10, item:'3 items'}),
      h('button',{class:'btn g', onclick:e=>{ collectWagon(e.target); C.closeModal(); }}, 'Unload!'));
    const cost = Math.max(2, Math.ceil(w/60e3/2));
    return h('div',{class:'center'}, h('p',null,'The wagon brings free supplies every 15 minutes, even while you\'re away.'), h('p',null,'Arrives in '+C.fmtTime(w)),
      h('div',{class:'row'}, h('div',{class:'grow'},'📺 Watch a video to bring it now'), h('button',{class:'btn s b', onclick:()=>{ C.closeModal(); C.rewardAd('wagon', ()=>{ S.wagonAt = Date.now(); openWagon(); }); }}, 'Watch')),
      h('div',{class:'row'}, h('div',{class:'grow'},'⏩ Hurry it up'), h('button',{class:'btn s', onclick:()=>{ if (S.gems < cost) return needGems(); S.gems -= cost; S.wagonAt = Date.now(); C.sfx('coin'); C.refreshModals(); }}, cost+' 💎')));
  }});
}
function collectWagon(btn){
  const ch = unlockedChains(), items = [ch[0]+':2', ch[1 % ch.length]+':1', ch[2 % ch.length]+':2'];
  S.wagonAt = Date.now() + WAGON_MS; C.track('wagons');
  C.flyTo(btn, '#hcoin', '🪙', 5); C.give({coins:60, energy:10, item:items}); C.sfx('win'); C.saveSoon();
}

/* ---------- town ---------- */
function renderTown(){
  const t = $('#town'); t.innerHTML = '';
  const done = S.chapter >= CHAPTERS.length, ch = CHAPTERS[Math.min(S.chapter, CHAPTERS.length-1)];
  const prog = done ? 1 : S.ctask / ch.tasks.length;
  const scene = h('div',{class:'scene'}, h('div',{class:'ttl'}, done ? 'Timberline is restored!' : 'Chapter '+(S.chapter+1)+': '+ch.name),
    h('div',{class:'mtn', style:'left:4%'}, '⛰️'), h('div',{class:'mtn', style:'right:6%;font-size:90px'}, '🏔️'), h('div',{class:'mtn', style:'left:36%;font-size:50px;bottom:47%'}, '🌲'),
    h('div',{class:'bld', style:`filter:grayscale(${1-prog}) brightness(${.6+.4*prog});transform:translateX(-50%) scale(${.75+.25*prog})`}, prog < .34 && !done ? '🏚️' : ch.e),
    CHAPTERS.slice(0, S.chapter).map((c, i) => h('div',{class:'dec', style:`left:${[3,85,12,76,40,62][i]}%;bottom:${[24,22,10,8,6,14][i]}%;font-size:40px`}, c.e)),
    S.decor.map((d, i) => { const D = DECOR.find(x => x.id === d); const p = DECOR_POS[i % DECOR_POS.length]; return D ? h('div',{class:'dec', style:`left:${p[0]}%;top:${p[1]}%`}, D.e) : null; }),
    prog >= 1 || done ? [h('div',{class:'sp', style:'left:30%;top:40%'},'✨'), h('div',{class:'sp', style:'left:66%;top:35%;animation-delay:.5s'},'✨')] : null);
  t.append(scene);
  if (!done){
    t.append(h('div',{class:'tsec'}, h('h3',null, '🔨 Fix up: '+ch.name+' ('+S.ctask+'/'+ch.tasks.length+')'), C.bar(prog),
      ch.tasks.map((tk, j) => j < S.ctask ? h('div',{class:'row dim'}, h('div',{class:'grow'}, tk[0]), h('span',{class:'tick'},'✔')) :
        j === S.ctask ? h('div',{class:'row'}, h('div',{class:'grow'}, h('b',null, tk[0])), h('button',{class:'btn s '+(S.stars >= tk[1]?'g':''), id:'restoreBtn', onclick:e=>restore(e.target)}, '⭐ '+tk[1])) :
        h('div',{class:'row dim'}, h('div',{class:'grow'}, '🔒 '+tk[0]), h('span',null,'⭐ '+tk[1])))));
  } else t.append(h('div',{class:'tsec center'}, h('h3',null,'🎉 Every building is restored!'), h('p',{class:'small'},'More chapters are coming in a future update. Keep finishing orders, decorating, and playing the weekend festival!')));
  if (S.chapter > 0){
    const pend = idlePending();
    t.append(h('div',{class:'tsec'}, h('h3',null,'🏭 Town income'), h('div',{class:'row'}, h('div',{class:'grow'}, 'Your restored buildings earn '+idleRate()+' 🪙/hour (up to 8 hours).', h('div',{class:'small'}, 'Ready: '+pend+' 🪙')),
      h('button',{class:'btn s g', disabled:pend>0?null:'', onclick:e=>{ C.flyTo(e.target, '#hcoin', '🪙', 6); C.give({coins:pend}); S.idleAt = Date.now(); renderTown(); }}, 'Collect'))));
  }
  t.append(h('div',{class:'tsec'}, h('h3',null,'🌻 Decorations ('+S.decor.length+') — each adds +2% order coins'),
    DECOR.map(d => { const own = S.decor.includes(d.id);
      return h('div',{class:'row'+(own?' dim':'')}, h('div',{class:'ach'}, d.e), h('div',{class:'grow'}, d.name, d.event?h('div',{class:'small'},'Weekend festival prize'):null),
        own ? h('span',{class:'tick'},'✔') : d.event ? h('span',{class:'small'},'🍁 Event') :
        h('button',{class:'btn s', onclick:()=>buyDecor(d)}, d.gems ? d.gems+' 💎' : d.cost+' 🪙')); })));
}
function buyDecor(d){
  if (d.gems){ if (S.gems < d.gems) return needGems(); S.gems -= d.gems; }
  else { if (S.coins < d.cost){ C.toast('Not enough 🪙 — finish more orders!'); C.sfx('err'); return; } S.coins -= d.cost; }
  S.decor.push(d.id); C.track('decor'); C.sfx('win'); C.confetti(); renderTown(); renderHUD(); C.saveSoon();
}
function restore(btn){
  const ch = CHAPTERS[S.chapter], tk = ch.tasks[S.ctask];
  if (S.stars < tk[1]){ C.toast('Need '+tk[1]+' ⭐ — finish orders on the merge board to earn stars!'); C.sfx('err'); C.shake(btn); return; }
  S.stars -= tk[1]; S.ctask++; C.track('restores'); C.addPassXP(3);
  const c = C.center(btn); C.burst(c.x, c.y, {n:30, speed:5}); C.sfx('big'); C.haptic('med');
  const f = FOLK[ch.who], g = {coins:40*(S.chapter+1), xp:10*(S.chapter+1)};
  const chapterDone = S.ctask >= ch.tasks.length;
  if (chapterDone){ S.chapter++; S.ctask = 0; S.idleAt = Date.now(); C.track('chapters'); }
  C.modal({title:tk[0]+' ✔', dismiss:false, render:()=>h('div',null, h('div',{class:'story'}, h('div',{class:'av'}, f[0]), h('div',{class:'sb2'}, h('b',null, f[1]+': '), tk[2])), h('div',{style:'margin-top:10px'}, C.rewardChips(g))),
    buttons:[{t:'Yay!', cls:'g', fn:()=>{ C.give(g); if (chapterDone) finishChapter(ch); else renderTown(); if (S.tut === 5) tutStep(99); }}]});
  renderHUD(); C.saveSoon();
}
function finishChapter(ch){
  const g = {gems:30, coins:500, energy:50};
  renderTown();
  C.sfx('level'); C.confetti(); setTimeout(C.confetti, 600);
  C.modal({title:'🎉 '+ch.name+' restored!', dismiss:false, render:()=>h('div',{class:'center'}, h('div',{class:'vaultbig'}, ch.e), h('p',null, 'It now earns '+idleRate()+' 🪙 per hour for the town — even while you\'re away!'), C.rewardChips(g)),
    buttons:[{t:'Celebrate!', cls:'g', fn:()=>C.give(g)}]});
}

/* ---------- album ---------- */
function openAlbum(){
  C.modal({title:'📖 Timberline Album', render:()=>h('div',null, h('p',{class:'small center'},'Discover every item. Finish a page for 25 💎!'),
    Object.keys(CH).map(k => { const got = CH[k].it.filter((_,j)=>S.disc[k+':'+(j+1)]).length, full = got === MAXL, claimed = S.albumGot[k];
      return h('div',{class:'tsec'}, h('div',{class:'row', style:'background:none;margin:0'}, h('b',{class:'grow'}, CH[k].name+' ('+got+'/'+MAXL+')'),
          claimed ? h('span',{class:'tick'},'✔ 25 💎') : h('button',{class:'btn s '+(full?'g':''), disabled:full?null:'', onclick:e=>{ S.albumGot[k] = 1; C.flyTo(e.target, '#hgem', '💎', 6); C.give({gems:25}); C.track('albumPages'); C.refreshModals(); }}, '25 💎')),
        h('div',{class:'album'}, CH[k].it.map((x,j) => S.disc[k+':'+(j+1)] ? h('div',{class:'alb'}, x[0], h('small',null, x[1])) : h('div',{class:'alb'}, h('span',{style:'filter:brightness(0) opacity(.35)'}, x[0]), h('small',null,'???')))));
    }))});
}

/* ---------- HUD ---------- */
function renderHUD(){
  $('#lvn').textContent = S.lvl; $('#xpf').style.width = Math.min(100, S.xp/xpNeed(S.lvl)*100)+'%';
  $('#env').textContent = Math.floor(S.energy); $('#cnv').textContent = C.fmt(S.coins); $('#gmv').textContent = C.fmt(S.gems); $('#stv').textContent = S.stars;
  $('#ent').textContent = S.energy < EMAX ? C.fmtTime(EREGEN - (Date.now() - S.eAt)) : '';
  const cost = S.chapter < CHAPTERS.length ? CHAPTERS[S.chapter].tasks[S.ctask][1] : Infinity;
  const rb = $('#restoreBtn'); if (rb) rb.classList.toggle('g', S.stars >= cost);
  $('#navTown').classList.toggle('dot', S.stars >= cost);
  C.updateBadges();
}
function layout(){
  const w = $('#boardWrap'); if (!w.clientHeight) return;
  const cs = Math.floor(Math.min((w.clientWidth-10-6*3)/COLS, (w.clientHeight-14-(ROWS-1)*3)/ROWS));
  document.documentElement.style.setProperty('--cs', Math.max(28, Math.min(64, cs))+'px');
}
function show(scr){
  $('#scrBoard').classList.toggle('on', scr === 'board'); $('#scrTown').classList.toggle('on', scr === 'town');
  $('#navBoard').classList.toggle('on', scr === 'board'); $('#navTown').classList.toggle('on', scr === 'town');
  if (scr === 'town'){ renderTown(); if (S.tut === 4) tutStep(5); } else { layout(); renderBoard(); }
}

/* ---------- tutorial ---------- */
function tutStep(n){
  S.tut = n; C.saveSoon();
  if (n === 1) C.coach(() => document.querySelector('.cell.gen'), 'Tap the Tool Shed to make a Bolt. Each tap uses 1 ⚡ energy.');
  else if (n === 2) C.coach(() => { const cs = [...document.querySelectorAll('.cell')].filter(c => { const o = S.board[+c.dataset.i]; return o && o.k === 'tools' && o.l === 1; }); return cs[0]; }, 'Two Bolts! Drag one onto the other to MERGE them into a Hammer.');
  else if (n === 3) C.coach(() => document.querySelector('.ord.ready .btn') || document.querySelector('.ord'), 'Grandma June needs a Hammer. Tap Deliver!');
  else if (n === 4) C.coach(() => $('#navTown'), 'You earned a ⭐ star! Stars fix up the town. Tap Town.');
  else if (n === 5) C.coach(() => $('#restoreBtn'), 'Spend your star to start fixing Grandpa\'s old sawmill!');
  else { C.coachOff(); if (n === 99){ C.toast('🌲 You\'re a natural! Keep merging to rebuild Timberline.', 3000); C.give({energy:20, gems:10}); } }
}
function intro(){
  C.modal({title:'🌲 Welcome to Timberline', dismiss:false, render:()=>h('div',null,
    h('div',{class:'story'}, h('div',{class:'av'},'👵'), h('div',{class:'sb2'}, h('b',null,'Grandma June: '), 'Welcome home, sweetheart! Grandpa Gus left you his old logging town up here in the Cascades. It\'s gotten awful run-down... but I just know you can bring Timberline back to life!')),
    h('p',{class:'small center'}, 'Merge tools and supplies, fill the neighbors\' orders, and use your stars to rebuild the town.')),
    buttons:[{t:'Let\'s do it!', cls:'g', fn:()=>tutStep(1)}]});
}

/* ---------- offline progress ---------- */
function welcomeBack(){
  const away = Date.now() - (S.savedAt || Date.now());
  if (away < 120e3 || S.tut < 99) return false;
  const eg = Math.floor(S.energy - E_AT_LOAD);
  const wagon = S.wagonAt <= Date.now(), idle = idlePending();
  if (!eg && !wagon && !idle) return false;
  C.modal({title:'👋 Welcome back!', render:()=>h('div',{class:'center'}, h('p',null,'While you were away ('+C.fmtTime(away)+'):'),
    h('div',{class:'chips'}, eg?h('span',{class:'chip'},'⚡ +'+eg+' energy'):null, wagon?h('span',{class:'chip'},'🛻 Wagon arrived'):null, idle?h('span',{class:'chip'},'🏭 '+idle+' 🪙 earned'):null)),
    buttons:[{t:'Collect', cls:'g', fn:()=>{ if (idle){ C.give({coins:idle}); S.idleAt = Date.now(); } if (wagon) collectWagon($('#wagonbtn')); }}]});
  return true;
}

/* ---------- wire up ---------- */
const B = $('#board');
B.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', () => { drag = null; const g = $('#ghost'); if (g) g.remove(); renderBoard(); });
$('#navBoard').onclick = () => show('board'); $('#navTown').onclick = () => show('town'); $('#navShop').onclick = () => C.openShop();
$('#dailybtn').onclick = C.openDaily; $('#taskbtn').onclick = C.openTasks; $('#passbtn').onclick = C.openPass; $('#evbtn').onclick = C.openEvent;
$('#vaultbtn').onclick = C.openVault; $('#achbtn').onclick = C.openAch; $('#albumbtn').onclick = openAlbum; $('#wagonbtn').onclick = openWagon;
$('#hen').onclick = outOfEnergy; $('#hgem').onclick = () => C.openShop(); $('#hcoin').onclick = () => C.openShop();
$('#hstar').onclick = () => show('town'); $('#hlvl').onclick = () => C.toast('Level '+S.lvl+' — '+S.xp+'/'+xpNeed(S.lvl)+' ✨ to next level');
$('#setbtn').onclick = () => C.openSettings();
window.addEventListener('resize', () => { layout(); });

const E_AT_LOAD = S.energy; regen(); layout(); renderBoard(); renderRbar(); renderHUD(); tick();
if (S.tut === 0) intro();
else if (S.tut < 99) tutStep(S.tut);
else if (!welcomeBack() && C.dailyReady()) setTimeout(C.openDaily, 500);
C.save();

window.__game = {S:()=>S, merge, tapGen, deliver, tutStep, show, outOfEnergy, openAlbum, openWagon, renderBoard, levelUp, haveFor, finishChapter, restore};
})();
