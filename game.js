'use strict';
/* ===== CONFIG ===== */
const cv=document.getElementById('c'),X=cv.getContext('2d'),W=900,H=450,WORLD=1500,GY=410;
const SC={pull:'#3b82f6',repel:'#ef4444',void:'#a855f7',shred:'#ff3b6b',rush:'#fbbf24',smash:'#f97316',swap:'#22c55e',slam:'#84cc16',crimson:'#ef4444',echo:'#fbbf24',bash:'#fb923c',wave:'#fbbf24',cleave:'#ff1030',dom:'#a78bfa'};
const SN={pull:'PULL',repel:'BLAST',void:'VOID',shred:'SHRED',rush:'RUSH',smash:'SMASH',swap:'SWAP',slam:'SLAM',crimson:'CRIMSON',echo:'ECHO',bash:'BASH',cleave:'CLEAVE'};
/* Character registry: add an entry here (+ its skill case in cast()) to add a fighter. */
const CH={
 sage:{name:'SAGE',col:'#4aa3ff',skills:['pull','repel','void'],dom:'void',look:{b:0,jc:'#1c2b57',pc:'#131b38',hr:'#f3f6ff',blind:1}},
 king:{name:'KING',col:'#ff4d6d',skills:['shred','cleave'],dom:'shrine',look:{b:1,jc:'#efe9dd',pc:'#2b2438',hr:'#f47fb2'}},
 brawler:{name:'BRAWLER',col:'#fbbf24',skills:['rush','smash'],kit:['crimson','echo','rush'],look:{b:0,jc:'#a32222',pc:'#2a1010',hr:'#ff9a3c',deco:'brawler'}},
 clapper:{name:'CLAPPER',col:'#22c55e',skills:['swap','slam'],kit:['swap','slam','bash'],look:{b:0,jc:'#1f7a5a',pc:'#14342b',hr:'#1f2d3a',deco:'clapper'}}};
const CK=Object.keys(CH);
/* Skill table: c=energy cost, cd=cooldown frames (60/s). Kit characters use these on 3 buttons. */
const SKD={crimson:{c:30,cd:100},echo:{c:40,cd:140},rush:{c:50,cd:200},swap:{c:35,cd:240},slam:{c:45,cd:160},bash:{c:30,cd:120}};
const plats=[{x:0,y:GY,w:WORLD},{x:150,y:320,w:200},{x:1150,y:320,w:200},{x:600,y:300,w:300},{x:380,y:210,w:200},{x:920,y:210,w:200},{x:20,y:200,w:120},{x:1360,y:200,w:120}];
/* ===== AUDIO ===== */
const S={music:1,sfx:1,shake:1};let AC;
function snd(f,d,ty,v,sl,m){if(!m&&!S.sfx)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=ty||'square';o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t+d);g.gain.setValueAtTime(v||.07,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(t+d)}catch(e){}}
/* ===== INPUT ===== */
const inp=[{l:0,r:0,j:0,a:0,s:0},{l:0,r:0,j:0,a:0,s:0}],pr=[{j:0,a:0,s:0,s2:0,s3:0,d:0,n:0},{j:0,a:0,s:0,s2:0,s3:0,d:0,n:0}];
const KM={KeyA:[0,'l'],KeyD:[0,'r'],KeyW:[0,'j'],KeyG:[0,'a'],KeyF:[0,'s'],KeyH:[0,'s2'],KeyT:[0,'d'],Semicolon:[1,'d'],KeyY:[0,'n'],Quote:[1,'n'],KeyR:[0,'s3'],Period:[1,'s2'],Comma:[1,'s3'],ArrowLeft:[1,'l'],ArrowRight:[1,'r'],ArrowUp:[1,'j'],Slash:[1,'a'],Enter:[1,'s']};
addEventListener('keydown',e=>{const m=KM[e.code];if(!m)return;e.preventDefault();const I=li(m[0]);inp[I][m[1]]=1;if(!e.repeat&&pr[I][m[1]]!==undefined)pr[I][m[1]]=1});
addEventListener('keyup',e=>{const m=KM[e.code];if(m)inp[li(m[0])][m[1]]=0});
(function(){const box=document.getElementById('ctl'),lay=[['a','✊'],['s','①'],['s2','②'],['s3','③'],['d','🌑'],['n','◯']];
 ['اللاعب 1','اللاعب 2'].forEach((n,i)=>{const g=document.createElement('div');g.className='g';g.innerHTML='<b>'+n+'</b>';
  lay.forEach(([k,t])=>{const b=document.createElement('button');b.textContent=t;
   const dn=e=>{e.preventDefault();b.classList.add('on');inp[li(i)][k]=1;if(pr[li(i)][k]!==undefined)pr[li(i)][k]=1};
   const up=e=>{e.preventDefault();b.classList.remove('on');inp[li(i)][k]=0};
   b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);b.addEventListener('contextmenu',e=>e.preventDefault());g.appendChild(b)});
  box.appendChild(g)})})();
/* ===== STATE ===== */
let P,shots,pick,parts,shake=0,flash=0,state='menu',spT=120,tick=0,overT=0,cam={x:750,z:1};
function mkP(i,ch){return{i,ch,x:i?1180:320,y:GY,vx:0,vy:0,f:i?-1:1,hp:100,en:100,sk:null,lsk:null,hit:0,at:0,sp:0,og:true,wk:0,cdA:0,cb:0,cbT:0,dcd:0,fz:0,ring:0,rcd:0,cds:{},reel:0,rs:null,name:CH[ch].name,col:CH[ch].col}}
function reset(a,b){P=[mkP(0,a),mkP(1,b)];dom=null;dsl=[];DM=[];CL=null;scars=[];shots=[];pick=[];parts=[];state='play';spT=90;document.getElementById('ov').style.display='none'}
P=[mkP(0,'sage'),mkP(1,'king')];shots=[];pick=[];parts=[];
function showOv(t,p,b){document.getElementById('ot').textContent=t;document.getElementById('op').textContent=p;document.getElementById('ob').textContent=b;document.getElementById('ov').style.display='flex'}
document.getElementById('ob').addEventListener('click',e=>{snd(500,.1,'triangle',.08,300);ON.role?onlineRestart():startSelect();e.target.blur()});
/* ===== EFFECTS ===== */
function burst(x,y,c,n,s){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*s*2,vy:(Math.random()-.5)*s*2,l:18+Math.random()*16,m:34,c})}
function hurt(t,d,kx,ky,o){t.hp=Math.max(0,t.hp-d);t.hit=14;t.vx+=kx;t.vy+=ky;if(ky<0)t.og=false;shake=Math.min(16,shake+d*.5);snd(170,.12,'square',.1,-110);burst(t.x,t.y-34,o.col,10+(d/2|0),6)}
function face(p,q){p.f=(q.x-p.x)>=0?1:-1}
/* ===== SKILLS ===== */
function cast(p){const d=p.f;p.sp=22;p.lsk=p.sk;
 if(p.sk==='pull'){shots.push({t:'pull',x:p.x+d*50,y:p.y-34,vx:d*5,vy:0,r:22,life:150,o:p.i,dl:0});snd(220,.5,'sine',.12,400)}
 else if(p.sk==='repel'){shots.push({t:'repel',x:p.x+d*75,y:p.y-30,vx:0,vy:0,r:10,life:18,o:p.i,dl:0,h:0});snd(140,.35,'sawtooth',.13,-90);shake=Math.max(shake,6)}
 else if(p.sk==='void'){shots.push({t:'void',x:p.x+d*40,y:p.y-34,vx:d*7,vy:0,r:30,life:170,o:p.i,dl:0,h:0});snd(80,.9,'sawtooth',.13,700);flash=.5}
 else if(p.sk==='shred'){for(let k=0;k<5;k++)shots.push({t:'shred',x:p.x+d*30,y:p.y-14-k*12,vx:d*12,vy:0,r:10,life:75,o:p.i,dl:k*5,h:0});snd(900,.2,'square',.07,-600)}
 else if(p.sk==='rush'){for(let k=0;k<6;k++)shots.push({t:'rush',x:p.x,y:p.y-34,vx:0,vy:0,r:14,life:1,o:p.i,dl:k*4});p.vx=d*10;snd(500,.3,'sawtooth',.08,300)}
 else if(p.sk==='smash'){shots.push({t:'smash',x:p.x+d*50,y:p.y-30,vx:0,vy:0,r:10,life:18,o:p.i,dl:0,h:0,rad:90,dmg:26,kb:22});snd(110,.35,'sawtooth',.14,-60);shake=Math.max(shake,8)}
 else if(p.sk==='slam'){shots.push({t:'slam',x:p.x,y:p.y-30,vx:0,vy:0,r:10,life:18,o:p.i,dl:0,h:0,rad:130,dmg:18,kb:15});snd(200,.15,'square',.1,-60);snd(120,.3,'sawtooth',.1,-60)}
 else if(p.sk==='swap'){const q=P[1-p.i],tx=p.x,ty=p.y;burst(p.x,p.y-30,SC.swap,24,8);burst(q.x,q.y-30,SC.swap,24,8);p.x=q.x;p.y=q.y;q.x=tx;q.y=ty;p.vy=q.vy=0;hurt(q,5,0,0,p);flash=.7;warp=12;rings.push({x:p.x,y:p.y-30,r:10,v:6,l:18,c:'#22c55e'},{x:q.x,y:q.y-30,r:10,v:6,l:18,c:'#22c55e'});face(p,q);p.at=14;p.cb=2;p.cdA=20;pop(p.x,p.y-90,'SWAP!','#22c55e');snd(700,.15,'square',.1,-300);snd(300,.2,'square',.1,400)}
 else if(p.sk==='crimson'){const q=P[1-p.i],crit=Math.random()<.3;p.vx=d*6;for(let k=0;k<5;k++)bolts.push(mkBolt(p.x+d*30,p.y-44,d,k%2?'#ef4444':'#111'));if(Math.abs(q.x-p.x)<100&&Math.abs(q.y-p.y)<60&&(q.x-p.x)*d>-10){hurt(q,crit?36:18,d*(crit?24:15),-6,p);if(crit){pop(q.x,q.y-90,'CRITICAL!','#ff2d2d');flash=.8;shake=16}else pop(q.x,q.y-90,'STRIKE!','#ef4444');burst(q.x,q.y-40,'#ef4444',24,9)}snd(90,.25,'sawtooth',.14,300);snd(1200,.1,'square',.06,-900)}
 else if(p.sk==='echo'){const q=P[1-p.i];if(Math.abs(q.x-p.x)<90&&Math.abs(q.y-p.y)<60&&(q.x-p.x)*d>-10)hurt(q,10,d*8,-3,p);rings.push({x:p.x+d*40,y:p.y-40,r:6,v:4,l:14,c:'#fbbf24'});shots.push({t:'wave',x:p.x+d*50,y:p.y-38,vx:d*9,vy:0,r:18,life:70,o:p.i,dl:14,h:0,dmg:12});snd(300,.2,'sawtooth',.1,-100)}
 else if(p.sk==='bash'){shots.push({t:'rush',x:p.x,y:p.y-34,vx:0,vy:0,r:14,life:1,o:p.i,dl:7,dmg:20,kb:22});p.vx=d*13;rings.push({x:p.x+d*30,y:p.y-40,r:6,v:5,l:12,c:'#fb923c'});snd(160,.3,'square',.12,-80)}
 else if(p.sk==='cleave'){const q=P[1-p.i];shots.push({t:'cleave',x:q.x,y:q.y-34,vx:0,vy:0,r:10,life:1,o:p.i,dl:14,dmg:16});snd(500,.3,'sawtooth',.08,300)}}
