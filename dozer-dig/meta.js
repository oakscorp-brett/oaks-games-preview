/* Frenzy Kit: shared progression + monetization layer (Oaks Corp games).
   All purchases are PRETEND placeholders in the web build. In the iOS build, swap Meta.store.buy()
   for StoreKit (e.g. @capgo/native-purchases), same as Gold Fever Frenzy. Nothing random is ever sold. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const Q=new URLSearchParams(location.search);
const pad=n=>String(n).padStart(2,'0');
const dkey=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const mkey=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1);
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const fmt=n=>{n=Math.floor(n);if(n<1e4)return n.toLocaleString('en-US');const u=['K','M','B','T','Qa','Qi'];let i=-1;while(n>=1e3&&i<u.length-1){n/=1e3;i++}return(n<100?n.toFixed(1):Math.floor(n))+u[i]};
function weekendKey(){const d=new Date();const day=d.getDay();const fri=new Date(d);fri.setDate(d.getDate()-((day+2)%7));return dkey(fri)}
function isWeekend(){if(Q.get('weekend')==='1')return true;const day=new Date().getDay();return day===5||day===6||day===0}
function weekendEndsIn(){const d=new Date();const end=new Date(d);const day=d.getDay();const add=day===0?0:(7-day)%7;end.setDate(d.getDate()+add);end.setHours(23,59,59,999);return end-d}
function dur(ms){ms=Math.max(0,ms);const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);return h>=24?Math.floor(h/24)+'d '+(h%24)+'h':h+'h '+m+'m'}

/* ---------- sound (WebAudio synth, no assets) ---------- */
let AC=null,GEST=false;function ac(){if(!GEST)return null;if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,t,type='sine',vol=.18,delay=0,slide=0){const a=ac();if(!a||!Meta.S.settings.sound)return;const o=a.createOscillator(),g=a.createGain();o.type=type;const t0=a.currentTime+delay;o.frequency.setValueAtTime(f,t0);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t0+t);g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.001,t0+t);o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+t+.02)}
function noise(t=.15,vol=.15,delay=0,freq=900){const a=ac();if(!a||!Meta.S.settings.sound)return;const b=a.createBuffer(1,a.sampleRate*t,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=a.createGain();g.gain.value=vol;s.connect(f).connect(g).connect(a.destination);s.start(a.currentTime+delay)}
const SFX={
 tap:()=>tone(520,.06,'triangle',.12),
 pop:()=>{tone(700,.08,'square',.08,0,300)},
 coin:()=>{tone(988,.08,'square',.07);tone(1319,.14,'square',.07,.07)},
 thud:()=>{noise(.18,.25,0,300);tone(90,.15,'sine',.25,0,-40)},
 chop:()=>{noise(.08,.2,0,2500);tone(220,.06,'square',.06)},
 whoosh:()=>noise(.3,.12,0,1600),
 splash:()=>{noise(.4,.22,0,1200);tone(300,.2,'sine',.06,0,-150)},
 reel:()=>tone(1400,.03,'square',.03),
 win:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,.22,'triangle',.15,i*.11))},
 star:()=>{tone(1047,.12,'triangle',.14);tone(1568,.25,'triangle',.12,.08)},
 lose:()=>{[392,330,262].forEach((f,i)=>tone(f,.25,'sawtooth',.07,i*.16))},
 levelup:()=>{[392,523,659,784,1047,1319].forEach((f,i)=>tone(f,.15,'square',.07,i*.06))},
 buy:()=>{tone(660,.1,'triangle',.12);tone(880,.1,'triangle',.12,.08);tone(1320,.2,'triangle',.12,.16)},
 err:()=>tone(150,.2,'sawtooth',.1)
};
function hap(k='Light'){try{const H=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Haptics;if(H)H.impact({style:k.toUpperCase()});else if(navigator.vibrate&&Meta.S.settings.vibe)navigator.vibrate(k==='Heavy'?40:10)}catch(e){}}

