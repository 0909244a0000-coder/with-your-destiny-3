// 冥爆の実際の技→仕込み/指鳴らし、歩行、手元/床、爆炎のセル切出し。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 await page.evaluate(()=>{WYD.resetting=true;localStorage.setItem(WYD.classes.ACTIVE_KEY,'bombmancer')});await page.reload();
 await page.waitForFunction(()=>['idle','walk','cast','finale'].every(a=>WYD.render.getImage(WYD.data.player.spriteAnimation[a].image))&&['bombAshBurst','bombOrb','bombSmoke','hitShadow','bombRingBurst'].every(k=>WYD.vfx.img(k)));
 const result=await page.evaluate(()=>{
  WYD.state.settings.speed=0;const W=WYD.world,R=WYD.render,V=WYD.vfx,P=WYD.data.player,s=WYD.save.newState(),w=W.create();
  for(const id in s.player.skillEnabled)s.player.skillEnabled[id]=false;
  for(const id of ['bomb_brand','bomb_finale']){s.player.skills[id]=6;s.player.skillEnabled[id]=true}
  const stats=WYD.stats.compute(s);Object.assign(w.player,{x:150,y:130,hp:stats.maxHp,face:1});w.time=R.clock=10;
  W.spawnEnemy(w,s,'preta',{x:195,y:145});w.enemies[0].hp=w.enemies[0].maxHp=1e9;
  W.tryUseSkills(w,s,stats);const plant=R.playerSprite(w.player,P).action,next=w.player.spriteCastNext.action;
  W.startSpriteCast(w,.17);const protectedSkill=w.player.spriteCast.action;
  const pose={dx:0,dy:0,sx:1,sy:1,rot:0,flip:-1},ctx=document.createElement('canvas').getContext('2d'),calls=[];
  const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(...a)=>{calls.push({src:a[0].src||'',args:a.slice(1),alpha:ctx.globalAlpha});draw(...a)};
  w.time=R.clock=10.32;const sprite=R.playerSprite(w.player,P),before=JSON.stringify(w);
  R.drawPlayerCastFx(ctx,w.player,sprite,pose,false);R.drawPlayerCastFx(ctx,w.player,sprite,pose,true);
  const attached=calls.length>=2,normal=Math.max(...calls.map(c=>c.alpha));calls.length=0;WYD.state.settings.quietFx=true;
  R.drawPlayerCastFx(ctx,w.player,sprite,pose,false);R.drawPlayerCastFx(ctx,w.player,sprite,pose,true);
  const quiet=Math.max(...calls.map(c=>c.alpha))<normal;WYD.state.settings.quietFx=false;
  const unchanged=JSON.stringify(w)===before;w.time=R.clock=10.65;W.trackMotion(w,.01);const finale=R.playerSprite(w.player,P).action;
  w.time=R.clock=11.4;w.player.moving=true;const walk=R.playerSprite(w.player,P).action;
  calls.length=0;V.spawn(w,'bombAshBurst',180,130,{size:500});const ef=w.effects.find(e=>e.key==='bombAshBurst');
  for(const time of [0,.1,.24,.45]){ef.time=time;V.draw(ctx,ef)}
  const cropped=calls.length>0&&calls.every(c=>c.args.length===8&&c.args[2]===384&&c.args[3]===384&&c.args[0]>=0&&c.args[1]>=0&&c.args[0]+384<=768&&c.args[1]+384<=768&&c.args[6]<=240);
  const statsBefore=JSON.stringify(WYD.stats.compute(s));const hp=w.enemies[0].hp;WYD.bombs.update(w,s,stats,.05);
  const damage=w.enemies[0].hp<hp,ring=w.effects.some(e=>e.key==='bombRingBurst');
  const statsStable=JSON.stringify(WYD.stats.compute(s))===statsBefore;
  // 通常の時限爆弾が新しい爆炎を使い、終幕の輪と別の絵になる。
  w.effects=[];w.bombs=[];W.castingId='bomb_brand';WYD.bombs.cast(w,s,stats,WYD.runes.effectiveDef(s,'bomb_brand'),6);WYD.bombs.update(w,s,stats,1.3);
  const burst=w.effects.some(e=>e.key==='bombAshBurst');
  const original=R.getImage;R.getImage=()=>null;const fallback=R.playerSprite(w.player,P)===null;R.getImage=original;
  return{plant,next,protectedSkill,finale,walk,attached,quiet,unchanged,cropped,damage,ring,statsStable,burst,fallback};
 });assert.deepEqual(result,{plant:'plant',next:'finale',protectedSkill:'plant',finale:'finale',walk:'walk',attached:true,quiet:true,unchanged:true,cropped:true,damage:true,ring:true,statsStable:true,burst:true,fallback:true});assert.deepEqual(errors,[]);console.log('ok 実際の仕込み/終幕、通常攻撃で中断なし、歩行、手/床、左向き/控えめ、状態不変、4コマ爆炎、戦闘維持、未読込代替');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