function shotsUpd(){for(const s of shots){if(s.dl>0){s.dl--;continue}const q=P[1-s.o],o=P[s.o];if(s.t==='rush'){s.x=o.x+o.f*40;s.y=o.y-34;if(Math.abs(q.x-o.x)>55)o.vx=o.f*8}s.x+=s.vx;s.y+=s.vy;s.life--;
  const cx=q.x,cy=q.y-30,d=Math.hypot(cx-s.x,cy-s.y);
  if(s.t==='pull'){if(s.life<90)s.vx*=.94;if(d<320&&d>16){const a=Math.atan2(s.y-cy,s.x-cx);q.vx+=Math.cos(a)*.9;q.vy+=Math.sin(a)*.35}
   if(d<s.r+22&&s.life%15===0)hurt(q,3,0,0,o);if(tick%2===0)parts.push({x:s.x+Math.cos(tick/3)*40,y:s.y+Math.sin(tick/3)*40,vx:(s.x-cx)*0,vy:0,l:10,m:10,c:SC.pull})}
  else if(s.t==='repel'||s.t==='smash'||s.t==='slam'){s.r+=5;if(!s.h){s.h=1;if(d<(s.rad||115))hurt(q,s.dmg||15,(cx>=s.x?1:-1)*(s.kb||17),-7,o);burst(s.x,s.y,SC[s.t],30,9)}}else if(s.t==='rush'){if(d<80){hurt(q,s.dmg||3,o.f*(s.kb||4),-1,o);burst(s.x,s.y,SC.rush,6,5)}}else if(s.t==='cleave'){addSlash({x:s.x,y:s.y+34},3);shake=Math.max(shake,8);snd(120,.2,'sawtooth',.12,-60);if(d<95)hurt(q,s.dmg,(cx>=s.x?1:-1)*8,-4,o)}
  else if(s.t==='void'){parts.push({x:s.x,y:s.y+(Math.random()-.5)*30,vx:0,vy:0,l:14,m:14,c:SC.void});if(!s.h&&d<s.r+22){s.h=1;hurt(q,35,Math.sign(s.vx)*20,-8,o);burst(s.x,s.y,SC.void,40,10);flash=1;s.life=0}}
  else if(s.t==='shred'||s.t==='wave'){if(!s.h&&Math.abs(cx-s.x)<(s.t==='wave'?30:24)&&Math.abs(cy-s.y)<46){s.h=1;hurt(q,s.dmg||5,Math.sign(s.vx)*(s.t==='wave'?10:6),-2,o);s.life=0;if(s.t==='shred')addSlash(q,2)}}}
 shots=shots.filter(s=>s.life>0)}
/* ===== PICKUPS ===== */
function spawn(){if(--spT>0)return;spT=170+(Math.random()*130|0);if(pick.length>=3)return;const nk=[0,1].filter(i=>!CH[P[i].ch].kit);if(!nk.length)return;const o=nk[Math.random()*nk.length|0],ty=CH[P[o].ch].skills;pick.push({x:90+Math.random()*(WORLD-180),y:-40,vy:0,type:ty[Math.random()*ty.length|0],o,life:900,g:0})}
function pickups(){for(const k of pick){k.life--;if(!k.g){const y0=k.y;k.vy=Math.min(4,k.vy+.12);k.y+=k.vy;for(const pl of plats){if(k.x>pl.x&&k.x<pl.x+pl.w&&y0<=pl.y-14&&k.y>=pl.y-14){k.y=pl.y-14;k.g=1;burst(k.x,k.y,SC[k.type],14,4);break}}}
  const p=P[k.o];if(!p.sk&&!p.reel&&Math.abs(p.x-k.x)<28&&Math.abs(p.y-30-k.y)<46){p.reel=55;p.rs=k.type;k.life=0;snd(600,.18,'triangle',.1,500);burst(k.x,k.y,'#ffd34d',20,6)}}
 pick=pick.filter(k=>k.life>0)}
/* ===== PLAYERS ===== */
function ctl(p){const c=inp[p.i],r=pr[p.i],q=P[1-p.i],dir=c.r-c.l;if(p.fz>0){p.fz--;p.vx*=.6;return}if(p.reel>0){if(p.reel%6===0)snd(500+Math.random()*400,.05,'square',.05);if(--p.reel===0){p.sk=p.rs;snd(800,.25,'triangle',.1,600);burst(p.x,p.y-40,SC[p.sk],20,6)}}
 p.vx+=(dir*4.4-p.vx)*(p.og?.22:.1);if(dir)p.f=dir;if(Math.abs(p.vx)>.6&&p.og)p.wk+=Math.abs(p.vx)*.09;
 if(r.j&&p.og){p.vy=-12.6;p.og=false;snd(420,.12,'triangle',.06,250)}
 if(r.a&&p.cdA<=0){p.cb=(p.cbT>0?p.cb+1:0)%3;p.cbT=40;p.cdA=p.cb===2?30:20;p.at=14;face(p,q);snd(260,.07,'triangle',.07,-120)}
 if(p.at===8){const dx=Math.abs(q.x-p.x),dy=Math.abs(q.y-p.y);if(dx<66&&dy<50&&(q.x-p.x)*p.f>-10&&q.hit<6){hurt(q,p.cb===2?10:4,p.f*(p.cb===2?14:7),-3,p);if(p.cb===2)pop(q.x,q.y-90,'COMBO!','#fbbf24')}}
 if(r.s&&p.sk&&p.en>=100){face(p,q);cast(p);p.sk=null;p.en=0}
 const kit=CH[p.ch].kit;if(kit)['s','s2','s3'].forEach((kk,n)=>{const sk=kit[n];if(r[kk]&&sk&&p.en>=SKD[sk].c&&!(p.cds[sk]>0)){face(p,q);p.sk=sk;cast(p);p.sk=null;p.en-=SKD[sk].c;p.cds[sk]=SKD[sk].cd}});if(r.d&&CH[p.ch].dom)tryDomain(p);if(r.n)tryRing(p);
 p.en=Math.min(100,p.en+.34)}
function phys(p){p.vy=Math.min(16,p.vy+.55);const y0=p.y;p.x+=p.vx;p.y+=p.vy;p.og=false;
 if(p.vy>=0)for(const pl of plats){if(p.x+10>pl.x&&p.x-10<pl.x+pl.w&&y0<=pl.y+1&&p.y>=pl.y){p.y=pl.y;p.vy=0;p.og=true;break}}
 p.x=Math.max(18,Math.min(WORLD-18,p.x));if(p.hit>0)p.hit--;if(p.cbT>0)p.cbT--;if(p.dcd>0)p.dcd--;if(p.rcd>0)p.rcd--;if(p.ring>0)p.ring--;for(const k in p.cds)if(p.cds[k]>0)p.cds[k]--;if(p.cdA>0)p.cdA--;if(p.at>0)p.at--;if(p.sp>0)p.sp--}
function step(){tick++;if(state==='select')selStep();
 if(ON.role==='guest'&&state!=='select'&&(ON.snap||state==='play'||state==='over')){guestStep();return}
 if(ON.role==='host'){if(ON.paused&&state==='play')return;if(state==='play')netPre()}
 if(state==='play'){P.forEach(ctl);spawn();pickups();shotsUpd();domStep();
  if(P[0].hp<=0||P[1].hp<=0){state='over';overT=70;dom=null;DM=[];CL=null;shake=14;flash=1}}
 P.forEach(phys);
 if(state==='over'&&--overT===0){const w=P[0].hp>0?'اللاعب 1 ('+P[0].name+')':'اللاعب 2 ('+P[1].name+')';showOv('🏆 فاز '+w,'معركة رائعة!','إعادة اللعب')}
 for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.l--}parts=parts.filter(p=>p.l>0);
 bolts.forEach(b=>b.l--);bolts=bolts.filter(b=>b.l>0);rings.forEach(r=>{r.r+=r.v;r.l--});rings=rings.filter(r=>r.l>0);pops.forEach(o=>{o.y-=.8;o.l--});pops=pops.filter(o=>o.l>0);warp*=.9;dsl.forEach(s=>s.l--);dsl=dsl.filter(s=>s.l>0);scars.forEach(s=>s.l--);scars=scars.filter(s=>s.l>0);
 shake*=.9;flash*=.9;pr.forEach(o=>{o.j=o.a=o.s=o.s2=o.s3=o.d=o.n=0});if(ON.role==='host'&&(state==='play'||state==='over')&&tick%3===0)sendSnap()}
