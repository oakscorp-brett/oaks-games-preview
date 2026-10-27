/* Dozer & Dig Tycoon — idle/tycoon land clearing & excavation (Oaks Corp) */
(function(){
'use strict';
const REGIONS=[
 {name:'Tenino Backroads',sub:'Where it all started',col:'#4f7a35',trees:['fir','alder'],ground:'#6d8a3e'},
 {name:'Thurston Valley',sub:'Farms, driveways and shop pads',col:'#7a8a2e',trees:['maple','oak'],ground:'#7d8b45'},
 {name:'Olympic Foothills',sub:'Big timber, wet ground',col:'#2f6d4f',trees:['cedar','spruce'],ground:'#4f7a4a'},
 {name:'Cascade Pass',sub:'Rocky mountain jobs',col:'#5a6a7a',trees:['hemlock','noble'],ground:'#6f7b6a'},
 {name:'Columbia Basin',sub:'Wide open land, huge contracts',col:'#a8803a',trees:['ponderosa','juniper'],ground:'#a89058'}];
const PER=20,JOBS=REGIONS.length*PER;
const TREES={fir:['🌲','Douglas Fir',''],alder:['🌳','Red Alder','Fast-growing; often first to sprout after a clearing.'],
 maple:['🍁','Bigleaf Maple','Has the largest leaves of any maple, up to 2 feet wide.'],oak:['🌳','Oregon White Oak','The only native oak in Washington.'],
 cedar:['🌲','Western Red Cedar','Smells great and resists rot. Can live over 1,000 years.'],spruce:['🌲','Sitka Spruce','The biggest spruce in the world; loves foggy coasts.'],
 hemlock:['🌲','Western Hemlock','Washington\'s state tree! Its top droops like a nodding head.'],noble:['🎄','Noble Fir','A favorite Christmas tree, grown in the Cascades.'],
 ponderosa:['🌲','Ponderosa Pine','Its bark smells like vanilla or butterscotch.'],juniper:['🌳','Western Juniper','A tough tree of dry Eastern Washington.']};
/* fix fact: Washington's state tree is Western Hemlock; Douglas fir is Oregon's */
TREES.fir[2]='Oregon\'s state tree and the top timber tree of the Northwest.';
const MACH=[
 {id:'dozer',name:'Bulldozer',icon:'🚜',eff:{clear:1,grade:1.2,haul:.5,dig:.4},mc:40,mp:1,unlock:1},
 {id:'skid',name:'Skid Steer',icon:'🛻',eff:{clear:.6,grade:1,haul:.9,dig:.5},mc:120,mp:1.1,unlock:3},
 {id:'dump',name:'Dump Truck',icon:'🚚',eff:{haul:1.6},mc:300,mp:1.2,unlock:6},
 {id:'exc',name:'Excavator',icon:'🏗️',eff:{dig:1.6,clear:.8,haul:.6},mc:700,mp:1.2,unlock:10},
 {id:'mulch',name:'Forestry Mulcher',icon:'⚙️',eff:{clear:2},mc:1500,mp:1.3,unlock:16}];
const CREW=['Big Mike','Dusty','Jo','Hank','Rosie','Tank','Sawyer','Lou','Birdie','Gus'];
const KIND={tree:{w:'clear',hp:2,next:'stump'},brush:{w:'clear',hp:1,next:'rough'},stump:{w:'clear',hp:1,next:'rough'},rock:{w:'haul',hp:2,next:'rough'},
 mound:{w:'haul',hp:2,next:'rough'},dig:{w:'dig',hp:3,next:'pit'},rough:{w:'grade',hp:1,next:'level'},level:{done:1},pit:{done:1}};
const JTYPES=[
 {n:'Lot Clearing',ic:'🌲',mix:{tree:.45,brush:.25,stump:.1,rough:.2}},
 {n:'Driveway Cut',ic:'🛣️',mix:{tree:.2,rock:.2,mound:.2,rough:.4}},
 {n:'Shop Foundation',ic:'🏠',mix:{dig:.45,rough:.3,mound:.15,rock:.1}},
 {n:'Haul-Off',ic:'🚚',mix:{rock:.4,mound:.4,stump:.2}},
 {n:'Land Clearing',ic:'🌲',mix:{tree:.6,stump:.15,brush:.25}},
 {n:'Pond Dig',ic:'💧',mix:{dig:.6,mound:.2,tree:.2}}];
const COLS=6,ROWS=8;
const payout=D=>Math.round(80*Math.pow(1.1,D));
const hpMul=D=>Math.pow(1.1,D);
const ePow=D=>Math.pow(1.09,D);
const mPower=(m,l)=>m.mp*Math.pow(1.1,l-1);
const upCost=(m,l)=>Math.round(m.mc*Math.pow(1.21,l-1));
const buyCost=m=>m.mc*4;
const crewCost=n=>Math.round(250*Math.pow(1.7,n));

let mode='map',J=null;
const cfg={id:'dozerdig',title:'Dozer & Dig Tycoon',coinIcon:'💵',coinName:'Cash',accent:'#f5b82e',bg:'#2b2416',panel:'#3a3020',
 coinScale:()=>Math.pow(1.1,Math.max(0,Meta.S.level-1)),coinStore:[600,4000,10000],
 boosters:{fuel:{name:'Jerry Can',icon:'⛽',desc:'+15 fuel on a job',cost:150},rip:{name:'Ripper Blast',icon:'💥',desc:'Clears a 3×3 patch instantly',cost:250},rush:{name:'Rush Crew',icon:'⚡',desc:'Machines work 3× faster for 20s',cost:200}},
 bundleBoosters:{fuel:2,rip:2,rush:2},starterName:'Owner-Operator Starter Pack',starterBoosters:{fuel:5,rip:5,rush:5},starterExtra:'+ Gold-paint Dozer badge',
 passName:'Contractor Pass',goldTrack:'Gold Hardhat Track',vaultName:'Cash Box',eventName:'Weekend Mega Job',eventIcon:'🏗️',eventTrophy:'🏅 Mega Job Trophy',
 eventHow:'Points for every tree, load and finished job.',eventPoints:{trees:1,loads:1,digs:1,wins:20,perfect:10},passXp:{trees:.3,loads:.3,digs:.3},
 taskPool:[{stat:'trees',text:'Clear {n} trees',n:[15,40,90]},{stat:'loads',text:'Haul {n} loads',n:[10,30,70]},{stat:'digs',text:'Dig {n} spots',n:[8,25,60]},{stat:'grades',text:'Grade {n} spots',n:[20,50,120]},
  {stat:'wins',text:'Finish {n} jobs',n:[2,4,6]},{stat:'perfect',text:'Get 3 stars on {n} jobs',n:[1,2,4]},{stat:'upgrades',text:'Upgrade machines {n} times',n:[3,6,10]},{stat:'boostersUsed',text:'Use {n} boosters',n:[1,2,3]},{stat:'collects',text:'Collect yard cash {n} times',n:[2,4,6]}],
 achievements:[{id:'trees',name:'Tree Clearer',icon:'🌲',stat:'trees',goals:[50,500,5000],text:'Clear {n} trees'},{id:'loads',name:'Hauler',icon:'🚚',stat:'loads',goals:[50,500,5000],text:'Haul {n} loads'},
  {id:'digs',name:'Digger',icon:'🏗️',stat:'digs',goals:[50,400,3000],text:'Dig {n} spots'},{id:'wins',name:'Contractor',icon:'📋',stat:'wins',goals:[10,50,100],text:'Finish {n} jobs'},
  {id:'stars',name:'Star Crew',icon:'⭐',stat:'stars',goals:[30,150,300],text:'Earn {n} stars'},{id:'streak',name:'On a Roll',icon:'🔥',stat:'bestStreak',goals:[5,10,25],text:'Win streak of {n}'},
  {id:'ups',name:'Gearhead',icon:'🔧',stat:'upgrades',goals:[10,50,200],text:'Upgrade {n} times'},{id:'crew',name:'Boss',icon:'👷',stat:'crewHired',goals:[3,6,10],text:'Hire {n} operators'},
  {id:'tycoon',name:'Tycoon',icon:'💰',stat:'coinsEarned',goals:[1e4,1e6,1e8],text:'Earn {n} cash'}],
 album:{title:'Company Album',icon:'📒',hint:'Clear trees in each region, buy machines and hire crew.',sets:[
  {id:'trees',name:'Northwest Trees',items:Object.entries(TREES).map(([k,v])=>({id:'t_'+k,icon:v[0],name:v[1],desc:v[2]})),reward:{coins:3000,boosters:{rip:3}}},
  {id:'mach',name:'The Fleet',items:MACH.map(m=>({id:'m_'+m.id,icon:m.icon,name:m.name})),reward:{coins:2000,boosters:{rush:3}}},
  {id:'crew',name:'The Crew',items:CREW.slice(0,8).map(c=>({id:'c_'+c,icon:'👷',name:c})),reward:{coins:4000,boosters:{fuel:5}}},
  {id:'reg',name:'Regions',items:REGIONS.map((r,i)=>({id:'r_'+i,icon:['🏡','🌾','⛰️','🏔️','🌵'][i],name:r.name})),reward:{coins:8000,boosters:{fuel:3,rip:3,rush:3}}}]},
 onHud(){const m=Meta.$('#hudMid');if(m)m.textContent=mode==='job'&&J?`${J.t.ic} Job ${J.n}`:`⭐ ${totalStars()} · Job ${Meta.S.level}`}
};
const S=Meta.init(cfg);
const G=S.game;if(!G.m){G.m={dozer:1};G.crew=0;G.bank=0;G.lastTick=Date.now()}
S.album.m_dozer=S.album.m_dozer||1;S.album.r_0=S.album.r_0||1;
const $=Meta.$,stage=$('#stage');
function totalStars(){return Object.values(Meta.S.stars).reduce((a,b)=>a+b,0)}
const owned=()=>MACH.filter(m=>G.m[m.id]);
const income=()=>{let s=0;for(const m of owned())s+=G.m[m.id]*m.mc*.02;return s*(1+G.crew*.15)*Math.pow(1.6,Math.floor((S.level-1)/PER))};
const bankCap=()=>income()*8*3600;

/* ---------- idle tick ---------- */
function tickIdle(){const now=Date.now(),dt=Math.min(8*3600,(now-G.lastTick)/1000);G.lastTick=now;G.bank=Math.min(bankCap(),G.bank+income()*dt);if(mode==='yard')updBank()}
const off=Meta.offlineSec;tickIdle();setInterval(()=>{tickIdle();Meta.save()},1000);

/* ---------- screens ---------- */
function tabs(){return`<div class="tabs"><button id="tMap" class="${mode==='map'?'on':''}">🗺️ Jobs</button><button id="tYard" class="${mode==='yard'?'on':''}">🏭 Yard${G.bank>income()*60?' 💵':''}</button></div>`}
function bindTabs(){$('#tMap').onclick=()=>{Meta.sfx('tap');showMap()};$('#tYard').onclick=()=>{Meta.sfx('tap');showYard()}}
function showMap(){mode='map';Meta.busy=false;J=null;Meta.hud();let h=tabs()+'<div style="position:absolute;top:48px;left:0;right:0;bottom:0"><div class="scroll" id="mapS">';
 for(let r=0;r<REGIONS.length;r++){const R=REGIONS[r];const unlocked=S.level>r*PER;
  h+=`<div class="region" style="background:${R.col}">${['🏡','🌾','⛰️','🏔️','🌵'][r]} ${R.name}<small>${unlocked?R.sub:'🔒 Finish job '+(r*PER)+' to unlock'}</small></div>`;
  for(let j=r*PER+1;j<=(r+1)*PER;j++){const x=50+Math.sin(j*.9)*30;const st=S.stars[j]||0;const cls=j<S.level?'done':j===S.level?'cur':'lock';
   h+=`<div style="display:flex;justify-content:${''}"><div class="node ${cls}" data-j="${j}" style="margin-left:calc(${x}% - 32px)">${j===S.level?'🚜':j}<span class="st">${'⭐'.repeat(st)}</span></div></div>`}}
 h+='<div class="region" style="background:#444">🚧 More regions coming soon!</div></div></div>';stage.innerHTML=h;bindTabs();
 stage.querySelectorAll('.node').forEach(n=>n.onclick=()=>{const j=+n.dataset.j;if(j>S.level){Meta.sfx('err');Meta.toast('Finish job '+S.level+' first!');return}preview(j)});
 const cur=stage.querySelector('.node.cur');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center'}),30)}
function jobType(n){return JTYPES[(n<4?0:n<6?[0,1][n%2]:n%JTYPES.length)]}
function preview(n){const t=jobType(n);Meta.modal(`<h2>${t.ic} Job ${n}: ${t.n}</h2><p class="tc">${REGIONS[Math.floor((n-1)/PER)].name}</p><p class="tc" style="font-size:22px;font-weight:900">Pays 💵 ${Meta.fmt(payout(n-1))}</p><p class="tc">${'⭐'.repeat(S.stars[n]||0)||'No stars yet'}</p><p class="tc small">Save fuel for more stars. Upgrade machines in the Yard to work faster.</p>`,[{t:'▶ Start Job',cls:'green',f:()=>startJob(n)},{t:'Back',cls:'sec'}])}
function showYard(){mode='yard';Meta.busy=false;Meta.hud();const rate=income();
 let h=tabs()+`<div style="position:absolute;top:48px;left:0;right:0;bottom:0"><div class="scroll">
 <div class="bank"><div class="small">Yard earnings (keep earning while you're away, up to 8 hours)</div><div style="font-size:30px;font-weight:900" id="bankTxt">💵 0</div><div class="small">💵 ${Meta.fmt(rate*60)}/min</div><div class="row c" style="margin-top:6px"><button class="btn green" id="col">Collect</button><button class="btn blue" id="col2">📺 Collect ×2</button></div></div>
 <h3>Machines</h3>`;
 for(const m of MACH){const l=G.m[m.id];const can=S.level>=m.unlock;
  h+=`<div class="card mach"><div class="ic">${can?m.icon:'🔒'}</div><div style="flex:1"><b>${m.name}</b> ${l?'Lv '+l:''}<br><span class="small">${Object.entries(m.eff).map(([k,v])=>k+(v>=1.5?' ★★':v>=1?' ★':'')).join(' · ')}${l?' · power '+Meta.fmt(mPower(m,l)*10):''}</span></div>
  ${!can?`<span class="small">Job ${m.unlock}</span>`:l?`<button class="btn" data-up="${m.id}">⬆ 💵${Meta.fmt(upCost(m,l))}</button>`:`<button class="btn green" data-buy="${m.id}">Buy 💵${Meta.fmt(buyCost(m))}</button>`}</div>`}
 h+=`<h3>Crew <span class="small">(each operator runs a machine by itself, +15% yard cash)</span></h3><div class="card mach"><div class="ic">👷</div><div style="flex:1"><b>${G.crew} operators</b><br><span class="small">${CREW.slice(0,G.crew).join(', ')||'Nobody yet, hire your first operator!'}</span></div>${G.crew<CREW.length?`<button class="btn" id="hire">Hire 💵${Meta.fmt(crewCost(G.crew))}</button>`:'Full crew!'}</div>
 <p class="small tc">Tip: Your machines on the job site only work by themselves when you have operators for them.</p></div></div>`;
 stage.innerHTML=h;bindTabs();updBank();
 $('#col').onclick=e=>collect(1,e);$('#col2').onclick=e=>{if(G.bank<1)return;Meta.rewardAd('yard',ok=>collect(ok?2:1,e))};
 stage.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const m=MACH.find(x=>x.id===b.dataset.up);if(Meta.spend(upCost(m,G.m[m.id]))){G.m[m.id]++;Meta.track('upgrades',1);Meta.sfx('levelup');Meta.hap('Medium');const r=b.getBoundingClientRect();Meta.fx.burst(r.left+r.width/2,r.top,['#ffd54a','#fff','#3ec46d'],18);Meta.fx.text(r.left+r.width/2,r.top,'Lv '+G.m[m.id]+'!');keepScroll(showYard)}});
 stage.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const m=MACH.find(x=>x.id===b.dataset.buy);if(Meta.spend(buyCost(m))){G.m[m.id]=1;Meta.track('upgrades',1);Meta.fx.confetti();Meta.sfx('win');Meta.collect('m_'+m.id);keepScroll(showYard)}});
 const hb=$('#hire');if(hb)hb.onclick=()=>{if(Meta.spend(crewCost(G.crew))){G.crew++;Meta.track('crewHired',1);Meta.collect('c_'+CREW[G.crew-1]);Meta.sfx('win');Meta.fx.confetti();keepScroll(showYard)}}}