/* ---------- particles / juice ---------- */
let fxc,fxx,parts=[];
function fxInit(){fxc=document.createElement('canvas');fxc.id='fx';document.body.appendChild(fxc);const r=()=>{fxc.width=innerWidth*devicePixelRatio;fxc.height=innerHeight*devicePixelRatio;fxx=fxc.getContext('2d');fxx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)};r();addEventListener('resize',r);requestAnimationFrame(fxLoop)}
function fxLoop(){requestAnimationFrame(fxLoop);if(!fxx)return;fxx.clearRect(0,0,innerWidth,innerHeight);parts=parts.filter(p=>p.life>0);for(const p of parts){p.life-=1/60;p.vx*=p.drag||.98;p.vy=p.vy*(p.drag||.98)+(p.g??.25);p.x+=p.vx;p.y+=p.vy;fxx.globalAlpha=Math.min(1,p.life*2);if(p.txt){fxx.font=`900 ${p.size}px system-ui`;fxx.textAlign='center';fxx.lineWidth=4;fxx.strokeStyle='rgba(0,0,0,.7)';fxx.strokeText(p.txt,p.x,p.y);fxx.fillStyle=p.c;fxx.fillText(p.txt,p.x,p.y)}else if(p.emoji){fxx.font=`${p.size}px system-ui`;fxx.textAlign='center';fxx.fillText(p.emoji,p.x,p.y)}else{fxx.fillStyle=p.c;fxx.save();fxx.translate(p.x,p.y);fxx.rotate(p.r=(p.r||0)+.2);fxx.fillRect(-p.size/2,-p.size/2,p.size,p.size*(p.flat||1));fxx.restore()}}fxx.globalAlpha=1}
const FX={
 burst(x,y,colors=['#ffd54a','#ff9f1c','#fff'],n=14,spd=5){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=Math.random()*spd+1;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,c:colors[i%colors.length],size:3+Math.random()*5,life:.6+Math.random()*.5})}},
 text(x,y,txt,c='#ffe14a',size=22){parts.push({x,y,vx:0,vy:-2.2,g:0,drag:.97,txt,c,size,life:1.1})},
 emoji(x,y,e,n=6){for(let i=0;i<n;i++){const a=Math.random()*6.28;parts.push({x,y,vx:Math.cos(a)*4,vy:Math.sin(a)*4-3,emoji:e,size:18+Math.random()*10,life:.9})}},
 confetti(){const c=['#ff3b30','#ffd60a','#34c759','#0a84ff','#bf5af2','#ff9f0a'];for(let i=0;i<110;i++)parts.push({x:Math.random()*innerWidth,y:-20-Math.random()*200,vx:(Math.random()-.5)*3,vy:Math.random()*3,g:.08,drag:.995,c:c[i%6],size:6+Math.random()*5,flat:.5,life:2.5+Math.random()})},
 coinsTo(x,y,n=8){const t=$('#coinPill');if(!t)return;const r=t.getBoundingClientRect();for(let i=0;i<n;i++){setTimeout(()=>{const el=document.createElement('div');el.textContent=Meta.cfg.coinIcon;el.style.cssText=`position:fixed;left:${x}px;top:${y}px;font-size:22px;z-index:75;pointer-events:none;transition:all .6s cubic-bezier(.5,-.3,.7,1)`;document.body.appendChild(el);requestAnimationFrame(()=>{el.style.left=(r.left+12)+'px';el.style.top=(r.top)+'px';el.style.transform='scale(.6)'});setTimeout(()=>{el.remove();SFX.coin();t.classList.remove('shake');void t.offsetWidth;t.classList.add('shake')},620)},i*55)}},
 shake(el){el=el||$('#stage');el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
};

/* ---------- state ---------- */
const DEF=()=>({v:1,coins:0,gems:0,level:1,stars:{},streak:0,bestStreak:0,boosters:{},stats:{},owned:{},
 daily:{last:'',idx:0},tasks:{date:'',list:[]},album:{},albumSets:{},ach:{},pass:{month:'',xp:0,free:[],paid:[],premium:false},
 vault:{amt:0,cap:0,breaks:0},event:{key:'',pts:0,claimed:[],offer:false},tut:{},settings:{sound:true,vibe:true},
 noAds:false,starter:{bought:false,shownAt:0},lastSeen:Date.now(),created:Date.now(),fails:0,game:{}});
const Meta={S:null,cfg:null,fx:FX,sfx:n=>SFX[n]&&SFX[n](),hap,fmt,rng,hash,dkey,isWeekend,dur,$};
let saveT=0;
Meta.save=function(){clearTimeout(saveT);saveT=setTimeout(Meta.saveNow,250)};
Meta.saveNow=function(){try{Meta.S.lastSeen=Date.now();localStorage.setItem(Meta.cfg.id+'_save_v1',JSON.stringify(Meta.S))}catch(e){}};
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(Meta.cfg.id+'_save_v1'))}catch(e){}const d=DEF();if(!s)return d;for(const k in d)if(s[k]===undefined)s[k]=d[k];return s}
Meta.reset=function(){localStorage.removeItem(Meta.cfg.id+'_save_v1');location.reload()};

/* ---------- currency / rewards ---------- */
Meta.addCoins=function(n,x,y){n=Math.floor(n);Meta.S.coins+=n;if(n>0){Meta.track('coinsEarned',n);if(x!=null)FX.coinsTo(x,y,Math.min(10,3+Math.floor(Math.log10(n+1)*2)))}Meta.hud();Meta.save()};
Meta.spend=function(n){if(Meta.S.coins<n){SFX.err();Meta.toast('Not enough '+Meta.cfg.coinName+'!');FX.shake($('#coinPill'));return false}Meta.S.coins-=n;Meta.hud();Meta.save();return true};
Meta.addBooster=(id,n=1)=>{Meta.S.boosters[id]=(Meta.S.boosters[id]||0)+n;Meta.save();Meta.hud()};
Meta.useBooster=id=>{if((Meta.S.boosters[id]||0)<=0)return false;Meta.S.boosters[id]--;Meta.track('boostersUsed',1);Meta.save();return true};
Meta.give=function(r,silent){if(!r)return;if(r.coins)Meta.addCoins(r.coins,innerWidth/2,innerHeight/2);if(r.gems){Meta.S.gems+=r.gems}if(r.boosters)for(const k in r.boosters)Meta.addBooster(k,r.boosters[k]);if(r.xp)Meta.passXp(r.xp);if(Meta.cfg.onReward)Meta.cfg.onReward(r);if(!silent){SFX.buy();hap('Medium')}Meta.hud();Meta.save()};
Meta.rewardText=function(r){const a=[];if(r.coins)a.push(Meta.cfg.coinIcon+' '+fmt(r.coins));if(r.boosters)for(const k in r.boosters){const b=Meta.cfg.boosters[k];a.push((b?b.icon:'🎁')+'×'+r.boosters[k])}if(r.xp)a.push('⭐'+r.xp+' XP');if(r.label)a.push(r.label);return a.join(' ')};
const scaleC=v=>Math.round(v*(Meta.cfg.coinScale?Meta.cfg.coinScale():1));

