// でたらめ操作テスト：ボタン・マス・選択肢をランダムに押し続け、エラーと壊れた数値を探す
// 使い方：NODE_PATH=/opt/node-tools/node_modules node tools/fuzz-test.js barbarian 2000
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const cls = process.argv[2] || 'barbarian';
  const steps = Number(process.argv[3]) || 3000;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 1600 } });
  const errs = new Map();
  pg.on('pageerror', e => { const k = e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(k, (errs.get(k) || 0) + 1); });
  pg.on('dialog', d => d.accept(Math.random() < 0.5 ? 'テスト' : ''));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  await pg.evaluate((c) => { localStorage.clear(); localStorage.setItem('wyd3-active-class', c); WYD.resetting = true; }, cls);
  await pg.reload(); await pg.click('#modal-ok');
  await pg.evaluate(() => { const s = WYD.state; s.player.level = 50; s.cleared = true; s.unlockedAreas = WYD.data.areas.map(a => a.id); s.materials = 99999; s.maxDifficulty = 10;
    s.player.skillPoints = 30; s.player.paragon.points = 40; s.player.paragon.level = 40; s.uber.keys = 6; s.trial.best = 3;
    for (let i = 0; i < 25; i++) s.inventory.push(i % 5 === 0 ? WYD.loot.createUnique(s, 20) : i % 7 === 0 ? WYD.loot.createSetPiece(s, 20) : WYD.loot.create(s, 20, 5));
    s.gems = { 'ruby:0': 5, 'topaz:1': 3, 'rune:tir': 2, 'rune:el': 4 }; s.maps = [WYD.maps.create(2), WYD.maps.create(4, 'rare')]; s.settings.speed = 4; WYD.ui.changed(); });
  for (let round = 0; round < steps / 100; round++) {
    await pg.evaluate(() => {
      const skip = new Set(['reset', 'backup-import', 'backup-export', 'class-select', 'backup-file']);
      for (let i = 0; i < 100; i++) {
        const all = [...document.querySelectorAll('button, summary, [data-index], [data-slot], [data-gem], [data-cell], [data-dev], [data-merc], [data-lgem], [data-gamble], [data-bounty], [data-map-use], [data-map-up], [data-build], select, input[type=checkbox]')]
          .filter((e) => e.offsetParent !== null && !skip.has(e.id) && !e.disabled);
        if (!all.length) continue;
        const el = all[Math.floor(Math.random() * all.length)];
        if (el.tagName === 'SELECT') {
          const o = el.options[Math.floor(Math.random() * el.options.length)]; if (o) { el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
          continue;
        }
        const r = Math.random();
        const opts = { bubbles: true, cancelable: true, ctrlKey: r < 0.1, shiftKey: r > 0.92 };
        if (Math.random() < 0.08) el.dispatchEvent(new MouseEvent('contextmenu', opts));
        else el.dispatchEvent(new MouseEvent('click', opts));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: 500, clientY: 500 }));
      }
    });
    await pg.waitForTimeout(150);   // ゲームも進ませる
  }
  await pg.waitForTimeout(1500);
  const sane = await pg.evaluate(() => { const s = WYD.state; const st = WYD.stats.compute(s); return { nanStats: Object.entries(st).filter(([k, v]) => typeof v === 'number' && !isFinite(v)).map(([k]) => k), inv: s.inventory.length, mats: s.materials, trial: !!s.trialRun }; });
  await pg.evaluate(() => WYD.save.write(WYD.state)); await pg.reload(); await pg.waitForTimeout(800);
  const ok = await pg.evaluate(() => !!WYD.state && WYD.state.player.level);
  console.log(cls, JSON.stringify(sane), 'reload ok:', ok, 'errors:', errs.size);
  for (const [k, n] of errs) console.log(n, 'x', k);
  await b.close();
})();
