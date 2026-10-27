/* Log Jam level generator + solver (pure; works in browser and node) */
(function(root){
'use strict';
function rng(seed){let a=seed>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const isDone=(s,cap)=>s.every(a=>a.length===0||(a.length===cap&&a.every(x=>x===a[0])));
function legal(s,cap){const out=[];let firstEmpty=-1;for(let j=0;j<s.length;j++)if(!s[j].length){firstEmpty=j;break}
 for(let i=0;i<s.length;i++){const a=s[i];if(!a.length)continue;const top=a[a.length-1];let run=1;while(run<a.length&&a[a.length-1-run]===top)run++;
  if(run===cap)continue;
  for(let j=0;j<s.length;j++){if(i===j)continue;const b=s[j];if(b.length>=cap)continue;
   if(b.length){if(b[b.length-1]!==top)continue}else{if(j!==firstEmpty||run===a.length)continue}
   const n=Math.min(run,cap-b.length);const sc=b.length?(n===run?3:2)+(b.every(x=>x===top)?2:0):0;out.push([i,j,n,sc])}}
 out.sort((x,y)=>y[3]-x[3]);return out}
function solve(start,cap,limit=80000){const s=start.map(a=>a.slice());const seen=new Set(),path=[];let nodes=0,fail=false;
 const key=()=>s.map(a=>a.join(',')).sort().join('|');
 function dfs(){if(isDone(s,cap))return true;if(++nodes>limit){fail=true;return false}const k=key();if(seen.has(k))return false;seen.add(k);
  for(const [i,j,n] of legal(s,cap)){const moved=s[i].splice(s[i].length-n,n);s[j].push(...moved);path.push([i,j,n]);if(dfs())return true;path.pop();s[j].splice(s[j].length-n,n);s[i].push(...moved);if(fail)return false}return false}
 return dfs()?path.slice():null}
function params(L){const t=[[1,2],[2,3],[5,4],[10,5],[18,6],[28,7],[41,8],[56,9],[76,10],[100,11],[115,12]];let c=2;for(const [l,v] of t)if(L>=l)c=v;
 const hard=L%10===0&&L>5;const easy=L%10===3;if(hard)c=Math.min(12,c+1);if(easy&&c>3)c--;
 return{colors:c,cap:4,empty:2,hidden:L>=25?Math.min(.55,.15+(L-25)*.008):0,hard,easy}}
function gen(L){const P=params(L);for(let att=0;att<40;att++){const r=rng(hash('logjam'+L+'#'+att));
  /* choose which wood colors appear: always include the newest ones so new woods show up */
  const cols=[];for(let i=0;i<P.colors;i++)cols.push(i);
  const bag=[];cols.forEach(c=>{for(let k=0;k<P.cap;k++)bag.push(c)});for(let i=bag.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
  const st=[];for(let i=0;i<P.colors;i++)st.push(bag.slice(i*P.cap,(i+1)*P.cap));for(let e=0;e<P.empty;e++)st.push([]);
  if(st.some(a=>a.length===P.cap&&a.every(x=>x===a[0])))continue;
  const sol=solve(st,P.cap,P.colors>9?150000:80000);if(!sol)continue;
  const hidden=st.map(a=>a.map((x,i)=>i<a.length-1&&r()<P.hidden));
  return{L,...P,stacks:st,hiddenMask:hidden,par:sol.length,sol}}
 return null}
root.LJ={rng,hash,solve,legal,isDone,params,gen};
if(typeof module!=='undefined')module.exports=root.LJ;
})(typeof window!=='undefined'?window:globalThis);
