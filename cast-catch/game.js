/* Cast & Catch — casual fishing collection on real Pacific NW waters (Oaks Corp) */
(function(){
'use strict';
const LOCS=window.CC_LOCS,PER=10,MAXL=LOCS.length*PER;
const GEAR={
 rod:{name:'Rod',icon:'🎣',max:12,base:150,desc:l=>`Cast distance ${Math.round(60+l*4)}% · bite window ${(0.7+l*.05).toFixed(2)}s`},
 reel:{name:'Reel',icon:'⚙️',max:12,base:200,desc:l=>`Reel speed ${100+l*12}%`},
 line:{name:'Line',icon:'🧵',max:12,base:180,desc:l=>`Strength ${100+l*10}%`},
 boat:{name:'Boat',icon:'🚤',max:2,base:5000,desc:l=>['Shore & dock only','Aluminum Skiff: Puget Sound','Sport Fisher: Westport offshore'][l]}};
const gearCost=(k,l)=>k==='boat'?[5000,40000][l]:Math.round(GEAR[k].base*Math.pow(1.55,l));
const AI=[['Captain Gill',90],['Salty Sue',220],['Big Bob',480],['Fin Fiona',900],['Old Pete',1500],['River Rita',2400],['Hook Hannah',3600]];
let mode='map',F=null;
const cfg={id:'castcatch',title:'Cast & Catch',coinIcon:'🪙',coinName:'Coins',accent:'#36c2ff',bg:'#0f3550',panel:'#174766',coinStore:[1200,7000,18000],
 boosters:{bait:{name:'Super Bait',icon:'🪱',desc:'Next cast: fast bite and a bigger hook window',cost:120},lure:{name:'Species Lure',icon:'🎯',desc:'You pick which fish bites next (no luck involved)',cost:350},strong:{name:'Strong Line',icon:'💪',desc:'Your line can\'t snap on the next fish',cost:200}},
 bundleBoosters:{bait:3,lure:1,strong:2},starterName:'Angler Starter Pack',starterBoosters:{bait:10,lure:4,strong:5},starterExtra:'+ Rod level up',
 passName:'Angler Pass',goldTrack:'Golden Reel Track',vaultName:'Tackle Box Bank',eventName:'Weekend Derby',eventIcon:'🏆',eventTrophy:'🏅 Derby Champion Trophy',
 eventHow:'1 point per pound caught + 10 per challenge won. Beat the fixed scores of the local anglers!',eventPoints:{lbs:1,wins:10},passXp:{catches:6},
 eventExtra(E){const rows=[...AI,['You',Math.floor(E.pts),1]].sort((a,b)=>b[1]-a[1]);return`<div class="lb">${rows.map((r,i)=>`<div class="${r[2]?'me':''}"><span>${i+1}. ${r[0]}</span><span>${Meta.fmt(r[1])} pts</span></div>`).join('')}</div><p class="small tc">Local anglers' scores are fixed each weekend. Pass them all!</p>`},
 taskPool:[{stat:'catches',text:'Catch {n} fish',n:[8,15,25]},{stat:'lbs',text:'Catch {n} lb of fish',n:[30,120,400]},{stat:'perfectHooks',text:'Get {n} perfect hooks',n:[3,6,10]},{stat:'wins',text:'Win {n} challenges',n:[2,4,6]},
  {stat:'newSpecies',text:'Find {n} new fish species',n:[1,1,2]},{stat:'farCasts',text:'Make {n} long casts',n:[5,10,20]},{stat:'boostersUsed',text:'Use {n} boosters',n:[1,2,3]}],
 achievements:[{id:'catches',name:'Angler',icon:'🎣',stat:'catches',goals:[25,250,2000],text:'Catch {n} fish'},{id:'lbs',name:'Heavy Hauler',icon:'⚖️',stat:'lbs',goals:[100,2000,20000],text:'Catch {n} lb total'},
  {id:'species',name:'Naturalist',icon:'📓',stat:'collected',goals:[10,25,40],text:'Find {n} species'},{id:'hooks',name:'Quick Hands',icon:'⚡',stat:'perfectHooks',goals:[10,100,500],text:'{n} perfect hooks'},
  {id:'wins',name:'Challenger',icon:'🏁',stat:'wins',goals:[10,40,80],text:'Win {n} challenges'},{id:'streak',name:'Hot Streak',icon:'🔥',stat:'bestStreak',goals:[5,10,25],text:'Win streak of {n}'},
  {id:'big',name:'Monster Hunter',icon:'🐋',stat:'monsters',goals:[1,5,20],text:'Catch {n} fish over 100 lb'}],
 album:{title:'Fish Journal',icon:'📓',hint:'Every Northwest water has 5 fish to find. Tap a fish to read about it.',sets:LOCS.map((L,li)=>({id:L.id,name:L.name+' · '+L.where,items:L.fish.map((f,fi)=>({id:L.id+'_'+fi,icon:fi===4?'🐋':fi===3?'🐡':'🐟',name:f[0],desc:f[7]})),reward:{coins:1000*(li+1),boosters:{lure:1+Math.floor(li/2)}}}))},
 onReward(r){},
 onHud(){const m=Meta.$('#hudMid');if(m)m.textContent=mode==='fish'&&F?`${F.L.name}`:`⭐ ${Object.values(Meta.S.stars).reduce((a,b)=>a+b,0)} · 📓 ${Object.keys(Meta.S.album).length}`}};
const S=Meta.init(cfg);const G=S.game;if(!G.gear){G.gear={rod:0,reel:0,line:0,boat:0};G.rec={}}
const $=Meta.$,stage=$('#stage');

/* ---------- challenges ---------- */
function challenge(n){const li=Math.floor((n-1)/PER),k=(n-1)%PER,L=LOCS[li];const sc=1+li*.8;const f=L.fish;
 const T=[{t:'count',n:2,txt:'Catch 2 fish'},{t:'count',n:3,txt:'Catch 3 fish'},{t:'species',sp:0,n:2,txt:`Catch 2 ${f[0][0]}`},{t:'lbs',w:Math.round(f[1][2]*6+4*sc),txt:''},{t:'count',n:5,txt:'Catch 5 fish'},
  {t:'big',w:Math.round((f[2][2]+f[2][3])/2),txt:''},{t:'species',sp:2,n:1,txt:`Catch a ${f[2][0]}`},{t:'lbs',w:Math.round(f[3][2]*5+10*sc),txt:''},{t:'species',sp:3,n:1,txt:`Catch a ${f[3][0]}`},{t:'species',sp:4,n:1,boss:1,txt:`👑 Boss: catch a ${f[4][0]}`}][k];
 if(T.t==='lbs')T.txt=`Catch ${T.w} lb total`;if(T.t==='big')T.txt=`Catch one fish over ${T.w} lb`;
 T.casts=T.t==='count'?Math.ceil(T.n*1.5)+1:T.t==='species'?(T.boss?7:T.n*3+1):T.t==='lbs'?6:5;T.n=T.n||1;T.li=li;T.k=k;return T}
const prog=(T,F)=>T.t==='count'?F.caught.length/T.n:T.t==='species'?F.caught.filter(c=>c.fi===T.sp).length/T.n:T.t==='lbs'?F.caught.reduce((a,c)=>a+c.w,0)/T.w:F.caught.some(c=>c.w>=T.w)?1:Math.max(0,...F.caught.map(c=>c.w))/T.w;

/* ---------- map & tackle ---------- */
function tabs(){return`<div class="tabs"><button id="tMap" class="${mode==='map'?'on':''}">🗺️ Waters</button><button id="tGear" class="${mode==='gear'?'on':''}">🎣 Tackle Shop</button></div>`}
function bindTabs(){$('#tMap').onclick=()=>{Meta.sfx('tap');showMap()};$('#tGear').onclick=()=>{Meta.sfx('tap');showGear()}}
function showMap(){mode='map';F=null;Meta.busy=false;Meta.hud();let h=tabs()+'<div style="position:absolute;top:48px;left:0;right:0;bottom:0"><div class="scroll">';
 LOCS.forEach((L,li)=>{const open=S.level>li*PER,needBoat=L.boat>G.gear.boat;const got=L.fish.filter((f,fi)=>S.album[L.id+'_'+fi]).length;
  h+=`<div class="loc" style="background:${L.col}"><div class="row"><b style="flex:1;font-size:17px">${['🏞️','🌿','🏙️','🐟','🏔️','🌉','⛴️','🌊'][li]} ${L.name}</b><span class="small">📓 ${got}/5</span></div><div class="small">${L.where}${needBoat?` · 🚤 needs ${['','Aluminum Skiff','Sport Fisher'][L.boat]}`:''}${!open?' · 🔒 finish the water above':''}</div><div class="nodes">`;
  for(let k=0;k<PER;k++){const n=li*PER+k+1,st=S.stars[n]||0;const cls=n<S.level?'done':n===S.level?'cur':'lock';h+=`<div class="node ${cls}" data-n="${n}">${n===S.level?'🎣':k===9?'👑':n}<span class="st">${'⭐'.repeat(st)}</span></div>`}
  h+='</div></div>'});
 h+='<div class="loc tc" style="background:#444">🚧 More Northwest waters coming soon!</div><div style="height:70px"></div></div></div><button class="btn green playbtn" id="pbtn">▶ Challenge '+Math.min(S.level,MAXL)+'</button>';stage.innerHTML=h;bindTabs();
 stage.querySelectorAll('.node').forEach(e=>e.onclick=()=>{const n=+e.dataset.n;if(n>S.level){Meta.sfx('err');Meta.toast('Win challenge '+S.level+' first!');return}preview(n)});
 $('#pbtn').onclick=()=>preview(Math.min(S.level,MAXL));const cur=stage.querySelector('.node.cur');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center'}),30)}
function preview(n){const T=challenge(n),L=LOCS[T.li];if(L.boat>G.gear.boat){Meta.modal(`<h2>🚤 Boat needed</h2><p class="tc">${L.name} is big water. Get the <b>${['','Aluminum Skiff','Sport Fisher'][L.boat]}</b> in the Tackle Shop.</p>`,[{t:'🎣 Tackle Shop',cls:'green',f:showGear},{t:'Close',cls:'sec'}]);return}
 Meta.modal(`<h2>${T.boss?'👑 ':''}Challenge ${n}</h2><p class="tc">${L.name} · ${L.where}</p><p class="tc" style="font-size:20px;font-weight:900">${T.txt}</p><p class="tc">🎣 ${T.casts+G.gear.boat} casts · ${'⭐'.repeat(S.stars[n]||0)||'No stars yet'}</p><p class="tc small">Fewer casts used = more stars. Long casts find bigger, rarer fish.</p>`,[{t:'▶ Go fishing',cls:'green',f:()=>startFish(n)},{t:'Back',cls:'sec'}])}
function showGear(){mode='gear';F=null;Meta.busy=false;Meta.hud();let h=tabs()+'<div style="position:absolute;top:48px;left:0;right:0;bottom:0"><div class="scroll"><p class="tc small">Upgrade your gear to cast farther, reel faster and land monsters.</p>';
 for(const k in GEAR){const g=GEAR[k],l=G.gear[k];h+=`<div class="card row"><b style="font-size:32px">${g.icon}</b><div style="flex:1"><b>${g.name}</b> ${k==='boat'?'':'Lv '+(l+1)}<br><span class="small">${g.desc(l)}</span></div>${l>=g.max?'<b>MAX</b>':`<button class="btn" data-g="${k}">⬆ 🪙${Meta.fmt(gearCost(k,l))}</button>`}</div>`}
 h+=`<h3>🏅 Records</h3>`+(Object.keys(G.rec).length?Object.entries(G.rec).sort((a,b)=>b[1]-a[1]).map(([n,w])=>`<div class="card row"><span style="flex:1">${n}</span><b>${w.toFixed(1)} lb</b></div>`).join(''):'<p class="small tc">Catch fish to set records!</p>')+'</div></div>';
 stage.innerHTML=h;bindTabs();stage.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const k=b.dataset.g;if(Meta.spend(gearCost(k,G.gear[k]))){G.gear[k]++;Meta.track('upgrades',1);Meta.sfx('levelup');const r=b.getBoundingClientRect();Meta.fx.burst(r.left+r.width/2,r.top,['#36c2ff','#fff','#ffe14a'],18);if(k==='boat')Meta.fx.confetti();Meta.save();const s=stage.querySelector('.scroll').scrollTop;showGear();stage.querySelector('.scroll').scrollTop=s}})}
cfg.onReward=r=>{if(r.label&&r.label.includes('Rod level')&&G.gear.rod<GEAR.rod.max)G.gear.rod++};

/* ---------- fishing ---------- */
let cv,cx,W,H;
function startFish(n){const T=challenge(n),L=LOCS[T.li];mode='fish';Meta.busy=true;
 F={n,T,L,casts:T.casts+G.gear.boat,casts0:T.casts+G.gear.boat,caught:[],st:'aim',pow:0,powDir:1,bob:null,t:0,fish:null,tension:0,progress:0,lure:null,bait:false,strong:false,over:false,splashes:[],ripples:[]};
 stage.innerHTML=`<div id="play"><div id="ptop"><button class="iconbtn" id="quit">✖</button><div style="flex:1"><div class="row"><b id="goal" style="font-size:13px"></b><span id="cs" style="margin-left:auto;font-weight:900"></span></div><div class="bar"><i id="gBar"></i></div></div></div>
 <canvas id="cv"></canvas><div id="boost">${Object.entries(cfg.boosters).map(([k,b])=>`<button data-b="${k}">${b.icon}<span>${S.boosters[k]||0}</span></button>`).join('')}</div></div>`;
 cv=$('#cv');cx=cv.getContext('2d');resize();Meta.hud();upd();
 $('#quit').onclick=()=>{if(!F.caught.length&&F.casts===F.casts0){showMap();return}Meta.modal(`<h2>Leave?</h2><p class="tc">${S.streak>=2?'You\'ll lose your 🔥'+S.streak+' streak.':'Your progress here will be lost.'}</p>`,[{t:'Keep fishing',cls:'green'},{t:'Leave',cls:'sec',f:()=>{S.streak=0;Meta.save();showMap()}}])};
 stage.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>booster(b.dataset.b));
 cv.onpointerdown=down;cv.onpointerup=cv.onpointercancel=cv.onpointerleave=up;
 if(n===1)Meta.tutorial('f1',[{text:'Welcome to <b>Cast & Catch</b>! 🎣 Let\'s fish the Deschutes River near Tumwater.'},{text:'<b>Press and hold</b> to power up your cast, then <b>let go</b>. Longer casts find bigger fish!',el:()=>cv,wait:d=>{tutW.cast=d}},{text:'Watch the bobber. When it <b>dives under</b> with a big ❗, <b>TAP</b> fast to hook it!',pos:'top',wait:d=>{tutW.hook=d}},{text:'Now <b>hold to reel</b>. Let go when the line gets <b>red</b> so it doesn\'t snap!',pos:'top',wait:d=>{tutW.reel=d}}]);
 if(n===3)Meta.tutorial('lure',[{text:'Need a certain fish? 🎯 The Species Lure lets <b>you pick</b> which fish bites next.',el:()=>$('#boost')}])}