/* ===== BACKGROUND (parallax) ===== */
const rnd=(function(){let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();
const far=[],mid=[];for(let i=0;i<40;i++)far.push({x:i*110,w:60+rnd()*70,h:80+rnd()*140});
for(let i=0;i<24;i++)mid.push({x:i*190,w:50+rnd()*50,h:120+rnd()*120,t:rnd()<.4});
function layer(a,sp,f,c,gy,det){const per=a.length*sp;for(const b of a){const sx=((b.x-cam.x*f)%per+per)%per-120;X.fillStyle=c;X.fillRect(sx,gy-b.h,b.w,b.h+300);
  if(det){if(b.t){X.beginPath();X.moveTo(sx-8,gy-b.h);X.lineTo(sx+b.w/2,gy-b.h-40);X.lineTo(sx+b.w+8,gy-b.h);X.fill()}else{X.fillStyle='#ffb84d55';for(let k=0;k<3;k++)X.fillRect(sx+8+k*14,gy-b.h+14+(k%2)*22,6,9)}}}}
function bg(){const gy=250+160*cam.z;let g=X.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b0620');g.addColorStop(.6,'#2a1250');g.addColorStop(1,'#4a1840');X.fillStyle=g;X.fillRect(0,0,W,H);
 const mx=700-cam.x*.03;g=X.createRadialGradient(mx,80,10,mx,80,110);g.addColorStop(0,'#e9e1ffcc');g.addColorStop(1,'#e9e1ff00');X.fillStyle=g;X.fillRect(mx-110,0,220,200);
 X.fillStyle='#f1ebff';X.beginPath();X.arc(mx,80,32,0,7);X.fill();
 X.fillStyle='#ffffff88';for(let i=0;i<30;i++)X.fillRect((i*97-cam.x*.05+900)%900,(i*53)%200,2,2);
 layer(far,110,.12,'#1a1038',gy,false);layer(mid,190,.3,'#251447',gy,true);
 g=X.createLinearGradient(0,gy-70,0,gy+10);g.addColorStop(0,'#7c3aed00');g.addColorStop(1,'#7c3aed44');X.fillStyle=g;X.fillRect(0,gy-70,W,80)}
/* ===== DRAW CHARACTERS ===== */
function drawChar(p){const LK=CH[p.ch].look,k=LK.b,air=!p.og,mv=Math.abs(p.vx)>.6&&!air,sw=mv?Math.sin(p.wk)*13:0,bob=!mv&&!air?Math.sin(tick/12)*1.5:0;
 const jc=LK.jc,pc=LK.pc,skn='#f2d0b0',hr=LK.hr;
 X.save();X.translate(p.x,p.y);X.scale(p.f,1);if(p.hit>0&&p.hit%4<2)X.globalAlpha=.5;X.lineCap='round';
 if(p.sk){const g=X.createRadialGradient(0,-32,5,0,-32,48);g.addColorStop(0,SC[p.sk]+'77');g.addColorStop(1,SC[p.sk]+'00');X.fillStyle=g;X.fillRect(-52,-84,104,108)}
 const L=air?(p.vy<0?[[9,-12],[-7,-7]]:[[10,-1],[-10,-1]]):[[sw,0],[-sw,0]];
 X.strokeStyle=pc;X.lineWidth=9;L.forEach(f=>{X.beginPath();X.moveTo(0,-26+bob);X.lineTo(f[0],f[1]);X.stroke()});
 X.fillStyle='#0c0c14';L.forEach(f=>X.fillRect(f[0]-3,f[1]-4,11,5));
 const arm=(sx,sy,ex,ey)=>{X.strokeStyle=jc;X.lineWidth=7;X.beginPath();X.moveTo(sx,sy);X.lineTo(ex,ey);X.stroke();X.fillStyle=skn;X.beginPath();X.arc(ex,ey,4.5,0,7);X.fill()};
 arm(-6,-47+bob,-8-sw*.5,-28+bob);if(k)arm(-5,-40+bob,-12,-24+bob);
 X.fillStyle=jc;X.beginPath();X.moveTo(-12,-50+bob);X.lineTo(12,-50+bob);X.lineTo(10,-24+bob);X.lineTo(-10,-24+bob);X.closePath();X.fill();
 if(k){X.fillStyle='#1a1424';X.fillRect(-12,-34+bob,24,5);X.fillRect(-2,-50+bob,4,26)}else{X.fillStyle='#0d1430';X.fillRect(-12,-52+bob,24,7);X.fillRect(-10,-33+bob,20,4)}
 X.fillStyle=skn;X.beginPath();X.arc(1,-63+bob,11,0,7);X.fill();
 X.fillStyle=hr;X.beginPath();
 if(k){[[-12,-62],[-9,-80],[-3,-72],[2,-84],[7,-73],[13,-80],[12,-63],[9,-68],[-8,-68]].forEach((v,i)=>i?X.lineTo(v[0],v[1]+bob):X.moveTo(v[0],v[1]+bob))}
 else{[[-13,-60],[-14,-76],[-6,-70],[-4,-87],[2,-72],[8,-86],[10,-71],[15,-78],[13,-62],[9,-68],[-9,-68]].forEach((v,i)=>i?X.lineTo(v[0],v[1]+bob):X.moveTo(v[0],v[1]+bob))}
 X.closePath();X.fill();
 if(k){X.fillStyle='#c01040';X.fillRect(3,-64+bob,7,2);X.strokeStyle='#7a1030';X.lineWidth=1.5;X.beginPath();X.moveTo(4,-58+bob);X.lineTo(9,-58+bob);X.moveTo(4,-55+bob);X.lineTo(9,-55+bob);X.stroke()}
 else if(LK.blind){X.fillStyle='#0b0b14';X.fillRect(-9,-67+bob,21,6)}
 if(LK.deco==='brawler'){X.fillStyle='#fff';X.fillRect(-11,-71+bob,24,4);X.fillStyle='#222';X.fillRect(5,-65+bob,3,3)}else if(LK.deco==='clapper'){X.fillStyle='#ff9f1c';X.fillRect(-10,-54+bob,22,5);X.fillStyle='#7dd3fc';X.fillRect(-1,-66+bob,12,5)}
 let ex,ey;if(p.at>0){ex=10+Math.sin((1-p.at/14)*3.14)*34;ey=-44+bob}else if(p.sp>0){const cl=p.lsk==='swap'||p.lsk==='dom';ex=cl?14:30;ey=cl?-46:-58}else if(air){ex=16;ey=-62}else{ex=8+sw*.5;ey=-28+bob}
 arm(6,-47+bob,ex,ey);if(k)arm(5,-40+bob,ex-4,ey+10);
 if(p.at>5&&p.at<13){X.strokeStyle='#fff';X.lineWidth=3;X.beginPath();X.arc(18,-44,30,-.9,.9);X.stroke();for(let q=0;q<3;q++){X.beginPath();X.moveTo(-8-q*8,-52+q*8);X.lineTo(-40-q*10,-52+q*8);X.stroke()}}
 if(p.sp>0&&p.lsk){const g=X.createRadialGradient(ex,ey,2,ex,ey,22);g.addColorStop(0,SC[p.lsk]);g.addColorStop(1,SC[p.lsk]+'00');X.fillStyle=g;X.fillRect(ex-22,ey-22,44,44)}
 X.restore()}
/* ===== DRAW WORLD ===== */
function drawShot(s){if(s.dl>0){if(s.t==='cleave'){X.save();X.globalAlpha=.4+.4*Math.sin(tick);X.strokeStyle='#ff1030';X.lineWidth=2;X.beginPath();X.moveTo(s.x-40,s.y-40);X.lineTo(s.x+40,s.y+40);X.moveTo(s.x+40,s.y-40);X.lineTo(s.x-40,s.y+40);X.stroke();X.restore()}return}X.save();X.globalCompositeOperation='lighter';const c=SC[s.t];
 if(s.t==='shred'){const d=Math.sign(s.vx);X.fillStyle=c;X.beginPath();X.moveTo(s.x-d*38,s.y+14);X.lineTo(s.x+d*10,s.y-1);X.lineTo(s.x-d*38,s.y-14);X.lineTo(s.x-d*18,s.y);X.closePath();X.fill();for(let i=1;i<4;i++){X.globalAlpha=.18;X.beginPath();const ox=s.x-d*i*16;X.moveTo(ox-d*38,s.y+14);X.lineTo(ox+d*10,s.y-1);X.lineTo(ox-d*38,s.y-14);X.closePath();X.fill()}X.globalAlpha=1;X.strokeStyle='#fff';X.lineWidth=2;X.beginPath();X.moveTo(s.x-d*30,s.y);X.lineTo(s.x+d*10,s.y-1);X.stroke()}
 else if(s.t==='repel'||s.t==='smash'||s.t==='slam'){const g=X.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);g.addColorStop(0,'#fff');g.addColorStop(.4,c+'cc');g.addColorStop(1,c+'00');X.fillStyle=g;X.beginPath();X.arc(s.x,s.y,s.r,0,7);X.fill();X.strokeStyle=c;X.lineWidth=4;X.beginPath();X.arc(s.x,s.y,s.r,0,7);X.stroke()}
 else{const g=X.createRadialGradient(s.x,s.y,2,s.x,s.y,s.r*1.6);g.addColorStop(0,'#fff');g.addColorStop(.35,c);g.addColorStop(1,c+'00');X.fillStyle=g;X.beginPath();X.arc(s.x,s.y,s.r*1.6,0,7);X.fill();
  X.strokeStyle='#fff8';X.lineWidth=2;for(let i=0;i<3;i++){X.beginPath();X.arc(s.x,s.y,s.r*(.5+i*.3),tick/5+i,tick/5+i+3);X.stroke()}}
 X.restore()}
function drawWorld(){
 X.fillStyle='#07050f';X.fillRect(-500,-600,500,1500);X.fillRect(WORLD,-600,500,1500);
 for(const pl of plats){const g=pl.y===GY;X.fillStyle=g?'#140f2a':'#1e1738';X.fillRect(pl.x,pl.y,pl.w,g?400:14);X.fillStyle='#7c3aed';X.fillRect(pl.x,pl.y,pl.w,3);
  if(!g){X.strokeStyle='#3a2a66';X.lineWidth=2;for(let x=pl.x+20;x<pl.x+pl.w;x+=40){X.beginPath();X.moveTo(x,pl.y+14);X.lineTo(x-6,pl.y+26);X.stroke()}}}
 for(const k of pick){const c='#ffd34d',pu=Math.sin(tick/8)*3;X.save();X.globalCompositeOperation='lighter';
  const bg=X.createLinearGradient(0,k.y-500,0,k.y);bg.addColorStop(0,c+'00');bg.addColorStop(1,c+'55');X.fillStyle=bg;X.fillRect(k.x-8,k.y-500,16,500);
  const g=X.createRadialGradient(k.x,k.y,2,k.x,k.y,22+pu);g.addColorStop(0,'#fff');g.addColorStop(.4,c);g.addColorStop(1,c+'00');X.fillStyle=g;X.beginPath();X.arc(k.x,k.y,22+pu,0,7);X.fill();X.restore();
  X.fillStyle='#fff';X.font='700 11px system-ui';X.textAlign='center';X.fillText('? SLOT',k.x,k.y-26)}
 P.forEach(drawChar);P.forEach(p=>{if(p.reel>0){X.fillStyle=SC[rk(p)];X.font='700 14px system-ui';X.textAlign='center';X.fillText('🎰 '+SN[rk(p)],p.x,p.y-96)}});shots.forEach(drawShot);drawFx();drawDom();
 X.save();X.globalCompositeOperation='lighter';for(const p of parts){X.globalAlpha=Math.max(0,p.l/p.m);X.fillStyle=p.c;X.beginPath();X.arc(p.x,p.y,3,0,7);X.fill()}X.restore()}
function hud(){for(const p of P){const l=p.i===0,x=l?16:W-316;X.fillStyle='#000a';X.fillRect(x-2,10,304,66);portrait(p.ch,l?x+308:x-60);if(CH[p.ch].kit)kitHud(p,x,l);if(CH[p.ch].dom)domHud(p,x,l);ringHud(p,x,l);
  X.fillStyle='#2a2540';X.fillRect(x,14,300,14);const w=300*p.hp/100;X.fillStyle=p.hp>30?p.col:'#ff2d2d';X.fillRect(l?x:x+300-w,14,w,14);
  X.fillStyle='#2a2540';X.fillRect(x,32,300,7);const ew=300*p.en/100;X.fillStyle=p.en>=100?'#fff':'#a855f7';X.fillRect(l?x:x+300-ew,32,ew,7);
  X.fillStyle='#fff';X.font='700 12px system-ui';X.textAlign=l?'left':'right';X.fillText(p.name+'  HP '+Math.ceil(p.hp),l?x:x+300,54);
  const rl=p.reel>0?rk(p):null;X.fillStyle=rl?SC[rl]:p.sk?SC[p.sk]:'#aaa';X.fillText(rl?'🎰 SPINNING: '+SN[rl]:p.sk?'SKILL: '+SN[p.sk]+(p.en>=100?' — READY':' — charging'):'SKILL: none',l?x:x+300,70)}}
function render(){if(state==='menu'){menuScene();return}if(state==='select'){selScene();return}const a=P[0],b=P[1],dist=Math.abs(a.x-b.x),tz=Math.min(1.05,Math.max(.62,W/(dist+420)));
 cam.z+=(tz-cam.z)*.06;const hv=W/2/cam.z;cam.x+=(Math.min(WORLD-hv,Math.max(hv,(a.x+b.x)/2))-cam.x)*.1;
 bg();domBg();X.save();X.translate(W/2+(Math.random()-.5)*shake*S.shake,250+(Math.random()-.5)*shake*S.shake);X.scale(cam.z,cam.z);if(warp>.5)X.transform(1,0,Math.sin(tick*1.3)*.012*warp,1,0,0);X.translate(-cam.x,-250);drawWorld();X.restore();domOver();
 if(flash>.02){X.fillStyle='rgba(255,255,255,'+Math.min(.6,flash*.6)+')';X.fillRect(0,0,W,H)}hud();drawJoy();netHud()}
/* ===== TOUCH JOYSTICKS: left half = P1, right half = P2 ===== */
const joy=[null,null];cv.style.touchAction='none';
function jpt(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;e.preventDefault();const p=jpt(e),i=ON.role?0:(p.x<W/2?0:1);if(joy[i])return;joy[i]={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,up:0};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{for(let i=0;i<2;i++){const j=joy[i];if(!j||j.id!==e.pointerId)continue;const p=jpt(e);let dx=p.x-j.ox,dy=p.y-j.oy;const d=Math.hypot(dx,dy);if(d>50){dx*=50/d;dy*=50/d}j.x=j.ox+dx;j.y=j.oy+dy;inp[i].l=dx<-14?1:0;inp[i].r=dx>14?1:0;if(dy<-30){if(!j.up){pr[i].j=1;j.up=1}}else j.up=0}});
const jend=e=>{for(let i=0;i<2;i++){const j=joy[i];if(j&&j.id===e.pointerId){joy[i]=null;inp[i].l=inp[i].r=0}}};
cv.addEventListener('pointerup',jend);cv.addEventListener('pointercancel',jend);
function drawJoy(){for(const j of joy){if(!j)continue;X.fillStyle='#ffffff22';X.beginPath();X.arc(j.ox,j.oy,50,0,7);X.fill();X.fillStyle='#ffffff88';X.beginPath();X.arc(j.x,j.y,22,0,7);X.fill()}}
/* ===== MENU / RANDOM SELECT / MUSIC ===== */
let sel=null;const $=id=>document.getElementById(id);
function dmy(ch,off,still){const a=(tick+off)%110;return{ch,i:0,x:0,y:0,vx:0,vy:0,f:1,hit:0,at:!still&&a<14?14-a:0,sp:0,og:true,wk:0,sk:null,lsk:null,reel:0}}
function rk(p){const s=CH[p.ch].skills;return s[(tick>>2)%s.length]}
function portrait(ch,px){X.save();X.beginPath();X.rect(px,10,52,66);X.clip();X.fillStyle='#000a';X.fillRect(px,10,52,66);X.translate(px+26,72);X.scale(.62,.62);drawChar(dmy(ch,0,1));X.restore()}
function menuScene(){cam.x=750+Math.sin(tick/260)*180;cam.z=1;bg();const n=CK.length;
 X.save();X.globalCompositeOperation='lighter';X.fillStyle='rgba(167,139,250,.06)';for(let r=0;r<4;r++){const x0=(r*260+tick*.6)%(W+300);X.beginPath();X.moveTo(x0,0);X.lineTo(x0+60,0);X.lineTo(x0-200,H);X.lineTo(x0-260,H);X.fill()}X.restore();
 X.fillStyle='#140f2a';X.fillRect(0,400,W,50);X.fillStyle='#7c3aed';X.fillRect(0,400,W,3);
 CK.forEach((k,i)=>{const left=i<n/2,x=left?90+i*130:W-90-(n-1-i)*130,c=CH[k].col;
  X.save();X.globalCompositeOperation='lighter';X.globalAlpha=.5+.4*Math.sin(tick/20+i);const g=X.createRadialGradient(x,320,10,x,320,130);g.addColorStop(0,c+'99');g.addColorStop(1,c+'00');X.fillStyle=g;X.fillRect(x-130,190,260,260);X.restore();
  const d=dmy(k,i*27);d.f=left?1:-1;X.save();X.translate(x,400);X.scale(1.7,1.7);drawChar(d);X.restore()});
 X.save();for(let j=0;j<40;j++){X.globalAlpha=.7;X.fillStyle=j%2?'#a78bfa':'#f472b6';X.fillRect((j*127+tick*(.3+j%3*.2))%W,H-((tick*(.6+j%4*.3)+j*53)%H),2,2+j%3)}X.restore();
 const g=X.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.65);g.addColorStop(0,'#0000');g.addColorStop(1,'#000c');X.fillStyle=g;X.fillRect(0,0,W,H);
 X.fillStyle='#000';X.fillRect(0,0,W,30);X.fillRect(0,H-30,W,30);
 const f=tick%300;if(f<10){X.fillStyle='rgba(255,255,255,'+(.4-f*.04)+')';X.fillRect(0,0,W,H)}}
