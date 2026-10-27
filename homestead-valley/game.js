/* Homestead Valley — cozy Washington farm & ranch game. */
(function(){
'use strict';
const C = Core, h = C.h, $ = C.$;
const KEY = 'homestead-valley-v1';
const SEC = 1000;

/* ---------- content ---------- */
const G = {
  wheat:{e:'🌾',n:'Wheat',v:2}, corn:{e:'🌽',n:'Corn',v:4}, carrot:{e:'🥕',n:'Carrots',v:6}, berry:{e:'🍓',n:'Strawberries',v:9}, pumpkin:{e:'🎃',n:'Pumpkin',v:15},
  egg:{e:'🥚',n:'Eggs',v:8}, milk:{e:'🥛',n:'Milk',v:14}, wool:{e:'🧶',n:'Wool',v:20},
  wood:{e:'🪵',n:'Firewood',v:5}, feed:{e:'🥣',n:'Animal Feed',v:2},
  bread:{e:'🍞',n:'Bread',v:22}, chair:{e:'🪑',n:'Rocking Chair',v:40}, butter:{e:'🧈',n:'Butter',v:34}, jam:{e:'🫙',n:'Berry Jam',v:36},
  cake:{e:'🍰',n:'Carrot Cake',v:58}, cheese:{e:'🧀',n:'Cheese',v:50}, scarf:{e:'🧣',n:'Wool Scarf',v:55}, pie:{e:'🥧',n:'Pumpkin Pie',v:72}, soup:{e:'🍲',n:'Harvest Soup',v:80},
};
const CROPS = {wheat:{t:20, cost:1, lvl:1}, corn:{t:60, cost:2, lvl:2}, carrot:{t:120, cost:3, lvl:3}, berry:{t:240, cost:5, lvl:5}, pumpkin:{t:480, cost:8, lvl:7}};
const ANIM = {
  chicken:{e:'🐔', name:'Chicken Coop', good:'egg', t:60, lvl:1, build:0, buy:60},
  cow:{e:'🐄', name:'Cow Pasture', good:'milk', t:180, lvl:4, build:400, buy:200},
  sheep:{e:'🐑', name:'Sheep Meadow', good:'wool', t:300, lvl:6, build:900, buy:350},
};
const SHOPS = {
  mill:{e:'🏭', name:'Feed Mill', lvl:1, build:0, rec:[{out:'feed', n:3, in:{wheat:2}, t:30}]},
  bakery:{e:'🥖', name:'Bakery', lvl:3, build:250, rec:[{out:'bread', n:1, in:{wheat:3, wood:1}, t:90}, {out:'cake', n:1, in:{carrot:2, egg:2, wheat:1}, t:180, lvl:5}, {out:'pie', n:1, in:{pumpkin:1, egg:1, wheat:2}, t:300, lvl:8}, {out:'soup', n:1, in:{pumpkin:1, carrot:2, milk:1, wood:1}, t:360, lvl:9}]},
  woodshop:{e:'🪚', name:'Woodshop', lvl:3, build:300, rec:[{out:'chair', n:1, in:{wood:4}, t:150}]},
  dairy:{e:'🧈', name:'Dairy', lvl:4, build:500, rec:[{out:'butter', n:1, in:{milk:2}, t:120}, {out:'cheese', n:1, in:{milk:3}, t:240, lvl:6}]},
  jamhouse:{e:'🍓', name:'Jam Kitchen', lvl:5, build:700, rec:[{out:'jam', n:1, in:{berry:3}, t:150}]},
  loom:{e:'🧵', name:'Sewing Room', lvl:7, build:1100, rec:[{out:'scarf', n:1, in:{wool:2}, t:240}]},
};
const PLOT_STEPS = [[6,1,0],[9,2,150],[12,4,400],[15,6,900],[18,8,1600]]; // plots, level, coins
const NEIGH = [['👵','Grandma Pearl'],['🤠','Rancher Gil'],['👩‍🍳','Baker Lou'],['👨‍🚒','Fire Chief Ben'],['👧','Lily'],['🧑‍🌾','Farmer Joe'],['👩‍🏫','Mrs. Ortiz'],['👴','Old Hank'],['🧔','Lumber Lars']];
const LVL_UNLOCKS = {2:'🌽 Corn, more fields', 3:'🥕 Carrots, 🥖 Bakery, 🪚 Woodshop', 4:'🐄 Cows, 🧈 Dairy, more fields', 5:'🍓 Strawberries, 🍰 Carrot Cake, Jam Kitchen, more trees', 6:'🐑 Sheep, 🧀 Cheese, more fields', 7:'🎃 Pumpkins, 🧵 Sewing Room', 8:'🥧 Pumpkin Pie, more fields', 9:'🍲 Harvest Soup'};

/* ---------- state ---------- */
function fresh(){
  const now = Date.now();
  return {v:1, coins:150, gems:25, xp:0, lvl:1, barn:{wheat:3, feed:3}, cap:50,
    plots:Array.from({length:6}, (_,i) => i < 2 ? {c:'wheat', at:now - 30*SEC} : null),
    pens:{chicken:{n:3, at:0}}, trees:[0,0,0,0], shops:{mill:{q:[], done:[], slots:2}},
    orders:[], oSeq:0, boost:1, disc:{wheat:1, feed:1}, albumGot:{}, tut:0, created:now, offerShown:{}, barnLv:0};
}
let S = C.load(KEY) || fresh();
const barnUsed = () => Object.values(S.barn).reduce((a,b)=>a+b, 0);
const cfg = {
  key:KEY, title:'Homestead Valley', bundle:'com.brettjohnson.homesteadvalley', adsPerDay:12,
  icons:{coins:'🪙', gems:'💎', xp:'✨', boost:'💧', ribbons:'🎀'},
  label: (k, v) => G[k] ? G[k].e+' '+v : k === 'cap' ? '🏚️ +'+v+' barn space' : null,
  hudFor: g => { const k = Object.keys(g||{})[0]; return k === 'coins' ? '#hcoin' : k === 'gems' ? '#hgem' : G[k] ? '#hbarn' : '#hlvl'; },
  grant(k, v){
    if (k === 'coins'){ S.coins += v; C.track('coinsEarned', v); }
    else if (k === 'gems') S.gems += v;
    else if (k === 'xp') addXP(v);
    else if (k === 'boost') S.boost += v;
    else if (k === 'cap') S.cap += v;
    else if (G[k]){ S.barn[k] = (S.barn[k]||0) + v; discover(k); }
  },
  onChange: () => { renderHUD(); dirty = true; },
  onTick: tick,
  daily:[{coins:80},{boost:1},{gems:8},{coins:250, wood:5},{feed:10, boost:1},{gems:20},{gems:50, coins:500, boost:3}],
  tasks:[
    {id:'h20', txt:'Harvest 20 crops', stat:'harvest', n:20, give:{coins:120}},
    {id:'h40', txt:'Harvest 40 crops', stat:'harvest', n:40, give:{gems:8}},
    {id:'o4', txt:'Fill 4 orders', stat:'orders', n:4, give:{boost:1}},
    {id:'o7', txt:'Fill 7 orders', stat:'orders', n:7, give:{gems:10}},
    {id:'a8', txt:'Collect 8 animal goods', stat:'animal', n:8, give:{feed:10}},
    {id:'w6', txt:'Chop 6 trees', stat:'chop', n:6, give:{coins:150}},
    {id:'c4', txt:'Make 4 goods in workshops', stat:'craft', n:4, give:{gems:6}},
  ],
  taskBonus:{gems:15, boost:2},
  ach:[
    {id:'hv1', name:'Green Thumb', txt:'Harvest 50 crops', stat:'harvest', n:50, give:{gems:10}},
    {id:'hv2', name:'Breadbasket', txt:'Harvest 1,000 crops', stat:'harvest', n:1000, give:{gems:60}},
    {id:'or1', name:'Good Neighbor', txt:'Fill 10 orders', stat:'orders', n:10, give:{gems:10}},
    {id:'or2', name:'Valley Favorite', txt:'Fill 150 orders', stat:'orders', n:150, give:{gems:50}},
    {id:'an1', name:'Rancher', txt:'Collect 100 animal goods', stat:'animal', n:100, give:{gems:20}},
    {id:'ch1', name:'Woodpile', txt:'Chop 50 trees', stat:'chop', n:50, give:{gems:15}},
    {id:'cr1', name:'Handmade', txt:'Make 50 workshop goods', stat:'craft', n:50, give:{gems:25}},
    {id:'ex1', name:'Land Baron', txt:'Expand your land 3 times', stat:'expand', n:3, give:{gems:25}},
    {id:'bd1', name:'Builder', txt:'Build 4 workshops or pens', stat:'built', n:4, give:{gems:20}},
    {id:'al1', name:'Almanac Keeper', txt:'Discover 15 goods', stat:'discovered', n:15, give:{gems:30}},
    {id:'dy1', name:'Early Riser', txt:'Claim 7 daily gifts', stat:'dailyClaims', n:7, give:{gems:25}},
    {id:'fr1', name:'Blue Ribbon', txt:'Claim 10 fair prizes', stat:'eventPrizes', n:10, give:{gems:30}},
  ],
  pass:{name:'Harvest Pass', paidName:'Golden Harvest', per:20, paidPitch:'extra gems, Super-Grow cans and goods every tier.',
    tier: i => ({free: i%5===0 ? {gems:10} : i%2 ? {coins:50+i*10} : {feed:6}, paid: i%5===0 ? {gems:30, boost:2} : i%3===0 ? {boost:1} : i%2 ? {gems:8} : {wood:6}})},
  event:{name:'Thurston County Fair', icon:'🎀', blurb:'Fill orders and craft goods this weekend to win fair ribbons.',
    ladder:[{need:5,give:{coins:120}},{need:15,give:{boost:1}},{need:30,give:{gems:10}},{need:50,give:{feed:20}},{need:75,give:{coins:600}},{need:105,give:{boost:2}},{need:140,give:{gems:25}},{need:180,give:{cap:25}},{need:225,give:{gems:40}},{need:275,give:{gems:60, boost:3}}]},
  vault:{name:'Piggy Bank', icon:'🐷', cap:300, min:60, blurb:'Every order you fill drops 2 💎 into the Piggy Bank. Crack it open to keep them all!'},
  products:{
    starter:{name:'Homestead Starter Pack', icon:'🎁', price:'$2.99', once:true, tag:'BEST DEAL • 1 per player', desc:'1,000 🪙, 80 💎, 5 💧 Super-Grow and +50 barn space', give:{coins:1000, gems:80, boost:5, cap:50}},
    noads:{name:'Ad-Free Pass', icon:'🚫', price:'$2.99', once:true, desc:'Get every video bonus instantly, forever — no ads.', onBuy:()=>{ C.meta().noAds = true; }},
    pass:{name:'Golden Harvest (this month)', icon:'✨', price:'$4.99', tag:'2X REWARDS', desc:'Unlock the gold row of the Harvest Pass', onBuy:()=>{ C.meta().pass.gold = true; }},
    vault:{name:'Piggy Bank', icon:'🐷', price:'$1.99', give:{gems:0}},
    grow:{name:'Super-Grow Pack', icon:'💧', price:'$0.99', desc:'5 Super-Grow cans — each one finishes all growing crops instantly', give:{boost:5}},
    g1:{name:'Pouch of Gems', icon:'💎', price:'$0.99', give:{gems:80}},
    g2:{name:'Basket of Gems', icon:'💎', price:'$4.99', tag:'POPULAR', give:{gems:500}},
    g3:{name:'Wagon of Gems', icon:'💎', price:'$9.99', tag:'BEST VALUE', give:{gems:1200}},
    b1:{name:'Barn Raiser Bundle', icon:'🏚️', price:'$4.99', give:{coins:3000, gems:150, cap:50}},
    b2:{name:'Ranch Bundle', icon:'🤠', price:'$9.99', tag:'MOST STUFF', give:{coins:8000, gems:400, boost:10, cap:100}},
    eventpack:{name:'County Fair Bundle', icon:'🎡', price:'$4.99', tag:'WEEKEND ONLY', desc:'200 💎, 1,500 🪙, 5 💧 + 30 🎀 — sold only during the fair, 1 per weekend', give:{gems:200, coins:1500, boost:5}, onBuy:()=>{ C.give(cfg.products.eventpack.give); C.meta().offers[C.meta().event.key] = 1; C.addEventTokens(30); }},
  },
  shop: () => [
    {title:'⭐ Special', items:[!C.owned('starter')?'starter':null, C.eventInfo().active && !C.meta().offers[C.meta().event.key]?'eventpack':null, !C.meta().pass.gold?'pass':null, !C.owned('noads')?'noads':null].filter(Boolean)},
    {title:'🆓 Free', items:['freeCoins','freeGrow']},
    {title:'⏩ Speed-ups', items:['grow','gemGrow']},
    {title:'💎 Gems', items:['g1','g2','g3']},
    {title:'📦 Bundles', items:['b1','b2']},
  ],
};
cfg.products.freeCoins = {name:'Free Coins', icon:'📺', price:'Watch', desc:'Watch a short video for +80 🪙', free:()=>C.rewardAd('coins', ()=>{ C.give({coins:80}); C.toast('+80 🪙'); })};
cfg.products.freeGrow = {name:'Free Super-Grow', icon:'📺', price:'Watch', desc:'Watch a short video for 1 💧 Super-Grow', free:()=>C.rewardAd('grow', ()=>{ C.give({boost:1}); C.toast('+1 💧 Super-Grow'); })};
cfg.products.gemGrow = {name:'Super-Grow Can', icon:'💧', price:'8 💎', desc:'1 Super-Grow can for 8 gems', free:()=>{ if (S.gems < 8) return needGems(); S.gems -= 8; C.give({boost:1}); C.sfx('coin'); C.refreshModals(); }};
C.bind(S, cfg);

/* ---------- helpers ---------- */
let dirty = true;
const xpNeed = l => 15 + l*20;
function needGems(){ C.toast('Not enough 💎'); C.openShop(); }
function have(k){ return S.barn[k] || 0; }
function take(inp){ for (const k in inp) S.barn[k] -= inp[k]; }
function canPay(inp){ for (const k in inp) if (have(k) < inp[k]) return false; return true; }
function addXP(v){ S.xp += v; let up = false; while (S.xp >= xpNeed(S.lvl)){ S.xp -= xpNeed(S.lvl); S.lvl++; up = true; } if (up) setTimeout(levelUp, 400); }
function levelUp(){
  const g = {gems:5+S.lvl, coins:60*S.lvl, boost:1};
  C.sfx('level'); C.confetti(); C.haptic('heavy');
  C.modal({title:'Level Up!', dismiss:false, render:()=>h('div',{class:'center'}, h('div',{class:'lvlbig'}, S.lvl), h('p',null, LVL_UNLOCKS[S.lvl] ? 'Unlocked: '+LVL_UNLOCKS[S.lvl] : 'Your homestead is growing!'), C.rewardChips(g)),
    buttons:[{t:'Collect!', cls:'g', fn:()=>{ C.give(g); C.vaultAdd(3); maybeStarter(); }}]});
}
function maybeStarter(){
  if (S.lvl >= 3 && !S.offerShown.starter && !C.owned('starter') && S.tut >= 99){ S.offerShown.starter = 1; setTimeout(()=>{
    const p = cfg.products.starter;
    C.modal({title:'🎁 Welcome Gift Offer', render:()=>h('div',{class:'center'}, h('p',null,'A one-time pack to grow your homestead faster. Only one per player — it stays in the Shop if you want it later.'), C.rewardChips(p.give), h('div',{class:'price'}, p.price)),
      buttons:[{t:'Maybe later'}, {t:'Get it '+p.price, cls:'g', fn:()=>C.buy('starter')}]});
  }, 800); }
}
function discover(k){ if (S.disc[k]) return; S.disc[k] = 1; C.track('discovered'); if (S.tut >= 99) C.toast('📖 New in your Almanac: '+G[k].e+' '+G[k].n+'!'); }
function store(k, n, fromEl){
  if (barnUsed() + n > S.cap){ barnFull(); return false; }
  S.barn[k] = have(k) + n; discover(k);
  if (fromEl){ const p = C.center(fromEl); C.flyTo(p, '#hbarn', G[k].e, Math.min(5, n)); C.floatText(p.x, p.y-12, '+'+n+' '+G[k].e, '#fff'); }
  return true;
}
function barnFull(){
  if (C.modalOpen()) { C.toast('🏚️ Barn is full!'); return; }
  const cost = 200*(S.barnLv+1);
  C.modal({title:'🏚️ Barn is full!', render:()=>h('div',{class:'center'}, h('p',null,'Sell extra goods, fill orders, or make your barn bigger.'),
    h('div',{class:'row'}, h('div',{class:'grow'},'Add 25 space'), h('button',{class:'btn s g', onclick:()=>{ upgradeBarn(); C.closeModal(); }}, cost+' 🪙')),
    h('div',{class:'row'}, h('div',{class:'grow'},'Barn Raiser Bundle (+50 space and more)'), h('button',{class:'btn s', onclick:()=>{ C.closeModal(); C.buy('b1'); }}, '$4.99'))),
    buttons:[{t:'Open Barn', fn:openBarn}]});
}
function upgradeBarn(){ const cost = 200*(S.barnLv+1); if (S.coins < cost){ C.toast('Not enough 🪙'); C.sfx('err'); return; } S.coins -= cost; S.barnLv++; S.cap += 25; C.sfx('win'); C.toast('🏚️ Barn now holds '+S.cap+'!'); renderHUD(); C.saveSoon(); }

/* ---------- crops ---------- */
function plotState(p){ if (!p) return 'empty'; return Date.now() >= p.at + CROPS[p.c].t*SEC ? 'ready' : 'grow'; }
function plant(i, c){
  const cr = CROPS[c]; if (S.coins < cr.cost){ C.toast('Not enough 🪙 for seeds'); C.sfx('err'); return false; }
  S.coins -= cr.cost; S.plots[i] = {c, at:Date.now()}; if (S.tut === 1 && c === 'wheat') S.plots[i].at -= 18*SEC; C.track('plant'); return true;
}
function openSeeds(i){
  C.modal({title:'🌱 Plant a crop', render:()=>{
    const empties = S.plots.map((p,j)=>p?-1:j).filter(j=>j>=0);
    return h('div',null, h('p',{class:'small center'}, 'Pick a crop. Seeds cost a few coins; every harvest gives 2.'),
      h('div',{class:'pick'}, Object.keys(CROPS).map(c => { const cr = CROPS[c], lock = S.lvl < cr.lvl;
        return h('div',{class:'pk'+(lock?' lock':''), 'data-c':c, onclick:()=>{ if (lock){ C.toast('Unlocks at level '+cr.lvl); return; }
            let n = 0; for (const j of [i, ...empties.filter(j=>j!==i)]) { if (!S.plots[j] && plant(j, c)) n++; else if (S.plots[j]) continue; else break; }
            C.closeModal(); C.sfx('spawn', 2); C.haptic('light'); if (n) C.toast('🌱 Planted '+n+' '+G[c].n); if (S.tut === 1) tutStep(2); dirty = true; render(); C.saveSoon(); }},
          h('div',{class:'e'}, lock?'🔒':G[c].e), h('b',null, G[c].n), h('small',null, lock?'Level '+cr.lvl:C.fmtTime(cr.t*SEC)+' • 🪙'+cr.cost)); })),
      h('p',{class:'small center'}, 'Plants every empty field ('+empties.length+').'));
  }});
}
function harvest(i, el){
  const p = S.plots[i]; if (!store(p.c, 2, el)) return;
  S.plots[i] = null; C.track('harvest', 2); C.addPassXP(1); addXP(1);
  const c = C.center(el); C.burst(c.x, c.y, {n:10, emoji:G[p.c].e, star:false, size:16, speed:3}); C.sfx('harvest'); C.haptic('light');
  if (S.tut === 2) setTimeout(()=>tutStep(2), 50);
}
function harvestAll(){
  let n = 0; S.plots.forEach((p,i) => { if (p && plotState(p) === 'ready'){ const el = document.querySelector('.plot[data-i="'+i+'"]'); if (el && barnUsed()+2 <= S.cap){ harvest(i, el); n++; } } });
  if (!n) C.toast('Nothing ready yet'); render(); C.saveSoon();
}
function superGrow(){
  if (S.boost < 1){ C.modal({title:'💧 Super-Grow', render:()=>h('div',{class:'center'}, h('p',null,'Super-Grow finishes every growing crop instantly.'),
      h('div',{class:'row'}, h('div',{class:'grow'},'📺 Watch a video: +1 💧'), h('button',{class:'btn s b', onclick:()=>{ C.closeModal(); C.rewardAd('grow', ()=>{ C.give({boost:1}); C.toast('+1 💧'); }); }},'Watch')),
      h('div',{class:'row'}, h('div',{class:'grow'},'1 can'), h('button',{class:'btn s', onclick:()=>{ C.closeModal(); cfg.products.gemGrow.free(); }},'8 💎')),
      h('div',{class:'row'}, h('div',{class:'grow'},'Super-Grow Pack (5 cans)'), h('button',{class:'btn s g', onclick:()=>{ C.closeModal(); C.buy('grow'); }},'$0.99')))}); return; }
  const growing = S.plots.filter(p => p && plotState(p) === 'grow'); if (!growing.length){ C.toast('No crops are growing right now'); return; }
  S.boost--; growing.forEach(p => p.at = Date.now() - CROPS[p.c].t*SEC); C.sfx('big'); C.confetti(); C.track('boosts'); dirty = true; render(); C.saveSoon();
}
function expand(){
  const nxt = PLOT_STEPS.find(s => s[0] > S.plots.length); if (!nxt) return;
  if (S.lvl < nxt[1]){ C.toast('More land unlocks at level '+nxt[1]); C.sfx('err'); return; }
  if (S.coins < nxt[2]){ C.toast('Need '+nxt[2]+' 🪙 to clear more land'); C.sfx('err'); return; }
  S.coins -= nxt[2]; while (S.plots.length < nxt[0]) S.plots.push(null); C.track('expand'); C.sfx('big'); C.confetti(); C.toast('🚜 New fields cleared!'); dirty = true; render(); C.saveSoon();
}

/* ---------- animals ---------- */
function penState(k){ const p = S.pens[k]; if (!p) return 'none'; if (!p.at) return 'hungry'; return Date.now() >= p.at + ANIM[k].t*SEC ? 'ready' : 'busy'; }
function tapPen(k, el){
  const a = ANIM[k], p = S.pens[k];
  if (!p){
    if (S.lvl < a.lvl){ C.toast(a.name+' unlocks at level '+a.lvl); return; }
    C.modal({title:a.e+' Build '+a.name+'?', body:'Costs '+a.build+' 🪙 and comes with 2 animals.', buttons:[{t:'Not now'},{t:'Build '+a.build+' 🪙', cls:'g', fn:()=>{ if (S.coins < a.build) { C.toast('Not enough 🪙'); return; } S.coins -= a.build; S.pens[k] = {n:2, at:0}; C.track('built'); C.sfx('big'); C.confetti(); dirty = true; render(); C.saveSoon(); }}]}); return;
  }
  const st = penState(k);
  if (st === 'ready'){
    if (!store(a.good, p.n, el)) return; p.at = 0; C.track('animal', p.n); C.addPassXP(2); addXP(p.n);
    C.sfx('harvest'); const c = C.center(el); C.burst(c.x, c.y, {n:10, emoji:G[a.good].e, star:false, size:16});
    if (S.tut === 5) tutStep(99);
  } else if (st === 'hungry'){
    if (have('feed') < p.n){ C.toast('Need '+p.n+' 🥣 feed — make it at the Feed Mill from wheat'); C.sfx('err'); C.shake(el); return; }
    S.barn.feed -= p.n; p.at = Date.now(); if (S.tut === 4) p.at -= (a.t-4)*SEC; C.sfx('pick'); C.toast(a.e+' Yum! Fed '+p.n);
    if (S.tut === 4) tutStep(5);
  } else {
    const left = p.at + a.t*SEC - Date.now(), cost = Math.max(1, Math.ceil(left/60e3));
    C.modal({title:a.e+' '+a.name, render:()=>h('div',{class:'center'}, h('p',null, p.n+' animals • '+G[a.good].e+' ready in '+C.fmtTime(left)),
      h('div',{class:'row'}, h('div',{class:'grow'},'⏩ Finish now'), h('button',{class:'btn s', onclick:()=>{ if (S.gems < cost) return needGems(); S.gems -= cost; p.at = Date.now() - a.t*SEC; C.closeModal(); C.sfx('coin'); dirty = true; render(); }}, cost+' 💎')),
      p.n < 6 ? h('div',{class:'row'}, h('div',{class:'grow'},'Buy another '+a.e+' ('+p.n+'/6)'), h('button',{class:'btn s g', onclick:()=>{ if (S.coins < a.buy*p.n) { C.toast('Not enough 🪙'); return; } S.coins -= a.buy*p.n; p.n++; C.closeModal(); C.sfx('win'); dirty = true; render(); }}, a.buy*p.n+' 🪙')) : null)});
    return;
  }
  dirty = true; render(); C.saveSoon();
}

/* ---------- trees ---------- */
const TREE_T = 120*SEC;
function treeCount(){ return S.lvl >= 5 ? 6 : 4; }
function chop(i, el){
  if (S.trees[i] && Date.now() < S.trees[i]){
    const cost = Math.max(1, Math.ceil((S.trees[i]-Date.now())/60e3));
    C.toast('🌱 Regrowing… '+C.fmtTime(S.trees[i]-Date.now())); return;
  }
  if (!store('wood', 3, el)) return;
  S.trees[i] = Date.now() + TREE_T; C.track('chop'); addXP(1); C.addPassXP(1);
  el.classList.add('chop'); C.sfx('chop'); C.haptic('med'); const c = C.center(el); C.burst(c.x, c.y, {n:12, emoji:'🍂', star:false, size:14, speed:3});
  setTimeout(()=>{ dirty = true; render(); }, 300); C.saveSoon();
}

/* ---------- workshops ---------- */
function shopUpdate(k){
  const s = S.shops[k]; if (!s) return; const now = Date.now();
  while (s.q.length && now >= s.q[0].end){ s.done.push(s.q.shift().out); }
}
function queueEnd(s){ return s.q.length ? s.q[s.q.length-1].end : Date.now(); }
function tapShop(k, el){
  const d = SHOPS[k], s = S.shops[k];
  if (!s){
    if (S.lvl < d.lvl){ C.toast(d.name+' unlocks at level '+d.lvl); return; }
    C.modal({title:d.e+' Build '+d.name+'?', body:'Costs '+d.build+' 🪙.', buttons:[{t:'Not now'},{t:'Build '+d.build+' 🪙', cls:'g', fn:()=>{ if (S.coins < d.build){ C.toast('Not enough 🪙'); return; } S.coins -= d.build; S.shops[k] = {q:[], done:[], slots:2}; C.track('built'); C.sfx('big'); C.confetti(); dirty = true; render(); C.saveSoon(); }}]}); return;
  }
  shopUpdate(k);
  if (s.done.length){ collectShop(k, el); return; }
  openShop(k);
}
function collectShop(k, el){
  const s = S.shops[k]; let n = 0;
  while (s.done.length){ const o = s.done[0], r = SHOPS[k].rec.find(r => r.out === o); if (!store(o, r.n, el)) break; s.done.shift(); n++; C.track('craft'); addXP(Math.ceil(G[o].v/6)); C.addPassXP(2); C.addEventTokens(1); }
  if (n){ C.sfx('win'); const c = C.center(el); C.burst(c.x, c.y, {n:16}); if (S.tut === 3.5) tutStep(4); }
  dirty = true; render(); C.saveSoon();
}
function openShop(k){
  const d = SHOPS[k], s = S.shops[k];
  C.modal({title:d.e+' '+d.name, live:true, render:()=>{
    shopUpdate(k); const now = Date.now();
    return h('div',null,
      h('div',{class:'small'}, 'Queue ('+s.q.length+'/'+s.slots+')'),
      h('div',{class:'q'}, s.q.map((q,j) => h('div',{class:'qi'}, G[q.out].e, h('small',null, j===0 ? C.fmtTime(q.end-now) : 'waiting'))),
        s.done.map(o => h('div',{class:'qi done'}, G[o].e, h('small',null,'ready'))),
        s.slots < 6 ? h('button',{class:'btn s', onclick:()=>{ const cost = 10*(s.slots-1); if (S.gems < cost) return needGems(); S.gems -= cost; s.slots++; C.sfx('coin'); C.refreshModals(); }}, '+slot '+(10*(s.slots-1))+'💎') : null),
      s.done.length ? h('button',{class:'btn g', style:'width:100%', onclick:()=>{ C.closeModal(); collectShop(k, document.querySelector('.card[data-s="'+k+'"]') || document.body); }}, 'Collect '+s.done.length+' item'+(s.done.length>1?'s':'')) : null,
      s.q.length ? h('div',{class:'row'}, h('div',{class:'grow'},'⏩ Finish current item'),
        h('button',{class:'btn s b', onclick:()=>C.rewardAd('speed', ()=>{ const q = s.q[0]; if (!q) return; const cut = Math.min(q.end-Date.now(), 5*60e3); s.q.forEach(x => x.end -= cut); C.toast('⏩ 5 minutes skipped!'); C.refreshModals(); })}, '📺 -5m'),
        h('button',{class:'btn s', onclick:()=>{ const q = s.q[0]; const cost = Math.max(1, Math.ceil((q.end-Date.now())/60e3)); if (S.gems < cost) return needGems(); S.gems -= cost; const cut = q.end-Date.now(); s.q.forEach(x => x.end -= cut); C.sfx('coin'); C.refreshModals(); }}, Math.max(1, Math.ceil((s.q[0].end-now)/60e3))+' 💎')) : null,
      d.rec.map(r => { const lock = r.lvl && S.lvl < r.lvl;
        return h('div',{class:'rec'+(lock?' dim':'')}, h('div',{class:'out'}, lock?'🔒':G[r.out].e), h('div',{class:'grow'}, h('b',null, G[r.out].n+(r.n>1?' ×'+r.n:'')), h('div',{class:'ins'}, Object.keys(r.in).map(x => h('span',{class:have(x) < r.in[x]?'bad':''}, G[x].e+have(x)+'/'+r.in[x]+' '))), h('div',{class:'small'}, '⏱ '+C.fmtTime(r.t*SEC)+(lock?' • level '+r.lvl:''))),
          h('button',{class:'btn s '+(canPay(r.in)&&!lock?'g':''), onclick:()=>make(k, r)}, 'Make'));
      }));
  }});
}
function make(k, r){
  const s = S.shops[k];
  if (r.lvl && S.lvl < r.lvl){ C.toast('Unlocks at level '+r.lvl); return; }
  if (s.q.length >= s.slots){ C.toast('Queue is full — add a slot or wait'); C.sfx('err'); return; }
  if (!canPay(r.in)){ const miss = Object.keys(r.in).filter(x => have(x) < r.in[x]).map(x => G[x].e+' '+G[x].n).join(', '); C.toast('Need more: '+miss); C.sfx('err'); return; }
  take(r.in); const start = Math.max(Date.now(), queueEnd(s)); s.q.push({out:r.out, end:start + r.t*SEC*(S.tut === 3 ? 0.05 : 1)});
  C.sfx('pick'); C.haptic('light'); if (S.tut === 3) tutStep(3.5); C.refreshModals(); dirty = true; C.saveSoon();
}

/* ---------- orders ---------- */
function goodsUnlocked(){
  const out = Object.keys(CROPS).filter(c => S.lvl >= CROPS[c].lvl);
  for (const k in S.pens) out.push(ANIM[k].good);
  if (S.lvl >= 2) out.push('wood');
  for (const k in S.shops) for (const r of SHOPS[k].rec) if (!r.lvl || S.lvl >= r.lvl) if (r.out !== 'feed') out.push(r.out);
  return out;
}
function newOrder(){
  S.oSeq++;
  if (S.oSeq === 1) return {id:S.oSeq, who:0, need:{wheat:4}};
  const gs = goodsUnlocked(), kinds = Math.min(gs.length, 1 + (S.lvl >= 3 ? Math.floor(Math.random()*2) : 0) + (S.lvl >= 6 && Math.random() < .3 ? 1 : 0)), need = {};
  for (let t=0;t<kinds;t++){ const k = gs[Math.floor(Math.random()*gs.length)]; const max = G[k].v < 10 ? 2 + Math.floor(S.lvl/2) : G[k].v < 30 ? 2 : 1; need[k] = Math.max(1, Math.min(8, 1 + Math.floor(Math.random()*max))); }
  return {id:S.oSeq, who:Math.floor(Math.random()*NEIGH.length), need};
}
function orderReward(o){ let v = 0; for (const k in o.need) v += G[k].v*o.need[k]; return {coins:Math.round(v*1.4)+5, xp:Math.ceil(v/4)+2}; }
function missing(o){ const m = {}; for (const k in o.need) if (have(k) < o.need[k]) m[k] = o.need[k] - have(k); return m; }
function fillOrders(){ const n = S.lvl >= 5 ? 8 : 6; while (S.orders.length < n) S.orders.push(newOrder()); }
function renderOrders(){
  fillOrders(); const el = $('#orders'); el.innerHTML = '';
  el.append(h('div',{class:'truck', id:'truck'}, '🛻'), h('div',{class:'small center', style:'margin-bottom:8px'}, 'Neighbors across the valley need goods. Fill orders for coins, XP and 🐷 gems.'));
  el.append(h('div',{class:'ordg'}, S.orders.map(o => {
    const m = missing(o), mk = Object.keys(m), ready = !mk.length, r = orderReward(o), f = NEIGH[o.who];
    const total = Object.values(o.need).reduce((a,b)=>a+b,0), missCount = mk.reduce((a,k)=>a+m[k],0);
    const close = !ready && total - missCount > 0 && missCount <= Math.max(1, Math.floor(total/3));
    const gemCost = mk.reduce((a,k)=>a+Math.ceil(G[k].v/4)*m[k], 0);
    return h('div',{class:'ord'+(ready?' ready':''), 'data-o':o.id}, close ? h('div',{class:'tag2'}, 'So close!') : null,
      h('div',{class:'who'}, f[0]+' '+f[1]),
      h('div',{class:'needs'}, Object.keys(o.need).map(k => h('span',{class:'nd'+(have(k)>=o.need[k]?' ok':''), onclick:()=>C.toast(G[k].e+' '+G[k].n+': you have '+have(k))}, G[k].e+' '+Math.min(have(k),o.need[k])+'/'+o.need[k]))),
      h('div',{class:'rw'}, '🪙'+r.coins+'  ✨'+r.xp+(C.eventInfo().active?'  🎀2':'')),
      h('div',{class:'btns'}, ready ? h('button',{class:'btn s g', onclick:e=>deliver(o, e.target)}, 'Ship it!') :
        close ? h('button',{class:'btn s', onclick:e=>{ if (S.gems < gemCost) return needGems(); S.gems -= gemCost; for (const k in m){ S.barn[k] = have(k) + m[k]; discover(k); } C.sfx('coin'); deliver(o, e.target); }}, 'Finish '+gemCost+'💎') : null,
        h('button',{class:'trash', title:'Skip order', onclick:()=>{ S.orders = S.orders.filter(x => x !== o); C.sfx('drop'); renderOrders(); C.saveSoon(); }}, '🗑️')));
  })));
}
function deliver(o, btn){
  if (Object.keys(missing(o)).length) return;
  take(o.need); const r = orderReward(o), card = btn.closest('.ord'), p = C.center(card);
  C.track('orders'); C.addPassXP(5); C.vaultAdd(2); C.addEventTokens(2, card);
  C.sfx('win'); C.haptic('med'); C.burst(p.x, p.y, {n:26, speed:5, size:9});
  const tr = $('#truck'); if (tr){ tr.classList.remove('go'); void tr.offsetWidth; tr.classList.add('go'); }
  setTimeout(()=>{ C.flyTo(p, '#hcoin', '🪙', 6); C.give(r); }, 200);
  S.orders = S.orders.filter(x => x !== o);
  setTimeout(()=>{ renderOrders(); C.saveSoon(); }, 450);
  if (S.tut === 2.5) tutStep(3);
}

/* ---------- farm render ---------- */
let sig = '';
function farmSig(){
  return S.plots.map(plotState).join() + '|' + Object.keys(ANIM).map(penState).join() + '|' + S.trees.map(t => t && Date.now() < t ? 1 : 0).join() + '|' + Object.keys(S.shops).map(k => { shopUpdate(k); return S.shops[k].q.length+'.'+S.shops[k].done.length; }).join() + '|' + S.lvl;
}
function render(){
  if (!$('#scrFarm').classList.contains('on')) return;
  const f = $('#farm'), sc = f.scrollTop; f.innerHTML = ''; sig = farmSig(); dirty = false; const now = Date.now();
  const ready = S.plots.filter(p => p && plotState(p) === 'ready').length, growing = S.plots.filter(p => p && plotState(p) === 'grow').length;
  const nxt = PLOT_STEPS.find(s => s[0] > S.plots.length);
  f.append(h('div',{class:'sec'}, h('div',{class:'sech'}, h('h3',null,'🌾 Fields'),
      h('button',{class:'btn s b', id:'growBtn', onclick:superGrow}, '💧 '+S.boost),
      h('button',{class:'btn s '+(ready?'g':''), onclick:harvestAll}, 'Harvest all'+(ready?' ('+ready+')':''))),
    h('div',{class:'plots'}, S.plots.map((p,i) => { const st = plotState(p);
      if (st === 'empty') return h('div',{class:'plot', 'data-i':i, onclick:()=>openSeeds(i)}, h('span',{class:'em', style:'font-size:22px;opacity:.6'}, '➕'));
      const cr = CROPS[p.c], left = p.at + cr.t*SEC - now;
      if (st === 'ready') return h('div',{class:'plot ready', 'data-i':i, onclick:e=>{ harvest(i, e.currentTarget); render(); C.saveSoon(); }}, h('span',{class:'em'}, G[p.c].e));
      return h('div',{class:'plot', 'data-i':i, onclick:()=>C.toast(G[p.c].e+' '+G[p.c].n+' ready in '+C.fmtTime(left)+' — use 💧 Super-Grow to finish now')}, h('span',{class:'em', style:'font-size:30px'}, left < cr.t*SEC/2 ? '🌿' : '🌱'),
        h('span',{class:'tm', 'data-end':p.at+cr.t*SEC}, C.fmtTime(left)), h('div',{class:'pb'}, h('i',{'data-from':p.at, 'data-to':p.at+cr.t*SEC})));
    }), nxt ? h('div',{class:'plot add', onclick:expand}, '🚜 Clear land', h('small',null, S.lvl < nxt[1] ? 'Level '+nxt[1] : nxt[2]+' 🪙')) : null)));
  f.append(h('div',{class:'sec'}, h('div',{class:'sech'}, h('h3',null,'🐓 Barnyard'), h('span',{class:'small'}, '🥣 '+have('feed')+' feed')),
    h('div',{class:'cards'}, Object.keys(ANIM).map(k => { const a = ANIM[k], p = S.pens[k], st = penState(k);
      const lock = !p && S.lvl < a.lvl;
      return h('div',{class:'card'+(st==='ready'?' ready':'')+(!p?' lock':''), 'data-p':k, onclick:e=>tapPen(k, e.currentTarget)},
        h('div',{class:'ce'}, st==='ready' ? G[a.good].e : a.e.repeat(Math.min(3, p ? p.n : 1))), h('b',null, a.name),
        h('div',{class:'st'}, !p ? (lock ? '🔒 Level '+a.lvl : 'Build: '+a.build+' 🪙') : st==='hungry' ? 'Tap to feed ('+p.n+' 🥣)' : st==='ready' ? 'Tap to collect '+p.n+' '+G[a.good].e : h('span',{'data-end':p.at+a.t*SEC}, C.fmtTime(p.at+a.t*SEC-now))),
        st==='busy' ? h('div',{class:'pb'}, h('i',{'data-from':p.at, 'data-to':p.at+a.t*SEC})) : null);
    }))));
  f.append(h('div',{class:'sec'}, h('div',{class:'sech'}, h('h3',null,'🌲 Woodlot'), h('span',{class:'small'}, 'Tap a tree for 🪵 firewood')),
    h('div',{class:'trees'}, Array.from({length:treeCount()}, (_,i) => { const t = S.trees[i] || 0, up = !t || now >= t;
      return h('div',{class:'tree'+(up?'':' stump'), 'data-t':i, onclick:e=>chop(i, e.currentTarget)}, up ? (i%2?'🌲':'🌳') : '🪵', up ? null : h('span',{class:'tm', 'data-end':t}, C.fmtTime(t-now)));
    }))));
  f.append(h('div',{class:'sec'}, h('div',{class:'sech'}, h('h3',null,'🏠 Workshops')),
    h('div',{class:'cards'}, Object.keys(SHOPS).map(k => { const d = SHOPS[k], s = S.shops[k]; if (s) shopUpdate(k);
      const lock = !s && S.lvl < d.lvl;
      return h('div',{class:'card'+(s && s.done.length?' ready':'')+(!s?' lock':''), 'data-s':k, onclick:e=>tapShop(k, e.currentTarget)},
        h('div',{class:'ce'}, s && s.done.length ? G[s.done[0]].e : d.e), h('b',null, d.name),
        h('div',{class:'st'}, !s ? (lock ? '🔒 Level '+d.lvl : 'Build: '+d.build+' 🪙') : s.done.length ? 'Tap to collect '+s.done.length : s.q.length ? h('span',null, G[s.q[0].out].e+' ', h('span',{'data-end':s.q[0].end}, C.fmtTime(s.q[0].end-now))) : 'Idle — tap to make goods'),
        s && s.q.length ? h('div',{class:'pb'}, h('i',{'data-from':s.q[0].end - (SHOPS[k].rec.find(r=>r.out===s.q[0].out).t*SEC), 'data-to':s.q[0].end})) : null);
    }))));
  f.scrollTop = sc; liveUpdate();
}
function liveUpdate(){
  const now = Date.now();
  document.querySelectorAll('#farm [data-end]').forEach(e => e.textContent = C.fmtTime(+e.dataset.end - now));
  document.querySelectorAll('#farm [data-from]').forEach(e => e.style.width = Math.min(100, Math.max(0, (now - e.dataset.from)/(e.dataset.to - e.dataset.from)*100))+'%');
}
let pressing = 0;
window.addEventListener('pointerdown', () => { pressing = Date.now(); }, true);
window.addEventListener('pointerup', () => { setTimeout(() => { pressing = 0; }, 80); }, true);
function tick(){
  renderHUD();
  const busy = pressing && Date.now() - pressing < 1500; // never swap the farm DOM mid-tap
  if ($('#scrFarm').classList.contains('on')){ if (!busy && (dirty || farmSig() !== sig)) render(); else liveUpdate(); }
  if (Math.random() < 0.1) C.save();
}

/* ---------- barn ---------- */
function openBarn(){
  C.modal({title:'🏚️ Barn ('+barnUsed()+'/'+S.cap+')', render:()=>h('div',null,
    C.bar(barnUsed()/S.cap, barnUsed()+' / '+S.cap),
    h('div',{class:'row'}, h('div',{class:'grow'}, 'Make the barn bigger (+25)'), h('button',{class:'btn s g', onclick:()=>{ upgradeBarn(); C.refreshModals(); }}, 200*(S.barnLv+1)+' 🪙')),
    h('p',{class:'small'}, 'Tap a good to sell one for coins.'),
    h('div',{class:'goods'}, Object.keys(G).filter(k => have(k) > 0).map(k => h('div',{class:'gd', onclick:e=>{ if (have(k) < 1) return; S.barn[k]--; const v = Math.max(1, Math.round(G[k].v*0.6)); S.coins += v; const c = C.center(e.currentTarget); C.floatText(c.x, c.y, '+'+v+' 🪙', '#ffd34d'); C.sfx('coin'); renderHUD(); C.refreshModals(); C.saveSoon(); }}, G[k].e, h('small',null, have(k))))),
    barnUsed() === 0 ? h('p',{class:'center small'},'Your barn is empty.') : null)});
}

/* ---------- almanac ---------- */
const PAGES = {'Crops':['wheat','corn','carrot','berry','pumpkin'], 'Ranch':['egg','milk','wool','wood','feed'], 'Kitchen':['bread','cake','pie','soup','jam'], 'Workshop':['butter','cheese','chair','scarf']};
function openAlbum(){
  C.modal({title:'📖 Farm Almanac', render:()=>h('div',null, h('p',{class:'small center'},'Make every good. Finish a page for 25 💎!'),
    Object.keys(PAGES).map(pg => { const got = PAGES[pg].filter(k => S.disc[k]).length, full = got === PAGES[pg].length;
      return h('div',{class:'sec'}, h('div',{class:'sech'}, h('h3',null, pg+' ('+got+'/'+PAGES[pg].length+')'),
          S.albumGot[pg] ? h('span',{class:'tick'},'✔ 25 💎') : h('button',{class:'btn s '+(full?'g':''), disabled:full?null:'', onclick:e=>{ S.albumGot[pg] = 1; C.flyTo(e.target, '#hgem', '💎', 6); C.give({gems:25}); C.refreshModals(); }}, '25 💎')),
        h('div',{class:'goods'}, PAGES[pg].map(k => h('div',{class:'gd'+(S.disc[k]?'':' no')}, G[k].e, h('small',null, S.disc[k]?G[k].n:'???')))));
    }))});
}

/* ---------- HUD / screens ---------- */
function renderHUD(){
  $('#lvn').textContent = S.lvl; $('#xpf').style.width = Math.min(100, S.xp/xpNeed(S.lvl)*100)+'%';
  $('#cnv').textContent = C.fmt(S.coins); $('#gmv').textContent = C.fmt(S.gems); $('#bnv').textContent = barnUsed()+'/'+S.cap;
  $('#hbarn').style.color = barnUsed() >= S.cap ? '#ff8a80' : '';
  $('#navOrders').classList.toggle('dot', S.orders.some(o => !Object.keys(missing(o)).length));
  C.updateBadges();
}
function show(s){
  $('#scrFarm').classList.toggle('on', s === 'farm'); $('#scrOrders').classList.toggle('on', s === 'orders');
  $('#navFarm').classList.toggle('on', s === 'farm'); $('#navOrders').classList.toggle('on', s === 'orders');
  if (s === 'farm') render(); else renderOrders();
  if (s === 'orders' && S.tut === 2) tutStep(2.5);
}

/* ---------- tutorial ---------- */
function tutStep(n){
  S.tut = n; C.saveSoon();
  if (n === 1) C.coach(() => document.querySelector('.plot[data-i="2"]'), 'Tap an empty field to plant wheat. 🌾');
  else if (n === 2){ const any = S.plots.some(p => p && plotState(p) !== 'empty'); C.coach(any ? () => document.querySelector('.plot.ready') || document.querySelector('.plot[data-i] .tm') : () => $('#navOrders'), any ? 'Tap ripe wheat to harvest it into your barn!' : 'Great harvest! Now open Orders.'); }
  else if (n === 2.5) C.coach(() => document.querySelector('.ord .btn.g') || document.querySelector('.ord'), 'Grandma Pearl needs 4 wheat. Ship it!');
  else if (n === 3){ show('farm'); C.coach(() => document.querySelector('.card[data-s="mill"]'), 'Animals need feed. Tap the Feed Mill and make Animal Feed from wheat.'); }
  else if (n === 3.5) C.coach(() => document.querySelector('.card[data-s="mill"].ready') || document.querySelector('.card[data-s="mill"]'), 'When the feed is ready, tap the mill to collect it.');
  else if (n === 4) C.coach(() => document.querySelector('.card[data-p="chicken"]'), 'Tap the Chicken Coop to feed your hens. 🐔');
  else if (n === 5) C.coach(() => document.querySelector('.card[data-p="chicken"].ready') || document.querySelector('.card[data-p="chicken"]'), 'Hens lay eggs while you wait. Tap to collect them when they\'re ready!');
  else { C.coachOff(); if (n === 99){ C.toast('🌻 You\'re a real homesteader! Keep growing your farm.', 3000); C.give({gems:10, boost:1}); } }
}
function intro(){
  C.modal({title:'🌻 Welcome to Homestead Valley', dismiss:false, render:()=>h('div',null,
    h('div',{class:'story'}, h('div',{class:'av'},'👵'), h('div',{class:'sb2'}, h('b',null,'Grandma Pearl: '), 'Well hello, neighbor! Your new homestead sits right here in the prettiest valley in Washington. Let\'s get some wheat in the ground!')),
    h('p',{class:'small center'}, 'Grow crops, raise animals, chop firewood, craft goods and fill orders for your neighbors.')),
    buttons:[{t:'Let\'s farm!', cls:'g', fn:()=>tutStep(1)}]});
}
function welcomeBack(){
  const away = Date.now() - (S.savedAt || Date.now());
  if (away < 120e3 || S.tut < 99) return false;
  const crops = S.plots.filter(p => p && plotState(p) === 'ready').length, anim = Object.keys(S.pens).filter(k => penState(k) === 'ready').length;
  let goods = 0; for (const k in S.shops){ shopUpdate(k); goods += S.shops[k].done.length; }
  if (!crops && !anim && !goods) return false;
  C.modal({title:'👋 Welcome back!', render:()=>h('div',{class:'center'}, h('p',null,'While you were away ('+C.fmtTime(away)+'), your farm kept working:'),
    h('div',{class:'chips'}, crops?h('span',{class:'chip'},'🌾 '+crops+' fields ready'):null, anim?h('span',{class:'chip'},'🐔 '+anim+' pens ready'):null, goods?h('span',{class:'chip'},'🏠 '+goods+' goods made'):null)),
    buttons:[{t:'Let\'s go!', cls:'g'}]});
  return true;
}

/* ---------- wire up ---------- */
$('#navFarm').onclick = () => show('farm'); $('#navOrders').onclick = () => show('orders'); $('#navBarn').onclick = openBarn; $('#navShop').onclick = () => C.openShop();
$('#dailybtn').onclick = C.openDaily; $('#taskbtn').onclick = C.openTasks; $('#passbtn').onclick = C.openPass; $('#evbtn').onclick = C.openEvent;
$('#vaultbtn').onclick = C.openVault; $('#achbtn').onclick = C.openAch; $('#albumbtn').onclick = openAlbum;
$('#hcoin').onclick = () => C.openShop(); $('#hgem').onclick = () => C.openShop(); $('#hbarn').onclick = openBarn; $('#setbtn').onclick = () => C.openSettings();
$('#hlvl').onclick = () => C.toast('Level '+S.lvl+' — '+S.xp+'/'+xpNeed(S.lvl)+' ✨'+(LVL_UNLOCKS[S.lvl+1]?' • Next: '+LVL_UNLOCKS[S.lvl+1]:''), 3000);

fillOrders(); render(); renderHUD();
if (S.tut === 0) intro();
else if (S.tut < 99) setTimeout(()=>tutStep(S.tut), 300);
else if (!welcomeBack() && C.dailyReady()) setTimeout(C.openDaily, 500);
C.save();
window.__game = {S:()=>S, show, render, harvest, plant, tapPen, tapShop, make, deliver, levelUp, superGrow, expand, openBarn, openAlbum, tutStep, chop, renderOrders};
})();
