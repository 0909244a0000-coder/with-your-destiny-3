// 通常攻撃と実際の技、変身/解除、左右の手・床を5つの姿で確認。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 for(const classId of ['paladin','barbarian','druid','collector']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(id=>localStorage.setItem('wyd3-active-class',id),classId);
  await page.goto('file://'+path.resolve(__dirname,'../index.html'));
  await page.waitForFunction(()=>['paladinHammerImpact','barbarianBladeWind','druidPrimalPulse','slashBeast','vines','holyWisp','rageWisp','slash','holyGround'].every(k=>WYD.vfx.img(k))&&Object.values(WYD.data.classes).filter(c=>['パラディン','バーバリアン','ドルイド'].includes(c.name)).flatMap(c=>[c.player.spriteAnimation,...Object.values(c.player.spriteForms||{})]).every(d=>Object.values(d).filter(a=>a?.image).every(a=>WYD.render.getImage(a.image))));
  const result=await page.evaluate(classId=>{
   WYD.resetting=true;WYD.state.settings.speed=0;const W=WYD.world,R=WYD.render,P=WYD.data.player,s=WYD.save.newState(),w=W.create();WYD.currentWorld=w;
   const off=()=>{for(const id in s.player.skillEnabled)s.player.skillEnabled[id]=false};off();
   const stats=WYD.stats.compute(s);Object.assign(w.player,{x:180,y:160,hp:stats.maxHp,face:1});w.time=R.clock=10;
   W.spawnEnemy(w,s,'preta',{x:195,y:160});const e=w.enemies[0];e.hp=e.maxHp=1e9;
   const cast=id=>{off();s.player.skills[id]=1;s.player.skillEnabled[id]=true;W.tryUseSkills(w,s,stats)};
   const fxCheck=()=>{
    const sprite=R.playerSprite(w.player,P),ctx=document.createElement('canvas').getContext('2d'),calls=[],positions=[],draw=ctx.drawImage.bind(ctx),translate=ctx.translate.bind(ctx);
    ctx.drawImage=(...a)=>{calls.push({args:a.slice(1),alpha:ctx.globalAlpha});draw(...a)};ctx.translate=(...a)=>{positions.push(a);translate(...a)};
    const before=JSON.stringify(w);const pose={dx:0,dy:0,sx:1,sy:1,rot:0,flip:-1};
    R.drawPlayerCastFx(ctx,w.player,sprite,pose,false);R.drawPlayerCastFx(ctx,w.player,sprite,pose,true);
    const normal=Math.max(...calls.map(c=>c.alpha)),attached=calls.length>=2,cropped=calls.filter(c=>c.args.length===8).every(c=>c.args[2]===384&&c.args[3]===384&&c.args[0]+384<=768&&c.args[1]+384<=768);
    const foot=positions.every(pos=>Math.abs(pos[1]-(w.player.y+P.radius*WYD.data.map.spriteScale*(w.player.form?.scale||1)*.4))<1e-8);
    calls.length=0;WYD.state.settings.quietFx=true;R.drawPlayerCastFx(ctx,w.player,sprite,pose,false);R.drawPlayerCastFx(ctx,w.player,sprite,pose,true);WYD.state.settings.quietFx=false;
    return attached&&cropped&&foot&&Math.max(...calls.map(c=>c.alpha))<normal&&JSON.stringify(w)===before;
   };
   const sheets=Object.values(WYD.data.classes).filter(c=>['パラディン','バーバリアン','ドルイド'].includes(c.name)).flatMap(c=>[c.player.spriteAnimation,...Object.values(c.player.spriteForms||{})]).every(d=>Object.values(d).filter(a=>a?.image).every(a=>{const img=R.getImage(a.image);return img.height===256&&img.width===a.frames*256}));
   if(classId==='paladin'||classId==='barbarian'){
    w.player.moving=true;const walk=R.playerSprite(w.player,P).action==='walk';w.player.moving=false;
    const hp=e.hp;cast(classId==='paladin'?'pal_zeal':'whirl');const first=w.player.spriteCast.action;
    cast(classId==='paladin'?'pal_judgment':'hanuman');const queued=w.player.spriteCastNext.action;
    W.startSpriteCast(w,.1);const protectedSkill=w.player.spriteCast.action===first;
    w.time=R.clock=10+w.player.spriteCast.duration*.6;const fx=fxCheck();
    const end=w.player.spriteCast.start+w.player.spriteCast.duration;w.time=R.clock=end+.01;W.trackMotion(w,.01);const second=w.player.spriteCast.action===queued;
    const previous={...w.player.spriteCast};w.player.hp=stats.maxHp*.5;cast(classId==='paladin'?'pal_fire':'bar_cry');const aura=w.player.spriteCast.action===previous.action&&w.player.spriteCast.start===previous.start;
    const statsBefore=JSON.stringify(WYD.stats.compute(s));R.drawPlayer(document.createElement('canvas').getContext('2d'),w.player);const stable=JSON.stringify(WYD.stats.compute(s))===statsBefore;
    return{walk,first,queued,protectedSkill,fx,second,damage:e.hp<hp,stable,aura,sheets};
   }
   const forms=[];
   for(const id of ['dru_bear','dru_wolf']){
    w.player.form=null;w.player.spriteCast=null;w.player.spriteCastNext=null;w.player.skillCooldowns={};w.time=R.clock+=2;
    const baseStats=WYD.stats.compute(s);cast(id);const f=w.player.form,formAction=w.player.spriteCast.action==='roar'&&w.player.spriteCast.appearance===id;
    const formStats=WYD.stats.compute(s),scaled=formStats.attack>baseStats.attack&&formStats.moveSpeed>=baseStats.moveSpeed;
    w.time=R.clock=w.player.spriteCast.start+w.player.spriteCast.duration*.6;const fx=fxCheck();
    w.time=R.clock+=1;w.player.spriteCast=null;w.player.moving=true;const walk=R.playerSprite(w.player,P).action==='walk';w.player.moving=false;
    off();w.player.attackTimer=0;const hp=e.hp;W.updatePlayer(w,s,WYD.stats.compute(s),.01);W.updateBolts(w,s,WYD.stats.compute(s),.5);const basic=w.player.spriteCast.action==='cast'&&R.playerSprite(w.player,P).image.includes('/'+(id==='dru_bear'?'bear':'wolf')+'/attack.webp');
    cast('dru_howl');const roar=w.player.spriteCast.action==='roar';w.player.stunTimer=1;const stunned=R.playerSprite(w.player,P).action==='idle'&&!R.playerSprite(w.player,P).fx;w.player.stunTimer=0;const savedImage=R.getImage;R.getImage=()=>null;const fallback=R.playerSprite(w.player,P)===null;R.getImage=savedImage;w.player.spriteCastNext={...w.player.spriteCast};
    WYD.forms.update(w,f.timeLeft+.01);const human=R.playerSprite(w.player,P),expired=!w.player.form&&(classId==='collector'?human===null:human.image.includes('assets/druid/'));
    W.trackMotion(w,.01);const cleared=!w.player.spriteCast&&!w.player.spriteCastNext;
    forms.push({id,formAction,scaled,fx,walk,basic,roar,stunned,fallback,expired,cleared,damage:e.hp<hp});
   }
   return{forms,sheets};
  },classId);
  assert(result.sheets,'256pxセル');
  if(classId==='paladin'||classId==='barbarian')assert.deepEqual(result,{walk:true,first:classId==='paladin'?'strike':'whirl',queued:classId==='paladin'?'prayer':'shout',protectedSkill:true,fx:true,second:true,damage:true,stable:true,aura:true,sheets:true});
  else for(const f of result.forms)for(const [key,value]of Object.entries(f))if(key!=='id')assert.equal(value,true,classId+'/'+f.id+'/'+key);
  assert.deepEqual(errors,[]);console.log('ok',classId,'実攻撃/技、8コマ、左右FX、控えめ、変身/解除、足元、状態維持');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
