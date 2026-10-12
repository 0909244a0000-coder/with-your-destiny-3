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
const s=W.save.newState(), u=W.ui; W.state=s; u.state=s;
u.changed=()=>{}; u.log=()=>{}; W.sound.play=()=>{};
s.materials=10000;
const make=()=>W.loot.create(s,10,1,{rarity:'legend',slot:'weapon'});
const selected=make(), other=make(); selected.plus=2; selected.sockets=['ruby:0',null];
s.inventory=[selected,other];
u.touchSheet('inv',0); assert.equal(u.sheet.id,selected.id); assert.equal(u.sheet.mode,'compare');
assert(!nodes['sheet-body'].innerHTML.includes('data-sheet="enhance"'));
const snapshot=JSON.stringify(s), before=W.stats.compute(s), next=W.stats.compute({...s,equipment:{weapon:selected}});
const summary=u.comparisonSummary(selected,null);
assert(summary.includes(`${Math.round(before.attack)} → ${Math.round(next.attack)}`));
assert.equal(JSON.stringify(s),snapshot);
const totals=W.loot.statTotals(selected);
assert(u.compareHtml(selected,null).includes(W.util.formatStat('attack',totals.attack)));
u.sheetAction('work'); s.inventory.reverse();
u.sheetAction('enhance'); u.sheetAction('enhance');
assert.equal(selected.plus,3); assert.equal(other.plus,undefined); assert.equal(u.sheet.key,1); assert.equal(u.sheet.mode,'work');
u.sheet.lastAction=0; u.sheetAction('unsocket:0'); assert.equal(s.gems['ruby:0'],1);
u.sheet.lastAction=0; const cost=W.inventory.rerollCost(selected), materials=s.materials; u.sheetAction('reroll'); assert.equal(s.materials,materials-cost);
u.sheetAction('compare'); assert.equal(u.sheet.id,selected.id);
s.inventory.splice(1,1); u.sheet.lastAction=0; u.sheetAction('enhance'); assert.equal(u.sheet,null); assert.equal(other.plus,undefined);
u.touchSheet('inv',0); other.locked=true; u.sheetAction('discard'); assert.equal(s.inventory.length,1);
u.touchSheet('inv',0); u.sheet.lastAction=0; u.sheetAction('equip'); assert.equal(s.equipment.weapon,other); assert.equal(u.sheet,null);
u.touchSheet('eq','weapon'); u.sheetAction('unequip'); assert.equal(s.inventory[0],other);
// 倉庫の経路は残す。満杯時に元の状態を維持する。
s.stash=[selected]; s.inventory=Array.from({length:W.data.items.inventorySize},make);
u.touchSheet('stash',0); u.sheetAction('back'); assert.equal(s.stash[0],selected);
s.inventory=[]; u.touchSheet('stash',0); u.sheetAction('back'); assert.equal(s.inventory[0],selected);
// 加工の上限・素材不足、鍛造と既存宝石画面への遷移。
s.materials=0; selected.plus=W.data.crafting.enhance.max;
u.touchSheet('inv',0,'work');
assert(nodes['sheet-body'].innerHTML.includes('最大強化です'));
const stateBefore=JSON.stringify(s); u.sheet.lastAction=0; u.sheetAction('enhance');
assert.equal(JSON.stringify(s),stateBefore);
u.sheet.lastAction=0; u.sheetAction('reroll'); assert.equal(JSON.stringify(s),stateBefore);
u.sheetAction('forge'); assert.equal(u.forgeItem,selected); assert.equal(nodes.forge.hidden,false); assert.equal(u.sheet,null);
u.touchSheet('inv',0,'work'); let gemsOpened=false; W.gemVault.open=()=>{gemsOpened=true;};
u.sheetAction('gems'); assert.equal(gemsOpened,false); assert.equal(u.sheet.mode,'gems'); assert.equal(u.sheet.id,selected.id);
// 選択した装備が別の場所へ移ったら旧場所のアイテムは処理しない。
u.touchSheet('inv',0); s.equipment[selected.slot]=selected; s.inventory=[other];
u.sheetAction('discard'); assert.equal(s.inventory[0],other); assert.equal(u.sheet,null);
u.touchSheet('eq',selected.slot); s.equipment[selected.slot]=other;
u.sheetAction('enhance'); assert.equal(other.plus,undefined); assert.equal(u.sheet,null);
const set=W.loot.forClass(W.data.sets.list)[0];
const pieces=set.pieces.map(p=>W.loot.createSetPiece(s,10,set.id,p.id)); s.equipment={};
for(const it of pieces) s.equipment[it.slot]=it;
const candidate=make(); candidate.slot=pieces[0].slot;
assert(u.compareHtml(candidate,pieces[0]).includes('完成の力 解除'));
delete s.equipment[pieces[0].slot]; assert(u.compareHtml(pieces[0],null).includes('完成の力 成立'));
assert(u.compareHtml(W.loot.createUnique(s,10),null).includes('自動評価対象外'));
// 自動装備・保存ビルドの保護をそのまま利用し、保存復元でIDを維持。
s.inventory=[selected]; s.equipment={}; selected.locked=true;
W.inventory.equip(s,0); s.builds=[{name:'保持',equipment:{weapon:selected.id}}];
assert(W.inventory.keepEquipped(selected,s)); assert.equal(W.inventory.autoEquip(s,candidate),false);
W.save.write(s); const loaded=W.save.load(); assert.equal(loaded.equipment.weapon.id,selected.id);
assert.equal(loaded.builds[0].equipment.weapon,selected.id);
// 個別宝石選択：はめ先固定・部位ごとの効果・全種類・所持数・連打・ID保護。
const fused='fused:attack=24', god='fused:god.stun=chance~3|sec~0.5';
for(const where of ['inv','eq','stash']) {
  const target=make(), untouched=make(); target.sockets=[null,null]; untouched.sockets=[null];
  s.inventory=where==='inv'?[target,untouched]:[untouched]; s.stash=where==='stash'?[target]:[];
  s.equipment=where==='eq'?{weapon:target}:{};
  s.gems={'ruby:0':2,[fused]:1,[god]:1}; const mat=s.materials;
  const key=where==='eq'?'weapon':0;
  u.touchSheet(where,key,'work'); u.sheetAction('gems');
  assert.equal(u.sheet.id,target.id); assert.equal(u.sheet.mode,'gems');
  const picker=nodes['sheet-body'].innerHTML;
  assert(picker.includes('空き 2 / 2')); assert(picker.includes(W.gems.statsText('ruby:0',target.slot)));
  assert(picker.includes('socket:'+fused)); assert(picker.includes('socket:'+god));
  assert(!picker.includes('gv-targets')); assert(!picker.includes('混沌の宝石を作る'));
  // ソート後も同じ装備へはめる。連打で2個消費しない。
  if(where==='inv') s.inventory.reverse();
  u.sheet.lastAction=0; u.sheetAction('socket:ruby:0'); u.sheetAction('socket:ruby:0');
  assert.equal(target.sockets[0],'ruby:0'); assert.equal(target.sockets[1],null);
  assert.equal(s.gems['ruby:0'],1); assert.equal(untouched.sockets[0],null); assert.equal(s.materials,mat);
  u.sheet.lastAction=0; u.sheetAction('socket:'+fused); assert.equal(target.sockets[1],fused);
  assert.equal(s.gems[fused],undefined); assert(nodes['sheet-body'].innerHTML.includes('空きソケットなし'));
  u.sheet.lastAction=0; u.sheetAction('unsocket:0'); assert.equal(s.gems['ruby:0'],2);
  u.sheetAction('work'); assert.equal(u.sheet.id,target.id); assert.equal(u.sheet.mode,'work');
}
// 神の装着制限は従来関数に任せる。消失や装備交換では別装備へ作用しない。
const target=make(), otherGod=make(); target.sockets=[null]; otherGod.sockets=[god];
s.equipment={weapon:target,body:otherGod}; s.inventory=[]; s.gems={[god]:1};
u.touchSheet('eq','weapon','gems'); assert(nodes['sheet-body'].innerHTML.includes('先に外してください'));
u.sheetAction('socket:'+god); assert.equal(target.sockets[0],null); assert.equal(s.gems[god],1);
u.sheet.lastAction=0; s.equipment.weapon=other; u.sheetAction('socket:'+god); assert.equal(u.sheet,null); assert.equal(s.gems[god],1);
console.log('ok 実計算の差分・比較の状態不変 / 二層操作・ID追従・消失・連打・ロック / 強化・つけ直し・宝石返却 / 装備・外す・倉庫・満杯 / セット成立解除・固有能力 / 自動装備保護・ビルド・保存復元 / 個別宝石の直接装着・全種類・3保管場所・神の制限');
