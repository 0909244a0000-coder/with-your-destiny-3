// 実ブラウザの描画・PC/タッチ相当・通常モードのフローを確認する。
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
   const page=await browser.newPage({viewport,isMobile:viewport.width<1000,hasTouch:viewport.width<1000});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.click('#modal-ok');
   const result=await page.evaluate(()=>{
    const s=WYD.state,w=WYD.currentWorld,D=WYD.dungeon,world=WYD.world;
    s.settings.speed=0;s.settings.autoEquip=false;s.settings.autoSkill=false;
    WYD.town.leave(w,s);s.bossProgress=0;s.floor=1;D.cancel(w);D.ensure(w,s);
    s.bossProgress=9;w.enemies=[];world.update(w,s,.05);
    const moving=!!w.dungeon.move;
    const before=D.view(s,w);world.update(w,s,.5);const pan=D.view(s,w);
    for(let i=0;i<25;i++)world.update(w,s,.05);
    const stage=w.dungeon.stage;
    // 最奥から通常の敵撃破処理で、実際の報酬と保存チェックポイントを観測。
    w.enemies=[];world.changeFloor(w,s,3);const e=world.spawnEnemy(w,s,'ravana',{x:600,y:220});e.boss=true;
    world.enemyDied(w,s,e);world.updateDrops(w,s,1);
    const reward=w.dungeonReward.items.map(it=>({id:it.id,status:it.status}));
    const ids=new Set([...s.inventory,...s.pendingLoot,...Object.values(s.equipment)].filter(Boolean).map(it=>it.id));
    const honest=reward.every(it=>it.status!=='獲得済み'||ids.has(it.id));
    w.dungeonReward.time=2;WYD.render.draw(document.getElementById('game').getContext('2d'),w,s);
    WYD.ui.renderPanels();
    return {moving,pan:before.x!==pan.x,stage,honest,rewardCount:reward.length,checkpoint:!!s.dungeonReturn};
   });
   assert(result.moving&&result.pan&&result.stage===1&&result.honest&&result.checkpoint);
   assert(result.rewardCount>=4&&result.rewardCount<=6);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
   const finished=await page.evaluate(()=>{
    const w=WYD.currentWorld,s=WYD.state;for(let i=0;i<100;i++)WYD.world.update(w,s,.05);
    WYD.ui.renderPanels();return {floor:s.floor,camp:!!w.dungeonCamp,town:!!w.town,bossDone:!!w.bossDone};
   });
   assert.equal(finished.floor,1);assert(!finished.bossDone);assert(!finished.camp);assert(!finished.town);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('ok PC/390px/横画面・前進パン・実報酬・取得状態・自動帰還再出発・画面幅・errors 0');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