/* ---------- toast / modal ---------- */
Meta.toast=t=>{const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2300)};
Meta.modal=function(html,btns=[{t:'OK'}],opt={}){Meta.closeModal(true);const bg=document.createElement('div');bg.className='modalbg';bg.id='mbg';const m=document.createElement('div');m.className='modal';m.innerHTML=html;const row=document.createElement('div');row.className='row c w';row.style.marginTop='10px';
 btns.forEach(b=>{const e=document.createElement('button');e.className='btn '+(b.cls||'');e.innerHTML=b.t;if(b.disabled)e.disabled=true;e.onclick=()=>{SFX.tap();if(b.keep){b.f&&b.f(e);return}Meta.closeModal();b.f&&b.f()};row.appendChild(e)});if(btns.length)m.appendChild(row);
 bg.appendChild(m);if(opt.dismiss!==false)bg.onclick=e=>{if(e.target===bg){Meta.closeModal();opt.onClose&&opt.onClose()}};document.body.appendChild(bg);SFX.pop();return m};
Meta.closeModal=function(quiet){const b=$('#mbg');if(b)b.remove();if(!quiet)setTimeout(()=>Meta.nextPopup(),250)};
Meta.modalOpen=()=>!!$('#mbg');
/* popup queue so launch popups don't stack */
const PQ=[];Meta.queue=f=>{PQ.push(f);if(!Meta.modalOpen())Meta.nextPopup()};Meta.busy=false;Meta.nextPopup=()=>{if(Meta.busy||Meta.modalOpen()||$('.tut'))return;const f=PQ.shift();if(f)f()};

/* ---------- store (PRETEND in web) ---------- */
Meta.store={
 products(){const c=Meta.cfg,s=c.coinStore||[500,3500,9000];return[
  {id:'starter',name:c.starterName||'Starter Pack',price:'$2.99',once:true,icon:'🎁',r:{coins:scaleC(s[1]*.7),boosters:c.starterBoosters||{},label:c.starterExtra||''}},
  {id:'coins_s',name:'Small '+c.coinName+' Bundle',price:'$0.99',icon:c.coinIcon,r:{coins:scaleC(s[0])}},
  {id:'coins_m',name:'Big '+c.coinName+' Bundle',price:'$4.99',icon:'💰',tag:'Popular',r:{coins:scaleC(s[1]),boosters:c.bundleBoosters||{}}},
  {id:'coins_l',name:'Mega '+c.coinName+' Bundle',price:'$9.99',icon:'🏆',tag:'Best value',r:{coins:scaleC(s[2]),boosters:Object.fromEntries(Object.entries(c.bundleBoosters||{}).map(([k,v])=>[k,v*3]))}},
  {id:'noads',name:'No-Ads Pass',price:'$2.99',once:true,icon:'🚫',r:{label:'Bonus rewards without ads, forever'}},
  {id:'pass',name:Meta.cfg.passName+' Premium',price:'$4.99',icon:'🎟️',r:{label:'Paid reward track this month'}},
  {id:'vault',name:'Crack the '+Meta.cfg.vaultName,price:'$1.99',icon:'🐷',r:{label:'Everything inside'}},
  {id:'eventoffer',name:Meta.cfg.eventName+' Offer',price:'$1.99',icon:'⏰',r:{coins:scaleC(s[1]*.5),boosters:Object.fromEntries(Object.entries(c.bundleBoosters||{}).map(([k,v])=>[k,v*2])),label:'+300 event points'}},
  {id:'streak',name:'Streak Saver',price:'$0.99',icon:'🛡️',r:{label:'Keeps your win streak'}},
 ]},
 get:id=>Meta.store.products().find(p=>p.id===id),
 /* Single choke point for money. iOS: replace body with StoreKit purchase + receipt check. */
 buy(id,onOk){const p=Meta.store.get(id);if(!p)return;
  Meta.modal(`<h2>${p.icon} ${p.name}</h2><p class="tc" style="font-size:20px;font-weight:900">${p.price}</p><p class="tc">${Meta.rewardText(p.r)}</p><p class="tc"><span class="testtag">TEST MODE</span><br><span class="small">This is a pretend purchase for testing. No money is charged.</span></p>`,
  [{t:'Pretend Buy',cls:'green',f:()=>{Meta.track('purchases',1);if(p.once)Meta.S.owned[id]=true;if(id==='noads')Meta.S.noAds=true;Meta.give(p.r);if(id==='starter')Meta.S.starter.bought=true;FX.confetti();Meta.save();onOk&&onOk()}},{t:'Cancel',cls:'sec'}])}
};
/* reward-ad placeholder hook: game asks Meta.rewardAd('placement', cb). No-Ads owners get it instantly. */
Meta.adProvider=null;
Meta.rewardAd=function(place,cb){Meta.track('adsWatched',1);if(Meta.S.noAds){Meta.toast('🚫 No-Ads Pass: bonus granted!');cb(true);return}
 if(Meta.adProvider){Meta.adProvider(place,cb);return}
 Meta.modal(`<h2>📺 Bonus Video</h2><p class="tc">A short video ad would play here.</p><p class="tc"><span class="testtag">PLACEHOLDER</span> <span class="small">No ad network is connected yet.</span></p>`,[{t:'Finish (pretend)',cls:'green',f:()=>cb(true)},{t:'Skip',cls:'sec',f:()=>cb(false)}],{dismiss:false})};