function keepScroll(f){const s=stage.querySelector('.scroll'),t=s?s.scrollTop:0;f();const s2=stage.querySelector('.scroll');if(s2)s2.scrollTop=t;Meta.save()}
function updBank(){const b=$('#bankTxt');if(b)b.textContent='💵 '+Meta.fmt(G.bank)}
function collect(m,e){if(G.bank<1){Meta.toast('Nothing to collect yet');return}const n=G.bank*m;G.bank=0;Meta.track('collects',1);const r=(e&&e.target||$('#col')).getBoundingClientRect();Meta.addCoins(n,r.left+r.width/2,r.top);Meta.fx.burst(r.left+r.width/2,r.top,['#3ec46d','#ffd54a'],20);updBank()}

/* ---------- job site ---------- */
function startJob(n){mode='job';Meta.busy=true;const D=n-1,R=REGIONS[Math.floor(D/PER)],t=jobType(n),rnd=Meta.rng(Meta.hash('job'+n));const hm=hpMul(D);
 const tiles=[];let need=0;const mix=Object.entries(t.mix);
 const pre=Math.max(0,.5-D*.04);for(let i=0;i<COLS*ROWS;i++){let x=rnd(),k='rough';if(rnd()<pre){tiles.push({k:'level',hp:0,max:0,tree:'fir',wob:0});continue}for(const [kk,p] of mix){if(x<p){k=kk;break}x-=p}
  const tr=R.trees[Math.floor(rnd()*R.trees.length)];tiles.push({k,hp:0,max:0,tree:tr,wob:0});setHp(tiles[i],hm)}
 for(const tl of tiles){let k=tl.k;while(!KIND[k].done){need+=KIND[k].hp*hm;k=KIND[k].next}}
 const fuel=Math.ceil(need/ePow(D)*1.3)+6;
 J={n,D,R,t,tiles,fuel,fuel0:fuel,hm,mach:[],rush:0,over:false,stats:{trees:0,loads:0,digs:0,grades:0}};
 owned().forEach((m,i)=>J.mach.push({m,x:(i+.5)*innerWidth/6,y:innerHeight*.5,tx:null,tile:-1,cd:1+i*.3,on:i<G.crew}));
 stage.innerHTML=`<div id="job"><div id="jobtop"><button class="iconbtn" id="quit">✖</button><div style="flex:1"><div class="row"><b>⛽ Fuel</b><span id="fuelTxt" style="margin-left:auto;font-weight:900"></span></div><div class="bar"><i id="fuelBar"></i></div></div><div class="pill" id="leftTxt"></div></div>
 <canvas id="cv"></canvas><div id="boost">${Object.entries(cfg.boosters).map(([k,b])=>`<button data-b="${k}">${b.icon}<span>${S.boosters[k]||0}</span></button>`).join('')}</div></div>`;
 cv=$('#cv');cx=cv.getContext('2d');resize();Meta.hud();updJobHud();
 $('#quit').onclick=()=>Meta.modal('<h2>Leave this job?</h2><p class="tc">You\'ll lose progress on this job'+(S.streak>=2?' and your 🔥'+S.streak+' streak':'')+'.</p>',[{t:'Keep working',cls:'green'},{t:'Leave',cls:'sec',f:()=>{if(S.streak){S.streak=0;Meta.hud()}showMap()}}]);
 stage.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>booster(b.dataset.b,b));
 cv.onpointerdown=tap;
 if(n===1)Meta.tutorial('job1',[{text:'Welcome to <b>Dozer & Dig</b>! You run a land-clearing company. 🚜'},{text:'Tap a <b>tree</b> to knock it down. Keep tapping to clear the stump, then tap again to <b>grade</b> it smooth.',el:()=>cv,wait:d=>{tutWait=d}},{text:'Every tap uses <b>⛽ fuel</b>. Finish with fuel left over to earn ⭐⭐⭐!',el:()=>$('#fuelBar')},{text:'Clear the whole lot to get paid. Go for it!'}]);
 if(n===4)Meta.tutorial('boost',[{text:'Boosters help on tough jobs! 💥 Ripper Blast clears a whole patch at once.',el:()=>$('#boost')}])}
