// node tools/pending-render-test.js：未受取満杯でも入場暗転が解け、戦闘は停止する。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.click('#modal-ok');
    const result = await page.evaluate(() => {
      WYD.resetting = true; WYD.state.settings.speed = 0;
      const state = WYD.save.newState(), w = WYD.world.create();
      state.pendingLoot = Array.from({ length: WYD.data.items.pendingLootLimit }, () => ({}));
      WYD.town.enter(w, state); WYD.town.leave(w, state);
      const canvas = document.createElement('canvas');
      canvas.width = WYD.data.map.width; canvas.height = WYD.data.map.height;
      const ctx = canvas.getContext('2d');
      const black = () => {
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] || pixels[i + 1] || pixels[i + 2]) return false;
        return true;
      };
      WYD.render.draw(ctx, w, state);
      const initiallyBlack = black(), hp = w.player.hp, floor = state.floor;
      w.bossIntro = { time: 0, name: '試験' };
      for (let i = 0; i < 200; i++) WYD.world.update(w, state, .05);
      WYD.render.draw(ctx, w, state);
      const stopped = w.enemies.length === 0 && w.player.hp === hp && state.floor === floor && !w.time;
      const visible = !black(), finished = !w.banner && !w.bossIntro;
      state.pendingLoot.pop(); WYD.world.update(w, state, .05);
      return { initiallyBlack, stopped, visible, finished, resumed: w.time > 0 };
    });
    for (const [name, value] of Object.entries(result)) assert.equal(value, true, name);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
