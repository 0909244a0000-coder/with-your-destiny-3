// 描画用カメラ、状態の寿命、同時召喚の表示、スマホの既存カメラとの共存。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('wyd3-active-class', 'collector'));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.click('#modal-ok');
    const result = await page.evaluate(() => {
      const s = WYD.state, w = WYD.currentWorld, R = WYD.render;
      WYD.ui.paused = true;
      if (w.town) WYD.town.leave(w, s);
      const ctx = document.getElementById('game').getContext('2d');
      w.player.x = 480; w.player.y = 300;
      const camera = R.cameraFor(ctx, w, s);
      s.settings.cameraZoom = 1.4;
      w.player.x = 960; w.player.y = 600;
      const edge = R.cameraFor(ctx, w, s);
      const arena = R.cameraFor({ canvas: { id: 'arena-canvas' } }, w, s);
      w.player.x = 480; w.player.y = 300;
      w.player.buff = { timeLeft: 2.2, defense: 10 }; w.player.haste = { timeLeft: 4, percent: 10 }; w.player.chill = 1.2;
      w.player.form = { id: 'dru_bear', timeLeft: 5 };
      w.player.shrine = { id: WYD.data.shrines.list[0].id, timeLeft: 6 };
      w.allies = [{ source: 'pup_thread', puppet: true, hp: 50, timeLeft: 10 }, { source: 'nec_raise', hp: 10, timeLeft: 8 }, { source: 'dru_wolves', hp: 10, timeLeft: 8 }, { source: 'merc', merc: true, hp: 10, timeLeft: Infinity }, { source: 'nec_raise', hp: 0, timeLeft: 8 }];
      const before = JSON.stringify(w);
      const states = R.activeStates(w); R.drawStateHud(w);
      const hud = document.getElementById('combat-states');
      const active = { count: hud.children.length, text: hud.textContent, hidden: hud.hidden };
      const unchanged = before === JSON.stringify(w);
      w.player.buff.timeLeft = w.player.haste.timeLeft = w.player.chill = w.player.form.timeLeft = w.player.shrine.timeLeft = 0;
      w.allies = []; R.drawStateHud(w);
      const cleared = hud.hidden && !hud.textContent;
      w.town = true;
      const town = R.cameraFor(ctx, w, s); w.player.chill = 5; R.drawStateHud(w);
      const townHidden = hud.hidden; w.town = false;
      w.player.dead = true; R.drawStateHud(w); const deadHidden = hud.hidden; w.player.dead = false;
      return { camera, edge, arena, town, states, active, unchanged, cleared, townHidden, deadHidden };
    });
    assert.equal(result.camera.zoom, 1.2);
    assert.equal(result.camera.x + result.camera.width / 2, 480);
    assert.equal(result.edge.x + result.edge.width, 960);
    assert.equal(result.edge.y + result.edge.height, 600);
    assert.equal(result.arena.zoom, 1); assert.equal(result.town.zoom, 1);
    assert.equal(result.states.length, 5); assert.equal(result.active.count, 9);
    assert.match(result.active.text, /防御強化 3秒/); assert.match(result.active.text, /鈍足 2秒/);
    assert.match(result.active.text, /人形 ×1/); assert.match(result.active.text, /傭兵 ×1/);
    assert(!result.active.hidden && result.unchanged && result.cleared && result.townHidden && result.deadHidden);
    await page.evaluate(() => { const el = document.getElementById('camera-zoom'); el.value = '1.4'; el.dispatchEvent(new Event('change')); });
    await page.reload();
    assert.equal(await page.evaluate(() => WYD.state.settings.cameraZoom), 1.4);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const mobile = await page.evaluate(() => {
      const w = WYD.currentWorld; w.town = false; WYD.ui.paused = true;
      const st = WYD.stats.compute(WYD.state);
      w.player.buff = { timeLeft: 9, defense: 10 }; w.player.chill = 4;
      for (const id of ['nec_raise', 'dru_wolves']) WYD.allies.spawn(w, st, WYD.data.skills[id], 1, id);
      w.notices = []; w.enemies = [];
      for (const a of w.allies) { a.x = w.player.x; a.y = w.player.y; }
      for (let i = 0; i < 20; i++) WYD.allies.update(w, WYD.state, st, .05);
      if (WYD.util.dist(w.allies[0], w.allies[1]) < 20) throw new Error('待機中の召喚が散開しない');
      const enemy = { kind: Object.keys(WYD.data.enemies)[0], x: 650, y: 280, hp: 10, stunTimer: 2.5 };
      const ctx = document.getElementById('game').getContext('2d');
      // 同じ座標・時間で何度描いても、拘束時間や戦闘座標は変わらない。
      const snapshot = JSON.stringify(enemy);
      WYD.render.drawUnitStates(ctx, { enemies: [enemy], allies: [] });
      if (snapshot !== JSON.stringify(enemy)) throw new Error('描画で状態が変わった');
      WYD.render.draw(ctx, w, WYD.state);
      const box = document.getElementById('combat-states').getBoundingClientRect();
      return { zoom: WYD.render.cameraFor(document.getElementById('game').getContext('2d'), w, WYD.state).zoom, within: box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(mobile.zoom, 1); assert(mobile.within && !mobile.overflow);
    if (process.env.SHOT) {
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(process.env.SHOT, 'readability-mobile.png') });
      await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(process.env.SHOT, 'readability-desktop.png') });
    }
    assert.deepEqual(errors, []);
    console.log('combat readability OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