/* ---------- tracking: tasks, achievements, event, pass ---------- */
Meta.track=function(k,n=1){const S=Meta.S;S.stats[k]=(S.stats[k]||0)+n;
 for(const t of S.tasks.list)if(t.stat===k&&!t.claimed)t.prog=Math.min(t.goal,t.prog+n);
 const ep=Meta.cfg.eventPoints||{};if(ep[k]&&isWeekend()){ensureEvent();S.event.pts+=ep[k]*n}
 const px=Meta.cfg.passXp||{};if(px[k])Meta.passXp(px[k]*n,true);
 checkAch();Meta.save();Meta.badges()};
function checkAch(){for(const a of Meta.cfg.achievements||[]){const tiers=a.goals||[a.goal];const done=Meta.S.ach[a.id]||0;if(done<tiers.length&&(Meta.S.stats[a.stat]||0)>=tiers[done]){Meta.S.ach[a.id]=done+1;const r={coins:scaleC((a.coins||200)*(done+1))};Meta.toast('🏆 '+a.name+(tiers.length>1?' '+['I','II','III','IV','V'][done]:'')+'!');SFX.levelup();Meta.give(r,true)}}}
/* tasks */
function ensureTasks(){const S=Meta.S,d=dkey();if(S.tasks.date===d)return;const r=rng(hash(d+Meta.cfg.id));const pool=[...Meta.cfg.taskPool];const list=[];while(list.length<3&&pool.length){const t=pool.splice(Math.floor(r()*pool.length),1)[0];const lvl=Math.min(t.n.length-1,Math.floor(S.level/15));list.push({stat:t.stat,text:t.text.replace('{n}',t.n[lvl]),goal:t.n[lvl],prog:0,claimed:false,reward:{coins:scaleC(150+60*list.length),xp:60}})}S.tasks={date:d,list,bonus:false}}
/* event */
function ensureEvent(){const S=Meta.S,k=weekendKey();if(S.event.key!==k)S.event={key:k,pts:0,claimed:[],offer:false}}
const LADDER=()=>{const b=Meta.cfg.bundleBoosters||{},ids=Object.keys(Meta.cfg.boosters);return[
 {pts:50,r:{coins:scaleC(200)}},{pts:150,r:{boosters:{[ids[0]]:1}}},{pts:300,r:{coins:scaleC(600)}},{pts:500,r:{boosters:{[ids[1%ids.length]]:2}}},
 {pts:800,r:{coins:scaleC(1200),xp:150}},{pts:1200,r:{boosters:{[ids[2%ids.length]]:2,[ids[0]]:2}}},{pts:1700,r:{coins:scaleC(2500)}},{pts:2400,r:{coins:scaleC(4000),boosters:Object.fromEntries(ids.map(i=>[i,2])),label:Meta.cfg.eventTrophy||'🏅 Weekend Trophy'}}]};
/* pass */
function ensurePass(){const S=Meta.S,m=mkey();if(S.pass.month!==m)S.pass={month:m,xp:0,free:[],paid:[],premium:false}}
const TIERS=30,XPT=100;
function passReward(i,paid){const ids=Object.keys(Meta.cfg.boosters);if(paid)return(i%3===2)?{boosters:{[ids[i%ids.length]]:2},coins:scaleC(150*(1+i/5))}:{coins:scaleC(300*(1+i/4))};return(i%5===4)?{boosters:{[ids[i%ids.length]]:1}}:{coins:scaleC(100*(1+i/5))}}
Meta.passXp=function(n,quiet){ensurePass();const before=Math.floor(Meta.S.pass.xp/XPT);Meta.S.pass.xp+=n;const after=Math.floor(Meta.S.pass.xp/XPT);if(after>before&&before<TIERS){if(!quiet||true)Meta.toast('🎟️ '+Meta.cfg.passName+' tier '+Math.min(TIERS,after)+' unlocked!')}Meta.save();Meta.badges()};
/* vault */
Meta.vaultCap=()=>scaleC(1500*(1+Meta.S.vault.breaks*.5));
Meta.fillVault=n=>{const c=Meta.vaultCap();Meta.S.vault.amt=Math.min(c,Meta.S.vault.amt+Math.floor(n));Meta.save()};

/* ---------- wins, losses, streaks, near-miss ---------- */
Meta.streakMult=()=>1+Math.min(Meta.S.streak,5)*.1;
Meta.win=function({stars=3,coins=0,x,y}={}){const S=Meta.S;S.streak++;S.bestStreak=Math.max(S.bestStreak,S.streak);S.fails=0;Meta.track('wins',1);Meta.track('stars',stars);if(stars===3)Meta.track('perfect',1);Meta.track('streakMax',0);S.stats.bestStreak=S.bestStreak;checkAch();
 const total=Math.round(coins*Meta.streakMult());Meta.fillVault(total*.35);Meta.passXp(30+stars*10,true);return total};
/* lose flow: offers extra moves (coins / ad / free retry), then streak protection. kind of near-miss text supplied by game */
Meta.lose=function({nearMiss='',title='Out of moves!',extraLabel='+5 Moves',extraCost=0,onExtra,onGiveUp}){const S=Meta.S;SFX.lose();hap('Heavy');const cost=extraCost||scaleC(300);
 const html=`<h2>${nearMiss?'😮 So close!':title}</h2>${nearMiss?`<p class="tc" style="font-size:17px">${nearMiss}</p>`:''}<p class="tc">Keep going with <b>${extraLabel}</b>?</p>${S.streak>=2?`<p class="tc small">🔥 Your ${S.streak}-win streak is on the line!</p>`:''}`;
 Meta.modal(html,[
  {t:`${extraLabel} ${Meta.cfg.coinIcon}${fmt(cost)}`,cls:'green',disabled:S.coins<cost,f:()=>{if(Meta.spend(cost)){Meta.track('continues',1);onExtra()}}},
  {t:`📺 ${extraLabel} free`,cls:'blue',f:()=>Meta.rewardAd('continue',ok=>ok?onExtra():giveUp())},
  {t:'Give up',cls:'sec',f:giveUp}],{dismiss:false});
 function giveUp(){S.fails++;Meta.track('fails',1);if(S.streak>=3)streakSave(onGiveUp);else{S.streak=0;Meta.save();Meta.hud();onGiveUp&&onGiveUp()}}};
