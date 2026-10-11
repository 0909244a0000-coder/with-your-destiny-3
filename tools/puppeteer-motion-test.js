// 実際の召喚・裁断・終幕から8コマへ。人形の挙動とHPコストを保つ。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('wyd3-active-class','puppeteer'));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 await page.waitForFunction(()=>['idle','walk','cast','finale'].every(a=>WYD.render.getImage('assets/puppeteer/'+a+'.webp'))&&['puppetThread','puppetBind','puppetBurst'].every(k=>WYD.vfx.img(k)));
 const result=await page.evaluate(()=>{
  WYD.state.settings.speed=0;const W=WYD.world,R=WYD.render,V=WYD.vfx,P=WYD.data.player,s=WYD.save.newState(),w=W.create();
  for(const id in s.player.skillEnabled)s.player.skillEnabled[id]=false;
  const stats=WYD.stats.compute(s);Object.assign(w.player,{x:150,y:130,hp:stats.maxHp,face:1});w.time=R.clock=10;
  const enable=id=>{for(const key in s.player.skillEnabled)s.player.skillEnabled[key]=false;s.player.skills[id]=1;s.player.skillEnabled[id]=true;W.tryUseSkills(w,s,stats)};
  enable('pup_thread');const command=R.playerSprite(w.player,P).action,a=WYD.puppeteer.active(w),cost=w.player.hp<stats.maxHp;
  W.spawnEnemy(w,s,'preta',{x:a.x+15,y:a.y});w.enemies[0].hp=w.enemies[0].maxHp=1e9;
  const hp=w.enemies[0].hp;enable('pup_cut');const queued=w.player.spriteCastNext.action,damage=w.enemies[0].hp<hp;
  W.startSpriteCast(w,.17);const protectedSkill=w.player.spriteCast.action;
  const ctx=document.createElement('canvas').getContext('2d'),calls=[],draw=ctx.drawImage.bind(ctx),pose={dx:0,dy:0,sx:1,sy:1,rot:0,flip:-1};
  ctx.drawImage=(...args)=>{calls.push({args:args.slice(1),alpha:ctx.globalAlpha});draw(...args)};
  w.time=R.clock=10.35;const before=JSON.stringify(w),sprite=R.playerSprite(w.player,P);
  R.drawPlayerCastFx(ctx,w.player,sprite,pose,false);R.drawPlayerCastFx(ctx,w.player,sprite,pose,true);
  const attached=calls.length>=2,normal=Math.max(...calls.map(c=>c.alpha));calls.length=0;WYD.state.settings.quietFx=true;
  R.drawPlayerCastFx(ctx,w.player,sprite,pose,false);R.drawPlayerCastFx(ctx,w.player,sprite,pose,true);
  const quiet=Math.max(...calls.map(c=>c.alpha))<normal;WYD.state.settings.quietFx=false;
  const unchanged=JSON.stringify(w)===before;w.time=R.clock=10.73;W.trackMotion(w,.01);const sever=R.playerSprite(w.player,P).action;
  w.time=R.clock=11.6;w.player.spriteCast=null;w.player.spriteCastNext=null;w.player.hp=stats.maxHp;a.hp=a.maxHp*.2;
  enable('pup_finale');const finale=R.playerSprite(w.player,P).action,destroyed=a.hp===0,atPuppet=w.effects.some(e=>e.key==='puppetBurst'&&e.x===a.x&&e.y===a.y);
  calls.length=0;const ef=w.effects.find(e=>e.key==='puppetBurst');
  for(const time of [0,.1,.25,.5]){ef.time=time;V.draw(ctx,ef)}
  const cropped=calls.length>0&&calls.every(c=>c.args.length===8&&c.args[2]===384&&c.args[3]===384&&c.args[0]+384<=768&&c.args[1]+384<=768&&c.args[6]<=220);
  w.time=R.clock=12.5;w.player.moving=true;const walk=R.playerSprite(w.player,P).action;
  const original=R.getImage;R.getImage=()=>null;const fallback=R.playerSprite(w.player,P)===null;R.getImage=original;
  w.player.dead=true;W.trackMotion(w,.01);const deathCleared=!w.player.spriteCast&&!w.player.spriteCastNext;
  return{command,cost,queued,damage,protectedSkill,attached,quiet,unchanged,sever,finale,destroyed,atPuppet,cropped,walk,fallback,deathCleared};
 });assert.deepEqual(result,{command:'command',cost:true,queued:'sever',damage:true,protectedSkill:'command',attached:true,quiet:true,unchanged:true,sever:'sever',finale:'sever',destroyed:true,atPuppet:true,cropped:true,walk:'walk',fallback:true,deathCleared:true});assert.deepEqual(errors,[]);console.log('ok 召喚/裁断/終幕、HPコストと人形破壊、順次再生、中断防止、手/床、左向き/控えめ、4コマ、歩行、代替、死亡');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
