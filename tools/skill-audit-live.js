// 新規セーブで各職10分自動育成したときのスキル使用状況を観測する。
const {chromium}=require('playwright'),path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});try{
 const pg=await b.newPage(),errors=[];pg.on('pageerror',e=>errors.push(e.message));
 await pg.goto('file://'+path.resolve(__dirname,'../index.html'));
 const classes=await pg.evaluate(()=>Object.keys(WYD.data.classes)),rows=[];
 for(const cls of classes){
  await pg.evaluate(id=>{localStorage.clear();localStorage.setItem('wyd3-active-class',id);WYD.resetting=true},cls);await pg.reload();
  const o=await pg.evaluate(()=>{
   const s=WYD.state,w=WYD.currentWorld;WYD.town.leave(w,s);s.settings.speed=0;s.settings.autoSkill=true;s.settings.autoEquip=true;
   const W=WYD.world;let deaths=0;
   for(let i=0;i<12000;i++){
    W.update(w,s,.05);if(w.player.dead&&w.player.respawnTimer>0&&w.player.respawnTimer<=.05)deaths++;
    if(i%200===0){if(s.inventory.length>20)WYD.inventory.discardRarities(s,['normal','magic']);const last=s.unlockedAreas.at(-1);if(s.area!==last){s.area=last;s.bossProgress=0;W.resetEnemies(w,s,false);}}
   }
   const result=WYD.results.get(w).total;
   return {level:s.player.level,area:s.area,deaths,skills:Object.keys(s.player.skills).filter(id=>s.player.skills[id]>0).map(id=>({id,level:s.player.skills[id],active:s.player.skillEnabled[id],casts:result.rows['skill:'+id]?.casts||0,damage:result.rows['skill:'+id]?.damage||0,healing:result.rows['skill:'+id]?.healing||0}))};
  });rows.push({classId:cls,...o});console.error('measured',cls);
 }
 console.log(JSON.stringify({rows,errors},null,2));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
