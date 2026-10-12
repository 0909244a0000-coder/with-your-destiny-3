// ブラウザに依存せず、実ゲームの計算と操作処理を検証する。
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), storage = new Map(), nodes = {};
const context = vm.createContext({ console, Date, Math, performance, setTimeout, clearTimeout,
  localStorage: {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document: {getElementById:id=>nodes[id]||(nodes[id]={hidden:true,innerHTML:'',style:{}})}, confirm:()=>true });
context.window=context;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/<script src="([^"]+)"/g)) {
  if(match[1]==='src/main.js') continue;
  vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),context,{filename:match[1]});
}
const W=context.WYD; W.classes.apply();

for(const name of ['log','notice','changed','markDirty','onLevelUp','showStory']) W.ui[name]=()=>{};
W.sound.play=()=>{}; W.render.getImage=()=>null;
const setup=area=>{
  const s=W.save.newState(),w=W.world.create();s.area=area||'forest';s.settings.autoSkill=false;s.settings.autoEquip=false;
  W.state=s;W.currentWorld=w;W.ui.state=s;W.ui.world=w;W.results.reset(w);W.dungeon.ensure(w,s);
  return {s,w};
};
const advance=(w,s,seconds)=>{for(let n=0;n<Math.ceil(seconds/.05);n++)W.world.update(w,s,.05);};
// 初期の区間、スポーン停止、味方保持、弾/設置物の掃除、描画のパン。
{
 const {s,w}=setup();w.player.hp=W.stats.compute(s).maxHp;
 const ally={x:300,y:300,hp:20,timeLeft:30,source:'test'};w.allies=[ally];
 const item=W.loot.create(s,1,1,{rarity:'magic'});w.drops=[{item,x:300,y:300,age:0}];
 s.bossProgress=9;w.projectiles=[{x:0,y:0}];w.fields=[{}];
 const before=W.dungeon.view(s,w);assert(W.dungeon.update(w,s,.05));assert(w.dungeon.move);
 assert.equal(w.projectiles.length,0);assert.equal(w.fields.length,0);assert(s.inventory.includes(item));
 const move=w.dungeon.move;W.dungeon.update(w,s,.55);assert.notEqual(W.dungeon.view(s,w).x,before.x);assert(w.player.moving);
 W.world.updateSpawns(w,s,10);assert.equal(w.enemies.length,0);assert.equal(w.dungeon.move,move);
 advance(w,s,1);assert.equal(w.dungeon.stage,1);assert(w.allies.includes(ally));
 s.bossProgress=18;w.enemies=[];W.dungeon.update(w,s,.05);advance(w,s,1.2);assert.equal(w.dungeon.stage,2);
 s.bossProgress=27;w.enemies=[];W.dungeon.update(w,s,.05);W.save.write(s);
 const reload=W.save.load();assert.equal(reload.bossProgress,27);assert.equal(reload.floor,1);
 advance(w,s,1.2);assert.equal(s.floor,2);assert.equal(s.bossProgress,0);
}
// 死亡・裂け目・未受取上限では前進しない。試練/対人/訓練には混入しない。
{
 const {s,w}=setup();s.bossProgress=9;w.player.dead=true;assert.equal(W.dungeon.update(w,s,1),false);assert(!w.dungeon.move);
 w.player.dead=false;w.player.stunTimer=1;assert.equal(W.dungeon.update(w,s,1),false);assert(!w.dungeon.move);w.player.stunTimer=0;w.breach={};assert.equal(W.dungeon.update(w,s,1),false);assert(!w.dungeon.move);w.breach=null;
 s.pendingLoot=Array.from({length:W.data.items.pendingLootLimit},()=>W.loot.createUnique(s,2));
 const x=w.player.x;W.world.update(w,s,1);assert.equal(w.player.x,x);assert(!w.dungeon.move);
 for(const mode of ['daily','map','uber','trial']){s.trialRun={level:1,[mode]:true};assert.equal(W.dungeon.enabled(w,s),false);}
 s.trialRun=null;w.player.arenaMain=true;assert.equal(W.dungeon.enabled(w,s),false);w.player.arenaMain=false;
 W.dpsEngine={world:w};assert.equal(W.dungeon.enabled(w,s),false);delete W.dpsEngine;
}
// ボスの基本4個+既存の追加2抽選。二重撃破しない。満杯時の実結果と保存復元。
{
 const {s,w}=setup();s.floor=4;s.settings.fullReplace=false;s.inventory=Array.from({length:W.data.items.inventorySize},()=>{const it=W.loot.create(s,1,1,{rarity:'magic'});it.locked=true;return it;});
 vm.runInContext('Math.random=()=>0',context);
 const boss=W.world.spawnEnemy(w,s,'ravana',{x:600,y:200});boss.boss=true;
 W.world.enemyDied(w,s,boss);assert.equal(w.dungeonReward.items.length,6);assert.equal(w.drops.length,6);assert.equal(w.dungeonReward.extra.gems,W.data.gems.drop.bossCount);
 const ids=w.dungeonReward.items.map(i=>i.id);assert.equal(new Set(ids).size,6);
 W.world.enemyDied(w,s,boss);assert.equal(w.drops.length,6);
 const earnedBeforePickup=s.materials;W.save.write(s);const saved=W.save.load();const ww=W.world.create();W.state=saved;W.currentWorld=ww;W.ui.state=saved;W.ui.world=ww;
 assert.equal(saved.pendingLoot.length,2);assert.equal(saved.dungeonReturn.drops.length,4);
 W.dungeon.restore(ww,saved);assert.equal(saved.floor,1);assert.equal(ww.drops.length,0);assert.equal(saved.pendingLoot.length,2);
 assert.equal(saved.materials,earnedBeforePickup+4*W.data.crafting.salvage.magic);assert.equal(saved.dungeonReturn,null);
 W.save.write(saved);const again=W.save.load();assert.equal(again.pendingLoot.length,2);assert.equal(again.materials,saved.materials);
 // 生の結果も、未受取/素材化を正しく区別。
 W.state=s;W.currentWorld=w;W.ui.state=s;W.ui.world=w;W.world.updateDrops(w,s,1);
 assert(w.dungeonReward.items.filter(i=>i.status==='未受取に保管').length===2);
 assert(w.dungeonReward.items.filter(i=>i.status==='満杯で素材化').length===4);
 assert.equal(w.dungeonReward.materials,4*W.data.crafting.salvage.magic);
}
// 森を複数周、実際のスポーン/討伐処理で通す。討伐閾値・帰還・自動再出発・保持上限。
vm.runInContext('let rng=11;Math.random=()=>{rng=(1664525*rng+1013904223)>>>0;return rng/4294967296;}',context);
{
 const {s,w}=setup();s.player.level=60;w.breachTimer=1e9;for(const key in s.player.skillEnabled)s.player.skillEnabled[key]=false;let loops=0,camp=false,travel=0,lastMove=null,normalKills=0;
 for(let frame=0;frame<15000&&loops<3;frame++){
  W.world.update(w,s,.05);
  if(w.dungeon?.move&&w.dungeon.move!==lastMove){lastMove=w.dungeon.move;travel++;}
  if(w.town)camp=true;
  if(camp&&!w.town){loops++;camp=false;assert.equal(s.floor,1);assert.equal(s.bossProgress,0);}
  for(const e of [...w.enemies]){if(!W.world.isBossRoom(s)&&!e.clone)normalKills++;W.world.enemyDied(w,s,e);}
 }
 assert.equal(loops,3);assert.equal(travel,27);assert.equal(normalKills,81*3);
 assert(s.unlockedAreas.includes('smashana'));assert(w.lastDungeonReward.items.length<=6);
 assert(w.drops.length<50);assert(s.pendingLoot.length<W.data.items.pendingLootLimit);
 console.log('ok 森3周・81体/周・27前進・ボス解放・帰還再出発');
}
console.log('ok 前進・味方・弾設置物・パン / 死亡・裂け目・停止・他モード分離 / 4+2抽選・二重撃破防止・満杯・未受取・素材化・保存復元');