function selScene(){const s=sel,n=CK.length;cam.x=750;cam.z=1;bg();X.fillStyle='#000a';X.fillRect(0,0,W,H);
 X.fillStyle='#fff';X.font='900 22px system-ui';X.textAlign='center';X.fillText('RANDOM SELECT',W/2,36);
 const gap=14,cw=(W-60-(n-1)*gap)/n,ch=250,y=60,p1=s.t<80?s.ca:s.a,p2=s.t<80?-1:(s.t<160?s.cb:s.b);
 for(let i=0;i<n;i++){const k=CK[i],x=30+i*(cw+gap),c=CH[k].col,on1=i===p1,on2=i===p2;
  X.fillStyle=(i===s.a&&s.t>=80&&!on1)?'#0a0816':'#150f2c';X.fillRect(x,y,cw,ch);
  X.lineWidth=on1||on2?5:2;X.strokeStyle=on1&&on2?'#fff':on1?'#4aa3ff':on2?'#ff4d6d':c+'66';X.strokeRect(x,y,cw,ch);
  if(on1||on2){X.fillStyle=(on1?'#4aa3ff':'#ff4d6d')+'33';X.fillRect(x,y,cw,ch)}
  X.save();X.translate(x+cw/2,y+ch-70);X.scale(1.6,1.6);drawChar(dmy(k,i*20));X.restore();
  X.textAlign='center';X.fillStyle='#fff';X.font='800 16px system-ui';X.fillText(CH[k].name,x+cw/2,y+ch-40);
  X.font='11px system-ui';X.fillStyle=c;X.fillText((CH[k].kit||CH[k].skills).map(q=>SN[q]).join(' · '),x+cw/2,y+ch-22);
  X.font='900 14px system-ui';if(on1){X.fillStyle='#4aa3ff';X.fillText('P1',x+cw/2,y+20)}if(on2){X.fillStyle='#ff4d6d';X.fillText('P2',x+cw/2,y+(on1?38:20))}}
 let m='';if(s.t>=80&&s.t<160)m='P1: '+CH[CK[s.a]].name;if(s.t>=160)m='P1: '+CH[CK[s.a]].name+'   VS   P2: '+CH[CK[s.b]].name;
 X.fillStyle='#fff';X.font='800 20px system-ui';X.textAlign='center';X.fillText(m,W/2,H-60);
 if(s.t>=160){X.font='12px system-ui';X.fillStyle='#c4b5fd';X.fillText('الجولة تبدأ...',W/2,H-36)}}
function startSelect(fa,fb){$('ov').style.display='none';$('ob').disabled=false;$('menu').style.display='none';inp.forEach(o=>{o.l=o.r=0});
 const n=CK.length,a=fa!==undefined?fa:Math.random()*n|0,b=fb!==undefined?fb:(a+1+(Math.random()*(n-1)|0))%n;sel={a,b,t:0,ca:0,cb:0};state='select'}
function selStep(){const s=sel,n=CK.length;s.t++;
 if(s.t<80){const iv=2+(s.t>>4);if(s.t%iv===0){s.ca=(s.ca+1)%n;snd(300+s.ca*80,.04,'square',.04)}if(s.t===79){s.ca=s.a;snd(700,.2,'triangle',.1,500);shake=8}}
 else if(s.t<160){const t=s.t-80,iv=2+(t>>4);if(t%iv===0){do{s.cb=(s.cb+1)%n}while(s.cb===s.a);snd(300+s.cb*80,.04,'square',.04)}if(s.t===159){s.cb=s.b;snd(700,.2,'triangle',.1,500);shake=8}}
 else if(s.t===230){reset(CK[s.a],CK[s.b])}}
function toMenu(){state='menu';$('ov').style.display='none';$('menu').style.display='flex'}
const NT=[0,3,7,10,12,10,7,3],BS=[0,0,-2,-5];let mus=null,ms=0;
function musicOn(){if(mus||!S.music)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){return}
 mus=setInterval(()=>{if(!S.music)return;const n=NT[ms%8],b=BS[(ms>>3)%4];snd(110*Math.pow(2,(n+b)/12),.22,'triangle',.035,0,1);if(ms%4===0)snd(55*Math.pow(2,b/12),.5,'sine',.06,0,1);ms++},240)}
function musicOff(){clearInterval(mus);mus=null}
function muteIcon(){$('mute').textContent=(S.music||S.sfx)?'🔊':'🔇'}
function click(){snd(520,.08,'square',.08,300)}
function sets(){const Lb={music:'الموسيقى',sfx:'المؤثرات',shake:'اهتزاز الشاشة'};$('sl').innerHTML='';for(const k in Lb){const b=document.createElement('button');b.className='mb';b.textContent=Lb[k]+': '+(S[k]?'تشغيل':'إيقاف');b.onclick=()=>{S[k]=S[k]?0:1;click();if(k==='music'){S.music?musicOn():musicOff()}sets();muteIcon()};$('sl').appendChild(b)}}
function panel(t){const p=$('pn');p.style.display='flex';
 if(t==='how')p.innerHTML='<div class="pc"><h3>HOW TO PLAY</h3><p>اللاعب 1: A/D حركة، W قفز، G ضرب، F مهارة.<br>اللاعب 2: الأسهم للحركة والقفز، / ضرب، Enter مهارة.<br>الموبايل: المس نصف الشاشة واسحب للتحريك، واسحب للأعلى للقفز.<br>التقط الكرة الذهبية لتدور البكرة وتحصل على مهارة عشوائية.<br>الشخصيات تُختار عشوائياً في كل جولة.</p><button class="mb" id="pcl">رجوع</button></div>';
 else{p.innerHTML='<div class="pc"><h3>SETTINGS</h3><div id="sl"></div><button class="mb" id="pcl">رجوع</button></div>';sets()}
 $('pcl').onclick=()=>{click();p.style.display='none'}}
