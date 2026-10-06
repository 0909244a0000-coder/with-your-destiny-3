// node tools/dps-test.js：全職/ルーン/秘技、原保存と本編集計の分離、条件/停止/比較/390px。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch();try{
 const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../index.html'));const ids=await p.evaluate(()=>Object.keys(WYD.data.classes)),report=[];
 for(const cls of ids){
  await p.evaluate(cls=>{WYD.resetting=true;localStorage.clear();localStorage.setItem('wyd3-active-class',cls)},cls);await p.reload();await p.click('#modal-ok');
  await p.evaluate(()=>{WYD.resetting=true;WYD.state.settings.speed=0;const s=WYD.state;s.player.level=40;for(const id in WYD.data.skills){s.player.skills[id]=6;s.player.skillEnabled[id]=true;}s.player.paragon.points=100;const a=WYD.training.list(s)[0];WYD.training.learn(s,a.id);WYD.runeSkills.roll(s);WYD.save.write(s);WYD.ui.renderPanels();WYD.dps.open();});
  const out=await p.evaluate(async()=>{
   const A=WYD.dps,s=WYD.state,state=JSON.stringify(s),results=JSON.stringify(WYD.currentWorld.results),storage=JSON.stringify(Object.entries(localStorage));A.$('dps-player-hp').value='0.3';await A.start(false);const e=A.engine,initial=JSON.stringify(e.state);let n=0;while(A.running&&n++<1000)A.advance();const r=A.lastResult.stats;
   const sourceRows=Object.keys(r.rows),alive=e.world.enemies.every(x=>x.hp>0&&Number.isFinite(x.hp+x.x+x.y)),noLoot=e.world.drops.length===0;
   const noProgress=JSON.stringify(e.state)===initial,original=JSON.stringify(s)===state&&JSON.stringify(WYD.currentWorld.results)===results&&JSON.stringify(Object.entries(localStorage))===storage;
   const sum=Object.values(r.rows).reduce((n,x)=>n+x.damage,0),aggregation=Math.abs(sum-r.damage)<.01;
   return{classId:s.classId,seconds:r.elapsed,damage:r.damage,sourceRows,alive,noLoot,noProgress,original,aggregation,completed:A.lastResult.completed};
  });for(const[k,v]of Object.entries(out))if(typeof v==='boolean')assert(v,cls+' '+k);assert(Math.abs(out.seconds-30)<1e-6);assert(out.damage>0);assert(out.sourceRows.some(id=>id.startsWith('runeskill:')));report.push(out);
  // 同条件の再計測は前回比較、表示速度は測定条件に含めない。
  const comparison=await p.evaluate(async()=>{const A=WYD.dps;A.$('dps-speed').value='4';await A.start(false);while(A.running)A.advance();return A.$('dps-compare').textContent});assert.match(comparison,/前回 .*DPS → 今回/);
  await p.evaluate(()=>WYD.dps.close());assert.equal(await p.locator('#dps-test').isVisible(),false);
 }
 const extra=await p.evaluate(async()=>{
  const A=WYD.dps;A.open();A.$('dps-count').value='3';A.$('dps-kind').value='boss';A.$('dps-hp').value='0.2';A.$('dps-defense').value='200';await A.start(false);const E=A.engine,F=A.frame.contentWindow.WYD;
  const old=E.world.enemies.map(x=>[x.x,x.y]),source=F.results.source('skill:bomb_brand').name;for(let i=0;i<40;i++)A.advance();A.paused=true;const time=E.world.time;A.advance();const pause=E.world.time===time;A.paused=false;
  const fixed=E.world.enemies.every((e,i)=>e.x===old[i][0]&&e.y===old[i][1]&&Math.abs(e.hp/e.maxHp-.2)<1e-6&&e.boss&&e.defense===200);
  const target=E.world.enemies[0],damageBefore=E.snapshot().damage;F.world.damageEnemy(E.world,E.state,target,1e20,false,'attack',true);const uncapped=Math.abs(E.snapshot().damage-damageBefore-1e20)<1e5&&target.hp>0&&E.world.drops.length===0;
  A.stop();const partial=!A.lastResult.completed&&A.lastResult.stats.elapsed>0;const mismatch=A.$('dps-compare').textContent.includes('同じ条件');A.close();const cleanup=!A.frame&&!A.engine&&!A.running&&!A.loading;
  WYD.town.leave(WYD.currentWorld,WYD.state);A.open();const campOnly=!A.opened;WYD.town.enter(WYD.currentWorld,WYD.state);A.open();A.$('dps-defense').value='-1';let invalid=false;try{await A.start(false)}catch{invalid=true;}A.$('dps-defense').value='0';return{pause,fixed,uncapped,partial,mismatch,cleanup,campOnly,invalid,source};
 });for(const[k,v]of Object.entries(extra))if(typeof v==='boolean')assert(v,k);
 await p.evaluate(async()=>{await WYD.dps.start(false);for(let i=0;i<120;i++)WYD.dps.advance();WYD.dps.stop()});const ui=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>390||document.querySelector('.dps-box').scrollWidth>document.querySelector('.dps-box').clientWidth,height:[...document.querySelectorAll('.dps-box button,.dps-box select,.dps-box input')].filter(x=>x.getClientRects().length).every(x=>x.getBoundingClientRect().height>=48)}));assert(!ui.overflow&&ui.height,JSON.stringify(ui));fs.mkdirSync(path.resolve(__dirname,'../results'),{recursive:true});await p.screenshot({path:path.resolve(__dirname,'../results/dps-390.png')});
 await p.setViewportSize({width:1920,height:1080});const desktop=await p.evaluate(()=>{const box=document.querySelector('.dps-box'),r=box.getBoundingClientRect();box.scrollTop=box.scrollHeight;const close=document.getElementById('dps-close').getBoundingClientRect();return{bounded:r.top>=0&&r.bottom<=1080,closeReachable:close.top>=r.top&&close.bottom<=r.bottom}});assert(desktop.bounded&&desktop.closeReachable);await p.setViewportSize({width:390,height:844});
 // 読込中に閉じた後、遅いフレームが計測を復活させない。
 await p.evaluate(async()=>{const pending=WYD.dps.start(false);WYD.dps.close();await pending;if(WYD.dps.running||WYD.dps.engine||WYD.dps.loading)throw Error('閉じた計測が復活')});assert.deepEqual(errors,[]);console.log(JSON.stringify({report,extra,ui,desktop,errors},null,2));
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