function streakSave(cb){const S=Meta.S,cost=scaleC(500);Meta.modal(`<h2>🛡️ Save your streak?</h2><p class="tc" style="font-size:40px">🔥${S.streak}</p><p class="tc">Your streak bonus is <b>+${Math.round((Meta.streakMult()-1)*100)}%</b> ${Meta.cfg.coinName}. Keep it?</p>`,[
 {t:`Keep ${Meta.cfg.coinIcon}${fmt(cost)}`,cls:'green',disabled:S.coins<cost,f:()=>{if(Meta.spend(cost)){Meta.toast('🛡️ Streak saved!');cb&&cb()}else lost()}},
 {t:'Keep 🛡️ $0.99',f:()=>Meta.store.buy('streak',()=>{Meta.toast('🛡️ Streak saved!');cb&&cb()})},
 {t:'Let it go',cls:'sec',f:lost}],{dismiss:false});
 function lost(){S.streak=0;Meta.save();Meta.hud();cb&&cb()}}

/* ---------- panels ---------- */
const P={};
P.daily=function(){const S=Meta.S,d=dkey(),can=S.daily.last!==d;let idx=S.daily.idx;
 const days=Meta.cfg.dailyRewards||defaultDaily();
 const cells=days.map((r,i)=>`<div class="${i<idx%7||(!can&&i===idx%7-1)?'done':''} ${can&&i===idx%7?'on':''}"><b>Day ${i+1}</b><br>${Meta.rewardText(r)}</div>`).join('');
 Meta.modal(`<h2>📅 Daily Rewards</h2><p class="tc small">Come back every day! Day 7 is the big one. Miss a day and it starts over.</p><div class="cal">${cells}</div>`,
  can?[{t:'Claim!',cls:'green',f:()=>claim(1)},{t:'📺 Claim ×2',cls:'blue',f:()=>Meta.rewardAd('daily',ok=>claim(ok?2:1))}]:[{t:'Come back tomorrow'}]);
 function claim(m){const r=JSON.parse(JSON.stringify(days[idx%7]));if(r.coins)r.coins*=m;if(r.boosters)for(const k in r.boosters)r.boosters[k]*=m;S.daily.last=d;S.daily.idx=idx+1;Meta.track('dailyClaims',1);Meta.give(r);FX.confetti();Meta.badges()}};
function defaultDaily(){const ids=Object.keys(Meta.cfg.boosters);return[{coins:scaleC(100)},{coins:scaleC(150)},{boosters:{[ids[0]]:1}},{coins:scaleC(300)},{boosters:{[ids[1%ids.length]]:1}},{coins:scaleC(500)},{coins:scaleC(1000),boosters:Object.fromEntries(ids.map(i=>[i,1]))}]}
function dailyRollover(){const S=Meta.S;if(!S.daily.last)return;const y=new Date();y.setDate(y.getDate()-1);if(S.daily.last!==dkey()&&S.daily.last!==dkey(y))S.daily.idx=0}
P.tasks=function(){ensureTasks();const T=Meta.S.tasks;const all=T.list.every(t=>t.claimed);
 const m=Meta.modal(`<h2>✅ Daily Tasks</h2><p class="tc small">New tasks every day. Finish all 3 for a bonus chest of ${Meta.rewardText({coins:scaleC(600)})}!</p>`+T.list.map((t,i)=>`<div class="card"><div class="row"><div style="flex:1"><b>${t.text}</b><div class="bar" style="margin-top:5px"><i style="width:${t.prog/t.goal*100}%"></i></div><span class="small">${fmt(t.prog)}/${fmt(t.goal)} · ${Meta.rewardText(t.reward)}</span></div><button class="btn ${t.claimed?'sec':'green'}" data-i="${i}" ${t.claimed||t.prog<t.goal?'disabled':''}>${t.claimed?'✓':'Claim'}</button></div></div>`).join('')+
  (all&&!T.bonus?`<div class="tc"><button class="btn" id="tbonus">🎁 Claim Bonus Chest</button></div>`:''),[{t:'Close',cls:'sec'}]);
 m.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const t=T.list[b.dataset.i];t.claimed=true;Meta.give(t.reward);Meta.track('tasksDone',1);P.tasks()});
 const tb=m.querySelector('#tbonus');if(tb)tb.onclick=()=>{T.bonus=true;Meta.give({coins:scaleC(600),xp:100});FX.confetti();P.tasks()}};