const tutW={};
function resize(){if(!cv)return;const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*devicePixelRatio;cv.height=H*devicePixelRatio;cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
addEventListener('resize',resize);
function upd(){if(!F)return;const g=$('#goal');if(!g)return;g.textContent=F.T.txt;$('#cs').textContent='🎣 '+F.casts;$('#gBar').style.width=Math.min(100,prog(F.T,F)*100)+'%';stage.querySelectorAll('[data-b] span').forEach(s=>s.textContent=S.boosters[s.parentNode.dataset.b]||0)}
let holding=false;
function down(e){if(!F||F.over)return;Meta.sfx('tap');holding=true;
 if(F.st==='aim'){if(F.casts<=0)return;F.st='power';F.pow=0;F.powDir=1}
 else if(F.st==='wait'){if(F.bite>0){hook(F.bite)}else if(F.nibble>0){F.st='aim';F.bob=null;Meta.toast('Too early! It swam off 🐟');Meta.sfx('splash');endCast(false)}}
}
function up(){holding=false;if(F&&F.st==='power'){cast()}}
function cast(){const maxD=.6+G.gear.rod*.04;F.dist=Math.max(.15,F.pow)*maxD;F.st='fly';F.t=0;F.casts--;Meta.sfx('whoosh');if(F.pow>.85)Meta.track('farCasts',1);upd();if(tutW.cast){const d=tutW.cast;tutW.cast=null;d()}}
function pickFish(){const L=F.L;if(F.lure!=null){const fi=F.lure;F.lure=null;return fi}
 const ws=L.fish.map((f,fi)=>{let w=f[4];if(fi>=3)w*=1+F.dist*2;if(F.T.t==='species'&&fi===F.T.sp)w*=F.T.boss?5:3;return w});
 let r=Math.random()*ws.reduce((a,b)=>a+b,0);for(let i=0;i<ws.length;i++){if(r<ws[i])return i;r-=ws[i]}return 0}
function hook(q){const perfect=q>.55;F.st='reel';const fi=pickFish(),f=F.L.fish[fi];const r=Math.random();let w=f[2]+(f[3]-f[2])*Math.pow(r,1.8)*(0.75+F.dist*.4);w=Math.min(f[3],Math.round(w*10)/10);
 F.fish={fi,f,w,fight:f[5]*(0.6+0.4*(w-f[2])/(f[3]-f[2]+.01)),ph:Math.random()*6};F.tension=20;F.progress=.3;F.strongNow=F.strong;F.strong=false;
 Meta.hap('Heavy');Meta.sfx('splash');Meta.fx.shake();if(perfect){Meta.track('perfectHooks',1);Meta.toast('⚡ Perfect hook!');F.progress=.45}
 if(tutW.hook){const d=tutW.hook;tutW.hook=null;setTimeout(d,200)}}
function endCast(caught){upd();if(F.over)return;const p=prog(F.T,F);if(p>=1){F.over=true;setTimeout(win,700);return}
 if(F.casts<=0){F.over=true;setTimeout(()=>fail(p),700)}}
function land(){const fsh=F.fish,f=fsh.f;F.st='show';F.caught.push({fi:fsh.fi,w:fsh.w});const id=F.L.id+'_'+fsh.fi;const isNew=!S.album[id];
 Meta.track('catches',1);Meta.track('lbs',fsh.w);if(fsh.w>=100)Meta.track('monsters',1);const rec=!G.rec[f[0]]||fsh.w>G.rec[f[0]];if(rec)G.rec[f[0]]=fsh.w;
 if(isNew){Meta.track('newSpecies',1);S.album[id]=Date.now();Meta.track('collected',1)}
 const coins=Math.max(5,Math.round(f[6]*Math.sqrt(fsh.w)*(1+F.T.li*.3)));Meta.addCoins(coins,innerWidth/2,innerHeight*.4);Meta.fillVault(coins*.25);
 Meta.sfx(isNew?'levelup':'win');Meta.fx.burst(innerWidth/2,innerHeight*.45,['#7fdcff','#fff','#36c2ff'],30,7);if(isNew)Meta.fx.confetti();
 F.show={fsh,isNew,rec,coins,t:0};Meta.save();Meta.badges();upd();
 if(tutW.reel){const d=tutW.reel;tutW.reel=null;d()}}
function lost(why){F.st='aim';F.fish=null;Meta.sfx('lose');Meta.hap('Heavy');Meta.toast(why==='snap'?'💥 Snap! The line broke':'🐟 It got away!');endCast(false)}
function booster(k){if(!F||F.over)return;if(k==='lure'&&F.st!=='aim'){Meta.toast('Use the lure before you cast');return}
 if((S.boosters[k]||0)<=0){const c=cfg.boosters[k];Meta.modal(`<h2>${c.icon} ${c.name}</h2><p class="tc">${c.desc}</p>`,[{t:`Buy 🪙${c.cost}`,cls:'green',f:()=>{if(Meta.spend(c.cost)){Meta.addBooster(k,1);upd()}}},{t:'📺 Get 1 free',cls:'blue',f:()=>Meta.rewardAd('booster',ok=>{if(ok){Meta.addBooster(k,1);upd()}})},{t:'Cancel',cls:'sec'}]);return}
 if(k==='lure'){const m=Meta.modal(`<h2>🎯 Pick your fish</h2>`+F.L.fish.map((f,i)=>`<div class="card row"><span style="flex:1">${S.album[F.L.id+'_'+i]?f[0]:'??? (new!)'}</span><button class="btn green" data-f="${i}">Pick</button></div>`).join(''),[{t:'Cancel',cls:'sec'}]);
  m.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{Meta.useBooster(k);F.lure=+b.dataset.f;Meta.closeModal();Meta.toast('🎯 Lure set!');upd()});return}
 Meta.useBooster(k);Meta.sfx('levelup');if(k==='bait'){F.bait=true;Meta.toast('🪱 Super Bait on!')}if(k==='strong'){F.strong=true;if(F.st==='reel')F.strongNow=true;Meta.toast('💪 Strong Line on!')}upd()}
