// node tools/background-check.js：6エリア・全階・試練・地図・双王・欠損時の描画と負荷を確認。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.click('#modal-ok');
    await page.evaluate(async () => {
      WYD.state.settings.speed = 0; WYD.state.settings.sound = false; WYD.state.settings.music = false;
      WYD.town.leave(WYD.currentWorld, WYD.state);
      const srcs = WYD.data.areas.flatMap(a => [a.sceneImage, a.groundImage]);
      for (const src of srcs) WYD.render.getImage(src);
      await Promise.all(srcs.map(src => WYD.render.images[src].decode()));
    });
    const report = await page.evaluate(() => {
      const s = WYD.state, w = WYD.currentWorld, R = WYD.render;
      const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
      const random = Math.random; let calls = 0; Math.random = () => { calls++; return random(); };
      const scenes = [];
      try {
        for (const a of WYD.data.areas) {
          s.area = a.id; s.floor = 1;
          const scene = R.getImage(a.sceneImage);
          const draws = []; const draw = ctx.drawImage.bind(ctx);
          ctx.drawImage = (...args) => { if (args[0] === scene) draws.push(args.slice(1)); return draw(...args); };
          for (let floor = 1; floor <= a.floors + 1; floor++) { s.floor = floor; R.draw(ctx, w, s); }
          ctx.drawImage = draw;
          scenes.push({ id: a.id, loaded: !!scene, uniqueViews: new Set(draws.map(d => JSON.stringify(d))).size, bounds: draws.every(d => d[0] >= 0 && d[1] >= 0 && d[0] + d[2] <= scene.width + 0.01 && d[1] + d[3] <= scene.height + 0.01) });
        }
        s.cleared = true; WYD.trial.start(w, s, 3); const trial = WYD.world.area(s).sceneImage;
        WYD.trial.stop(w, s); s.maps = [WYD.maps.create(5, 'rare')]; WYD.maps.use(w, s, 0); const map = WYD.world.area(s).sceneImage;
        WYD.trial.stop(w, s); s.uber.keys = 3; WYD.uber.start(w, s); const uber = WYD.world.area(s).sceneImage;
        R.draw(ctx, w, s); WYD.trial.stop(w, s);
        // 同じ状態で背景あり／旧地面を交互に描き、戦闘状態と乱数を変えないことを確認。
        s.area = 'forest'; s.floor = 1; const savedScene = WYD.data.areas[0].sceneImage;
        calls = 0; const stateBefore = JSON.stringify(s); const timings = { scene: [], tile: [] };
        for (let round = 0; round < 3; round++) {
          for (const type of ['scene', 'tile']) {
            WYD.data.areas[0].sceneImage = type === 'scene' ? savedScene : null;
            const start = performance.now(); for (let i = 0; i < 100; i++) R.draw(ctx, w, s);
            timings[type].push((performance.now() - start) / 100);
          }
        }
        WYD.data.areas[0].sceneImage = savedScene;
        const unchanged = JSON.stringify(s) === stateBefore;
        WYD.data.areas[0].sceneImage = 'assets/areas/scenes/missing.webp'; R.draw(ctx, w, s); WYD.data.areas[0].sceneImage = savedScene;
        return { scenes, trial, map, uber, calls, unchanged, timings };
      } finally { Math.random = random; }
    });
    for (const item of report.scenes) { assert(item.loaded); assert.equal(item.uniqueViews, 4); assert(item.bounds); }
    assert.equal(report.trial, 'assets/areas/scenes/patala.webp'); assert.equal(report.map, 'assets/areas/scenes/frost.webp'); assert.equal(report.uber, 'assets/areas/scenes/inferno.webp');
    assert.equal(report.calls, 0); assert(report.unchanged);
    const output = process.env.BACKGROUND_SCREENSHOTS;
    if (output) fs.mkdirSync(output, { recursive: true });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const area of ['forest', 'cathedral', 'frost', 'inferno']) {
        await page.evaluate(id => {
          const s = WYD.state, w = WYD.currentWorld; s.area = id; s.floor = 1; s.trialRun = null; w.town = false; s.settings.speed = 0;
          w.enemies = []; w.drops = []; w.effects = []; w.banner = null; w.notices = []; w.bossIntro = null;
          w.player.x = 480; w.player.y = 300; w.player.hp = WYD.stats.compute(s).maxHp;
          for (const [i, e] of WYD.world.area(s).enemies.slice(0, 3).entries()) WYD.world.spawnEnemy(w, s, e.kind, { x: 210 + i * 260, y: 200 + i * 65 });
          w.drops.push({ x: 400, y: 400, age: 0, item: WYD.loot.createUnique(s, 10) });
          WYD.ui.changed();
        }, area);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
        if (output) await page.locator('#game').screenshot({ path: path.join(output, `${area}-${viewport.width}.png`) });
      }
    }
    assert.deepEqual(errors, []); console.log(JSON.stringify(report)); console.log('ok 6エリア全階・試練/地図/双王・欠損時fallback・描画の乱数0・状態不変・1440px/390px・errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
