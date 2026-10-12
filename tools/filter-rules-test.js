// 戦利品フィルターの細かい決まり：ソケットの数・特殊効果の数で拾う、ソケットなしは拾わない、太古は拾う。画面から選べて保存される。
// node tools/filter-rules-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    const r = await page.evaluate(() => {
      const s = WYD.state, I = WYD.inventory; s.settings.speed = 0;
      const make = (rarity, sockets, effects, ancient) => { const it = WYD.loot.create(s, 10, 0, { slot: 'ring', rarity }); it.sockets = Array(sockets).fill(null); it.effects = Array.from({ length: effects }, () => ({ id: 'lifesteal', value: 1 })); it.ancient = ancient || 0; it.stats = [{ stat: 'maxHp', value: 1, main: true }]; return it; };
      s.equipment.ring = WYD.loot.create(s, 60, 0, { slot: 'ring', rarity: 'legend' }); s.equipment.ring.stats = [{ stat: 'attack', value: 999, main: true }];   // 今の装備は強い（keepUpgrades に当たらない）
      s.settings.filter = { on: true, slots: { ring: 'legend' }, keepUpgrades: true };
      const keep = (it) => !I.shouldAutoSalvage(s, it);
      const magic0 = make('magic', 0, 0), magic2 = make('magic', 2, 0), magicFx = make('magic', 0, 2), legend0 = make('legend', 0, 0), anc = make('magic', 0, 0, 1);
      const base = [magic0, magic2, magicFx, legend0, anc].map(keep);
      s.settings.filter.minSockets = 2; const sockets = [magic0, magic2].map(keep);
      s.settings.filter.minEffects = 2; const effects = keep(magicFx);
      s.settings.filter.keepAncient = true; const ancient = keep(anc);
      s.settings.filter.noSocketDrop = true; const noSocket = [legend0, magic2, magicFx, anc].map(keep);
      // 画面：開いて選ぶと保存される
      s.settings.filter = { on: true, slots: {}, keepUpgrades: true }; WYD.ui.changed();
      document.getElementById('filter-open').click();
      const sel = (id, v) => { const el = document.querySelector(`[data-filter-num="${id}"]`); el.value = String(v); el.dispatchEvent(new Event('change', { bubbles: true })); };
      sel('minSockets', 3); sel('minEffects', 1);
      const chk = (id) => { const el = document.querySelector(`[data-filter-flag="${id}"]`); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); };
      chk('noSocketDrop'); chk('keepAncient');
      WYD.save.write(s); const f = WYD.save.load().settings.filter;
      return { base, sockets, effects, ancient, noSocket, saved: { minSockets: f.minSockets, minEffects: f.minEffects, noSocketDrop: f.noSocketDrop, keepAncient: f.keepAncient } };
    });
    assert.deepEqual(r.base, [false, false, false, true, false], 'レア度だけ（マジックは拾わない・レジェンドは拾う）');
    assert.deepEqual(r.sockets, [false, true], 'ソケット2つ以上は拾う');
    assert.equal(r.effects, true, '特殊効果2つ以上は拾う'); assert.equal(r.ancient, true, '太古は拾う');
    assert.deepEqual(r.noSocket, [false, true, true, true], 'ソケットなしは拾わない（ほかの残す決まりが先）');
    assert.deepEqual(r.saved, { minSockets: 3, minEffects: 1, noSocketDrop: true, keepAncient: true });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(r));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
