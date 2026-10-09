// 職業ごとの単独技能を同条件の戦闘標的で計測。ゲームデータやセーブは変更しない。
const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'../index.html'));
  const classes=await page.evaluate(()=>Object.keys(WYD.data.classes));
  const rows=[];
  for(const classId of classes){
   await page.evaluate(id=>{localStorage.clear();localStorage.setItem('wyd3-active-class',id);WYD.resetting=true},classId);
   await page.reload();
   const measured=await page.evaluate(()=>{
    const W=WYD.world, ids=Object.keys(WYD.data.skills);
    W.updateSpawns=()=>{};W.updateFloors=()=>{};W.updateEnemies=()=>{};
    const run=id=>{
     const s=WYD.save.newState();s.player.level=40;s.settings.autoSkill=false;s.settings.speed=0;
     for(const key of ids){s.player.skills[key]=key===id?6:0;s.player.skillEnabled[key]=key===id;}
     const w=W.create();WYD.currentWorld=w;WYD.state=s;const stats=WYD.stats.compute(s);w.player.hp=stats.maxHp*.55;w.spawnTimer=1e9;
     for(let j=0;j<3;j++){
      const e=W.spawnEnemy(w,s,'preta',{x:w.player.x+80+j*35,y:w.player.y+(j-1)*32});
      e.hp=e.maxHp=1e9;e.attack=0;e.defense=20;
     }
     WYD.results.reset(w);
     let buff=0,haste=0,allies=0;
     for(let i=0;i<600;i++){W.update(w,s,.05);buff+=!!w.player.buff;haste+=!!w.player.haste;allies+=w.allies.length;}
     const total=WYD.results.get(w).total,row=total.rows['skill:'+id]||{};
     return {id,name:WYD.data.skills[id]?.name,kind:WYD.classes.kindOf(id),mode:WYD.data.skills[id]?.mode,casts:row.casts||0,damage:row.damage||0,healing:row.healing||0,hits:row.hits||0,totalDamage:Math.round(total.damage),hp:Math.round(w.player.hp),maxHp:stats.maxHp,buffSeconds:Math.round(buff*.05),hasteSeconds:Math.round(haste*.05),allySeconds:Math.round(allies*.05),dead:w.player.dead};
    };
    const oldWorld=WYD.currentWorld,oldState=WYD.state;
    try{return [run(null),...ids.map(run)];}finally{WYD.currentWorld=oldWorld;WYD.state=oldState;}
   });
   rows.push({classId,baseline:measured[0],skills:measured.slice(1)});
   console.error('measured',classId);
  }
  console.log(JSON.stringify({rows,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