let tutWait=null,tutTaps=0;
function setHp(t,hm){const K=KIND[t.k];if(K.done){t.hp=t.max=0;return}t.max=t.hp=K.hp*hm}
let cv,cx,W,H,TS,OX,OY;
function resize(){if(!cv)return;const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*devicePixelRatio;cv.height=H*devicePixelRatio;cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);TS=Math.floor(Math.min(W/COLS,H/ROWS));OX=(W-TS*COLS)/2;OY=(H-TS*ROWS)/2}
addEventListener('resize',resize);
const tileXY=i=>[OX+(i%COLS)*TS,OY+Math.floor(i/COLS)*TS];
function bestPower(w){let b=0;for(const m of owned()){const e=m.eff[w]||0;b=Math.max(b,e*mPower(m,G.m[m.id]))}return Math.max(b,.3)}
function tap(e){if(!J||J.over)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const c=Math.floor((x-OX)/TS),rr=Math.floor((y-OY)/TS);if(c<0||c>=COLS||rr<0||rr>=ROWS)return;doTap(rr*COLS+c,e.clientX,e.clientY)}
function doTap(i,sx,sy){if(!J||J.over)return;const t=J.tiles[i];
 if(KIND[t.k].done){Meta.sfx('tap');return}
 if(J.fuel<=0)return;J.fuel--;hit(i,bestPower(KIND[t.k].w),true,sx,sy);updJobHud();
 if(tutWait&&++tutTaps>=3){const d=tutWait;tutWait=null;d()}
 if(J.fuel<=0&&!J.over)setTimeout(checkFail,500)}