$('bPlay').onclick=()=>{click();musicOn();startSelect()};
$('bHow').onclick=()=>{click();panel('how')};
$('bSet').onclick=()=>{click();panel('set')};
$('ob2').onclick=()=>{click();ON.role?leaveOnline():toMenu()};
$('mute').onclick=()=>{const on=!(S.music||S.sfx);S.music=S.sfx=on?1:0;on?musicOn():musicOff();muteIcon();click()};
addEventListener('pointerdown',musicOn);
/* ===== FX + KIT HUD ===== */
let bolts=[],rings=[],pops=[],warp=0;
function pop(x,y,t,c){pops.push({x,y,t,c,l:50})}
function mkBolt(x,y,d,c){const pts=[[x,y]];let px=x,py=y;for(let i=0;i<6;i++){px+=d*14;py+=(Math.random()-.5)*22;pts.push([px,py])}return{pts,c,l:12}}
function drawFx(){X.save();X.lineCap='round';X.lineJoin='round';
 for(const b of bolts){X.globalAlpha=b.l/12;for(const w of [[6,'#ef4444'],[2.5,b.c==='#111'?'#111':'#fff']]){X.lineWidth=w[0];X.strokeStyle=w[1];X.beginPath();b.pts.forEach((q,i)=>i?X.lineTo(q[0],q[1]+(Math.random()-.5)*3):X.moveTo(q[0],q[1]));X.stroke()}}
 for(const r of rings){X.globalAlpha=r.l/18;X.strokeStyle=r.c;X.lineWidth=3;X.beginPath();X.arc(r.x,r.y,r.r,0,7);X.stroke()}
 X.font='900 16px system-ui';X.textAlign='center';for(const o of pops){X.globalAlpha=Math.min(1,o.l/20);X.fillStyle=o.c;X.strokeStyle='#000';X.lineWidth=3;X.strokeText(o.t,o.x,o.y);X.fillText(o.t,o.x,o.y)}X.restore()}
function kitHud(p,x,l){const kit=CH[p.ch].kit,ks=l?['F','H','R']:['Ent','.',','];kit.forEach((sk,n)=>{const bx=x+n*102,ok=p.en>=SKD[sk].c,cd=p.cds[sk]>0?p.cds[sk]/SKD[sk].cd:0;X.fillStyle='#000a';X.fillRect(bx,80,98,16);X.fillStyle=cd>0?'#555':ok?SC[sk]+'cc':'#333';X.fillRect(bx,80,98*(cd>0?1-cd:1),16);X.fillStyle='#fff';X.font='700 10px system-ui';X.textAlign='left';X.fillText('['+ks[n]+'] '+SN[sk]+' '+SKD[sk].c,bx+4,92)})}
/* ===== DOMAIN EXPANSION: Crimson Sanctum (KING) — 10s, recharge 35s, needs 100% energy ===== */
let dom=null,dsl=[];const DR=520;
function domK(){return dom?Math.min(1,dom.age/45)*Math.min(1,dom.t/40):0}
function startDomain(p){p.en=0;dom={o:p.i,age:0,t:600};shake=20;flash=1;pop(p.x,p.y-100,'DOMAIN EXPANSION','#ff2d2d');snd(50,1.6,'sawtooth',.2,160);snd(35,2,'sine',.25);snd(220,1.2,'square',.07,-150);burst(p.x,p.y-40,'#ff2020',36,12);burst(p.x,p.y-40,'#8a0018',36,12)}
function addSlash(q,n){for(let i=0;i<n;i++)dsl.push({x:q.x+(Math.random()-.5)*40,y:q.y-34+(Math.random()-.5)*40,a:Math.random()*3.14,len:50+Math.random()*60,l:12})}
function domStep(){if(!dom)return;const p=P[dom.o],q=P[1-dom.o];dom.age++;dom.t--;
 if(dom.age<70)shake=Math.max(shake,12);
 if(dom.age>40){q.vx*=.85;if(q.vy<-8)q.vy=-8;if(q.x>p.x+DR){q.x=p.x+DR;q.vx=-3}if(q.x<p.x-DR){q.x=p.x-DR;q.vx=3}
  if(dom.age%5===0)dsl.push({x:p.x+(Math.random()-.5)*900,y:100+Math.random()*300,a:(Math.random()-.5)*1.2+(Math.random()<.5?0:1.57),len:150+Math.random()*150,l:10,amb:1})}
 if(dom.age>60){const n=dom.age-60;
  if(n%20===0){hurt(q,1,0,0,p);addSlash(q,1);snd(900,.07,'square',.05,-500)}
  if(n%60===30){hurt(q,2.5,(q.x>=p.x?1:-1)*3,-2,p);addSlash(q,4);shake=Math.max(shake,9);burst(q.x,q.y-34,'#ff2020',16,8);snd(300,.15,'sawtooth',.1,-200)}}
 if(dom.t<=0){dom=null;p.dcd=2100;shake=10;flash=.6;pop(p.x,p.y-100,'DOMAIN COLLAPSE','#fff');snd(300,.7,'sawtooth',.1,-250);burst(p.x,p.y-40,'#8a0018',30,10)}}
function shrine(cx,by){X.lineJoin='round';
 for(let i=0;i<3;i++){const w=430-i*120,b=by-i*118,top=b-92;
  X.fillStyle='#16000a';X.strokeStyle='#ff2a2a';X.lineWidth=2;X.fillRect(cx-w/2+34,top,w-68,92);X.strokeRect(cx-w/2+34,top,w-68,92);
  for(let k=0;k<4;k++){X.fillStyle=(tick+k*7+i*3)%40<34?'#ff3030':'#7a0010';X.fillRect(cx-w/2+58+k*((w-140)/3),top+22,12,26)}
  X.fillStyle='#16000a';X.beginPath();X.moveTo(cx-w/2-50,top+8);X.quadraticCurveTo(cx-w/2+10,top-4,cx,top-62);X.quadraticCurveTo(cx+w/2-10,top-4,cx+w/2+50,top+8);X.quadraticCurveTo(cx,top-18,cx-w/2-50,top+8);X.fill();X.stroke();
  for(let k=-3;k<=3;k++){X.beginPath();X.moveTo(cx+k*20-5,top-40+Math.abs(k)*9);X.lineTo(cx+k*20,top-58+Math.abs(k)*9);X.lineTo(cx+k*20+5,top-40+Math.abs(k)*9);X.fill()}}
 X.fillStyle='#000';X.beginPath();X.moveTo(cx-40,by);X.lineTo(cx-40,by-50);X.quadraticCurveTo(cx,by-88,cx+40,by-50);X.lineTo(cx+40,by);X.fill();
 X.fillStyle='#ff2030';[-1,1].forEach(s=>{X.beginPath();X.moveTo(cx+s*8,by-60);X.lineTo(cx+s*30,by-70);X.lineTo(cx+s*26,by-56);X.fill()});
 X.fillStyle='#e8e0d0';for(let k=-3;k<=3;k++){X.beginPath();X.moveTo(cx+k*10-4,by-38);X.lineTo(cx+k*10,by-24);X.lineTo(cx+k*10+4,by-38);X.fill()}}
function domBg(){if(!dom)return;const k=domK(),gy=250+160*cam.z,oy=(dom.age<60?Math.pow(1-dom.age/60,3)*430:0)+(dom.t<40?Math.pow(1-dom.t/40,2)*430:0);
 X.save();X.globalAlpha=k;let g=X.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0006');g.addColorStop(.6,'#620012');g.addColorStop(1,'#140004');X.fillStyle=g;X.fillRect(0,0,W,H);
 const mx=W*.5-cam.x*.02,rg=X.createRadialGradient(mx,150,10,mx,150,190);rg.addColorStop(0,'#ff5050');rg.addColorStop(.5,'#b0102066');rg.addColorStop(1,'#b0102000');X.fillStyle=rg;X.fillRect(mx-200,0,400,350);
 shrine(W/2,gy+oy);X.restore()}
function domOver(){if(!dom)return;const k=domK();X.save();
 X.globalCompositeOperation='multiply';X.fillStyle='rgba(255,60,60,'+(.75*k)+')';X.fillRect(0,0,W,H);X.globalCompositeOperation='source-over';
 const g=X.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,W*.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(.85*k)+')');X.fillStyle=g;X.fillRect(0,0,W,H);
 if(dom.age<40){X.strokeStyle='rgba(255,40,40,'+(1-dom.age/40)+')';X.lineWidth=10;X.beginPath();X.arc(W/2,H/2,dom.age*24,0,7);X.stroke()}
 if(dom.age>40&&dom.age%9<2){X.strokeStyle='#fff';X.lineWidth=2;const y0=Math.random()*H;X.beginPath();X.moveTo(0,y0);X.lineTo(W,y0+(Math.random()-.5)*200);X.stroke()}
 X.fillStyle='#000';const bh=24*k;X.fillRect(0,0,W,bh);X.fillRect(0,H-bh,W,bh);X.restore()}
function drawDom(){if(!dom)return;const p=P[dom.o],k=domK();X.save();
 if(dom.age>40)for(const sd of [-1,1]){const x=p.x+sd*DR,g=X.createLinearGradient(x-sd*40,0,x,0);g.addColorStop(0,'rgba(255,32,48,0)');g.addColorStop(1,'rgba(255,32,48,'+(.45*k)+')');X.fillStyle=g;X.fillRect(Math.min(x,x-sd*40),-300,40,800)}
 X.globalAlpha=k;X.save();X.globalCompositeOperation='lighter';const rg=X.createRadialGradient(p.x,p.y-40,5,p.x,p.y-40,90);rg.addColorStop(0,'rgba(255,48,48,.55)');rg.addColorStop(1,'rgba(255,48,48,0)');X.fillStyle=rg;X.fillRect(p.x-90,p.y-130,180,180);X.restore();
 for(let i=0;i<8;i++){const a=i/8*6.28+tick/12,fx=p.x+Math.cos(a)*24,h=46+Math.sin(tick/4+i)*16;X.fillStyle=i%2?'#ff2030':'#0c0004';X.beginPath();X.moveTo(fx-7,p.y);X.quadraticCurveTo(fx+Math.sin(tick/5+i)*8,p.y-h,fx+6,p.y-h*1.7);X.quadraticCurveTo(fx+10,p.y-h*.5,fx+7,p.y);X.fill()}
 X.lineCap='round';for(const s of dsl){const dx=Math.cos(s.a)*s.len,dy=Math.sin(s.a)*s.len;X.globalAlpha=s.l/(s.amb?10:12);X.strokeStyle='#ff1030';X.lineWidth=s.amb?3:7;X.beginPath();X.moveTo(s.x-dx,s.y-dy);X.lineTo(s.x+dx,s.y+dy);X.stroke();X.strokeStyle='#fff';X.lineWidth=s.amb?1:2;X.stroke()}
 X.restore()}
function domHud(p,x,l){const on=dom&&dom.o===p.i,rdy=p.dcd<=0&&p.en>=100&&!dom,f=on?dom.t/600:p.dcd>0?1-p.dcd/2100:p.en/100,w=300*f;
 X.fillStyle='#000a';X.fillRect(x,80,300,16);X.fillStyle=on||rdy?'#ff2030':'#5a2030';X.fillRect(l?x:x+300-w,80,w,16);
 X.fillStyle='#fff';X.font='700 10px system-ui';X.textAlign='left';X.fillText('['+(l?'T':';')+'] DOMAIN '+(on?'ACTIVE '+Math.ceil(dom.t/60)+'s':p.dcd>0?'recharge '+Math.ceil(p.dcd/60)+'s':p.en>=100?'READY':'needs full energy'),x+4,92)}