function fail(p){Meta.busy=false;const pct=Math.round(p*100);
 Meta.lose({title:'Out of casts!',nearMiss:p>=.6?`You were <b>${pct}%</b> of the way there!`:'',extraLabel:'+3 Casts',extraCost:250,
  onExtra:()=>{F.over=false;Meta.busy=true;F.casts+=3;F.st='aim';upd()},
  onGiveUp:()=>Meta.modal(`<h2>Challenge ${F.n}</h2><p class="tc">Tip: upgrade your 🎣 rod to cast farther, and try a 🎯 Species Lure.</p>`,[{t:'🔄 Try again',cls:'green',f:()=>startFish(F.n)},{t:'🎣 Tackle Shop',f:showGear},{t:'Map',cls:'sec',f:showMap}],{dismiss:false})})}
function win(){if(F.won)return;F.over=true;F.won=true;Meta.busy=false;const ratio=F.casts/F.casts0;const stars=ratio>=.34?3:ratio>=.15?2:1;const prev=S.stars[F.n]||0;S.stars[F.n]=Math.max(prev,stars);const first=F.n===S.level;
 const base=Math.round((60+F.n*8)*(first?1:.3)*(F.T.boss?2:1));const total=Meta.win({stars,coins:base});if(first)S.level++;Meta.save();Meta.sfx('win');Meta.fx.confetti();
 const nT=S.level<=MAXL?challenge(S.level):null;
 const m=Meta.modal(`<h2>Challenge won! 🎉</h2><p class="tc" style="font-size:44px;margin:0" id="stars">☆☆☆</p><p class="tc" style="font-size:24px;font-weight:900">🪙 ${Meta.fmt(total)}</p>${S.streak>1?`<p class="tc">🔥 ${S.streak} in a row! +${Math.round((Meta.streakMult()-1)*100)}%</p>`:''}<p class="tc small">${F.caught.length} fish · ${F.caught.reduce((a,c)=>a+c.w,0).toFixed(1)} lb · ${F.casts} casts left</p>${nT?`<div class="card tc">Next: <b>${nT.txt}</b>${nT.boss?' 👑':''}</div>`:''}`,[
  {t:'▶ Next',cls:'green',f:()=>{Meta.addCoins(total,innerWidth/2,innerHeight/2);nT?preview(S.level):showMap()}},
  {t:'📺 Coins ×2',cls:'blue',f:()=>Meta.rewardAd('win2x',ok=>{Meta.addCoins(total*(ok?2:1),innerWidth/2,innerHeight/2);showMap()})},
  {t:'Map',cls:'sec',f:()=>{Meta.addCoins(total,innerWidth/2,innerHeight/2);showMap()}}],{dismiss:false});
 let s=0;const el=m.querySelector('#stars');const iv=setInterval(()=>{if(s>=stars){clearInterval(iv);return}s++;el.textContent='⭐'.repeat(s)+'☆'.repeat(3-s);Meta.sfx('star')},300);Meta.maybeStarter()}

