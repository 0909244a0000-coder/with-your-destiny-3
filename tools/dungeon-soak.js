// 描画なしの長時間自然戦闘。node --expose-gc tools/dungeon-soak.js [周回数] [結果JSON]
// 強い検証装備・全通常品フィルター。実機のFPS/ブラウザメモリ測定ではない。
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),target=Number(process.argv[2]||100);
if(!Number.isInteger(target)||target<1||target>1000)throw Error('周回数は1〜1000');
const storage=new Map(),nodes={};
const node=()=>({hidden:true,style:{},children:[],prepend(child){child.parent=this;this.children.unshift(child);},
 get lastChild(){return this.children.at(-1);},remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);}});
const c={console,Date,Math:Object.create(Math),performance,setTimeout,clearTimeout,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:()=>node()},confirm:()=>true};
c.window=c;vm.createContext(c);
let seed=9;c.Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)){
 if(m[1]!=='src/main.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),c,{filename:m[1]});
}
const W=c.WYD;W.classes.apply();
for(const name of ['changed','markDirty','onLevelUp','showStory'])W.ui[name]=()=>{};
W.sound.play=()=>{};W.render.getImage=()=>null;
const s=W.save.newState(),w=W.world.create();
W.state=s;W.currentWorld=w;W.ui.state=s;W.ui.world=w;W.results.reset(w);
s.player.level=80;s.settings.autoSkill=false;s.settings.autoEquip=false;s.settings.fullReplace=false;
s.settings.filter={on:true,keepUpgrades:false,slots:Object.fromEntries(Object.keys(W.data.items.slots).map(id=>[id,'none']))};
for(const id in s.player.skills)s.player.skillEnabled[id]=false;
const item=W.loot.create(s,10,1,{rarity:'legend',slot:'weapon'});item.locked=true;
item.stats=[{stat:'attack',value:6000,main:true},{stat:'defense',value:5000},{stat:'maxHp',value:100000},{stat:'attackSpeed',value:500}];
s.equipment.weapon=item;W.town.enter(w,s);W.town.leave(w,s);
const keys=['enemies','allies','drops','effects','texts','corpses','projectiles','bolts','hazards','pools','fields','traps','bombs','classTasks','notices'];
const maxima={...Object.fromEntries(keys.map(k=>[k,0])),rewardRows:0},samples=[];
let loops=0,camp=false,frames=0,reason=null;
const capture=()=>{
 const items=[...s.inventory,...s.stash,...s.pendingLoot,...Object.values(s.equipment)].filter(Boolean);
 if(new Set(items.map(it=>it.id)).size!==items.length)throw Error('所持装備IDの重複');
 if(global.gc)global.gc();
 samples.push({loops,gameSeconds:+(w.time||0).toFixed(2),heapBytes:process.memoryUsage().heapUsed,
  worldBytes:Buffer.byteLength(JSON.stringify(w)),stateBytes:Buffer.byteLength(JSON.stringify(s)),
  arrays:Object.fromEntries(keys.map(k=>[k,(w[k]||[]).length])),logRows:nodes.log?.children.length||0,
  inventory:s.inventory.length,pending:s.pendingLoot.length,rewardRows:w.lastDungeonReward?.items.length||0,
  checkpoint:!!s.dungeonReturn});
};
const started=performance.now();capture();
// 別タイマーや敵の強制撃破を使わず、実world.updateだけで周回する。
while(loops<target&&(w.time||0)<60*60*24){
 W.world.update(w,s,.05);frames++;
 for(const k of keys)maxima[k]=Math.max(maxima[k],(w[k]||[]).length);
 const rewardRows=w.lastDungeonReward?.items.length||0;
 maxima.rewardRows=Math.max(maxima.rewardRows,rewardRows);
 if(rewardRows>W.data.dungeon.summary.maxItems)throw Error('戦利品サマリーの保持上限');
 if(W.world.battleStopped(s)){reason='未受取上限で既存ルールどおり停止';break;}
 if(w.town)camp=true;
 if(camp&&!w.town){
  loops++;camp=false;
  if(s.floor!==1||s.bossProgress!==0||w.dungeonCamp||w.dungeonReward)throw Error('帰還・再出発状態の不整合');
  if(loops%10===0||loops===target)capture();
 }
}
if(loops!==target&&!reason)reason='シミュレーション上限';
if(samples.at(-1).loops!==loops)capture();
const result={fixture:'Lv80/強い検証装備・スキルOFF・通常品フィルター・固定乱数9・自然戦闘/裂け目有効',
 target,loops,completed:loops===target,reason,frames,gameSeconds:+w.time.toFixed(2),wallSeconds:+((performance.now()-started)/1000).toFixed(2),
 bossKills:s.records.bossKills,deaths:s.records.deaths||0,gcAvailable:!!global.gc,maxima,samples,
 limitations:'Node VM・描画/画像キャッシュなし・最小DOM。通常育成、実機FPS、ブラウザ全体のメモリを保証しない。所持品と報酬記録の増加は正常。'};
if(process.argv[3])fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({completed:result.completed,loops,bossKills:result.bossKills,gameSeconds:result.gameSeconds,wallSeconds:result.wallSeconds,reason,maxima,samples: samples.map(x=>({loops:x.loops,heapMiB:+(x.heapBytes/1048576).toFixed(2),worldKiB:+(x.worldBytes/1024).toFixed(2),logRows:x.logRows,rewardRows:x.rewardRows,inventory:x.inventory,pending:x.pending}))},null,2));
if(!result.completed)process.exitCode=1;
