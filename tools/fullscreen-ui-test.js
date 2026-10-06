// node tools/fullscreen-ui-test.js — 全画面HUDの操作・重なり・保存互換を実ブラウザで確認。
// 任意のChromiumを使う場合は PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH を指定。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage(), errors = [], report = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.locator('#modal-ok').click();
    // 後半で解放される操作も含めてHUDを折り返させる。ユーザーの保存には触れない。
    await page.evaluate(() => {
      WYD.state.player.level = 50;
      WYD.state.player.paragon.points = 100;
      WYD.state.player.paragon.level = 133;
      WYD.data.skillOrder.slice(0,3).forEach(id => { WYD.state.player.skills[id]=1; WYD.state.player.skillEnabled[id]=true; });
      WYD.state.cleared = true;
      WYD.ui.renderPanels();
      document.getElementById('trial-group').hidden = false;
    });
    for (const [width, height] of [[1920,1080],[1363,936],[1024,768],[844,390],[768,1024],[390,844]]) {
      await page.setViewportSize({width, height});
      await page.waitForFunction(() => {
        const r = document.querySelector('.hud-top').getBoundingClientRect();
        return parseFloat(document.documentElement.style.getPropertyValue('--hud-bottom')) === Math.ceil(r.bottom);
      });
      // クリック可能な中心点まで確認し、透明なレイヤーに覆われる退行も拾う。
      const layout = await page.evaluate(() => {
        const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
        const header = document.querySelector('.hud-top').getBoundingClientRect();
        const actions = document.querySelector('.stage-btns').getBoundingClientRect();
        const vitals = document.querySelector('.live-vitals').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.stage-btns button')].filter(visible).map(el => {
          const r = el.getBoundingClientRect(), at = document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
          return {id:el.id, inView:r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight, clickable:!!at && el.contains(at)};
        });
        const intersects = (a,b) => a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
        return {headerOverlap:intersects(header,actions), vitalsOverlap:intersects(vitals,actions), buttons,
          canvasFit:getComputedStyle(document.getElementById('game')).objectFit,
          overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert(!layout.headerOverlap && !layout.vitalsOverlap && !layout.overflow, JSON.stringify({width,height,layout}));
      assert.equal(layout.canvasFit,'contain');
      assert(layout.buttons.some(b => b.id === 'dps-open'), '縦画面でもDPSテストへ到達');
      for (const button of layout.buttons) assert(button.inView && button.clickable, `${width}×${height} ${JSON.stringify(button)}`);
      await page.locator('#game-log-panel summary').click();
      const dock = await page.evaluate(() => {
        const rect = sel => document.querySelector(sel).getBoundingClientRect();
        const hp=rect('.live-vitals'), skills=rect('#hud-skills'), log=rect('.game-log'), panel=rect('.combat-panel'), actions=rect('.stage-btns');
        const separate=(a,b)=>a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top;
        const side=parseFloat(document.documentElement.style.getPropertyValue('--field-side'));
        return {separate:separate(hp,skills)&&separate(log,hp)&&separate(log,skills),inView:log.top>=0&&panel.bottom<=innerHeight&&panel.left>=0&&panel.right<=innerWidth,actionsInside:innerWidth<=900||actions.right<=innerWidth-side};
      });
      assert(dock.separate && dock.inView && dock.actionsInside, JSON.stringify({width,height,dock}));
      if(width===1920) await page.screenshot({path:'/tmp/hud-layout.png'});
      await page.locator('#game-log-panel summary').click();
      await page.locator('#character-open').click();
      await assert.doesNotReject(() => page.locator('#rune-open').click());
      assert(await page.locator('#rune-lab').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#rune-lab').isVisible(),false);
      assert(await page.locator('#character-drawer').isVisible(), 'ルーンのEscapeは人物を閉じない');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#character-open').getAttribute('aria-expanded'),'false');
      await page.locator('#bag-open').click();
      assert(await page.locator('#bag').isVisible());
      await page.locator('#bag-gamble-open').click();
      const gamble = await page.evaluate(() => {
        const el = document.getElementById('gamble-close'), r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      });
      assert(gamble,'装備から開く賭けは装備の前面');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#gamble').isVisible(),false);
      assert(await page.locator('#bag').isVisible());
      await page.locator('[data-bag-target="equipment-panel"]').click();
      const nav = await page.evaluate(() => {
        const head = document.querySelector('.bag-head').getBoundingClientRect();
        const nav = document.querySelector('.bag-nav').getBoundingClientRect();
        const panel = document.getElementById('equipment-panel').getBoundingClientRect();
        return {separate:nav.top>=head.bottom-1, target:panel.top>=nav.bottom-1};
      });
      assert(nav.separate && nav.target, JSON.stringify({width,height,nav}));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#bag').isVisible(),false);
      await page.locator('#dps-open').click();
      assert(await page.locator('#dps-test').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#dps-test').isVisible(),false);
      report.push({width,height,layout,nav});
    }
    // 子窓のEscapeが人物と装備を閉じず、入力欄からでも親のEscapeが効く。
    await page.setViewportSize({width:1920,height:1080});
    await page.locator('#town-btn').click();
    await page.locator('#character-open').click();
    const before = await page.evaluate(() => WYD.currentWorld.time);
    await page.waitForFunction(t => WYD.currentWorld.time > t+.2, before);
    await page.keyboard.press('Escape');
    await page.locator('#bag-open').click();
    const bagTime = await page.evaluate(() => WYD.currentWorld.time);
    await page.waitForFunction(t => WYD.currentWorld.time > t+.2, bagTime);
    await page.evaluate(() => {
      WYD.state.inventory.push(WYD.loot.create(WYD.state,10,1,{rarity:'magic'}));
      WYD.ui.touchSheet('inv',0,true);
    });
    assert(await page.locator('#sheet').isVisible());
    const sheetFront = await page.evaluate(() => {
      const el=document.querySelector('[data-sheet="close"]'),r=el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
    });
    assert(sheetFront,'アイテム操作が装備の前面');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sheet').isVisible(),false);
    assert(await page.locator('#bag').isVisible());
    await page.keyboard.press('Escape');
    // 自動装備など現行セーブの意味が再読み込みで変わらない。
    const saved = await page.evaluate(() => { WYD.save.write(WYD.state); return {classId:WYD.state.classId,equipment:WYD.state.equipment,settings:WYD.state.settings}; });
    await page.reload();
    const restored = await page.evaluate(() => ({classId:WYD.state.classId,equipment:WYD.state.equipment,settings:WYD.state.settings}));
    assert.deepEqual(restored,saved);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({report,liveCombat:true,saveRoundTrip:true,errors},null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
