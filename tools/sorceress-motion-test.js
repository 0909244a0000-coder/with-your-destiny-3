// ソーサレスのセル切出し・状態切替・未読込代替。戦闘値と保存形式は変更しない。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.setItem(WYD.classes.ACTIVE_KEY, 'sorceress'); });
    await page.reload();
    await page.waitForFunction(() => ['idle','walk','cast','meteor','nova'].every(a => WYD.render.getImage(WYD.data.player.spriteAnimation[a].image)));
    const result = await page.evaluate(() => {
      const R = WYD.render, P = WYD.data.player, w = WYD.world.create(), p = w.player;
      R.clock = w.time = 10;
      const idle = R.playerSprite(p,P);
      p.moving = true; const walk = R.playerSprite(p,P);
      WYD.world.startSpriteCast(w); const start = {...p.spriteCast};
      w.time = R.clock = 10.36; const cast = R.playerSprite(p,P);
      WYD.world.startSpriteCast(w); const retained = p.spriteCast.start === start.start;
      R.clock = w.time = 10.73; const recovered = R.playerSprite(p,P);
      p.dead = true; const dead = R.playerSprite(p,P);
      p.dead = false; p.stunTimer = 1; const stunned = R.playerSprite(p,P); p.stunTimer = 0;
      w.time = R.clock = 12; WYD.world.startSpriteCast(w, 1/6);
      R.clock = 12.15; const rapid = R.playerSprite(p,P);
      p.face = -1;
      const canvas = document.createElement('canvas'); canvas.width=400;canvas.height=300;
      R.drawPlayer(canvas.getContext('2d'),p);
      const crop = R.images[rapid.image+'|frame:'+rapid.frame];
      const saved = R.getImage; R.getImage = () => null; const fallback = R.playerSprite(p,P); R.getImage = saved;
      return { idle:idle.action, walk:walk.action, cast:cast.action, frame:cast.frame, retained,
        recovered:recovered.action, dead:dead.action, stunned:stunned.action, rapid:rapid.frame,
        crop: [crop.width,crop.height], fallback, other:R.playerSprite(p,WYD.data.classes.necromancer.player), anchor:[cast.anchorX,cast.anchorY] };
    });
    assert.deepEqual(result, {idle:'idle',walk:'walk',cast:'cast',frame:3,retained:true,recovered:'walk',dead:'idle',stunned:'idle',rapid:7,crop:[256,256],fallback:null,other:null,anchor:[128,234]});
    await page.waitForFunction(() => ['fireball','hitIce','rageWisp','frostCrown'].every(k=>WYD.vfx.img(k)));
    const skills = await page.evaluate(() => {
      const R=WYD.render, W=WYD.world, P=WYD.data.player, w=W.create(), p=w.player;
      Object.assign(p,{x:150,y:130,face:1}); R.clock=w.time=20;
      W.startSpriteCast(w, .17); W.startSpriteCast(w, undefined, 'sorc_meteor');
      const meteor=R.playerSprite(p,P).action;
      W.startSpriteCast(w,.17); const protectedSkill=p.spriteCast.action;
      W.startSpriteCast(w,undefined,'sorc_nova'); const queue=p.spriteCastNext.action;
      w.time=R.clock=20.85; W.trackMotion(w,.05); const nova=R.playerSprite(p,P).action;
      R.clock=w.time=21.19; const sprite=R.playerSprite(p,P);
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),calls=[];
      const native=ctx.drawImage.bind(ctx); ctx.drawImage=(...args)=>{calls.push({alpha:ctx.globalAlpha,src:args[0].src,args:args.slice(1)});native(...args)};
      const pose={dx:0,dy:0,sx:1,sy:1,rot:0,flip:1},before=JSON.stringify(w);
      R.drawPlayerCastFx(ctx,p,sprite,pose,false); R.drawPlayerCastFx(ctx,p,sprite,pose,true);
      const count=calls.length,normal=Math.max(...calls.map(c=>c.alpha));
      calls.length=0;WYD.state.settings.quietFx=true;
      R.drawPlayerCastFx(ctx,p,sprite,{...pose,flip:-1},false);R.drawPlayerCastFx(ctx,p,sprite,{...pose,flip:-1},true);
      const quiet=Math.max(...calls.map(c=>c.alpha))<normal;WYD.state.settings.quietFx=false;
      const unchanged=JSON.stringify(w)===before;
      calls.length=0;p.dead=true;R.drawPlayerCastFx(ctx,p,sprite,pose,false);R.drawPlayerCastFx(ctx,p,sprite,pose,true);const dead=calls.length===0;
      W.trackMotion(w,.05);const cleared=!p.spriteCast&&!p.spriteCastNext;
      // 実際の成功した技から専用モーションが選ばれることも確かめる。
      const s=WYD.save.newState(),battle=W.create();battle.time=30;
      for(const id in s.player.skillEnabled)s.player.skillEnabled[id]=false;
      for(const id of ['sorc_nova','sorc_meteor']) { s.player.skills[id]=6;s.player.skillEnabled[id]=true; }
      const stats=WYD.stats.compute(s);Object.assign(battle.player,{x:150,y:130,hp:stats.maxHp});
      W.spawnEnemy(battle,s,Object.keys(WYD.data.enemies)[0],{x:175,y:140});
      battle.enemies[0].hp=battle.enemies[0].maxHp=1e9;
      W.tryUseSkills(battle,s,stats);
      const routed=new Set([battle.player.spriteCast?.action,battle.player.spriteCastNext?.action]);
      return {meteor,protectedSkill,queue,nova,count,quiet,unchanged,dead,cleared,routed:[...routed].sort()};
    });
    assert.equal(skills.meteor,'meteor');assert.equal(skills.protectedSkill,'meteor');
    assert.equal(skills.queue,'nova');assert.equal(skills.nova,'nova');assert(skills.count>=2);
    assert(skills.quiet&&skills.unchanged&&skills.dead&&skills.cleared);
    assert.deepEqual(skills.routed,['meteor','nova']);
    assert.deepEqual(errors, []);
    console.log('ok 待機/歩行/詠唱8コマ、復帰、死亡/拘束、連射、左向き描画、256px切出し、未読込代替、他職維持');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