function hit(i,pw,byTap,sx,sy){const t=J.tiles[i];const K=KIND[t.k];if(K.done)return;t.hp-=pw;t.wob=1;if(!byTap)J.lastProg=performance.now();const [tx,ty]=tileXY(i);const r=cv.getBoundingClientRect();const px=sx??r.left+tx+TS/2,py=sy??r.top+ty+TS/2;
 const col={clear:['#3d7a2a','#8b5a2b','#c49a5a'],haul:['#888','#aaa','#6b4a2a'],dig:['#5a3a1a','#7a4f25','#3a2510'],grade:['#c8a46a','#a07c45']}[K.w];
 Meta.fx.burst(px,py,col,byTap?10:6,byTap?5:3);if(byTap){Meta.fx.text(px,py-10,'-'+Meta.fmt(Math.max(1,pw)),'#fff',16);Meta.hap('Light')}
 Meta.sfx(K.w==='clear'?'chop':K.w==='grade'?'tap':'thud');
 if(t.hp<=0.001){const was=t.k;t.k=K.next;setHp(t,J.hm);
  if(was==='tree'){J.stats.trees++;Meta.track('trees',1);Meta.collect('t_'+t.tree);Meta.fx.emoji(px,py,'🍃',5)}
  if(K.w==='haul'){J.stats.loads++;Meta.track('loads',1)}if(K.w==='dig'){J.stats.digs++;Meta.track('digs',1)}if(K.w==='grade'){J.stats.grades++;Meta.track('grades',1);Meta.fx.burst(px,py,['#ffe14a','#fff'],12,4)}
  const cash=Math.round(payout(J.D)*.004)+1;S.coins+=cash;Meta.hud();if(byTap)Meta.fx.text(px,py-30,'+💵'+Meta.fmt(cash),'#7CFC9A',15);
  if(KIND[t.k].done){Meta.sfx('pop');if(left()===0)win()}}
 updJobHud()}