/* ---------- loop ---------- */
let last=performance.now(),T=0,reelTick=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;if(mode!=='fish'||!F||!cx)return;step(dt);draw()}
function step(dt){F.t+=dt;
 if(F.st==='power'){F.pow+=F.powDir*dt*1.3;if(F.pow>1){F.pow=1;F.powDir=-1}if(F.pow<0){F.pow=0;F.powDir=1}}
 if(F.st==='fly'&&F.t>=.7){F.st='wait';F.t=0;F.bite=0;F.nibble=0;F.biteAt=(F.bait?.6:1.5+Math.random()*2.5);F.nibbles=F.bait?0:Math.floor(Math.random()*3);Meta.sfx('splash');F.ripples.push({x:bobX(),y:bobY(),t:0})}
 if(F.st==='wait'){const win=(.7+G.gear.rod*.05)*(F.bait?1.6:1);
  if(F.bite>0){F.bite-=dt/win;if(F.bite<=0){F.bite=0;F.st='aim';F.bait=false;Meta.toast('Missed it! 🐟');Meta.sfx('err');endCast(false)}}
  else if(F.nibble>0){F.nibble-=dt*3}
  else if(F.nibbles>0&&F.t>F.biteAt*.5&&Math.random()<dt*1.5){F.nibbles--;F.nibble=1;Meta.sfx('tap');F.ripples.push({x:bobX(),y:bobY(),t:0})}
  else if(F.t>=F.biteAt){F.bite=1;F.bait=false;Meta.sfx('splash');Meta.hap('Medium');F.ripples.push({x:bobX(),y:bobY(),t:0})}}
 if(F.st==='reel'){const fs=F.fish;fs.ph+=dt*(1.5+fs.fight*.3);const pull=fs.fight*(.45+.55*Math.max(0,Math.sin(fs.ph)))*(Math.sin(fs.ph*.37)>.85?1.8:1);
  const maxT=100*(1+G.gear.line*.1),reelS=(.2+G.gear.reel*.025)/(1+fs.fight*.15);
  if(holding){F.tension+=(pull*16+8)*dt;F.progress+=reelS*dt*(1.2-pull/7);reelTick+=dt;if(reelTick>.06){reelTick=0;Meta.sfx('reel')}if(F.tension>maxT*.8)Meta.hap('Light')}
  else{F.tension=Math.max(0,F.tension-55*dt);F.progress-=pull*.022*dt}
  if(F.strongNow)F.tension=Math.min(F.tension,maxT*.95);
  if(F.tension>=maxT)lost('snap');else if(F.progress<=0)lost('away');else if(F.progress>=1)land()}
 if(F.st==='show'){F.show.t+=dt;if(F.show.t>2.2){F.st='aim';F.show=null;F.fish=null;endCast(true)}}
 F.ripples=F.ripples.filter(r=>(r.t+=dt)<1.5)}