/* ===== DOMAIN SYSTEM v2: per-character domains, Null Ring, Domain Clash (overrides the v1 functions above) ===== */
let DM=[],CL=null,scars=[];
const DD={void:{name:'ENDLESS EXPANSE',col:'#a78bfa',base:.95},shrine:{name:'CRIMSON SANCTUM',col:'#ff2d2d',base:1.05}};
function domK(d){return Math.min(1,d.age/45)*Math.min(1,d.t/40)}
function dpow(d){return(.6+.4*P[d.o].hp/100)*(.7+.3*d.t/600)*DD[d.ty].base}
function addSlash(q,n){for(let i=0;i<n;i++)dsl.push({x:q.x+(Math.random()-.5)*40,y:q.y-34+(Math.random()-.5)*40,a:(Math.random()-.5)*2.2+(i%2?.8:-.8),len:50+Math.random()*60,l:12});scars.push({x:q.x,l:50})}
function tryDomain(p){if(CL&&DM.some(d=>d.o===p.i)){CL.m+=(p.i===CL.L?1:-1)*5;snd(200+Math.random()*200,.04,'square',.05);return}
 if(DM.some(d=>d.o===p.i)||p.dcd>0||p.en<100)return;startDomain(p)}
function startDomain(p){const ty=CH[p.ch].dom;p.en=0;p.sp=40;p.lsk='dom';p.fz=22;DM.push({o:p.i,ty,age:0,t:600});shake=20;flash=1;pop(p.x,p.y-100,DD[ty].name,DD[ty].col);snd(50,1.6,'sawtooth',.2,160);snd(35,2,'sine',.25);snd(220,1.2,'square',.07,-150);burst(p.x,p.y-40,DD[ty].col,36,12);
 if(DM.length>1&&!CL){CL={t:300,m:0,L:Math.min(DM[0].o,DM[1].o)};pop(p.x,p.y-130,'DOMAIN CLASH!','#fff');snd(70,1,'sawtooth',.2,400)}}
function endDomain(d,txt){DM=DM.filter(z=>z!==d);const p=P[d.o];p.dcd=2100;pop(p.x,p.y-100,txt,'#fff');snd(300,.7,'sawtooth',.1,-250);burst(p.x,p.y-40,DD[d.ty].col,30,10);shake=Math.max(shake,12);flash=Math.max(flash,.5)}
function tryRing(p){if(p.ring>0||p.rcd>0||p.en<30)return;p.en-=30;p.ring=180;p.rcd=480;rings.push({x:p.x,y:p.y-30,r:10,v:5,l:18,c:'#67e8f9'});snd(500,.25,'triangle',.1,300);pop(p.x,p.y-90,'NULL RING','#67e8f9')}
function domStep(){
 if(CL){const a=DM.find(d=>d.o===CL.L),b=DM.find(d=>d.o!==CL.L);
  if(!a||!b){CL=null}else{CL.t--;CL.m=Math.max(-100,Math.min(100,CL.m+(dpow(a)-dpow(b))*.6));shake=Math.max(shake,8);
   const bx=W/2+CL.m*W*.0045;if(tick%3===0)burst(cam.x+(bx-W/2)/cam.z,GY-30-Math.random()*160,'#ffffff',3,8);
   if(CL.m>=100||CL.m<=-100||CL.t<=0){const win=CL.m>15?a:CL.m<-15?b:null;
    if(win){const lose=win===a?b:a;endDomain(lose,'DOMAIN BROKEN');win.age=Math.max(win.age,60);pop(P[win.o].x,P[win.o].y-120,'DOMAIN HOLDS','#fff')}else{endDomain(a,'CLASH DRAW');endDomain(b,'CLASH DRAW')}
    CL=null;flash=1;shake=18}}
  return}
 for(const d of DM.slice()){d.age++;d.t--;const p=P[d.o],q=P[1-d.o],rd=q.ring>0,red=Math.max(.5,Math.min(.9,1.5-dpow(d)*.9)),m=rd?1-red:1;
  if(d.age<70)shake=Math.max(shake,12);
  if(d.age>40&&!rd){q.vx*=d.ty==='void'?.7:.85;if(q.vy<-8)q.vy=-8;if(d.ty==='shrine'){if(q.x>p.x+DR){q.x=p.x+DR;q.vx=-3}if(q.x<p.x-DR){q.x=p.x-DR;q.vx=3}}}
  if(d.ty==='shrine'&&d.age>40&&d.age%5===0)dsl.push({x:p.x+(Math.random()-.5)*900,y:100+Math.random()*300,a:(Math.random()-.5)*1.2+(Math.random()<.5?0:1.57),len:150+Math.random()*150,l:10,amb:1});
  if(d.age>60){const n=d.age-60;
   if(d.ty==='shrine'){if(n%20===0){hurt(q,1*m,0,0,p);addSlash(q,2);snd(900,.07,'square',.05,-500)}
    if(n%60===30){hurt(q,2.5*m,(q.x>=p.x?1:-1)*3,-2,p);addSlash(q,6);shake=Math.max(shake,9);burst(q.x,q.y-34,'#ff2020',16,8);snd(300,.15,'sawtooth',.1,-200)}}
   else{if(n%30===0){hurt(q,1.2*m,0,0,p);rings.push({x:q.x,y:q.y-34,r:8,v:4,l:14,c:'#a78bfa'});burst(q.x,q.y-34,'#a78bfa',6,5)}
    if(n%150===0&&!rd){q.fz=25;pop(q.x,q.y-90,'FROZEN','#a78bfa')}}}
  if(d.t<=0)endDomain(d,'DOMAIN COLLAPSE')}}
function dBg(d,k,gy){const ag=CL?Math.max(d.age,60):d.age,tt=CL?Math.max(d.t,40):d.t,oy=(ag<60?Math.pow(1-ag/60,3)*430:0)+(tt<40?Math.pow(1-tt/40,2)*430:0);X.save();X.globalAlpha=k;
 if(d.ty==='shrine'){const g=X.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0006');g.addColorStop(.6,'#620012');g.addColorStop(1,'#140004');X.fillStyle=g;X.fillRect(0,0,W,H);const mx=W*.5-cam.x*.02,rg=X.createRadialGradient(mx,150,10,mx,150,190);rg.addColorStop(0,'#ff5050');rg.addColorStop(.5,'rgba(176,16,32,.4)');rg.addColorStop(1,'rgba(176,16,32,0)');X.fillStyle=rg;X.fillRect(mx-200,0,400,350);shrine(W/2,gy+oy)}
 else{const g=X.createRadialGradient(W/2,H/2,20,W/2,H/2,W*.7);g.addColorStop(0,'#2a1a7a');g.addColorStop(.5,'#0b0630');g.addColorStop(1,'#020010');X.fillStyle=g;X.fillRect(0,0,W,H);
  X.fillStyle='#fff';for(let i=0;i<60;i++){const a=i*2.4+tick*.004*(1+i%3),r=40+((i*37)%360);X.globalAlpha=k*(.3+.7*(((i+(tick>>3))%3)/2));X.fillRect(W/2+Math.cos(a)*r*1.5,H/2+Math.sin(a)*r*.8,1+i%2,1+i%2)}
  X.globalAlpha=k;const R=Math.min(1,ag/45)*(tt<40?tt/40:1)*280,sg=X.createRadialGradient(W/2,200,R*.2,W/2,200,Math.max(1,R));sg.addColorStop(0,'rgba(124,92,255,0)');sg.addColorStop(.85,'rgba(124,92,255,.35)');sg.addColorStop(1,'rgba(200,180,255,.7)');X.fillStyle=sg;X.beginPath();X.arc(W/2,200,R,0,7);X.fill();
  X.strokeStyle='#c4b5fd';X.lineWidth=2;for(let j=0;j<5;j++){X.beginPath();X.arc(W/2,200,Math.max(1,R*(.3+j*.14)),tick/30+j,tick/30+j+2.2);X.stroke()}}
 X.restore()}
function domBg(){if(!DM.length)return;const gy=250+160*cam.z;
 if(CL){const bx=W/2+CL.m*W*.0045;DM.forEach(d=>{X.save();X.beginPath();if(d.o===CL.L)X.rect(0,0,bx,H);else X.rect(bx,0,W-bx,H);X.clip();dBg(d,1,gy);X.restore()});return}
 DM.forEach(d=>dBg(d,domK(d),gy))}
function domOver(){if(!DM.length)return;const bx=W/2+(CL?CL.m*W*.0045:0);let kk=0;
 DM.forEach(d=>{const k=CL?1:domK(d);kk=Math.max(kk,k);X.save();if(CL){X.beginPath();if(d.o===CL.L)X.rect(0,0,bx,H);else X.rect(bx,0,W-bx,H);X.clip()}
  X.globalCompositeOperation='multiply';X.fillStyle=d.ty==='shrine'?'rgba(255,60,60,'+(.75*k)+')':'rgba(120,110,255,'+(.7*k)+')';X.fillRect(0,0,W,H);X.restore()});
 X.save();const g=X.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,W*.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(.8*kk)+')');X.fillStyle=g;X.fillRect(0,0,W,H);
 if(CL){X.lineJoin='round';for(const w of [[16,'rgba(255,255,255,.25)'],[3,'#fff']]){X.lineWidth=w[0];X.strokeStyle=w[1];X.beginPath();for(let y=0;y<=H;y+=22){const x=bx+(y?(Math.random()-.5)*18:0);y?X.lineTo(x,y):X.moveTo(x,y)}X.stroke()}
  const a=DM.find(d=>d.o===CL.L),b=DM.find(d=>d.o!==CL.L);
  if(a&&b){const x0=W/2-150,y0=118,pa=dpow(a),pb=dpow(b),fr=.5+CL.m/200;X.fillStyle='rgba(0,0,0,.8)';X.fillRect(x0-2,y0-2,304,20);X.fillStyle=DD[a.ty].col;X.fillRect(x0,y0,300*fr,16);X.fillStyle=DD[b.ty].col;X.fillRect(x0+300*fr,y0,300*(1-fr),16);X.fillStyle='#fff';X.fillRect(x0+300*fr-2,y0-4,4,24);X.font='800 11px system-ui';X.textAlign='center';X.fillText('DOMAIN CLASH  '+pa.toFixed(2)+' vs '+pb.toFixed(2)+'  ('+Math.ceil(CL.t/60)+'s)',W/2,y0+34);X.fillText('MASH YOUR DOMAIN BUTTON!',W/2,y0+48)}}
 else if(DM[0].age<40){X.strokeStyle='rgba(255,255,255,'+(1-DM[0].age/40)+')';X.lineWidth=10;X.beginPath();X.arc(W/2,H/2,DM[0].age*24,0,7);X.stroke()}
 X.fillStyle='#000';const bh=24*kk;X.fillRect(0,0,W,bh);X.fillRect(0,H-bh,W,bh);X.restore()}