const left=()=>J.tiles.filter(t=>!KIND[t.k].done).length;
function updJobHud(){if(!J)return;const f=$('#fuelBar');if(!f)return;f.style.width=Math.max(0,J.fuel/J.fuel0*100)+'%';f.style.background=J.fuel/J.fuel0<.15?'#ff3b30':J.fuel/J.fuel0<.3?'#ffcc00':'';$('#fuelTxt').textContent=J.fuel+' / '+J.fuel0;
 const l=left();$('#leftTxt').textContent='🚧 '+l;stage.querySelectorAll('[data-b] span').forEach(s=>{s.textContent=S.boosters[s.parentNode.dataset.b]||0})}
function booster(k,b){if(!J||J.over)return;if(!Meta.useBooster(k)){Meta.modal(`<h2>${cfg.boosters[k].icon} ${cfg.boosters[k].name}</h2><p class="tc">${cfg.boosters[k].desc}</p>`,[{t:`Buy 💵${Meta.fmt(Math.round(cfg.boosters[k].cost*cfg.coinScale()))}`,cls:'green',f:()=>{if(Meta.spend(Math.round(cfg.boosters[k].cost*cfg.coinScale()))){Meta.addBooster(k,1);updJobHud()}}},{t:'📺 Get 1 free',cls:'blue',f:()=>Meta.rewardAd('booster',ok=>{if(ok){Meta.addBooster(k,1);updJobHud()}})},{t:'Cancel',cls:'sec'}]);return}
 Meta.sfx('levelup');Meta.hap('Heavy');Meta.fx.shake();
 if(k==='fuel'){J.fuel+=15;J.fuel0=Math.max(J.fuel0,J.fuel)}
 if(k==='rush'){J.rush=20;Meta.toast('⚡ Rush Crew! Machines go 3× faster')}
 if(k==='rip'){let best=-1,bs=-1;for(let i=0;i<J.tiles.length;i++){let s=0;nb(i).forEach(j=>{if(!KIND[J.tiles[j].k].done)s++});if(s>bs){bs=s;best=i}}nb(best).forEach(j=>{const t=J.tiles[j];let g=20;while(!KIND[t.k].done&&g--)hit(j,1e12,false)})}
 updJobHud()}