const shoreY=()=>H*.82;
const bobX=()=>W*.5+Math.sin(F.n)*W*.12;
const bobY=()=>shoreY()-(F.dist||.3)*(shoreY()-H*.12);
function draw(){const L=F.L,sy=shoreY();
 const sky=cx.createLinearGradient(0,0,0,H*.15);sky.addColorStop(0,'#7cc6ff');sky.addColorStop(1,'#d8f0ff');cx.fillStyle=sky;cx.fillRect(0,0,W,H*.15);
 cx.fillStyle=L.col;cx.beginPath();cx.moveTo(0,H*.15);for(let x=0;x<=W;x+=20)cx.lineTo(x,H*.15-10-Math.abs(Math.sin(x*.03+F.n))*28);cx.lineTo(W,H*.15);cx.fill();
 cx.font='22px system-ui';for(let x=8;x<W;x+=34)cx.fillText('🌲',x,H*.15-4);
 const wg=cx.createLinearGradient(0,H*.15,0,sy);wg.addColorStop(0,L.water);wg.addColorStop(1,shade(L.water,-30));cx.fillStyle=wg;cx.fillRect(0,H*.15,W,sy-H*.15);
 cx.strokeStyle='rgba(255,255,255,.1)';for(let y=H*.2;y<sy;y+=22){cx.beginPath();for(let x=0;x<=W;x+=12)cx.lineTo(x,y+Math.sin(x/25+T*1.5+y)*3);cx.stroke()}
 cx.fillStyle='#7a5a32';cx.fillRect(0,sy,W,H-sy);cx.fillStyle='#5e4424';for(let x=0;x<W;x+=26)cx.fillRect(x,sy,3,H-sy);
 const rx=W*.5,ry=sy+12;cx.font='38px system-ui';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(G.gear.boat?'🚤':'🧍',rx-26,ry+8);
 const tipX=rx-4,tipY=sy-46;cx.strokeStyle='#3a2a1a';cx.lineWidth=3;cx.beginPath();cx.moveTo(rx-20,ry);cx.quadraticCurveTo(rx-12,sy-20,tipX,tipY);cx.stroke();cx.lineWidth=1;
 for(const r of F.ripples){cx.strokeStyle=`rgba(255,255,255,${.6-r.t*.4})`;cx.beginPath();cx.ellipse(r.x,r.y,8+r.t*30,3+r.t*10,0,0,7);cx.stroke()}
 if(F.st==='aim'||F.st==='power'){cx.fillStyle='rgba(255,255,255,.85)';cx.font='900 18px system-ui';cx.fillText(F.st==='aim'?(F.casts>0?'Press & hold to cast':''):'Let go to cast!',W/2,H*.5);
  if(F.lure!=null){cx.font='14px system-ui';cx.fillText('🎯 Lure: '+(S.album[L.id+'_'+F.lure]?L.fish[F.lure][0]:'???'),W/2,H*.5+24)}
  if(F.st==='power'){const bw=W*.6;cx.fillStyle='rgba(0,0,0,.5)';cx.fillRect((W-bw)/2,H*.58,bw,18);const g=cx.createLinearGradient((W-bw)/2,0,(W+bw)/2,0);g.addColorStop(0,'#3ec46d');g.addColorStop(.7,'#ffd54a');g.addColorStop(1,'#ff6b3a');cx.fillStyle=g;cx.fillRect((W-bw)/2,H*.58,bw*F.pow,18);cx.strokeStyle='#fff';cx.strokeRect((W-bw)/2,H*.58,bw,18);cx.fillStyle='#fff';cx.font='12px system-ui';cx.fillText('🐋 far = bigger fish',W/2,H*.58+34)}}
 let bx=bobX(),by=bobY();
 if(F.st==='fly'){const t=Math.min(1,F.t/.7);bx=tipX+(bx-tipX)*t;by=tipY+(by-tipY)*t-Math.sin(t*Math.PI)*H*.25}
 if(['fly','wait','reel'].includes(F.st)){let dy=0;if(F.st==='wait')dy=Math.sin(T*3)*2+(F.nibble>0?F.nibble*6:0)+(F.bite>0?10:0);
  if(F.st==='reel'){const pr=F.progress;bx=bobX()+(tipX-bobX())*pr*.85+Math.sin(F.fish.ph*2)*10;by=bobY()+(sy-20-bobY())*pr+Math.cos(F.fish.ph)*4}
  cx.strokeStyle='rgba(255,255,255,.8)';cx.beginPath();cx.moveTo(tipX,tipY);cx.quadraticCurveTo((tipX+bx)/2,Math.max(tipY,by)-(F.st==='reel'?-10:30),bx,by+dy);cx.stroke();
  if(F.st==='reel'){drawFish(bx,by+14,26,F.fish.f[1],Math.sin(F.fish.ph*3)*.3,.5);if(Math.random()<.2)Meta.fx&&0}
  else{cx.fillStyle='#ff3b30';cx.beginPath();cx.arc(bx,by+dy,7,Math.PI,0);cx.fill();cx.fillStyle='#fff';cx.beginPath();cx.arc(bx,by+dy,7,0,Math.PI);cx.fill()}
  if(F.st==='wait'&&F.bite>0){cx.font='900 40px system-ui';cx.fillStyle='#ffe14a';cx.fillText('❗',bx,by-34);cx.font='900 22px system-ui';cx.fillStyle='#fff';cx.fillText('TAP!',bx,by-66)}}
 if(F.st==='reel'){const maxT=100*(1+G.gear.line*.1),tn=F.tension/maxT;const bx2=W-34,bh=H*.5,by2=H*.18;cx.fillStyle='rgba(0,0,0,.5)';cx.fillRect(bx2,by2,20,bh);
  cx.fillStyle='rgba(62,196,109,.35)';cx.fillRect(bx2,by2+bh*.25,20,bh*.5);cx.fillStyle=tn>.8?'#ff3b30':tn>.6?'#ffcc00':'#3ec46d';cx.fillRect(bx2,by2+bh*(1-tn),20,bh*tn);cx.strokeStyle='#fff';cx.strokeRect(bx2,by2,20,bh);
  cx.fillStyle='#fff';cx.font='11px system-ui';cx.fillText('LINE',bx2+10,by2-8);if(F.strongNow){cx.fillText('💪',bx2+10,by2+bh+14)}
  const pw=W*.55;cx.fillStyle='rgba(0,0,0,.5)';cx.fillRect((W-pw)/2,H*.1,pw,12);cx.fillStyle='#36c2ff';cx.fillRect((W-pw)/2,H*.1,pw*F.progress,12);cx.fillStyle='#fff';cx.font='900 16px system-ui';cx.fillText(holding?'Reeling…':'HOLD to reel',W/2,H*.1+30);
  if(tn>.8){cx.fillStyle='#ff3b30';cx.fillText('Let go!',W/2,H*.1+52)}}
 if(F.st==='show'&&F.show){const s=F.show,t=Math.min(1,s.t*3);cx.fillStyle=`rgba(0,0,0,${.55*t})`;cx.fillRect(0,0,W,H);cx.save();cx.translate(W/2,H*.42);cx.scale(t,t);
  cx.fillStyle='#fffbe8';rrect(-W*.42,-110,W*.84,220,18);cx.fill();drawFish(0,-30,70,s.fsh.f[1],Math.sin(T*6)*.1,1);cx.fillStyle='#1b2a3a';cx.font='900 22px system-ui';cx.fillText(s.fsh.f[0],0,40);cx.font='800 18px system-ui';cx.fillText(s.fsh.w.toFixed(1)+' lb   🪙 '+s.coins,0,68);
  if(s.isNew||s.rec){cx.fillStyle=s.isNew?'#ff3b30':'#e8a400';cx.font='900 16px system-ui';cx.fillText(s.isNew?'⭐ NEW SPECIES! ⭐':'🏅 New record!',0,-92)}cx.restore()}}