function drawDom(){X.save();X.lineCap='round';
 for(const s of scars){X.globalAlpha=s.l/50;X.strokeStyle='#ff1030';X.lineWidth=3;X.beginPath();X.moveTo(s.x-50,GY+1);X.lineTo(s.x-15,GY+5);X.lineTo(s.x+10,GY);X.lineTo(s.x+50,GY+3);X.stroke()}
 for(const s of dsl){const pg=Math.min(1,(13-s.l)/4),dx=Math.cos(s.a),dy=Math.sin(s.a),L=s.len*pg,w=s.amb?2.5:6;X.globalAlpha=s.l/(s.amb?10:12);
  for(const f of [[1,'#ff1030'],[.35,'#fff']]){X.fillStyle=f[1];X.beginPath();X.moveTo(s.x-dx*L,s.y-dy*L);X.lineTo(s.x-dy*w*f[0],s.y+dx*w*f[0]);X.lineTo(s.x+dx*L,s.y+dy*L);X.lineTo(s.x+dy*w*f[0],s.y-dx*w*f[0]);X.closePath();X.fill()}}
 X.globalAlpha=1;
 for(const p of P){if(p.ring>0){X.globalAlpha=Math.min(1,p.ring/30);X.strokeStyle='#67e8f9';X.lineWidth=3;X.setLineDash([14,8]);X.beginPath();X.arc(p.x,p.y-34,46,tick/15,tick/15+6.28);X.stroke();X.setLineDash([])}
  if(p.fz>0){X.globalAlpha=.7;X.strokeStyle='#c4b5fd';X.lineWidth=2;X.strokeRect(p.x-16,p.y-90,32,92)}}
 for(const d of DM){const p=P[d.o],k=CL?1:domK(d);X.globalAlpha=k;
  X.save();X.globalCompositeOperation='lighter';const rg=X.createRadialGradient(p.x,p.y-40,5,p.x,p.y-40,90);rg.addColorStop(0,d.ty==='shrine'?'rgba(255,48,48,.55)':'rgba(140,110,255,.55)');rg.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=rg;X.fillRect(p.x-90,p.y-130,180,180);X.restore();
  if(d.ty==='shrine'){for(let i=0;i<8;i++){const a=i/8*6.28+tick/12,fx=p.x+Math.cos(a)*24,h=46+Math.sin(tick/4+i)*16;X.fillStyle=i%2?'#ff2030':'#0c0004';X.beginPath();X.moveTo(fx-7,p.y);X.quadraticCurveTo(fx+Math.sin(tick/5+i)*8,p.y-h,fx+6,p.y-h*1.7);X.quadraticCurveTo(fx+10,p.y-h*.5,fx+7,p.y);X.fill()}
   if(!CL&&d.age>40)for(const sd of [-1,1]){const x=p.x+sd*DR,g=X.createLinearGradient(x-sd*40,0,x,0);g.addColorStop(0,'rgba(255,32,48,0)');g.addColorStop(1,'rgba(255,32,48,'+(.45*k)+')');X.fillStyle=g;X.fillRect(Math.min(x,x-sd*40),-300,40,800)}}
  else{X.fillStyle='#e9e1ff';for(let i=0;i<10;i++){const a=i/10*6.28+tick/20;X.fillRect(p.x+Math.cos(a)*(30+i%3*8),p.y-40+Math.sin(a)*(40+i%2*10),2,2)}}}
 X.restore()}
function domHud(p,x,l){const d=DM.find(z=>z.o===p.i),nm=DD[CH[p.ch].dom],f=d?d.t/600:p.dcd>0?1-p.dcd/2100:p.en/100,w=300*f,rdy=!d&&p.dcd<=0&&p.en>=100;
 X.fillStyle='#000a';X.fillRect(x,80,300,16);X.fillStyle=d||rdy?nm.col:'#4a3050';X.fillRect(l?x:x+300-w,80,w,16);
 X.fillStyle='#fff';X.font='700 10px system-ui';X.textAlign='left';X.fillText('['+(l?'T':';')+'] '+nm.name+' '+(d?(CL?'CLASH':Math.ceil(d.t/60)+'s'):p.dcd>0?'recharge '+Math.ceil(p.dcd/60)+'s':p.en>=100?'READY':'needs full energy'),x+4,92)}
function ringHud(p,x,l){const w=130,rx=l?x:x+300-w,f=p.ring>0?p.ring/180:p.rcd>0?1-p.rcd/480:Math.min(1,p.en/30),kc=l?'Y':String.fromCharCode(39);
 X.fillStyle='#000a';X.fillRect(rx,100,w,12);X.fillStyle=p.ring>0?'#67e8f9':p.rcd>0?'#345':p.en>=30?'#22d3ee':'#234';X.fillRect(rx,100,w*f,12);X.fillStyle='#fff';X.font='700 9px system-ui';X.textAlign='left';X.fillText('['+kc+'] NULL RING '+(p.ring>0?'ON':p.rcd>0?Math.ceil(p.rcd/60)+'s':''),rx+3,109)}
/* ===== ONLINE MULTIPLAYER (room capability; host-authoritative) =====
   Host (P1) runs the whole simulation: damage, cooldowns, domains, clash, winner. Guest (P2) only sends inputs and renders host snapshots. */
const ON={role:null,code:'',nr:null,R:undefined,gp:null,hp:null,accepted:false,full:false,pc:[0,0,0,0,0,0,0],gin:null,ginT:0,paused:false,pauseT:0,lostT:0,lastSnap:0,snap:null,fresh:0,msg:'',unsub:[],seq:0,cnt:[0,0,0,0,0,0,0],lm:0,lc:'',lt:0};
const NK=['l','r','j','a','s','s2','s3','d','n'],PK=['j','a','s','s2','s3','d','n'];
function li(i){return ON.role?0:i}
let evq=[];const _burst=burst,_snd=snd;
burst=function(x,y,c,n,s){if(ON.role==='host'&&evq.length<30)evq.push(['b',x|0,y|0,c,n,s]);return _burst(x,y,c,n,s)};
snd=function(f,d,ty,v,sl,m){if(ON.role==='host'&&!m&&evq.length<30)evq.push(['n',f|0,d,ty,v,sl|0]);return _snd(f,d,ty,v,sl,m)};
function setStatus(t){const e=$('ost');if(e)e.textContent=t}
function pres(o){try{ON.nr.presence(o).catch(()=>{})}catch(e){}}
function genCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',u=new Uint32Array(5);crypto.getRandomValues(u);let s='';for(const v of u)s+=a[v%a.length];return s}
async function getRoom(){if(ON.R!==undefined)return ON.R;try{ON.R=typeof claude!=='undefined'?await claude.use('room'):null}catch(e){ON.R=null}return ON.R}
async function openRoom(role,code){const R=await getRoom();if(!R){setStatus('الأونلاين غير مُعدّ: أضف SUPABASE_URL و SUPABASE_ANON_KEY (راجع README)');return false}
 try{ON.nr=await R.join('cpb-'+code.toLowerCase())}catch(e){setStatus('تعذر الدخول إلى الغرفة: '+(e&&e.code||'error'));return false}
 const nr=ON.nr;ON.role=role;ON.code=code;ON.gp=ON.hp=null;ON.accepted=ON.full=false;ON.pc=[0,0,0,0,0,0,0];ON.cnt=[0,0,0,0,0,0,0];ON.gin=null;ON.snap=null;ON.paused=false;ON.lostT=0;ON.lastSnap=Date.now();ON.lm=0;ON.lc='';inp.forEach(o=>{for(const k in o)o[k]=0});
 pres(role==='host'?{role:'host',open:true,gp:null}:{role:'guest'});
 ON.unsub=[nr.onPeers(onPeers),nr.on('g',onG),role==='host'?nr.on('i',onInput):nr.on('s',onSnap),nr.onConnection(()=>uiStatus())];return true}
function onPeers(ch){const ps=ch.peers,me=ps.find(p=>p.isMe&&p.sameTab);
 if(ON.role==='host'){const gs=ps.filter(p=>!p.isMe&&p.presence&&p.presence.role==='guest');
  if(ON.gp&&gs.some(p=>p.peer===ON.gp)){if(ON.lostT||ON.paused){ON.lostT=0;ON.paused=false;pres({open:false,gp:ON.gp})}}
  else{if(ON.gp&&!ON.lostT)ON.lostT=Date.now();const c=gs[0];if(c&&(!ON.gp||Date.now()-ON.lostT>2000)){ON.gp=c.peer;ON.lostT=0;ON.pc=[0,0,0,0,0,0,0];ON.gin=null;ON.paused=false;pres({open:false,gp:c.peer})}}}
 else{const h=ps.find(p=>!p.isMe&&p.presence&&p.presence.role==='host');ON.hp=h?h.peer:null;ON.accepted=!!(h&&me&&h.presence.gp===me.peer);ON.full=!!(h&&h.presence.open===false&&!ON.accepted)}
 uiStatus()}
function uiStatus(){if(!$('ost'))return;const ps=ON.nr?ON.nr.peers():[];
 if(ON.role==='host'){const here=!!(ON.gp&&ps.some(p=>p.peer===ON.gp));setStatus(!ON.nr.connected()?'جارٍ الاتصال بالخادم…':here?'✅ اللاعب الآخر متصل — اضغط START':'⏳ بانتظار انضمام اللاعب الآخر… أرسل له الكود');if($('rstart'))$('rstart').disabled=!here}
 else if(ON.role==='guest')setStatus(ON.full?'❌ الغرفة ممتلئة':ON.accepted?'✅ تم الاتصال — بانتظار بدء المضيف…':ON.hp?'جارٍ الانضمام…':'⏳ جارٍ البحث عن الغرفة…')}
function onInput(m){if(m.peer!==ON.gp)return;const d=m.data;if(!d||typeof d.m!=='number'||!Array.isArray(d.c)||d.c.length!==7)return;if(ON.gin&&d.n<ON.gin.n)return;ON.gin=d;ON.ginT=Date.now()}
function netPre(){const g=ON.gin&&Date.now()-ON.ginT<400?ON.gin:null;NK.forEach((k,i)=>{inp[1][k]=g?(g.m>>i)&1:0});PK.forEach((k,i)=>{const c=g?g.c[i]|0:0;if(c>ON.pc[i]){pr[1][k]=1;ON.pc[i]=c}})}
function sendSnap(){const r=n=>Math.round(n*10)/10;
 const pl=P.map(p=>({x:r(p.x),y:r(p.y),vx:r(p.vx),vy:r(p.vy),f:p.f,h:r(p.hp),e:r(p.en),ht:p.hit,a:p.at,s:p.sp,g:p.og?1:0,w:r(p.wk),r:p.reel,z:p.fz,rg:p.ring,rc:p.rcd,dc:p.dcd,sk:p.sk,ls:p.lsk,cd:p.cds,cb:p.cb,rs:p.rs}));
 const s={q:++ON.seq,st:state,ch:[P[0].ch,P[1].ch],p:pl,sh:shots.filter(z=>z.dl<=0||z.t==='cleave').slice(0,14).map(z=>[z.t,r(z.x),r(z.y),r(z.vx),z.r,z.o,z.dl|0,z.life|0]),pk:pick.map(k=>[k.x|0,k.y|0,k.type,k.o,k.g]),dm:DM.map(d=>({o:d.o,ty:d.ty,age:d.age,t:d.t})),cl:CL,
  rg:rings.slice(0,8).map(z=>[z.x|0,z.y|0,z.r|0,z.v,z.l,z.c]),ds:dsl.slice(0,12).map(z=>[z.x|0,z.y|0,r(z.a),z.len|0,z.l,z.amb?1:0]),sc:scars.slice(0,6).map(z=>[z.x|0,z.l]),po:pops.slice(0,5).map(z=>[z.x|0,z.y|0,z.t,z.c,z.l]),bo:bolts.slice(0,6).map(z=>[z.pts[0][0]|0,z.pts[0][1]|0,Math.sign(z.pts[1][0]-z.pts[0][0]),z.c,z.l]),sk:r(shake),fl:r(flash),wp:r(warp),ev:evq};
 evq=[];let j=JSON.stringify(s);if(j.length>3900){s.ev=s.ev.slice(0,6);s.ds=s.ds.slice(0,5);j=JSON.stringify(s)}if(j.length>3900){s.ev=[];s.sh=s.sh.slice(0,8)}
 ON.nr.emit('s',s).catch(()=>{})}
