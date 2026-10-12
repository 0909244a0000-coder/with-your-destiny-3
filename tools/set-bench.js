// セットの完成の力を決めるための計測：セット4つ（+10）と、同じ4部位をレジェンド（+10、4個から点数でいちばん良いもの）にしたときの与ダメージ/秒を比べる（乱数3組×3回）。
// node tools/set-bench.js [職業:セット,...]  例：bombmancer:pyre,barbarian:immortalKing  → 比（セット÷レジェンド）を出す。data/sets.js の complete.attackMult を決めるのに使う
const { chromium } = require('playwright'); const path=require('path');
const cases = (process.argv[2] || 'bombmancer:pyre,barbarian:immortalKing,sorceress:talRasha').split(',').map(x=>x.split(':'));
(async()=>{const b=await chromium.launch({...(require('fs').existsSync('/opt/pw-browsers/chromium')?{executablePath:'/opt/pw-browsers/chromium'}:{})});const p=await b.newPage();p.setDefaultTimeout(0);
const out=[];
for (const [cls,setId] of cases){
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
await p.evaluate(c=>{WYD.resetting=true;localStorage.clear();localStorage.setItem('wyd3-active-class',c)},cls);await p.reload();
out.push(await p.evaluate(([cls,setId])=>{
 const W=WYD.world; W.updateSpawns=()=>{};W.updateFloors=()=>{};WYD.shrines.update=()=>{};WYD.breach.update=()=>{};
 const seeded=(seed)=>{let x=seed>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};};
 const real=Math.random, area=WYD.data.areas.find(a=>a.id==='inferno'), L=WYD.loot, set=WYD.data.sets.list.find(s=>s.id===setId);
 const bonus4=WYD.loot.setBonuses(set,cls)[4]||{}, kind=bonus4.params&&bonus4.params.kind;
 let build=(WYD.data.classes[cls].autoBuild||WYD.data.autoBuild).slice(0,3);
 if(kind && !build.some(id=>WYD.classes.kindOf(id)===kind)){const k=Object.keys(WYD.data.skills).find(id=>WYD.classes.kindOf(id)===kind); if(k) build=[build[0],build[1],k];}
 const dps=(st)=>{let tot=0;for(const seed of [1,2,3]){Math.random=seeded(seed);const w=W.create();w.town=false;WYD.currentWorld=w;WYD.state=st;const stats=WYD.stats.compute(st);w.player.hp=stats.maxHp;w.spawnTimer=1e9;
   for(let j=0;j<6;j++){const ang=j/6*Math.PI*2;const e=W.spawnEnemy(w,st,area.enemies[j%area.enemies.length].kind,{x:w.player.x+Math.cos(ang)*110,y:w.player.y+Math.sin(ang)*110});e.hp=e.maxHp=1e12;e.attack=0;}
   WYD.results.reset(w);for(let i=0;i<800;i++){W.update(w,st,.05);for(const e of w.enemies)if(e.hp<1e11)e.hp=1e12;}tot+=WYD.results.get(w).total.damage/40;}Math.random=real;return tot/3;};
 const rows=[];
 for(let t=0;t<3;t++){
  Math.random=seeded(500+t);
  const s=WYD.save.newState();s.player.level=50;s.settings.autoSkill=false;s.settings.speed=0;s.area='inferno';s.difficulty=5;
  for(const id in WYD.data.skills){s.player.skills[id]=build.includes(id)?10:0;s.player.skillEnabled[id]=build.includes(id);}
  const plus=(it)=>{it.plus=10;return it;};
  const pieces=set.pieces.map(pc=>plus(L.createSetPiece(s,50,set.id,pc.id)));
  for(const slot of Object.keys(WYD.data.items.slots)) s.equipment[slot]=plus(L.create(s,50,0,{slot,rarity:'legend'}));
  const alt={};for(const pc of pieces){let best=null;for(let i=0;i<4;i++){const it=plus(L.create(s,50,0,{slot:pc.slot,rarity:'legend'}));if(!best||WYD.optimizer.score(it,'damage').total>WYD.optimizer.score(best,'damage').total)best=it;}alt[pc.slot]=best;}
  Math.random=real;
  const sSet=JSON.parse(JSON.stringify(s));for(const pc of pieces)sSet.equipment[pc.slot]=pc;
  const sLeg=JSON.parse(JSON.stringify(s));for(const k in alt)sLeg.equipment[k]=alt[k];
  WYD.state=sSet;const a=dps(sSet);WYD.state=sLeg;const bb=dps(sLeg);
  rows.push({set:Math.round(a),legend:Math.round(bb),ratio:+(a/bb).toFixed(2)});
 }
 return {cls,setId,build,rows,mean:+(rows.reduce((n,r)=>n+r.ratio,0)/rows.length).toFixed(2)};
},[cls,setId]));}
console.log(JSON.stringify(out,null,1));await b.close();})();