function rrect(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath()}
function drawFish(x,y,s,col,rot,alpha){cx.save();cx.translate(x,y);cx.rotate(rot);cx.globalAlpha=alpha>=1?1:.9;
 cx.fillStyle=shade(col,-25);cx.beginPath();cx.moveTo(-s*.9,0);cx.lineTo(-s*1.4,-s*.45);cx.lineTo(-s*1.3,0);cx.lineTo(-s*1.4,s*.45);cx.closePath();cx.fill();
 const g=cx.createLinearGradient(0,-s*.45,0,s*.45);g.addColorStop(0,shade(col,-20));g.addColorStop(.5,col);g.addColorStop(1,shade(col,50));cx.fillStyle=g;cx.beginPath();cx.ellipse(0,0,s,s*.42,0,0,7);cx.fill();
 cx.fillStyle=shade(col,-30);cx.beginPath();cx.moveTo(-s*.2,-s*.38);cx.quadraticCurveTo(s*.1,-s*.75,s*.35,-s*.36);cx.fill();
 cx.fillStyle='#fff';cx.beginPath();cx.arc(s*.62,-s*.08,s*.11,0,7);cx.fill();cx.fillStyle='#111';cx.beginPath();cx.arc(s*.65,-s*.08,s*.06,0,7);cx.fill();cx.restore();cx.globalAlpha=1}
function shade(hex,p){const n=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,v+p));return`rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`}
requestAnimationFrame(loop);

showMap();
if(S.tut.f1)Meta.launchPopups();else Meta.queue(()=>Meta.modal(`<h2>🎣 Cast & Catch</h2><p class="tc">Fish real Northwest waters, from the Deschutes River to the Pacific off Westport. Fill your Fish Journal and land a giant!</p>`,[{t:'▶ Go fishing',cls:'green',f:()=>startFish(1)}],{dismiss:false}));
window.__game={S,G,startFish,showMap,showGear,get F(){return F},challenge,down,up,win,LOCS};
})();
