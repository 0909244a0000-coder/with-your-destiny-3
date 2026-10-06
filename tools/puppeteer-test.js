const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 try {
  const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('wyd3-active-class','puppeteer'));
  await page.goto('file://'+path.resolve(__dirname,'../index.html'));
  const assets=await page.evaluate(async()=>{
   const paths=[WYD.data.player.image,WYD.data.player.poses.attack,WYD.data.puppeteer.puppet.image,WYD.data.puppeteer.puppet.poses.attack,...Object.values(WYD.data.skillIcons),...['puppetThread','puppetSlash','puppetBind','puppetBurst'].map(k=>WYD.data.vfx.textures[k])];
   return Promise.all(paths.map(src=>new Promise(resolve=>{WYD.render.getImage(src);const image=WYD.render.images[src];if(image.complete)return resolve({src,ok:image.naturalWidth>0});image.onload=()=>resolve({src,ok:true});image.onerror=()=>resolve({src,ok:false})})));
  });
  assert(assets.every(x=>x.ok),JSON.stringify(assets));
  const result=await page.evaluate(()=>{
   const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
   assert(WYD.classes.id==='puppeteer','class');
   assert(WYD.data.classes.puppeteer.name==='傀儡師','localized class');
   assert(Object.values(WYD.data.skills).every(x=>/[^\x00-\x7f]/.test(x.name)&&/[^\x00-\x7f]/.test(x.desc)),'localized skills');
   assert(WYD.data.skillOrder.every(id=>WYD.data.runes.skills[id].every(x=>/[^\x00-\x7f]/.test(x.name)&&/[^\x00-\x7f]/.test(x.desc))),'localized runes');
   assert(WYD.save.KEY.endsWith('-puppeteer'),'save key');
   assert(Object.keys(WYD.data.skills).length===9,'skills');
   assert(WYD.data.skillOrder.every(id=>WYD.data.runes.skills[id].length===3),'runes');
   const state=WYD.state, stats=WYD.stats.compute(state), w=WYD.world.create();
   w.time=0;w.player.hp=stats.maxHp;
   const expected=Math.round((WYD.data.player.base.maxHp+WYD.data.player.perLevel.maxHp*(state.player.level-1))*0.52);
   assert(Math.abs(stats.maxHp-expected)<100,'half HP '+stats.maxHp+' vs '+expected);
   assert(WYD.puppeteer.spawn(w,stats,4),'summon');
   const a=WYD.puppeteer.active(w), base={hp:a.maxHp,atk:a.attack,def:a.defense};
   assert(w.allies.length===1 && w.player.hp<stats.maxHp,'one puppet and cost');
   assert(w.effects.some(ef=>ef.key==='puppetThread'),'summon effect');
   a.atkAnim=WYD.data.anim.attack.time;a.attackTarget={x:a.x+30,y:a.y};
   assert(WYD.render.poseImage(a,a)===a.poses.attack,'puppet attack pose');
   a.atkAnim=0;assert(WYD.render.poseImage(a,a)===a.image,'puppet idle pose');
   assert(a.visualScale===1.35 && a.radius===WYD.data.puppeteer.puppet.radius,'bigger visual only');
   const improved={...stats,maxHp:stats.maxHp+100,defense:stats.defense+30};
   const stronger=WYD.puppeteer.values(improved);
   assert(stronger.maxHp>base.hp && stronger.attack>base.atk && stronger.defense>base.def,'body HP and defense scaling');
   WYD.puppeteer.update(w,state,improved);
   assert(a.maxHp===stronger.maxHp && a.attack>base.atk && a.defense>base.def,'live refresh');
   const guard=WYD.data.skills.pup_guard; w.enemies=[{x:a.x+5,y:a.y+5,kind:'goblin',hp:100,defense:0}];
   assert(WYD.puppeteer.cast(w,state,stats,guard,1),'guard');
   WYD.puppeteer.update(w,state,stats);
   assert(a.defense>stats.defense,'guard defense');
   assert(w.player.atkAnim>0 && w.effects.some(ef=>ef.key==='puppetThread'),'command pose and effect');
   assert(WYD.render.poseImage(w.player,WYD.data.player)===WYD.data.player.poses.attack,'master command pose');
   const stitch=WYD.data.skills.pup_stitch;
   assert(WYD.puppeteer.cast(w,state,stats,stitch,1),'stitch');
   const hp=w.player.hp;WYD.puppeteer.onHit(w,stats,a,10);
   assert(w.player.hp>hp,'stitch heal');
   w.player.hp=stats.maxHp*0.16;
   assert(!WYD.puppeteer.cast(w,state,stats,WYD.data.skills.pup_cut,1),'reserve prevents cast');
   assert(w.player.hp>0,'no suicide');
   w.player.hp=stats.maxHp;const finale=WYD.data.skills.pup_finale;
   assert(WYD.puppeteer.cast(w,state,stats,finale,1),'finale');
   assert(a.hp<=0 && !WYD.puppeteer.active(w),'finale destroys puppet');
   assert(w.effects.some(ef=>ef.key==='puppetBurst'),'finale effect');
   WYD.puppeteer.update(w,state,stats);
   assert(!WYD.puppeteer.active(w),'respawn delay');
   w.time+=WYD.data.puppeteer.respawnCooldown+.1;WYD.puppeteer.update(w,state,stats);
   assert(!!WYD.puppeteer.active(w) && w.allies.filter(x=>x.puppet&&x.hp>0).length===1,'auto respawn one');
   const sim=WYD.save.newState();sim.player.level=40;sim.settings.speed=0;sim.settings.autoSkill=true;
   for(const id of Object.keys(WYD.data.skills)){sim.player.skills[id]=6;sim.player.skillEnabled[id]=['pup_thread','pup_pierce','pup_stitch'].includes(id)}
   const sw=WYD.world.create(), ss=WYD.stats.compute(sim);sw.player.hp=ss.maxHp;sw.spawnTimer=1000;
   for(let i=0;i<3;i++){const e=WYD.world.spawnEnemy(sw,sim,'preta',{x:sw.player.x+90+i*18,y:sw.player.y+30});e.hp=e.maxHp=100000;e.attack=0}
   for(let i=0;i<400;i++)WYD.world.update(sw,sim,.05);
   const damage=WYD.results.get(sw).total.damage;
   assert(damage>0 && Number.isFinite(damage),'combat damage');
   assert(sw.allies.filter(x=>x.puppet&&x.hp>0).length<=1,'combat puppet cap');
   assert(sw.player.hp>0 && Number.isFinite(sw.player.hp),'combat HP');
   const canvas=document.createElement('canvas');canvas.width=WYD.data.map.width;canvas.height=WYD.data.map.height;
   WYD.render.draw(canvas.getContext('2d'),sw,sim);
   return {maxHp:stats.maxHp,base,stronger,remainingHp:w.player.hp,combatDamage:damage,combatHp:sw.player.hp};
  });
  const persisted=await page.evaluate(()=>{const s=WYD.state;s.player.skills.pup_bind=5;s.player.runes.pup_bind='deep';localStorage.setItem('wyd3-save-v1',JSON.stringify({sentinel:true}));WYD.save.write(s);const loaded=WYD.save.load();return loaded.player.skills.pup_bind===5&&loaded.player.runes.pup_bind==='deep'&&JSON.parse(localStorage.getItem('wyd3-save-v1')).sentinel===true});
  assert(persisted,'separate save and runes');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({puppeteer:result,assets:assets.length,persisted,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