// 実際の描画をPC/390px相当で通し、描画が戦闘乱数や状態を変更しないことを確認。
context.getComputedStyle=()=>({getPropertyValue:()=> 'serif'});context.document.documentElement={};
for(const width of [1440,390]) {
 const {s,w}=setup();s.bossProgress=9;W.dungeon.update(w,s,.05);W.dungeon.update(w,s,.4);
 const calls=[];
 const ctx=new Proxy({canvas:{id:'test',clientWidth:width,width:960,height:600}}, {
  get:(obj,key)=>key in obj?obj[key]:key==='measureText'?()=>({width:100}):key==='createRadialGradient'||key==='createLinearGradient'?()=>({addColorStop(){}}):(...args)=>{if(key==='drawImage')calls.push(args);},
  set:(obj,key,value)=>(obj[key]=value,true)
 });
 W.render.draw(ctx,w,s);
 const before=JSON.stringify(s),camera=W.render.cameraFor(ctx,w,s);
 vm.runInContext('Math.random=()=>{throw Error("描画が戦闘乱数を使用");}',context);
 W.render.draw(ctx,w,s);W.render.drawScene(ctx,{width:1280,height:800},s,w);
 assert.equal(JSON.stringify(s),before);assert(calls.length>0);assert(camera.zoom>=1);
 w.dungeonReward={areaName:'森',boss:'羅刹王',time:2,materials:0,items:[{rarity:'unique',label:'試験',status:'地面にドロップ',materials:0}]};
 W.dungeon.drawReward(ctx,w,s);
}
console.log('ok PC/390px相当の描画・sceneパン・描画乱数0・状態不変');

