// 実Chromiumで自然戦闘とCanvas描画を継続する。実機FPS/GPUメモリ測定ではない。
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const target=Number(process.argv[2]||5),out=path.resolve(__dirname,'../results');
if(!Number.isInteger(target)||target<1||target>20)throw Error('周回数は1〜20');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.click('#modal-ok');
  await page.evaluate(()=>{
   const W=WYD,s=W.state,w=W.currentWorld;
   s.settings.speed=0;s.settings.autoSkill=false;s.settings.autoEquip=false;s.settings.fullReplace=false;
   s.settings.filter={on:true,keepUpgrades:false,slots:Object.fromEntries(Object.keys(W.data.items.slots).map(id=>[id,'none']))};
   s.player.level=80;for(const id in s.player.skills)s.player.skillEnabled[id]=false;
   const item=W.loot.create(s,10,1,{rarity:'legend',slot:'weapon'});item.locked=true;
   item.stats=[{stat:'attack',value:6000,main:true},{stat:'defense',value:5000},{stat:'maxHp',value:100000},{stat:'attackSpeed',value:500}];
   s.equipment.weapon=item;W.town.enter(w,s);W.town.leave(w,s);W.ui.paused=false;
   window.renderSoak={loops:0,camp:false,frames:0,paintMs:0,paints:0,rewardSeen:false};
  });
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const samples=[];
  const capture=async()=>{
   await cdp.send('HeapProfiler.collectGarbage');
   const metrics=await cdp.send('Performance.getMetrics'),dom=await cdp.send('Memory.getDOMCounters');
   const state=await page.evaluate(()=>{
    const W=WYD,s=W.state,w=W.currentWorld,r=W.render;
    const items=[...s.inventory,...s.stash,...s.pendingLoot,...Object.values(s.equipment)].filter(Boolean);
    if(new Set(items.map(it=>it.id)).size!==items.length)throw Error('装備ID重複');
    return {loops:renderSoak.loops,gameSeconds:w.time,inventory:s.inventory.length,pending:s.pendingLoot.length,
     images:Object.keys(r.images).length,loadedImages:Object.values(r.images).filter(i=>i.complete&&i.naturalWidth).length,
     rims:Object.keys(r.rims).length,patterns:Object.keys(r.patterns).length,logRows:document.getElementById('log').children.length,
     rewardRows:w.lastDungeonReward?.items.length||0,bossKills:s.records.bossKills,deaths:s.records.deaths||0};
   });
   samples.push({...state,heapBytes:metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value,dom});
   console.log(JSON.stringify(samples.at(-1)));
  };
  await capture();let rewardShot=false,done;
  while(true){
   done=await page.evaluate(async target=>{
    const W=WYD,s=W.state,w=W.currentWorld,t=renderSoak,ctx=document.getElementById('game').getContext('2d');
    for(let i=0;i<50&&t.loops<target;i++){
     W.world.update(w,s,.05);t.frames++;
     const start=performance.now();W.render.draw(ctx,w,s);t.paintMs+=performance.now()-start;t.paints++;
     if(w.dungeonReward)t.rewardSeen=true;
     if(W.world.battleStopped(s))throw Error('未受取上限で停止');
     if(w.town)t.camp=true;
     if(t.camp&&!w.town){t.loops++;t.camp=false;if(s.floor!==1||s.bossProgress!==0)throw Error('再出発の不整合');break;}
     if((w.lastDungeonReward?.items.length||0)>W.data.dungeon.summary.maxItems)throw Error('サマリー上限');
    }
    W.ui.renderPanels();await new Promise(resolve=>requestAnimationFrame(resolve));
    return {...t,rewardVisible:!!w.dungeonReward};
   },target);
   if(done.rewardVisible&&!rewardShot){await page.screenshot({path:path.join(out,'dungeon-render-soak-reward.jpg'),type:'jpeg'});rewardShot=true;}
   if(done.loops>samples.at(-1).loops)await capture();
   if(done.loops===target)break;
   if(done.frames>60000)throw Error('周回時間上限');
  }
  assert(done.rewardSeen);assert.deepEqual(errors,[]);assert(samples.at(-1).loadedImages>0);
  await page.screenshot({path:path.join(out,'dungeon-render-soak-PC.jpg'),type:'jpeg'});
  const report={completed:true,target,...done,samples,errors,
   fixture:'PC1440x900・Lv80検証装備・スキルOFF・通常品フィルター・自然戦闘/裂け目有効。50更新ごとにRAFへ制御を戻す。',
   limitations:'加速検証。JS heap/DOM/描画キャッシュを観測。GPUメモリ・実機FPS・通常育成の戦闘テンポを保証しない。'};
  fs.writeFileSync(path.join(out,'dungeon-render-soak.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`ok Chromium自然戦闘 ${done.loops}周、${done.paints}描画、pageerrors 0`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