P.album=function(){const A=Meta.cfg.album;let total=0,have=0;
 const html=A.sets.map(set=>{const got=set.items.filter(it=>Meta.S.album[it.id]).length;total+=set.items.length;have+=got;const done=got===set.items.length,claimed=Meta.S.albumSets[set.id];
  return`<div class="card"><div class="row"><b style="flex:1">${set.name}</b><span class="small">${got}/${set.items.length}</span></div><div class="grid4" style="margin-top:6px">${set.items.map(it=>`<div class="alb ${Meta.S.album[it.id]?'':'no'}" data-it="${it.id}"><b>${it.icon}</b>${Meta.S.album[it.id]?it.name:'???'}</div>`).join('')}</div>
  <div class="row" style="margin-top:6px"><span class="small" style="flex:1">Set reward: ${Meta.rewardText(set.reward)}</span>${done&&!claimed?`<button class="btn green" data-set="${set.id}">Claim</button>`:claimed?'✅':''}</div></div>`}).join('');
 const m=Meta.modal(`<h2>${A.icon||'📖'} ${A.title}</h2><p class="tc small">${have}/${total} collected. ${A.hint||''}</p>${html}`,[{t:'Close',cls:'sec'}]);
 m.querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{const s=A.sets.find(x=>x.id===b.dataset.set);Meta.S.albumSets[s.id]=true;Meta.give(s.reward);FX.confetti();P.album()});
 m.querySelectorAll('[data-it]').forEach(b=>b.onclick=()=>{const it=A.sets.flatMap(s=>s.items).find(x=>x.id===b.dataset.it);if(it&&Meta.S.album[it.id]&&it.desc)Meta.toast(it.icon+' '+it.desc.slice(0,60))})};
Meta.collect=function(id){if(Meta.S.album[id])return false;const it=Meta.cfg.album.sets.flatMap(s=>s.items).find(x=>x.id===id);if(!it)return false;Meta.S.album[id]=Date.now();Meta.track('collected',1);Meta.save();Meta.badges();
if(Meta.busy)Meta.toast('📖 New: '+it.icon+' '+it.name+'!');
 Meta.queue(()=>Meta.modal(`<h2>📖 New for your ${Meta.cfg.album.title}!</h2><p class="tc" style="font-size:64px;margin:4px">${it.icon}</p><p class="tc" style="font-size:20px"><b>${it.name}</b></p>${it.desc?`<p class="tc small">${it.desc}</p>`:''}`,[{t:'Nice!',cls:'green'}]));SFX.levelup();return true};
P.event=function(){ensureEvent();const S=Meta.S,E=S.event,L=LADDER();if(!isWeekend()){Meta.modal(`<h2>${Meta.cfg.eventIcon} ${Meta.cfg.eventName}</h2><p class="tc">Every Friday to Sunday! Earn points and climb the prize ladder. Every prize is guaranteed, nothing random.</p><p class="tc small">${Meta.cfg.eventHow}</p>`,[{t:'OK'}]);return}
 const m=Meta.modal(`<h2>${Meta.cfg.eventIcon} ${Meta.cfg.eventName}</h2><p class="tc small">Ends in ${dur(weekendEndsIn())} · ${Meta.cfg.eventHow}</p><p class="tc" style="font-size:22px;font-weight:900">${fmt(E.pts)} pts</p>${Meta.cfg.eventExtra?Meta.cfg.eventExtra(E):''}<div class="ladder">${L.map((s,i)=>`<div class="${E.claimed.includes(i)?'got':''}"><span>${s.pts} pts</span><span>${Meta.rewardText(s.r)}</span>${E.claimed.includes(i)?'✅':E.pts>=s.pts?`<button class="btn green" data-l="${i}">Claim</button>`:'🔒'}</div>`).join('')}</div>
 ${!E.offer?`<div class="card tc"><b>⏰ Weekend-only offer</b><br>${Meta.rewardText(Meta.store.get('eventoffer').r)}<br><button class="btn" id="eoff" style="margin-top:6px">$1.99</button></div>`:''}`,[{t:'Close',cls:'sec'}]);
 m.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{const i=+b.dataset.l;E.claimed.push(i);Meta.give(L[i].r);if(i===L.length-1)FX.confetti();P.event()});
 const o=m.querySelector('#eoff');if(o)o.onclick=()=>Meta.store.buy('eventoffer',()=>{E.offer=true;E.pts+=300;Meta.save()})};
P.pass=function(){ensurePass();const S=Meta.S,X=S.pass,tier=Math.min(TIERS,Math.floor(X.xp/XPT));
 let rows='';for(let i=0;i<TIERS;i++){const fr=passReward(i,0),pr=passReward(i,1),un=i<tier;
  const fs=X.free.includes(i)?'got':un?'ready':'lock',ps=X.paid.includes(i)?'got':(un&&X.premium)?'ready':'lock';
  rows+=`<div class="passrow"><div><b>${i+1}</b></div><div class="${fs}" data-f="${i}">${Meta.rewardText(fr)}${fs==='got'?' ✅':''}</div><div class="${ps}" data-p="${i}">${X.premium?'':'🔒 '}${Meta.rewardText(pr)}${ps==='got'?' ✅':''}</div></div>`}
 const m=Meta.modal(`<h2>🎟️ ${Meta.cfg.passName}</h2><p class="tc small">This month · ${fmt(X.xp%XPT)}/${XPT} XP to next tier · tier ${tier}/${TIERS}</p><div class="bar"><i style="width:${X.xp%XPT}%"></i></div>
 ${X.premium?'':`<div class="card tc"><b>Unlock the ${Meta.cfg.goldTrack||'Gold Track'}</b> for double rewards all month<br><button class="btn" id="ppre" style="margin-top:6px">🎟️ $4.99</button></div>`}
 <div class="passrow"><div></div><div><b>Free</b></div><div><b>${Meta.cfg.goldTrack||'Gold Track'}</b></div></div>${rows}`,[{t:'Close',cls:'sec'}]);
 m.querySelectorAll('.ready').forEach(b=>b.onclick=()=>{if(b.dataset.f!=null){X.free.push(+b.dataset.f);Meta.give(passReward(+b.dataset.f,0))}else{X.paid.push(+b.dataset.p);Meta.give(passReward(+b.dataset.p,1))}const st=m.scrollTop;P.pass();$('.modal').scrollTop=st});
 const pp=m.querySelector('#ppre');if(pp)pp.onclick=()=>Meta.store.buy('pass',()=>{X.premium=true;Meta.save();P.pass()})};
