/* Log Jam — sort colored logs onto matching trucks & rafts (Oaks Corp) */
(function(){
'use strict';
const WOODS=[
 ['Douglas Fir','#f08c2e','●','The Northwest\'s top timber tree. Can grow over 300 feet tall.'],
 ['Western Red Cedar','#d8342c','▲','Naturally rot-resistant, used for canoes and longhouses by Coast Salish peoples.'],
 ['Bigleaf Maple','#f5d33f','■','Its leaves can be as big as a dinner plate.'],
 ['Red Alder','#4caf50','◆','Grows fast and makes the soil richer for other trees.'],
 ['Blue-Stain Pine','#3b82f6','★','A harmless fungus turns this pine wood blue-gray!'],
 ['Pacific Madrone','#f06292','♥','Peels its own red bark every summer.'],
 ['Sitka Spruce','#f2eee0','✚','Light but strong; used to build the famous Spruce Goose plane.'],
 ['Western Hemlock','#8e5bd6','✿','Washington\'s state tree.'],
 ['Oregon White Oak','#8b5a2b','⬟','The only oak native to Washington.'],
 ['Black Cottonwood','#26c6da','☁','The tallest cottonwood; its seeds float like snow.'],
 ['Noble Fir','#b5e655','✦','A favorite Christmas tree from the Cascades.'],
 ['Western Larch','#555b66','☀','A conifer that turns gold and drops its needles each fall.']];
const CHAPTERS=[
 {name:'Logging Road',sub:'Load the trucks before the rain',bg:'#264d2e',raft:false,icon:'🚛'},
 {name:'Chehalis River',sub:'Float logs downstream on rafts',bg:'#1b4f6b',raft:true,icon:'🛶'},
 {name:'Tenino Mill Yard',sub:'Busy day at the mill',bg:'#5a4632',raft:false,icon:'🏭'},
 {name:'Cascade Ridge',sub:'Snowy mountain hauls',bg:'#4d6278',raft:false,icon:'🏔️'},
 {name:'Puget Sound Booms',sub:'Big rafts on salt water',bg:'#18465e',raft:true,icon:'⛴️'},
 {name:'Old Growth',sub:'The toughest puzzles',bg:'#1f3a24',raft:false,icon:'🌲'}];
const PER=20,MAXL=CHAPTERS.length*PER;
let mode='map',P=null;
const cfg={id:'logjam',title:'Log Jam',coinIcon:'🪙',coinName:'Coins',accent:'#ffb020',bg:'#173042',panel:'#233f52',coinStore:[1000,6000,15000],
 boosters:{undo:{name:'Undo',icon:'↩️',desc:'Take back your last move',cost:120},truck:{name:'Extra Truck',icon:'🚚',desc:'Adds one empty truck to this level',cost:300},hint:{name:'Lantern Hint',icon:'🔦',desc:'Shows a good next move',cost:150}},
 bundleBoosters:{undo:3,truck:1,hint:2},starterName:'Lumberjack Starter Pack',starterBoosters:{undo:10,truck:5,hint:5},starterExtra:'+ golden truck paint',
 passName:'Timber Pass',goldTrack:'Golden Axe Track',vaultName:'Coin Stump',eventName:'Weekend Log Drive',eventIcon:'🪵',eventTrophy:'🏅 Log Drive Trophy',
 eventHow:'Points for every truck you load and every level you win.',eventPoints:{trucks:3,wins:15,perfect:10},passXp:{trucks:2},
 taskPool:[{stat:'trucks',text:'Load {n} trucks',n:[15,30,60]},{stat:'wins',text:'Win {n} levels',n:[3,5,8]},{stat:'perfect',text:'Get 3 stars {n} times',n:[2,3,5]},{stat:'logs',text:'Move {n} logs',n:[80,150,300]},
  {stat:'boostersUsed',text:'Use {n} boosters',n:[1,2,3]},{stat:'combos',text:'Make {n} big moves (3+ logs at once)',n:[3,6,10]},{stat:'hardWins',text:'Beat {n} hard level',n:[1,1,2]}],
 achievements:[{id:'wins',name:'Sorter',icon:'🧩',stat:'wins',goals:[10,50,120],text:'Win {n} levels'},{id:'trucks',name:'Fleet Loader',icon:'🚛',stat:'trucks',goals:[50,500,3000],text:'Load {n} trucks'},
  {id:'stars',name:'Star Lumberjack',icon:'⭐',stat:'stars',goals:[30,150,360],text:'Earn {n} stars'},{id:'streak',name:'Hot Streak',icon:'🔥',stat:'bestStreak',goals:[5,10,25],text:'Win streak of {n}'},
  {id:'combo',name:'Big Mover',icon:'💪',stat:'combos',goals:[20,200,1000],text:'Move 3+ logs at once {n} times'},{id:'hard',name:'Tough Nut',icon:'🌰',stat:'hardWins',goals:[1,5,12],text:'Beat {n} hard levels'},
  {id:'logs',name:'Log Roller',icon:'🪵',stat:'logs',goals:[500,5000,30000],text:'Move {n} logs'}],
 album:{title:'Wood Collection',icon:'📗',hint:'New woods show up as you play. Tap one to read about it.',sets:[
  {id:'soft',name:'Softwoods',items:[0,6,7,10,11,4].map(i=>({id:'w'+i,icon:'🪵',name:WOODS[i][0],desc:WOODS[i][3]})),reward:{coins:1500,boosters:{truck:2}}},
  {id:'hard',name:'Hardwoods',items:[1,2,3,5,8,9].map(i=>({id:'w'+i,icon:'🪵',name:WOODS[i][0],desc:WOODS[i][3]})),reward:{coins:1500,boosters:{hint:3}}},
  {id:'places',name:'Places',items:CHAPTERS.map((c,i)=>({id:'c'+i,icon:c.icon,name:c.name})),reward:{coins:5000,boosters:{undo:5,truck:3,hint:3}}}]},
 onHud(){const m=Meta.$('#hudMid');if(m)m.textContent=mode==='play'&&P?`Level ${P.L}`:`⭐ ${Object.values(Meta.S.stars).reduce((a,b)=>a+b,0)} · Lv ${Meta.S.level}`}
};
const S=Meta.init(cfg);S.album.c0=S.album.c0||1;
const $=Meta.$,stage=$('#stage');
const reward=L=>40+L*4;

/* ---------- map ---------- */
function showMap(){mode='map';P=null;Meta.busy=false;Meta.hud();let h='<div class="scroll">';
 for(let c=0;c<CHAPTERS.length;c++){const C=CHAPTERS[c];h+=`<div class="region" style="background:${C.bg}">${C.icon} ${C.name}<small>${S.level>c*PER?C.sub:'🔒 Reach level '+(c*PER+1)}</small></div>`;
  for(let L=c*PER+1;L<=(c+1)*PER;L++){const x=50+Math.sin(L*.85)*30,st=S.stars[L]||0,pr=LJ.params(L);const cls=(L<S.level?'done':L===S.level?'cur':'lock')+(pr.hard?' hard':'');
   h+=`<div><div class="node ${cls}" data-l="${L}" style="margin-left:calc(${x}% - 30px)">${L===S.level?'🪵':L}<span class="st">${pr.hard&&L>=S.level?'💀':'⭐'.repeat(st)}</span></div></div>`}}
 h+='<div class="region" style="background:#444">🚧 More levels coming soon!</div><div style="height:70px"></div></div><button class="btn green playbtn" id="pbtn">▶ Level '+Math.min(S.level,MAXL)+'</button>';stage.innerHTML=h;
 stage.querySelectorAll('.node').forEach(n=>n.onclick=()=>{const L=+n.dataset.l;if(L>S.level){Meta.sfx('err');Meta.toast('Beat level '+S.level+' first!');return}startLevel(L)});
 $('#pbtn').onclick=()=>startLevel(Math.min(S.level,MAXL));
 const cur=stage.querySelector('.node.cur');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center'}),30)}

/* ---------- play ---------- */
let cv,cx,W,H;
function startLevel(L){const g=LJ.gen(L);if(!g){Meta.toast('Level error');return}mode='play';Meta.busy=true;const ch=Math.floor((L-1)/PER);
 const limit=g.par+Math.max(8,Math.ceil(g.par*.45));
 P={L,g,cap:g.cap,ch,C:CHAPTERS[ch],stacks:g.stacks.map((a,i)=>a.map((c,k)=>({c,h:g.hiddenMask[i][k]}))),moves:0,limit,par:g.par,sel:-1,hist:[],fly:[],done:new Set(),over:false,extra:false,hintM:null,bump:{}};
 for(let i=0;i<g.colors;i++)Meta.collect('w'+i);
 stage.innerHTML=`<div id="play"><div id="ptop"><button class="iconbtn" id="quit">✖</button><div style="flex:1"><div class="row"><b>Moves</b><span id="mv" style="margin-left:auto;font-weight:900"></span></div><div class="bar"><i id="mvBar"></i></div></div>${g.hard?'<span class="pill" style="background:#b3261e">💀 Hard</span>':''}<button class="iconbtn" id="rs">🔄</button></div>
 <canvas id="cv"></canvas><div id="boost">${Object.entries(cfg.boosters).map(([k,b])=>`<button data-b="${k}">${b.icon}<span>${S.boosters[k]||0}</span></button>`).join('')}</div></div>`;
 cv=$('#cv');cx=cv.getContext('2d');resize();Meta.hud();upd();
 $('#quit').onclick=()=>confirmLeave(showMap);$('#rs').onclick=()=>confirmLeave(()=>startLevel(L),'Restart');
 stage.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>booster(b.dataset.b));cv.onpointerdown=onTap;
 if(g.hard)Meta.toast('💀 Hard level! Double coins');
 if(L===1)Meta.tutorial('l1',[{text:'Welcome to <b>Log Jam</b>! 🪵 Each truck can carry <b>4 logs</b>.'},{text:'Tap a truck to pick up its top log, then tap another truck to drop it. You can only stack a log on the <b>same color</b> or in an <b>empty</b> truck.',el:()=>cv,wait:d=>{tutDone=d}},{text:'Fill every truck with one color to win! 🎉'}]);
 if(L===4)Meta.tutorial('boost',[{text:'Stuck? Boosters help! ↩️ Undo, 🚚 Extra Truck, and 🔦 Hint.',el:()=>$('#boost')}]);
 if(L===25)Meta.tutorial('hidden',[{text:'New: <b>muddy logs</b> ❓ You find out their color when they reach the top!'}])}
let tutDone=null;
function confirmLeave(f,word='Leave'){if(!P||P.moves===0||P.over){f();return}Meta.modal(`<h2>${word} level?</h2><p class="tc">${S.streak>=2?'You\'ll lose your 🔥'+S.streak+' win streak.':'Your progress on this level will be lost.'}</p>`,[{t:'Keep playing',cls:'green'},{t:word,cls:'sec',f:()=>{S.streak=0;Meta.save();Meta.hud();f()}}])}
function resize(){if(!cv)return;const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*devicePixelRatio;cv.height=H*devicePixelRatio;cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
addEventListener('resize',resize);
function layout(){const n=P.stacks.length;const perRow=n<=5?n:n<=10?Math.ceil(n/2):Math.ceil(n/3);const rows=Math.ceil(n/perRow);
 const sw=Math.min(84,(W-16)/perRow-8);const lh=Math.min(sw*.36,(H/rows-40)/P.cap);const sh=lh*P.cap+26;const gapY=(H-rows*sh)/(rows+1);const out=[];
 for(let i=0;i<n;i++){const r=Math.floor(i/perRow),c=i%perRow,inRow=Math.min(perRow,n-r*perRow);const rowW=inRow*(sw+8)-8;out.push({x:(W-rowW)/2+c*(sw+8),y:gapY+r*(sh+gapY),w:sw,h:sh,lh})}return out}
const runLen=a=>{if(!a.length)return 0;const t=a[a.length-1].c;let r=1;while(r<a.length&&a[a.length-1-r].c===t)r++;return r};
const isFull=a=>a.length===P.cap&&a.every(l=>l.c===a[0].c);
function onTap(e){if(!P||P.over)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const L=layout();const i=L.findIndex(b=>x>=b.x-4&&x<=b.x+b.w+4&&y>=b.y-20&&y<=b.y+b.h+10);if(i<0){P.sel=-1;return}
 const s=P.stacks[i];if(P.sel<0){if(!s.length||isFull(s)){Meta.sfx('err');P.bump[i]=1;return}P.sel=i;Meta.sfx('tap');Meta.hap('Light');return}
 if(P.sel===i){P.sel=-1;return}
 const a=P.stacks[P.sel],top=a[a.length-1];
 if(s.length>=P.cap||(s.length&&s[s.length-1].c!==top.c)){Meta.sfx('err');P.bump[i]=1;Meta.hap('Light');if(s.length&&!isFull(s)&&s.length<P.cap&&s[s.length-1].c!==top.c){P.sel=i;}else P.sel=-1;return}
 move(P.sel,i);P.sel=-1}
function move(from,to,isUndo){const a=P.stacks[from],b=P.stacks[to];const n=isUndo?isUndo:Math.min(runLen(a),P.cap-b.length);const moved=a.splice(a.length-n,n);
 const L=layout();moved.forEach((l,k)=>{P.fly.push({l,from,to,fi:a.length+k,ti:b.length+k,t:-k*.06})});b.push(...moved);
 if(a.length&&a[a.length-1].h){a[a.length-1].h=false;setTimeout(()=>{Meta.sfx('pop');const bb=layout()[from];if(bb){const rr=cv.getBoundingClientRect();Meta.fx.burst(rr.left+bb.x+bb.w/2,rr.top+bb.y+bb.h-26-a.length*bb.lh,['#7a5530','#c9a66b'],10,3)}},250)}
 if(!isUndo){P.moves++;P.hist.push([from,to,n]);Meta.track('logs',n);if(n>=3)Meta.track('combos',1);if(tutDone){const d=tutDone;tutDone=null;setTimeout(d,300)}}
 Meta.sfx('whoosh');P.hintM=null;
 setTimeout(()=>{checkDone(to);upd();if(!isUndo)afterMove()},320)}
function checkDone(i){const s=P.stacks[i];if(isFull(s)&&!P.done.has(i)){P.done.add(i);Meta.track('trucks',1);Meta.sfx('star');Meta.hap('Medium');const b=layout()[i],r=cv.getBoundingClientRect();
 Meta.fx.burst(r.left+b.x+b.w/2,r.top+b.y+b.h/2,[WOODS[s[0].c][1],'#fff','#ffe14a'],24,6);Meta.fx.text(r.left+b.x+b.w/2,r.top+b.y,'Loaded!','#ffe14a',18);P.bump[i]=1.5}
 if(!isFull(s))P.done.delete(i)}
function afterMove(){if(P.over)return;if(LJ.isDone(P.stacks.map(a=>a.map(l=>l.c)),P.cap)){win();return}
 if(P.moves>=P.limit){fail('moves');return}
 if(!LJ.legal(P.stacks.map(a=>a.map(l=>l.c)),P.cap).length)fail('stuck')}
function upd(){if(!P)return;const left=P.limit-P.moves;const mv=$('#mv');if(!mv)return;mv.textContent=left+' left';const b=$('#mvBar');b.style.width=Math.max(0,left/P.limit*100)+'%';b.style.background=left<=5?'#ff3b30':left<=10?'#ffcc00':'';
 stage.querySelectorAll('[data-b] span').forEach(s=>s.textContent=S.boosters[s.parentNode.dataset.b]||0)}
function unsorted(){return P.stacks.filter(a=>a.length&&!isFull(a)).length}
function fail(kind){P.over=true;Meta.busy=false;const u=unsorted();const colorsLeft=new Set(P.stacks.filter(a=>a.length&&!isFull(a)).flatMap(a=>a.map(l=>l.c))).size;
 const near=colorsLeft<=2?`Only <b>${colorsLeft}</b> color${colorsLeft>1?'s':''} left to sort!`:u<=3?`Just ${u} trucks left to load!`:'';
 Meta.lose({title:kind==='stuck'?'No moves left!':'Out of moves!',nearMiss:near,extraLabel:kind==='stuck'?'+1 Empty Truck':'+5 Moves',extraCost:kind==='stuck'?250:200,
  onExtra:()=>{P.over=false;Meta.busy=true;if(kind==='stuck')P.stacks.push([]);else P.limit+=5;upd()},
  onGiveUp:()=>Meta.modal(`<h2>Level ${P.L}</h2><p class="tc">So close! Want to try again?</p>`,[{t:'🔄 Try again',cls:'green',f:()=>startLevel(P.L)},{t:'Map',cls:'sec',f:showMap}],{dismiss:false})})}
function booster(k){if(!P||P.over)return;
 const canUse=k==='undo'?P.hist.length>0:k==='truck'?!P.extra:true;if(!canUse){Meta.toast(k==='undo'?'Nothing to undo':'Already added a truck');return}
 if(!Meta.useBooster(k)){const c=cfg.boosters[k];Meta.modal(`<h2>${c.icon} ${c.name}</h2><p class="tc">${c.desc}</p>`,[{t:`Buy 🪙${c.cost}`,cls:'green',f:()=>{if(Meta.spend(c.cost)){Meta.addBooster(k,1);upd()}}},{t:'📺 Get 1 free',cls:'blue',f:()=>Meta.rewardAd('booster',ok=>{if(ok){Meta.addBooster(k,1);upd()}})},{t:'Cancel',cls:'sec'}]);return}
 Meta.sfx('levelup');
 if(k==='undo'){const [f,t,n]=P.hist.pop();P.done.delete(t);move(t,f,n);P.moves=Math.max(0,P.moves-1)}
 if(k==='truck'){P.extra=true;P.stacks.push([]);Meta.toast('🚚 Extra truck!')}
 if(k==='hint'){const sol=LJ.solve(P.stacks.map(a=>a.map(l=>l.c)),P.cap,60000);if(sol&&sol.length){P.hintM=sol[0];Meta.toast('🔦 Try the glowing trucks')}else{Meta.toast('🔦 Try an Undo or Extra Truck!');Meta.addBooster('hint',1)}}
 upd()}
function win(){P.over=true;Meta.busy=false;const extra=P.moves-P.par;const stars=extra<=0?3:extra<=Math.ceil(P.par*.25)+2?2:1;const prev=S.stars[P.L]||0;S.stars[P.L]=Math.max(prev,stars);const first=P.L===S.level;
 if(P.g.hard)Meta.track('hardWins',1);
 const base=(first?reward(P.L):Math.round(reward(P.L)*.3))*(P.g.hard?2:1);const total=Meta.win({stars,coins:base});
 if(first&&S.level<MAXL+1){S.level++;if((S.level-1)%PER===0)Meta.collect('c'+Math.floor((S.level-1)/PER))}Meta.save();
 Meta.sfx('win');Meta.fx.confetti();Meta.hap('Heavy');
 /* trucks drive off */P.driveOff=0;
 setTimeout(()=>{const nx=LJ.params(S.level);const m=Meta.modal(`<h2>${['','Nice!','Great!','Perfect!'][stars]} 🎉</h2><p class="tc" style="font-size:44px;margin:0" id="stars">☆☆☆</p><p class="tc" style="font-size:24px;font-weight:900">🪙 ${Meta.fmt(total)}</p>${S.streak>1?`<p class="tc">🔥 ${S.streak} in a row! +${Math.round((Meta.streakMult()-1)*100)}% coins</p>`:''}<p class="tc small">${P.moves} moves · best is ${P.par}${stars<3?' (beat it for ⭐⭐⭐)':''}</p>
  ${S.level<=MAXL?`<div class="card tc">Next: <b>Level ${S.level}</b> ${nx.hard?'💀 Hard, double coins!':nx.easy?'😌 A quick one!':''}</div>`:''}`,[
  {t:'▶ Next Level',cls:'green',f:()=>{Meta.addCoins(total,innerWidth/2,innerHeight/2);S.level<=MAXL?startLevel(S.level):showMap()}},
  {t:'📺 Coins ×2',cls:'blue',f:()=>Meta.rewardAd('win2x',ok=>{Meta.addCoins(total*(ok?2:1),innerWidth/2,innerHeight/2);showMap()})},
  {t:'Map',cls:'sec',f:()=>{Meta.addCoins(total,innerWidth/2,innerHeight/2);showMap()}}],{dismiss:false});
  let s=0;const el=m.querySelector('#stars');const iv=setInterval(()=>{if(s>=stars){clearInterval(iv);return}s++;el.textContent='⭐'.repeat(s)+'☆'.repeat(3-s);Meta.sfx('star')},300);Meta.maybeStarter()},900)}

/* ---------- drawing ---------- */
function rr(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath()}
function drawLog(x,y,w,h,l,glow){const c=l.h?'#6b4a2a':WOODS[l.c][1];cx.fillStyle='rgba(0,0,0,.25)';rr(x+1,y+3,w,h-2,h/2);cx.fill();
 const g=cx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,shade(c,30));g.addColorStop(.5,c);g.addColorStop(1,shade(c,-35));cx.fillStyle=g;rr(x,y,w,h-2,h/2);cx.fill();
 cx.strokeStyle='rgba(0,0,0,.18)';cx.beginPath();cx.moveTo(x+h*.6,y+h*.35);cx.lineTo(x+w*.55,y+h*.35);cx.moveTo(x+w*.3,y+h*.65);cx.lineTo(x+w-h,y+h*.65);cx.stroke();
 const ex=x+w-h/2,ey=y+h/2-1,er=h/2-2;cx.fillStyle=l.h?'#8a6238':shade(c,45);cx.beginPath();cx.ellipse(ex,ey,er*.8,er,0,0,7);cx.fill();cx.strokeStyle='rgba(0,0,0,.25)';cx.beginPath();cx.ellipse(ex,ey,er*.45,er*.55,0,0,7);cx.stroke();
 cx.fillStyle='rgba(0,0,0,.6)';cx.font=`900 ${Math.floor(h*.55)}px system-ui`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(l.h?'?':WOODS[l.c][2],ex,ey+1);
 if(glow){cx.strokeStyle='#ffe14a';cx.lineWidth=3;rr(x-2,y-2,w+4,h+2,h/2);cx.stroke();cx.lineWidth=1}}
function shade(hex,p){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,v+p));return`rgb(${f(r)},${f(g)},${f(b)})`}
let last=performance.now(),T=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;if(mode!=='play'||!P||!cx)return;
 cx.clearRect(0,0,W,H);const C=P.C;cx.fillStyle=C.bg;cx.fillRect(0,0,W,H);
 if(C.raft){cx.strokeStyle='rgba(255,255,255,.08)';cx.lineWidth=2;for(let y=20;y<H;y+=28){cx.beginPath();for(let x=0;x<=W;x+=10)cx.lineTo(x,y+Math.sin(x/30+T*2+y)*4);cx.stroke()}cx.lineWidth=1}
 else{cx.font='28px system-ui';cx.globalAlpha=.12;for(let i=0;i<10;i++)cx.fillText('🌲',(i*97)%W,(i*163)%H);cx.globalAlpha=1}
 const L=layout();const flyTo={};P.fly.forEach(f=>{if(f.t<1)flyTo[f.to]=(flyTo[f.to]||0)+1});
 L.forEach((b,i)=>{const s=P.stacks[i];const bump=P.bump[i]||0;if(bump>0)P.bump[i]=Math.max(0,bump-dt*4);const oy=-Math.abs(Math.sin(bump*6))*6*Math.min(1,bump);const full=P.done.has(i);
  const isHint=P.hintM&&(P.hintM[0]===i||P.hintM[1]===i)&&Math.sin(T*8)>0;
  cx.save();cx.translate(0,oy);
  // bed
  if(C.raft){cx.fillStyle='#8a6238';rr(b.x-4,b.y+b.h-20,b.w+8,12,4);cx.fill();cx.fillStyle='#6b4a2a';for(let k=0;k<4;k++)cx.fillRect(b.x+k*b.w/4+2,b.y+b.h-20,3,12)}
  else{cx.fillStyle='#3a3f47';cx.fillRect(b.x-3,b.y+b.h-22,b.w+6,8);cx.fillStyle='#22262c';cx.fillRect(b.x-3,b.y+4,4,b.h-24);cx.fillRect(b.x+b.w-1,b.y+4,4,b.h-24);
   cx.fillStyle='#111';[b.x+b.w*.2,b.x+b.w*.8].forEach(wx=>{cx.beginPath();cx.arc(wx,b.y+b.h-10,8,0,7);cx.fill();cx.fillStyle='#888';cx.beginPath();cx.arc(wx,b.y+b.h-10,3,0,7);cx.fill();cx.fillStyle='#111'})}
  if(full){cx.shadowColor='#ffe14a';cx.shadowBlur=18}
  if(i===P.sel||isHint){cx.strokeStyle=isHint?'#7CFC9A':'#fff';cx.lineWidth=3;rr(b.x-6,b.y-14,b.w+12,b.h-4,10);cx.stroke();cx.lineWidth=1}
  const hidden=flyTo[i]||0,run=i===P.sel?runLen(s):0;
  for(let k=0;k<s.length-hidden;k++){const lift=(i===P.sel&&k>=s.length-run)?-14:0;drawLog(b.x,b.y+b.h-26-(k+1)*b.lh+lift,b.w,b.lh,s[k],false)}
  cx.shadowBlur=0;if(full){cx.font='18px system-ui';cx.textAlign='center';cx.fillText('✅',b.x+b.w/2,b.y-4)}
  cx.restore()});
 P.fly=P.fly.filter(f=>{f.t+=dt*3.2;if(f.t<0)return true;const a=L[f.from],b=L[f.to];if(!a||!b)return false;const t=Math.min(1,f.t);const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const x0=a.x,y0=a.y+a.h-26-(f.fi+1)*a.lh-14,x1=b.x,y1=b.y+b.h-26-(f.ti+1)*b.lh;const x=x0+(x1-x0)*e,y=y0+(y1-y0)*e-Math.sin(t*Math.PI)*60;drawLog(x,y,b.w,b.lh,f.l,false);
  if(t>=1){Meta.sfx('thud');return false}return true})}
requestAnimationFrame(loop);

showMap();
if(S.tut.l1)Meta.launchPopups();else Meta.queue(()=>Meta.modal(`<h2>🪵 Log Jam</h2><p class="tc">The mill needs your help! Sort the logs so every truck and raft carries just one kind of wood.</p>`,[{t:'▶ Play',cls:'green',f:()=>startLevel(1)}],{dismiss:false}));
window.__game={S,startLevel,showMap,get P(){return P},move,win,layout,LJ};
})();
