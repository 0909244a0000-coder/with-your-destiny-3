// 新しく手に入れた装備・宝石の NEW の印：つく（拾う・ごほうび・合成）／つかない（外して戻す）、見ると消える、保存される（まとめて消すボタンはなくした）。
// node tools/new-mark-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } }); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    // 装備：持ち物に入ると NEW。装備画面に印が出て、乗せると消える。装備の窓を開いても消える。まとめて消せる
    const items = await page.evaluate(() => {
      const s = WYD.state; s.settings.speed = 0; s.inventory = [];
      const a = WYD.loot.create(s, 10, 0, { slot: 'ring' }), b = WYD.loot.create(s, 10, 0, { slot: 'head' }), c = WYD.loot.create(s, 10, 0, { slot: 'feet' });
      for (const it of [a, b, c]) WYD.inventory.add(s, it);
      WYD.ui.changed(); WYD.equipScreen.open();
      return { flags: [a.isNew, b.isNew, c.isNew], badges: document.querySelectorAll('#equipscreen .es-new').length, button: !!document.querySelector('[data-es="seenAll"]') };   /* 「NEWを消す」はなくした */
    });
    assert.deepEqual(items, { flags: [true, true, true], badges: 3, button: false });
    await page.hover('#equipscreen [data-es="item"][data-index="0"]');
    assert.equal(await page.evaluate(() => WYD.state.inventory[0].isNew), undefined, '乗せると消える');
    await page.evaluate(() => { WYD.ui.touchSheet('inv', 1); WYD.ui.sheetAction('close'); });
    assert.equal(await page.evaluate(() => WYD.state.inventory[1].isNew), undefined, '装備の窓を開くと消える');
    assert.equal(await page.evaluate(() => WYD.state.inventory[2].isNew), true, '見ていないものは残る');
    // 宝石：手に入れると NEW、外して戻したものはつかない。宝石の画面に印、乗せると消える。まとめて消せる。保存される
    const gems = await page.evaluate(() => {
      const s = WYD.state, G = WYD.gems; WYD.equipScreen.close(); s.gems = {}; s.gemNew = {};
      G.gain(s, 'ruby:1'); G.gain(s, 'topaz:2');
      const w = WYD.loot.create(s, 10, 0, { slot: 'weapon' }); w.sockets = ['emerald:3']; G.unsocket(s, w);
      WYD.save.write(s); const loaded = WYD.save.load();
      WYD.gemVault.open();
      return { ruby: G.isNew(s, 'ruby:1'), emerald: G.isNew(s, 'emerald:3'), saved: loaded.gemNew, badges: document.querySelectorAll('#gemvault .gv-card .new-badge').length };
    });
    assert.deepEqual(gems, { ruby: true, emerald: false, saved: { 'ruby:1': true, 'topaz:2': true }, badges: 2 });
    await page.hover('#gemvault [data-gv-key="ruby:1"]');
    assert.equal(await page.evaluate(() => WYD.gems.isNew(WYD.state, 'ruby:1')), false, '乗せると消える');
    assert.deepEqual(await page.evaluate(() => ({ topaz: WYD.gems.isNew(WYD.state, 'topaz:2'), button: !!document.querySelector('[data-gv-act="seenAll"]') })), { topaz: true, button: false }, '見ていないものは残る・まとめて消すボタンはない');
    // 合成でできた宝石にも NEW
    const fused = await page.evaluate(() => { const s = WYD.state; s.gems = { 'ruby:4': 10 }; const k = WYD.gems.fuse(s); return WYD.gems.isNew(s, k); });
    assert(fused);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ items, gems, fused }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