function nb(i){const c=i%COLS,r=Math.floor(i/COLS),a=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=c+dx,y=r+dy;if(x>=0&&x<COLS&&y>=0&&y<ROWS)a.push(y*COLS+x)}return a}
function checkFail(){if(!J||J.over||J.fuel>0||left()===0)return;if(J.mach.some(a=>a.on)&&performance.now()-(J.lastProg||0)<2500){setTimeout(checkFail,1000);return}const l=left(),pct=Math.round((1-l/(COLS*ROWS))*100);J.over=true;Meta.busy=false;
 Meta.lose({title:'Out of fuel!',nearMiss:l<=8?`Only <b>${l}</b> spot${l>1?'s':''} left! The job is ${pct}% done.`:'',extraLabel:'+15 Fuel',extraCost:Math.round(payout(J.D)*.6),
  onExtra:()=>{J.over=false;Meta.busy=true;J.fuel+=15;J.fuel0=Math.max(J.fuel0,J.fuel);updJobHud()},
  onGiveUp:()=>{Meta.modal(`<h2>Job not finished</h2><p class="tc">Tip: upgrade your machines in the 🏭 Yard so each tap does more work, and hire operators to help.</p>`,[{t:'🏭 Go to Yard',cls:'green',f:showYard},{t:'Retry',f:()=>startJob(J.n)}])}})}