// 全6エリアで既存の3階分の討伐数と正しいボス/報酬/帰還。共通処理だけを使う。
for(const area of W.data.areas) {
 vm.runInContext('Math.random=()=>0.5',context);
 const {s,w}=setup(area.id);s.player.level=80;w.breachTimer=1e9;for(const k in s.player.skillEnabled)s.player.skillEnabled[k]=false;
 let camp=false,kills=0,bossName='';
 for(let frame=0;frame<14000&&!camp;frame++){
  W.world.update(w,s,.05);
  if(w.town)camp=true;
  for(const e of [...w.enemies]){if(!W.world.isBossRoom(s)&&!e.clone)kills++;if(e.boss)bossName=W.data.enemies[e.kind].name;W.world.enemyDied(w,s,e);}
 }
 assert(camp,area.id);assert.equal(kills,area.killsPerFloor*area.floors,area.id);
 assert.equal(bossName,W.data.enemies[area.boss].name);assert.equal(w.lastDungeonReward.items.length,4);
 assert.equal(s.floor,1);assert.equal(s.bossProgress,0);
}
assert.equal(W.data.boss.dropCount,4);
const scripts=file=>[...fs.readFileSync(path.join(root,file),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
const exclude=['src/main.js','src/ui.js','src/runeSkillsUI.js','src/arena.js','src/arena-sim.js','src/gemvault.js','src/equipscreen.js','data/equipscreen.js','src/optimizer.js','data/optimizer.js','src/grimoire.js','src/navigation.js','data/dps.js','src/dps.js','data/mobile.js','src/mobile.js'];
assert.deepEqual(scripts('arena-engine.html'),scripts('index.html').filter(x=>!exclude.includes(x)).concat('src/arena-engine.js'));
console.log('ok 6エリアの討伐数・3階＋ボス・基本4個・帰還 / 独立フレーム依存一致');

// 裂け目中は既存イベントを完了してから前進。試練/地図/日替わり/双王は既存処理。
{
 vm.runInContext('Math.random=()=>0.5',context);
 const {s,w}=setup();s.bossProgress=9;W.breach.open(w,s);
 W.world.update(w,s,.05);assert(w.breach);assert(!w.dungeon.move);
 W.breach.close(w,s);w.enemies=[];W.world.update(w,s,.05);assert(w.dungeon.move);
}
for(const mode of ['trial','daily','map','uber']) {
 vm.runInContext('Math.random=()=>0.5',context);
 const {s,w}=setup();s.cleared=true;s.player.level=80;
 const daily=mode==='daily'?{date:W.daily.today(),modIds:[],guardian:W.data.trial.guardians[0]}:null;
 const map=mode==='map'?W.maps.create(1,'normal'):null;
 W.trial.start(w,s,1,daily,map,mode==='uber');
 let success=false;
 for(let frame=0;frame<5000&&!success;frame++){
  W.world.update(w,s,.05);
  for(const e of [...w.enemies])W.world.enemyDied(w,s,e);
  success=!!w.trial?.done;
 }
 assert(success,mode);
 if(mode==='trial')assert.equal(s.trial.runs,1);
 if(mode==='daily')assert.equal(s.daily.total,1);
 if(mode==='map')assert.equal(s.mapBest,1);
 if(mode==='uber')assert.equal(s.uber.kills,1);
 assert(!w.dungeon?.move);assert(!w.dungeonReward);assert.equal(s.dungeonReturn,null);
}
console.log('ok 裂け目の完了待ち / 試練・日替わり・地図・双王の実処理で混入なし');

vm.runInContext('let naturalRng=9;Math.random=()=>{naturalRng=(1664525*naturalRng+1013904223)>>>0;return naturalRng/4294967296;}',context);
{
 const {s,w}=setup();s.player.level=80;w.breachTimer=1e9;for(const key in s.player.skillEnabled)s.player.skillEnabled[key]=false;
 const item=W.loot.create(s,10,1,{rarity:'legend',slot:'weapon'});item.locked=true;
 item.stats=[{stat:'attack',value:6000,main:true},{stat:'defense',value:5000},{stat:'maxHp',value:100000},{stat:'attackSpeed',value:500}];s.equipment.weapon=item;
 let seen=false,loops=0;for(let f=0;f<16000&&loops<2;f++){W.world.update(w,s,.05);if(w.town)seen=true;if(seen&&!w.town){loops++;seen=false;}}
 assert.equal(loops,2);assert.equal(s.records.bossKills,2);assert.equal(s.floor,1);
 console.log(`ok 自然戦闘AIの森2周（強い検証装備・${w.time.toFixed(1)}ゲーム秒）`);
}

// 自動分解は生成時に1回だけ観測。通常の未取得レジェンドは階移動で消さない。
{
 vm.runInContext('Math.random=()=>0',context);
 const {s,w}=setup();s.floor=4;s.settings.autoSalvage='magic';
 const e=W.world.spawnEnemy(w,s,'ravana',{x:600,y:200});e.boss=true;W.world.enemyDied(w,s,e);
 assert.equal(w.dungeonReward.items.length,6);assert.equal(w.dungeonReward.items.filter(it=>it.status==='自動分解').length,4);
 const mats=w.dungeonReward.materials;W.world.updateDrops(w,s,1);assert.equal(w.dungeonReward.materials,mats);
}
{
 vm.runInContext('Math.random=()=>0.5',context);
 const {s,w}=setup();s.settings.fullReplace=false;s.inventory=Array.from({length:W.data.items.inventorySize},()=>{const it=W.loot.create(s,1,1,{rarity:'magic'});it.locked=true;return it;});
 const item=W.loot.create(s,1,1,{rarity:'legend'});assert(!W.inventory.protectDrop(s,item));
 w.drops=[{item,x:300,y:300,age:0}];s.bossProgress=27;W.world.changeFloor(w,s,1);
 assert.equal(w.drops.length,1);assert.equal(w.drops[0].item.id,item.id);assert.equal(s.floor,2);
 s.dungeonReturn={area:s.area,returned:true,reward:null,drops:[]};W.save.write(s);
 const restored=W.save.load(),ww=W.world.create();W.state=restored;W.currentWorld=ww;W.ui.state=restored;W.ui.world=ww;W.dungeon.restore(ww,restored);
 assert.equal(restored.floor,2);assert.equal(ww.drops.length,1);assert.equal(ww.drops[0].item.id,item.id);
 restored.inventory=[];W.world.updateDrops(ww,restored,1);assert.equal(restored.inventory.filter(it=>it.id===item.id).length,1);
 W.world.updateDrops(ww,restored,1);assert.equal(restored.inventory.filter(it=>it.id===item.id).length,1);
}
console.log('ok 自動分解1回 / 未取得レジェンドの階移動保持・返却後保存・ID復元・取得重複なし');

// 12周連続：最新サマリー1件、移動/報酬の一時状態、ドロップは増え続けない。
{
 vm.runInContext('Math.random=()=>0.5',context);
 const {s,w}=setup();s.player.level=80;w.breachTimer=1e9;for(const k in s.player.skillEnabled)s.player.skillEnabled[k]=false;
 let loops=0,camp=false;
 for(let frame=0;frame<40000&&loops<12;frame++){
  W.world.update(w,s,.05);if(w.town)camp=true;
  if(camp&&!w.town){loops++;camp=false;assert(w.lastDungeonReward.items.length<=6);assert(!w.dungeonCamp);assert(!w.dungeonReward);assert(w.drops.length<50);}
  for(const e of [...w.enemies])W.world.enemyDied(w,s,e);
 }
 assert.equal(loops,12);console.log('ok 12周連続・報酬/移動状態の解放・保持オブジェクト上限');
}

// オフライン報酬を適用しても、チェックポイントの装備を再抽選/複製しない。
{
 vm.runInContext('Math.random=()=>0.5',context);
 const {s,w}=setup();s.floor=4;s.offlineRates={exp:1,mats:0.1,gems:0};
 const item=W.loot.create(s,1,1,{rarity:'legend'});
 s.dungeonReturn={area:s.area,returned:false,reward:null,drops:[{item,x:200,y:200,age:0}]};
 W.offline.apply(s,w,Date.now()-3600000);W.dungeon.restore(w,s);
 assert.equal(s.floor,1);assert.equal(s.inventory.filter(it=>it.id===item.id).length,1);
 W.dungeon.restore(w,s);assert.equal(s.inventory.filter(it=>it.id===item.id).length,1);
}
console.log('ok オフライン報酬後の帰還・装備重複なし');