function onSnap(m){if(m.peer!==ON.hp||!m.data||!Array.isArray(m.data.p))return;ON.snap=m.data;ON.fresh=1;ON.lastSnap=Date.now()}
function cosm(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.l--}parts=parts.filter(p=>p.l>0);bolts.forEach(b=>b.l--);bolts=bolts.filter(b=>b.l>0);rings.forEach(r=>{r.r+=r.v;r.l--});rings=rings.filter(r=>r.l>0);pops.forEach(o=>{o.y-=.8;o.l--});pops=pops.filter(o=>o.l>0);dsl.forEach(s=>s.l--);dsl=dsl.filter(s=>s.l>0);scars.forEach(s=>s.l--);scars=scars.filter(s=>s.l>0);shake*=.9;flash*=.9;warp*=.9}
function applySnap(s){
 if(!P||P[0].ch!==s.ch[0]||P[1].ch!==s.ch[1]||(state!=='play'&&state!=='over')){reset(s.ch[0],s.ch[1]);$('menu').style.display='none';$('pn').style.display='none'}
 s.p.forEach((q,i)=>{const p=P[i],far=p.x===undefined||Math.hypot(p.x-q.x,p.y-q.y)>150;p.tx=q.x;p.ty=q.y;p.vx=q.vx;p.vy=q.vy;p.f=q.f;p.hp=q.h;p.en=q.e;p.hit=q.ht;p.at=q.a;p.sp=q.s;p.og=!!q.g;p.wk=q.w;p.reel=q.r;p.fz=q.z;p.ring=q.rg;p.rcd=q.rc;p.dcd=q.dc;p.sk=q.sk;p.lsk=q.ls;p.cds=q.cd||{};p.cb=q.cb;p.rs=q.rs;if(far){p.x=q.x;p.y=q.y}});
 shots=s.sh.map(z=>({t:z[0],x:z[1],y:z[2],vx:z[3],vy:0,r:z[4],o:z[5],dl:z[6],life:z[7]}));pick=s.pk.map(k=>({x:k[0],y:k[1],type:k[2],o:k[3],g:k[4]}));
 DM=s.dm||[];CL=s.cl||null;rings=s.rg.map(z=>({x:z[0],y:z[1],r:z[2],v:z[3],l:z[4],c:z[5]}));dsl=s.ds.map(z=>({x:z[0],y:z[1],a:z[2],len:z[3],l:z[4],amb:z[5]}));scars=s.sc.map(z=>({x:z[0],l:z[1]}));pops=s.po.map(z=>({x:z[0],y:z[1],t:z[2],c:z[3],l:z[4]}));
 bolts=s.bo.map(z=>{const b=mkBolt(z[0],z[1],z[2]||1,z[3]);b.l=z[4];return b});shake=Math.max(shake,s.sk);flash=Math.max(flash,s.fl);warp=Math.max(warp,s.wp);
 for(const e of s.ev){if(e[0]==='b')_burst(e[1],e[2],e[3],e[4],e[5]);else _snd(e[1],e[2],e[3],e[4],e[5])}
 if(s.st==='over'&&state!=='over'){state='over';overT=60}if(s.st==='play'&&state==='over'){state='play';$('ov').style.display='none'}}
function guestStep(){
 if(ON.snap&&ON.fresh){ON.fresh=0;try{applySnap(ON.snap)}catch(e){}}
 if(P&&P[0]&&P[1]){for(const p of P){if(p.tx!==undefined){p.tx+=p.vx;if(!p.og){p.ty+=p.vy;p.vy+=.55}p.x+=(p.tx-p.x)*.4;p.y+=(p.ty-p.y)*.4}if(p.dcd>0)p.dcd--;if(p.rcd>0)p.rcd--;if(p.ring>0)p.ring--;for(const k in p.cds)if(p.cds[k]>0)p.cds[k]--}
  shots.forEach(s=>{s.x+=s.vx});if(!CL)DM.forEach(d=>{d.age++;d.t--});else CL.t--}
 cosm();
 if(state==='over'&&overT>0&&--overT===0){const w=P[0].hp>0?'اللاعب 1 ('+P[0].name+')':'اللاعب 2 ('+P[1].name+')';showOv('🏆 فاز '+w,'بانتظار المضيف لبدء جولة جديدة','…');$('ob').disabled=true}
 PK.forEach((k,i)=>{if(pr[0][k])ON.cnt[i]++});let m=0;NK.forEach((k,i)=>{if(inp[0][k])m|=1<<i});const lc=ON.cnt.join(),chg=m!==ON.lm||lc!==ON.lc;
 if(ON.nr&&((chg&&tick-ON.lt>=2)||tick-ON.lt>=4)){ON.lt=tick;ON.lm=m;ON.lc=lc;ON.nr.emit('i',{m,c:ON.cnt.slice(),n:++ON.seq}).catch(()=>{})}
 pr.forEach(o=>{o.j=o.a=o.s=o.s2=o.s3=o.d=o.n=0})}
function onG(m){const d=m.data;if(!d||d.k!=='start'||ON.role!=='guest'||m.peer!==ON.hp)return;const n=CK.length;if(!Number.isInteger(d.a)||!Number.isInteger(d.b)||d.a<0||d.b<0||d.a>=n||d.b>=n||d.a===d.b)return;$('pn').style.display='none';$('menu').style.display='none';DM=[];CL=null;ON.snap=null;startSelect(d.a,d.b)}
function onlineStart(fa,fb){if(ON.role!=='host'||!ON.gp||!ON.nr)return;const n=CK.length,a=fa!==undefined?fa:Math.random()*n|0,b=fb!==undefined?fb:(a+1+(Math.random()*(n-1)|0))%n;evq=[];ON.paused=false;ON.nr.emit('g',{k:'start',a,b}).catch(()=>{});$('pn').style.display='none';startSelect(a,b)}
function onlineRestart(){if(ON.role==='host')onlineStart()}
async function leaveOnline(close,msg){ON.unsub.forEach(u=>{try{u()}catch(e){}});ON.unsub=[];const nr=ON.nr;ON.nr=null;ON.role=null;ON.gp=ON.hp=null;ON.snap=null;ON.paused=false;ON.accepted=ON.full=false;inp.forEach(o=>{for(const k in o)o[k]=0});if(nr){try{await nr.leave()}catch(e){}}DM=[];CL=null;toMenu();if(msg){onlinePanel('msg',msg)}else $('pn').style.display='none'}
function onlinePanel(kind,msg){const p=$('pn');p.style.display='flex';
 if(kind==='host')p.innerHTML='<div class=pc><h3>CREATE ROOM</h3><p>كود الغرفة (أرسله لصديقك):</p><p><b id=rcode class=big></b></p><p id=ost></p><button class=mb id=rstart disabled>START</button> <button class=mb id=rcopy>COPY CODE</button> <button class=mb id=rleave>LEAVE</button></div>';
 else if(kind==='join')p.innerHTML='<div class=pc><h3>JOIN ROOM</h3><p>اكتب كود الغرفة:</p><p><input id=rin maxlength=5 autocomplete=off></p><p id=ost></p><button class=mb id=rgo>JOIN</button> <button class=mb id=rleave>BACK</button></div>';
 else p.innerHTML='<div class=pc><h3>ONLINE</h3><p id=ost></p><button class=mb id=rleave>OK</button></div>';
 if(msg)setStatus(msg);
 $('rleave').onclick=()=>{click();if(ON.role)leaveOnline();else $('pn').style.display='none'};
 if(kind==='host'){$('rstart').onclick=()=>{click();onlineStart()};$('rcopy').onclick=()=>{click();try{navigator.clipboard.writeText(ON.code)}catch(e){}}}
 if(kind==='join')$('rgo').onclick=()=>{click();doJoin()}}
async function createRoom(){click();musicOn();onlinePanel('host');const code=genCode();$('rcode').textContent=code;if(await openRoom('host',code))uiStatus()}
async function doJoin(){const c=($('rin').value||'').trim().toUpperCase();if(!/^[A-Z2-9]{5}$/.test(c)){setStatus('الكود غير صحيح (5 خانات)');return}
 setStatus('جارٍ الانضمام…');if(!(await openRoom('guest',c)))return;uiStatus();
 setTimeout(()=>{if(ON.role==='guest'&&!ON.hp)leaveOnline(true,'الغرفة غير موجودة أو المضيف غير متصل')},6000)}
function netTick(){if(!ON.role||!ON.nr)return;const now=Date.now();
 if(ON.role==='host'){if(ON.gp&&ON.lostT&&now-ON.lostT>2000&&!ON.paused){pres({open:true,gp:null});if(state==='play'||state==='over'){ON.paused=true;ON.pauseT=now}}
  if(ON.paused&&now-ON.pauseT>30000)leaveOnline(true,'انتهت المهلة: لم يعد اللاعب الآخر')}
 else{ON.msg=(state==='play'&&now-ON.lastSnap>2500)?'انقطع الاتصال بالمضيف… جارٍ الانتظار':'';if(state==='play'&&now-ON.lastSnap>30000)leaveOnline(true,'انقطع الاتصال بالمضيف')}}
setInterval(netTick,500);
function netHud(){if(!ON.role)return;X.save();X.textAlign='center';X.font='700 11px system-ui';const ok=ON.nr&&ON.nr.connected();X.fillStyle=ok?'#4ade80':'#f87171';X.fillText((ok?'● ONLINE':'● RECONNECTING')+' — YOU ARE P'+(ON.role==='host'?1:2)+'  ['+ON.code+']',W/2,14);
 let m='';if(ON.role==='host'&&ON.paused)m='OPPONENT DISCONNECTED — waiting '+Math.max(0,30-Math.floor((Date.now()-ON.pauseT)/1000))+'s';else if(ON.role==='guest')m=ON.msg;
 if(m){X.fillStyle='rgba(0,0,0,.7)';X.fillRect(W/2-190,H/2-22,380,40);X.fillStyle='#fff';X.font='800 14px system-ui';X.fillText(m,W/2,H/2+4)}X.restore()}
$('bCreate').onclick=createRoom;$('bJoin').onclick=()=>{click();onlinePanel('join')};
let last=0,acc=0;function loop(ts){acc+=Math.min(100,ts-last);last=ts;while(acc>=16.67){step();acc-=16.67}render();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
