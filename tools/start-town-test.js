// 初回・旧セーブ・再読み込みは拠点。出発先のエリア／階を保つ。
// node tools/start-town-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    const camp = () => page.evaluate(() => {
      const w = WYD.currentWorld, s = WYD.state;
      s.settings.speed = 0; WYD.ui.changed();
      for (let i = 0; i < 100; i++) WYD.world.update(w, s, .05);
      return { town: w.town, enemies: w.enemies.length, hp: w.player.hp,
        maxHp: WYD.stats.compute(s).maxHp, area: s.area, floor: s.floor,
        elapsed: WYD.results.get(w).elapsed, title: document.querySelector('#area-name').textContent };
    });
    const fresh = await camp();
    assert.equal(fresh.town, true); assert.equal(fresh.enemies, 0);
    assert.equal(fresh.hp, fresh.maxHp); assert.equal(fresh.elapsed, 0);
    assert.equal(fresh.area, 'forest'); assert.equal(fresh.floor, 1); assert.equal(fresh.title, '野営地');
    await page.click('#town-btn');
    assert.equal(await page.evaluate(() => WYD.currentWorld.town), false);
    await page.evaluate(() => {
      const s = WYD.state; s.area = 'smashana'; s.floor = 3;
      s.unlockedAreas.push('smashana'); s.player.level = 20; s.materials = 777;
      s.lastSeen = Date.now(); WYD.save.write(s); WYD.resetting = true;
    });
    await page.reload();
    const resumed = await camp(); assert.equal(resumed.town, true);
    assert.equal(resumed.area, 'smashana'); assert.equal(resumed.floor, 3);
    assert.equal(resumed.elapsed, 0);
    assert.equal(await page.evaluate(() => WYD.state.materials), 777);
    await page.click('#town-btn');
    const left = await page.evaluate(() => {
      const w = WYD.currentWorld, s = WYD.state;
      for (let i = 0; i < 100; i++) WYD.world.update(w, s, .05);
      return { town: w.town, area: s.area, floor: s.floor, elapsed: WYD.results.get(w).elapsed };
    });
    assert.equal(left.town, false); assert.equal(left.area, 'smashana'); assert.equal(left.floor, 3);
    assert(left.elapsed > 0); assert.deepEqual(errors, []);
    console.log('ok 新規は拠点 / 拠点は安全・全快・集計時間0 / 上部バーは野営地 / 再読込は拠点 / 保存した出発先・素材を保持 / 戦場へボタンで再開 / errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