function win(){J.over=true;Meta.busy=false;const ratio=J.fuel/J.fuel0;const stars=ratio>=.2?3:ratio>=.08?2:1;const prev=S.stars[J.n]||0;S.stars[J.n]=Math.max(prev,stars);
 const first=J.n===S.level;const base=payout(J.D)*(first?1:.5)+Math.max(0,stars-prev)*payout(J.D)*.2;const total=Meta.win({stars,coins:base});
 if(first){S.level++;if((S.level-1)%PER===0&&S.level<=JOBS){Meta.collect('r_'+Math.floor((S.level-1)/PER))}}
 Meta.save();Meta.sfx('win');Meta.fx.confetti();Meta.hap('Heavy');
 const nextT=jobType(S.level);
 setTimeout(()=>{const m=Meta.modal(`<h2>Job Complete! 🎉</h2><p class="tc" style="font-size:44px;margin:0" id="stars"></p><p class="tc" style="font-size:24px;font-weight:900">💵 ${Meta.fmt(total)}</p>${S.streak>1?`<p class="tc">🔥 ${S.streak} streak bonus +${Math.round((Meta.streakMult()-1)*100)}%</p>`:''}<p class="tc small">🌲 ${J.stats.trees} · 🚚 ${J.stats.loads} · 🏗️ ${J.stats.digs} · 🟫 ${J.stats.grades}</p>
  <div class="card tc">Next up: <b>${nextT.ic} Job ${S.level}</b> pays 💵${Meta.fmt(payout(S.level-1))}</div>`,[
  {t:'▶ Next Job',cls:'green',f:()=>{Meta.addCoins(total,innerWidth/2,innerHeight/2);S.level<=JOBS?startJob(S.level):showMap()}},
  {t:'📺 Cash ×2',cls:'blue',f:()=>Meta.rewardAd('win2x',ok=>{Meta.addCoins(total*(ok?2:1),innerWidth/2,innerHeight/2);showMap()})},
  {t:'Map',cls:'sec',f:()=>{Meta.addCoins(total,innerWidth/2,innerHeight/2);showMap()}}],{dismiss:false});
  let s=0;const el=m.querySelector('#stars');const iv=setInterval(()=>{if(s>=stars){clearInterval(iv);return}s++;el.textContent='⭐'.repeat(s)+'☆'.repeat(3-s);Meta.sfx('star')},300);
  if(S.level===3)Meta.queue(()=>Meta.tutorial('yard',[{text:'Nice work, boss! 💪 Open the <b>🏭 Yard</b> after this to upgrade your dozer and buy a Skid Steer.',pos:'top'}]));
  Meta.maybeStarter()},600)}

/* ---------- render loop ---------- */
let last=performance.now();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(mode!=='job'||!J||!cx)return;
 if(J.rush>0)J.rush-=dt;
 /* operators drive machines */
 for(const a of J.mach){if(!a.on||J.over)continue;a.cd-=dt*(J.rush>0?3:1)*(1+Math.max(0,G.crew-owned().length)*.1);
  if(a.tile<0||KIND[J.tiles[a.tile].k].done||!a.m.eff[KIND[J.tiles[a.tile].k].w]){a.tile=-1;let bd=1e9;for(let i=0;i<J.tiles.length;i++){const t=J.tiles[i];if(KIND[t.k].done)continue;const e=a.m.eff[KIND[t.k].w]||0;if(e<.75)continue;if(J.mach.some(o=>o!==a&&o.tile===i))continue;const [x,y]=tileXY(i);const d=Math.hypot(x-a.x,y-a.y)/e;if(d<bd){bd=d;a.tile=i}}}
  if(a.tile>=0){const [x,y]=tileXY(a.tile);const tx=x+TS/2,ty=y+TS/2;a.x+=(tx-a.x)*Math.min(1,dt*4);a.y+=(ty-a.y)*Math.min(1,dt*4);
   if(a.cd<=0&&Math.hypot(tx-a.x,ty-a.y)<TS*.6){a.cd=1.3;const t=J.tiles[a.tile];hit(a.tile,(a.m.eff[KIND[t.k].w]||0)*mPower(a.m,G.m[a.m.id]),false)}}}
 draw()}