P.vault=function(){const V=Meta.S.vault,cap=Meta.vaultCap(),full=V.amt>=cap;
 Meta.modal(`<h2>🐷 ${Meta.cfg.vaultName}</h2><p class="tc" style="font-size:60px;margin:0">${full?'🐷💥':'🐷'}</p><p class="tc">Every win drops ${Meta.cfg.coinName} into your ${Meta.cfg.vaultName}. Crack it open to keep it all!</p>
 <p class="tc" style="font-size:24px;font-weight:900">${Meta.cfg.coinIcon} ${fmt(V.amt)} / ${fmt(cap)}</p><div class="bar"><i style="width:${V.amt/cap*100}%"></i></div><p class="tc small">${full?'FULL! Crack it now, new wins can\'t add more.':'You always know exactly what is inside.'}</p>`,
 [{t:'Crack it $1.99',cls:'green',disabled:V.amt<cap*.25,f:()=>Meta.store.buy('vault',()=>{const n=V.amt;V.amt=0;V.breaks++;Meta.addCoins(n,innerWidth/2,innerHeight/2);Meta.save()})},{t:'Close',cls:'sec'}])};
P.ach=function(){const L=Meta.cfg.achievements;Meta.modal(`<h2>🏆 Trophies</h2>`+L.map(a=>{const tiers=a.goals||[a.goal],d=Meta.S.ach[a.id]||0,g=tiers[Math.min(d,tiers.length-1)],v=Meta.S.stats[a.stat]||0;return`<div class="card row"><b style="font-size:26px">${d?a.icon:'🔒'}</b><div style="flex:1"><b>${a.name}</b> ${'⭐'.repeat(d)}<br><span class="small">${a.text.replace('{n}',fmt(g))}</span><div class="bar"><i style="width:${d>=tiers.length?100:Math.min(100,v/g*100)}%"></i></div></div></div>`}).join(''),[{t:'Close',cls:'sec'}])};
P.shop=function(){const S=Meta.S,ps=Meta.store.products().filter(p=>['coins_s','coins_m','coins_l','noads','starter'].includes(p.id)&&!(p.once&&S.owned[p.id]));
 const m=Meta.modal(`<h2>🛒 Shop</h2><p class="tc"><span class="testtag">TEST MODE</span> <span class="small">Pretend purchases, nothing is charged.</span></p>`+
 ps.map(p=>`<div class="card row"><b style="font-size:30px">${p.icon}</b><div style="flex:1"><b>${p.name}</b> ${p.tag?`<span class="testtag" style="background:#ff9f0a">${p.tag}</span>`:''}<br><span class="small">${Meta.rewardText(p.r)}</span></div><button class="btn green" data-b="${p.id}">${p.price}</button></div>`).join('')+
 `<h3 class="tc">Boosters</h3>`+Object.entries(Meta.cfg.boosters).map(([k,b])=>`<div class="card row"><b style="font-size:26px">${b.icon}</b><div style="flex:1"><b>${b.name}</b> ×${S.boosters[k]||0}<br><span class="small">${b.desc}</span></div><button class="btn" data-c="${k}">${Meta.cfg.coinIcon}${fmt(scaleC(b.cost))}</button></div>`).join('')+
 `<div class="row c" style="margin-top:8px"><button class="btn sec" id="snd">${S.settings.sound?'🔊 Sound on':'🔇 Sound off'}</button><button class="btn sec" id="rst">Restore Purchases</button></div>`,[{t:'Close',cls:'sec'}]);
 m.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>Meta.store.buy(b.dataset.b));
 m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const k=b.dataset.c;if(Meta.spend(scaleC(Meta.cfg.boosters[k].cost))){Meta.addBooster(k,1);SFX.buy();P.shop()}});
 m.querySelector('#snd').onclick=()=>{S.settings.sound=!S.settings.sound;Meta.save();P.shop()};
 m.querySelector('#rst').onclick=()=>Meta.toast('Restore runs through the App Store in the iPhone app')};
P.starter=function(){if(Meta.S.owned.starter)return;const p=Meta.store.get('starter');Meta.S.starter.shownAt=Date.now();Meta.save();
 Meta.modal(`<h2>🎁 ${p.name}</h2><p class="tc"><span class="testtag" style="background:#ff9f0a">ONE TIME ONLY</span></p><p class="tc" style="font-size:18px">${Meta.rewardText(p.r)}</p><p class="tc small">Everything you need to get rolling. One per player.</p>`,[{t:p.price,cls:'green',f:()=>Meta.store.buy('starter')},{t:'No thanks',cls:'sec'}])};
Meta.open=n=>{SFX.tap();P[n]&&P[n]()};Meta.panels=P;

