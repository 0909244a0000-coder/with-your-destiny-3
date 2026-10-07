// node tools/arena-balance.js [ゲームのフォルダ] [結果JSON]：同じ装備/乱数で各条件3回、勝者も記録。
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const output=path.resolve(process.argv[3]||path.join(root,'results','arena-balance.json'));
(async()=>{
 const browser=await chromium.launch();
 try {
  const page=await browser.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='file://'+path.join(root,'index.html');await page.goto(url);
  await page.evaluate(()=>{localStorage.clear();WYD.resetting=true;});
  const ids=await page.evaluate(()=>Object.keys(WYD.data.classes));
  const profiles=[{id:'育成途中',level:15,item:5,skill:2},{id:'育成済み',level:40,item:15,skill:6},{id:'強装備',level:40,item:40,skill:8}];
  const fixtures={};
  for(const id of ids){
   await page.evaluate(id=>{localStorage.setItem('wyd3-active-class',id);WYD.resetting=true;},id);await page.reload();
   fixtures[id]=await page.evaluate(([profiles,classIndex])=>{
    WYD.resetting=true;
    return profiles.map((profile,pi)=>{
     let seed=20261005+classIndex+pi*100;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
     const s=WYD.save.newState();s.seenHelp=true;s.player.level=profile.level;s.settings.autoSkill=false;s.settings.speed=0;
     let shift=false;const active=Object.keys(WYD.data.skills).filter(id=>{if(WYD.classes.kindOf(id)!=='shift')return true;if(shift)return false;shift=true;return true;}).slice(0,3);
     Object.keys(WYD.data.skills).forEach(id=>{s.player.skills[id]=profile.skill;s.player.skillEnabled[id]=active.includes(id);s.player.runes[id]=WYD.runes.list(id)[pi].id;});
     if(pi===0){for(const slot of Object.keys(WYD.data.items.slots))s.equipment[slot]=WYD.loot.create(s,profile.item,1,{slot,rarity:'rare'});}
     else {
      const defs=WYD.loot.forClass(WYD.data.uniques.list);
      for(const d of defs){const it=WYD.loot.createUnique(s,profile.item,d);if(!s.equipment[it.slot])s.equipment[it.slot]=it;}
      s.equipment.weapon=WYD.loot.create(s,profile.item,1,{slot:'weapon',rarity:'normal'});s.equipment.weapon.sockets=['rune:eth','rune:tir','rune:ral'];
      // 職業に合うユニークがない部位は、レアで埋める（職業ごとに空きの数が違うと比較にならない）
      for(const slot of Object.keys(WYD.data.items.slots))if(!s.equipment[slot])s.equipment[slot]=WYD.loot.create(s,profile.item,1,{slot,rarity:'rare'});
      const c=WYD.data.devotion.list[0];s.devotion[c.id]=true;
      const d=defs.find(d=>!Object.values(s.equipment).some(it=>it.unique===d.id));if(d){s.cube.learned[d.id]=true;s.cube.slots[WYD.cube.slotOf(d)]=d.id;}
      if(pi===2){const set=WYD.data.sets.list[0]; // 不死者4点で高反射のストレス条件
for(const piece of set.pieces){const it=WYD.loot.createSetPiece(s,profile.item,set.id,piece.id);s.equipment[it.slot]=it;}for(const it of Object.values(s.equipment))it.plus=8;}
      for(const g of WYD.data.legendaryGems.list.slice(0,3)){s.lgems.owned[g.id]=pi===2?30:10;s.lgems.equipped.push(g.id);}
     }
     s.mercenary={type:'mage',rank:pi+1};return s;
    });
   },[profiles,ids.indexOf(id)]);
  }
  await page.evaluate(()=>{localStorage.setItem('wyd3-active-class','barbarian');WYD.resetting=true;});await page.reload();
  const result=await page.evaluate(async([ids,profiles,fixtures])=>{
   WYD.resetting=true;WYD.arena.open();const A=WYD.arena,out=[];
   const seeded=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
   for(let pi=0;pi<profiles.length;pi++){
    for(const entry of A.rosterEntries)entry.snapshot=JSON.parse(JSON.stringify(fixtures[entry.id][pi]));
    const groups=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)groups.push([ids[i],ids[j]]);groups.push(ids.slice(0,WYD.data.arena.modes.royale.max)); // バトルロワイヤルは上限人数まで
    for(const group of groups)for(let repeat=0;repeat<3;repeat++){
     const seed=20261005+pi*10000+repeat*100+groups.indexOf(group);
     Math.random=seeded(seed);await A.start(group,group.length===2?'duel':'royale',false);
     // 画像の読み込みによるFXの乱数差を減らしてから、同じ戦闘乱数で測る。
     await Promise.all(Object.values(WYD.render.images).map(img=>img.complete?Promise.resolve():new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true});})));
     for(const f of A.fighters)f.frame.contentWindow.Math.random=seeded(seed+ids.indexOf(f.entry.id)*1000);
     let ticks=0;while(A.running&&ticks++<3601)A.advance();assertFinite();
     function assertFinite(){if(A.running||A.fighters.some(f=>!Number.isFinite(f.engine.world.player.hp)))throw Error('試合異常');}
     const fighters=A.fighters.map(f=>{const r=f.engine.summary();return{id:f.entry.id,rank:f.rank,damage:r.damage,taken:r.taken,healing:r.healing,crits:r.crit,eliminatedAt:f.eliminatedAt,casts:r.rows.reduce((n,r)=>n+r.casts,0),sources:r.rows.filter(r=>r.damage).map(r=>({id:r.id,damage:r.damage}))};});
     if(Math.abs(fighters.reduce((a,f)=>a+f.damage-f.taken,0))>.001)throw Error('与被ダメージ不一致');
     out.push({profile:profiles[pi].id,mode:group.length===2?'duel':'royale',pair:group,repeat,seed,time:+A.time.toFixed(2),reason:A.reason,winner:A.reason==='winner'?A.fighters.find(f=>f.eliminatedAt==null).entry.id:null,fighters});
    }
   }
   return{profiles,combat:WYD.data.arena.combat||null,matches:out};
  },[ids,profiles,fixtures]);
  assert.deepEqual(errors,[]);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));
  for(const profile of profiles)for(const mode of ['duel','royale']){const rows=result.matches.filter(r=>r.profile===profile.id&&r.mode===mode),times=rows.map(r=>r.time).sort((a,b)=>a-b);console.log(JSON.stringify({profile:profile.id,mode,count:rows.length,min:times[0],median:times[(times.length-1)/2],max:times.at(-1),draw:rows.filter(r=>r.reason==='draw').length,timeout:rows.filter(r=>r.reason==='timeout').length,wins:Object.fromEntries(ids.map(id=>[id,rows.filter(r=>r.winner===id).length]))}));}
  console.log('errors 0');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