requestAnimationFrame(loop);
function draw(){cx.clearRect(0,0,W,H);cx.fillStyle=J.R.ground;cx.fillRect(0,0,W,H);
 for(let i=0;i<J.tiles.length;i++){const t=J.tiles[i];const [x,y]=tileXY(i);const k=t.k;
  cx.fillStyle=k==='level'?'#c9a66b':k==='pit'?'#4a2e14':k==='rough'||k==='stump'||k==='mound'||k==='rock'?'#8a6238':k==='dig'?'#9c7040':J.R.ground;cx.fillRect(x+1,y+1,TS-2,TS-2);
  if(k==='level'){cx.strokeStyle='rgba(255,255,255,.18)';cx.beginPath();for(let s=6;s<TS;s+=8){cx.moveTo(x+2,y+s);cx.lineTo(x+TS-2,y+s)}cx.stroke()}
  if(k==='pit'){cx.fillStyle='#2d1b0b';cx.fillRect(x+5,y+5,TS-10,TS-10)}
  if(k==='rough'){cx.fillStyle='#7a5530';for(let s=0;s<5;s++){cx.beginPath();cx.arc(x+((s*37)%TS),y+((s*53)%TS),4,0,7);cx.fill()}}
  if(k==='dig'){cx.setLineDash([5,4]);cx.strokeStyle='#ff9f1c';cx.lineWidth=2;cx.strokeRect(x+5,y+5,TS-10,TS-10);cx.setLineDash([]);cx.lineWidth=1}
  if(k==='mound'){cx.fillStyle='#6b4423';cx.beginPath();cx.ellipse(x+TS/2,y+TS*.62,TS*.4,TS*.3,0,Math.PI,0);cx.fill()}
  const em={tree:TREES[t.tree][0],brush:'🌿',stump:'🪵',rock:'🪨',dig:'📍'}[k];
  if(em){const w=t.wob>0?Math.sin(t.wob*20)*t.wob*4:0;t.wob=Math.max(0,t.wob-.06);cx.font=`${Math.floor(TS*(k==='tree'?.78:.6))}px system-ui`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(em,x+TS/2+w,y+TS/2)}
  if(!KIND[k].done&&t.hp<t.max){cx.fillStyle='rgba(0,0,0,.5)';cx.fillRect(x+6,y+TS-9,TS-12,5);cx.fillStyle='#3ec46d';cx.fillRect(x+6,y+TS-9,(TS-12)*Math.max(0,t.hp/t.max),5)}}
 cx.font=`${Math.floor(TS*.7)}px system-ui`;for(const a of J.mach)if(a.on){cx.save();cx.translate(a.x,a.y);if(a.cd>1.1){cx.translate(Math.sin(a.cd*60)*2,0)}cx.fillText(a.m.icon,0,0);cx.restore()}
 if(J.rush>0){cx.fillStyle='rgba(255,225,74,.15)';cx.fillRect(0,0,W,H)}}

/* ---------- launch ---------- */
showMap();
if(off>120&&G.bank>1&&S.tut.job1){Meta.queue(()=>Meta.modal(`<h2>Welcome back, boss! 👷</h2><p class="tc">Your yard earned while you were away:</p><p class="tc" style="font-size:28px;font-weight:900">💵 ${Meta.fmt(G.bank)}</p>`,[{t:'Collect',cls:'green',f:()=>collect(1)},{t:'📺 Collect ×2',cls:'blue',f:()=>Meta.rewardAd('offline',ok=>collect(ok?2:1))}]))}
if(S.tut.job1)Meta.launchPopups();
else Meta.queue(()=>Meta.modal(`<h2>🚜 Dozer & Dig Tycoon</h2><p class="tc">Start with one old dozer. Clear lots, dig foundations and haul dirt. Grow into the biggest outfit in Washington!</p>`,[{t:'▶ Start my company',cls:'green',f:()=>startJob(1)}],{dismiss:false}));
window.__game={S,G,doTap,MACH,upCost,buyCost,crewCost,income,payout,startJob,showYard,showMap,get J(){return J},win,hit};
})();
