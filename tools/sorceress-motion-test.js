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
    await page.waitForFunction(() => ['idle','walk','cast'].every(a => WYD.render.getImage(WYD.data.player.spriteAnimation[a].image)));
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
    assert.deepEqual(errors, []);
    console.log('ok 待機/歩行/詠唱8コマ、復帰、死亡/拘束、連射、左向き描画、256px切出し、未読込代替、他職維持');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