/* ---------- HUD & dock ---------- */
Meta.hud=function(){const c=$('#coinTxt');if(c)c.textContent=fmt(Meta.S.coins);const s=$('#streakTxt');if(s)s.textContent=Meta.S.streak;if(Meta.cfg.onHud)Meta.cfg.onHud()};
Meta.badges=function(){const S=Meta.S;if(!$('#dock'))return;ensureTasks();ensurePass();
 const b={daily:S.daily.last!==dkey()?1:0,tasks:S.tasks.list.filter(t=>t.prog>=t.goal&&!t.claimed).length+(S.tasks.list.every(t=>t.claimed)&&!S.tasks.bonus?1:0),
  pass:(()=>{const t=Math.min(TIERS,Math.floor(S.pass.xp/XPT));let n=0;for(let i=0;i<t;i++){if(!S.pass.free.includes(i))n++;if(S.pass.premium&&!S.pass.paid.includes(i))n++}return n})(),
  event:isWeekend()?(ensureEvent(),LADDER().filter((l,i)=>S.event.pts>=l.pts&&!S.event.claimed.includes(i)).length||'!'):0,
  album:Meta.cfg.album.sets.filter(s=>!S.albumSets[s.id]&&s.items.every(i=>S.album[i.id])).length,
  vault:S.vault.amt>=Meta.vaultCap()?'!':0};
 for(const k in b){const el=$('#dk_'+k);if(!el)continue;let bd=el.querySelector('.badge');if(b[k]){if(!bd){bd=document.createElement('span');bd.className='badge';el.appendChild(bd)}bd.textContent=b[k]}else if(bd)bd.remove()}
 const ev=$('#dk_event');if(ev)ev.style.display=isWeekend()?'':'none'};
function buildChrome(){const app=document.createElement('div');app.id='app';
 app.innerHTML=`<div id="hud"><button class="pill" id="coinPill"><span>${Meta.cfg.coinIcon}</span><span id="coinTxt">0</span><span style="color:#3ec46d">＋</span></button><div class="pill grow" id="hudMid"></div><div class="pill" title="Win streak">🔥<span id="streakTxt">0</span></div><button class="iconbtn" id="shopBtn">🛒</button></div><div id="stage"></div>
 <div id="dock">${[['daily','📅','Daily'],['tasks','✅','Tasks'],['event',Meta.cfg.eventIcon,'Event'],['pass','🎟️','Pass'],['vault','🐷','Vault'],['album',Meta.cfg.album.icon||'📖','Album'],['ach','🏆','Trophies'],['shop','🛒','Shop']].map(([k,i,l])=>`<button class="dk" id="dk_${k}"><b>${i}</b>${l}</button>`).join('')}</div>`;
 document.body.appendChild(app);
 app.querySelectorAll('.dk').forEach(b=>b.onclick=()=>Meta.open(b.id.slice(3)));$('#shopBtn').onclick=$('#coinPill').onclick=()=>Meta.open('shop')}

/* ---------- tutorial ---------- */
/* steps: [{text, el:()=>Element|null, pos:'top'|'bottom', wait:(done)=>{} }] ; tap bubble to advance unless wait given */
Meta.tutorial=function(id,steps,done){if(Meta.S.tut[id]||Q.get('notut')==='1'){done&&done();return}let i=0;const o=document.createElement('div');o.className='tut';document.body.appendChild(o);
 function show(){if(i>=steps.length){o.remove();Meta.S.tut[id]=1;Meta.save();done&&done();Meta.nextPopup();return}const s=steps[i];const el=s.el&&s.el();let h='';
  if(el){const r=el.getBoundingClientRect();h+=`<div class="ring" style="left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px"></div><div class="hand" style="left:${r.left+r.width/2}px;top:${r.top+r.height/2}px">👆</div>`}else h+=`<div class="ring" style="left:50%;top:50%;width:0;height:0;border:0"></div>`;
  const top=s.pos==='top'||(el&&el.getBoundingClientRect().top>innerHeight*.55);h+=`<div class="bub" style="${top?'top:80px':'bottom:110px'}">${s.text}<div class="small" style="margin-top:6px">${s.wait?'👉 Try it!':'Tap to continue'}</div></div>`;o.innerHTML=h;
  const bub=o.querySelector('.bub');if(s.wait){o.style.pointerEvents='none';bub.style.pointerEvents='none';s.wait(()=>{i++;show()})}else{bub.onclick=()=>{SFX.tap();i++;show()};o.style.pointerEvents='auto';o.onclick=e=>{if(e.target===o){i++;show()}}}}
 show()};

/* ---------- init ---------- */
Meta.init=function(cfg){Meta.cfg=cfg;document.documentElement.style.setProperty('--accent',cfg.accent||'#f5b82e');document.documentElement.style.setProperty('--bg',cfg.bg||'#1d2a1d');document.documentElement.style.setProperty('--panel',cfg.panel||'#2c3e2c');
 Meta.S=load();const S=Meta.S;Meta.offlineSec=Math.max(0,(Date.now()-(S.lastSeen||Date.now()))/1000);dailyRollover();ensureTasks();ensurePass();buildChrome();fxInit();Meta.hud();Meta.badges();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)Meta.saveNow()});addEventListener('pagehide',Meta.saveNow);
 document.addEventListener('pointerdown',()=>{GEST=true;ac()},{once:true});setInterval(()=>Meta.badges(),15000);window.Meta=Meta;return S};
/* launch popups: daily, starter offer (after a few levels, ~once a day), event */
Meta.launchPopups=function(){const S=Meta.S;if(S.daily.last!==dkey())Meta.queue(()=>P.daily());
 if(isWeekend()&&!sessionStorage.getItem(Meta.cfg.id+'_ev')){sessionStorage.setItem(Meta.cfg.id+'_ev',1);Meta.queue(()=>P.event())}
 Meta.maybeStarter()};
Meta.maybeStarter=function(){const S=Meta.S;if(!S.owned.starter&&S.level>=4&&Date.now()-S.starter.shownAt>20*36e5)Meta.queue(()=>P.starter())};
window.Meta=Meta;
})();
