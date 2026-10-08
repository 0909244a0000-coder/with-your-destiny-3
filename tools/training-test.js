// node tools/training-test.js：全職業の秘技の実発動/振り直し（秘技だけ・スキルの振り直しでは残る）/旧保存/ビルド/390px。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 const report=[];
 for(const cls of await page.evaluate(()=>Object.keys(WYD.data.classes))){
  await page.evaluate(cls=>{localStorage.clear();localStorage.setItem('wyd3-active-class',cls);WYD.resetting=true},cls);await page.reload();await page.click('#modal-ok');
  const result=await page.evaluate(()=>{
   WYD.resetting=true;WYD.state.settings.speed=0;WYD.sound.play=()=>{};
   const T=WYD.training,S=WYD.classSpecialization,W=WYD.world,s=WYD.state,arts=T.list(s),pg=s.player.paragon;pg.points=100;s.player.level=40;
   const old=WYD.save.newState();delete old.player.paragon.training;WYD.save.write(old);const legacy=WYD.save.load(),legacySafe=legacy.player.paragon.points===0&&T.current(legacy)===null;
   pg.points=19;const poor=!T.learn(s,arts[0].id);pg.points=100;
   const learned=T.learn(s,arts[0].id)&&pg.points===80&&!T.learn(s,arts[0].id)&&pg.points===80;T.learn(s,arts[1].id);const switched=T.equip(s,arts[0].id)&&T.current(s).id===arts[0].id&&pg.points===60;
   WYD.builds.save(s,0,'秘技');T.equip(s,arts[1].id);WYD.builds.load(s,0);const build=T.current(s).id===arts[0].id;
   WYD.save.write(s);const loaded=WYD.save.load(),persist=T.current(loaded).id===arts[0].id&&loaded.player.paragon.points===60;
   const refunded=T.refund(s)===40&&pg.points===100&&T.refund(s)===0&&!T.equip(s,arts[0].id);WYD.builds.load(s,0);const missingSafe=T.current(s)===null;
   pg.board={'9,5':true};T.learn(s,arts[0].id);s.materials=1e8;const pointsBefore=pg.points,respec=WYD.inventory.respec(s),keepParagon=respec.paragon===undefined&&pg.points===pointsBefore&&!!pg.board['9,5']&&T.current(s)?.id===arts[0].id;/* スキルの振り直しは秘技・能力の盤面をもどさない */
   const checks=[];
   for(const a of arts){
    pg.points=Math.max(pg.points,WYD.data.training.cost);/* 蒐集者は全職業の秘技（数が多い）を順に試すので、足りないぶんを足す */T.learn(s,a.id);T.equip(s,a.id);s.player.skills[a.skill]=6;s.player.skillEnabled[a.skill]=true;
    const w=W.create(),stats=WYD.stats.compute(s);w.town=false;w.time=0;w.player.x=400;w.player.y=300;w.player.maxHp=stats.maxHp;w.player.hp=stats.maxHp*.3;
    const kind=Object.keys(WYD.data.enemies)[0];w.enemies=[0,1,2,3].map(i=>({id:100+i,kind,x:460+i*20,y:300,hp:1e8,maxHp:1e8,radius:10,defense:0,stunTimer:0}));w.allies=[{id:11,hp:1,maxHp:100,x:400,y:300,source:'test'}];if(WYD.puppeteer&&WYD.classes.acts('puppeteer',s))WYD.puppeteer.spawn(w,stats,0);/* 蒐集者も人形の技をONにしていれば人形を出す */
    W.castingId=a.skill;W.hitSkill=a.skill;W.castExtra=null;const before=w.enemies[0].x;
    const used=W.skillHandlers[WYD.classes.kindOf(a.skill)].call(W,w,s,stats,WYD.runes.effectiveDef(s,a.skill),6);
    W.castingId=W.hitSkill=null;
    let distinctive=true;
    if(a.mode==='pull')distinctive=w.enemies[0].x<before;
    if(a.mode==='corpses')distinctive=w.necRemains?.length===2;
    if(a.mode==='reverseOrbit')distinctive=w.classOrbits?.length===2&&w.classOrbits[0].speed*w.classOrbits[1].speed<0;
    if(a.mode==='twinStorm')distinctive=w.classTasks?.filter(t=>t.mode==='storm').length===2&&w.classTasks[0].dy*w.classTasks[1].dy<0;
    if(a.mode==='twinHunter')distinctive=w.bombs?.length===2&&w.bombs[0].x!==w.bombs[1].x;
    if(a.mode==='healFriend')distinctive=w.allies[0].hp>1;
    if(['area','pulses','midpoint','targetArea'].includes(a.mode))distinctive=w.classTasks?.some(t=>t.mode==='training');
    if(['chain','fork'].includes(a.mode))distinctive=w.effects.some(e=>e.type==='runeArt'&&e.cell==='chain');
    const snapshot=JSON.stringify(s);for(let i=0;i<65;i++){w.time+=.05;S.update(w,s,stats,.05);WYD.bombs.update(w,s,stats,.05);}
    const finite=w.enemies.every(e=>Number.isFinite(e.hp+e.x+e.y+e.stunTimer))&&Number.isFinite(w.player.hp);
    const unchanged=JSON.stringify(s)===snapshot;const damageWhenApplicable=['corpses','healFriend'].includes(a.mode)||Object.values(w.results?.total.rows||{}).some(r=>r.damage>0);
    S.clear(w);const cleanup=w.classTasks.length===0&&w.classOrbits.length===0&&w.necRemains.length===0;
    checks.push({id:a.id,used:!!used,distinctive:!!distinctive,finite,unchanged,damageWhenApplicable,cleanup});
   }
   // OFF/習得0の技は自動発動しない。
   const a=arts[0];T.equip(s,a.id);for(const id in s.player.skillEnabled)s.player.skillEnabled[id]=false;const idle=W.create();W.tryUseSkills(idle,s,WYD.stats.compute(s));const off=!(idle.classTasks?.length||idle.effects.length||idle.bombs?.length||idle.necRemains?.length);
   return{collector:WYD.data.classes[WYD.classes.id].collect?1:0,arts:WYD.data.training.arts.length,classId:s.classId,legacySafe,poor,learned,switched,build,persist,refunded,missingSafe,keepParagon,off,checks};
  });for(const[k,v]of Object.entries(result))if(typeof v==='boolean')assert(v,result.classId+' '+k);for(const c of result.checks)for(const[k,v]of Object.entries(c))if(typeof v==='boolean')assert(v,c.id+' '+k);assert.equal(result.checks.length,result.collector?result.arts:2);/* 蒐集者は全職業の秘技 */report.push(result);
 }
 // 最後の職業のUI：不足/習得/切替/取り消し/全額返却。
 await page.evaluate(()=>{WYD.state.player.paragon.points=40;WYD.training.refund(WYD.state);WYD.ui.$('board-body').innerHTML=WYD.ui.boardHtml();WYD.ui.$('board').hidden=false});
 const learn=page.locator('[data-training-action="learn"]');await learn.first().click();assert.equal(await page.locator('.training-card.active').count(),1);await learn.first().click();assert.equal(await page.locator('.training-card.active').count(),1);
 require('node:fs').mkdirSync(path.resolve(__dirname,'../results'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'../results/training-390.png')});const before=await page.evaluate(()=>JSON.stringify(WYD.state));page.once('dialog',d=>d.dismiss());await page.locator('[data-training-action="refund"]').click();assert.equal(await page.evaluate(()=>JSON.stringify(WYD.state)),before);page.once('dialog',d=>d.accept());await page.locator('[data-training-action="refund"]').click();assert.equal(await page.locator('.training-card.active').count(),0);
 const ui=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>390,height:[...document.querySelectorAll('[data-training-action]')].every(b=>b.getBoundingClientRect().height>=48)}));assert(!ui.overflow&&ui.height);await page.setViewportSize({width:1920,height:1080});const desktop=await page.evaluate(()=>{const box=document.querySelector('.board-box'),rect=box.getBoundingClientRect();box.scrollTop=box.scrollHeight;const close=document.getElementById('board-close').getBoundingClientRect();return{bounded:rect.top>=0&&rect.bottom<=1080,closeReachable:close.bottom<=rect.bottom&&close.top>=rect.top}});assert(desktop.bounded&&desktop.closeReachable);await page.setViewportSize({width:390,height:844});const arena=await page.evaluate(async()=>{
 const A=WYD.arena,ids=Object.keys(WYD.data.classes).filter(id=>!WYD.data.classes[id].collect)/* 蒐集者は職業専用の秘技がない */,original=JSON.stringify(WYD.state),matches=[];
 for(let round=0;round<2;round++){
  const snapshots={};for(const id of ids){const copy=JSON.parse(original),a=WYD.data.training.arts.filter(x=>x.classId===id)[round];copy.classId=id;copy.player.paragon.training={owned:{[a.id]:20},active:a.id};const skills=WYD.data.classes[id].skills||WYD.classes.baseSkills;copy.player.skills=Object.fromEntries(Object.keys(skills).map(k=>[k,6]));const on=[a.skill,...WYD.data.classes[id].autoBuild||WYD.data.autoBuild].slice(0,3);copy.player.skillEnabled=Object.fromEntries(Object.keys(skills).map(k=>[k,on.includes(k)]));snapshots[id]=copy;localStorage.setItem(A.key(id),JSON.stringify(copy));}
  // 現在の職業は本人の状態から読まれるので、テスト用構成を適用してから開始。
  Object.assign(WYD.state,snapshots[WYD.classes.id]);A.open();A.refresh();const selected=round===0?ids.slice(0,6):ids.slice(-6),teams=Object.fromEntries(selected.map((id,i)=>[id,i<3?'A':'B']));const before=JSON.stringify(WYD.state);await A.start(selected,'teams',false,teams);
  for(const f of A.fighters){const D=f.frame.contentWindow.WYD,base=D.training.onCast;D.training.onCast=function(w,s,stats,skill,lv,prior){if(this.current(s)?.skill===prior.id)w.trainingObserved=(w.trainingObserved||0)+1;return base.call(this,w,s,stats,skill,lv,prior)};}
  if(round===0){const f=A.fighters.find(f=>f.entry.id==='paladin'),D=f.frame.contentWindow.WYD,E=f.engine,friend=A.fighters.find(x=>x.team===f.team&&x!==f).engine;E.world.player.hp=E.world.player.maxHp;E.world.allies=[];E.world.player.x=friend.world.player.x=400;E.world.player.y=friend.world.player.y=300;friend.world.player.hp=friend.world.player.maxHp/2;D.world.castingId='pal_prayer';A.bridge.actor=E;const used=D.world.skillHandlers.aura(E.world,E.state,E.stats,D.data.skills.pal_prayer,6);A.bridge.actor=null;if(!used||!E.world.classTasks?.some(t=>t.mode==='training'))throw Error('満タン術者の味方回復秘技');D.world.castingId=null;}
  if(round===1){const f=A.fighters.find(f=>f.entry.id==='druid'),D=f.frame.contentWindow.WYD,E=f.engine,friend=A.fighters.find(x=>x.team===f.team&&x!==f).engine;E.world.player.hp=E.world.player.maxHp;E.world.allies=[];E.world.player.x=friend.world.player.x=400;E.world.player.y=friend.world.player.y=300;friend.world.player.hp=friend.world.player.maxHp/2;const old=friend.world.player.hp;A.bridge.actor=E;D.training.onCast(E.world,E.state,E.stats,D.data.skills.dru_howl,6,{id:'dru_howl',extra:null});A.bridge.actor=null;const amount=friend.world.player.maxHp*.06*E.healFactor();if(Math.abs(friend.world.player.hp-old-amount)>.00001||!(E.summary().allyHealing>0))throw Error('秘技の味方回復補正/集計 '+JSON.stringify({active:D.training.current(E.state),old,hp:friend.world.player.hp,amount,summary:E.summary(),friends:E.bridge.friends(E).map(f=>({id:f.classId,hp:f.world.player.hp,max:f.world.player.maxHp,x:f.world.player.x,y:f.world.player.y})),casts:E.world.trainingObserved}));}
  let ticks=0;while(A.running&&ticks++<3601)A.advance();const rows=A.fighters.map(f=>f.engine.summary());if(A.running||rows.some(x=>!Number.isFinite(x.damage+x.taken+x.allyHealing+x.bindSeconds))||Math.abs(rows.reduce((n,x)=>n+x.damage-x.taken,0))>.01)throw Error('秘技3対3集計');if(JSON.stringify(WYD.state)!==before)throw Error('対人で原本変更');matches.push({round,reason:A.reason,seconds:A.time,observed:A.fighters.map(f=>({id:f.entry.id,casts:f.engine.world.trainingObserved||0}))});A.stop();
 }
 Object.assign(WYD.state,JSON.parse(original));return{matches,fullHpPrayer:true,friendHeal:true};
 });assert.deepEqual(errors,[]);console.log(JSON.stringify({report,ui,desktop,arena,errors},null,2));
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
