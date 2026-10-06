// HPバーの横の召喚表示の確認。node tools/summon-hud-test.js（Playwright＋Chromium）
// SHOT=フォルダ を付けると、その場所に画面の写真を保存する
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const out = {};
    for (const [w, h] of [[1280, 800], [390, 844]]) for (const cls of ['necromancer', 'puppeteer', 'barbarian']) {
      const page = await browser.newPage({ viewport: { width: w, height: h } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(cls => { localStorage.clear(); localStorage.setItem('wyd3-active-class', cls); }, cls);
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      await page.click('#modal-ok').catch(() => {});
      const r = await page.evaluate(async () => {
        const s = WYD.state, U = WYD.ui; s.player.level = 30;
        for (const id in WYD.data.skills) { s.player.skills[id] = 6; s.player.skillEnabled[id] = ['nec_raise', 'nec_mage'].includes(id) || id === 'pup_thread' || WYD.data.skills[id].kind !== 'raise'; }
        if (U.world.town) WYD.town.toggle(U.world, s);
        const w = U.world, stats = WYD.stats.compute(s); w.player.hp = stats.maxHp;
        w.enemies = [{ x: w.player.x + 60, y: w.player.y, kind: Object.keys(WYD.data.enemies)[0], hp: 1e6, maxHp: 1e6, defense: 0 }];
        for (const id of ['nec_raise', 'nec_mage']) if (WYD.data.skills[id]) { WYD.world.castingId = id; WYD.allies.summon(w, s, stats, WYD.runes.effectiveDef(s, id), 6); }
        if (WYD.classes.id === 'puppeteer') { WYD.puppeteer.spawn(w, stats, 4); WYD.puppeteer.active(w).hp *= 0.5; }
        U.updateBars();
        const box = document.getElementById('summon-status'), row = box.parentElement.getBoundingClientRect();
        const hpText = document.getElementById('hp-text').getBoundingClientRect();
        const first = box.textContent;
        // 人形が壊れたあとは、呼び直せるまでの秒数
        let broken = null;
        if (WYD.classes.id === 'puppeteer') { WYD.puppeteer.active(w).hp = 0; w.puppetWasAlive = true; w.time = 10; WYD.puppeteer.update(w, s, stats); U.updateBars(); broken = box.textContent; }
        return { hidden: box.hidden, first, broken,
          inRow: box.hidden || box.getBoundingClientRect().right <= row.right + 1, hpWidth: Math.round(hpText.width), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      if (process.env.SHOT) await page.locator('.live-vitals').screenshot({ path: path.join(process.env.SHOT, `${cls}-${w}.png`) });
      assert.deepEqual(errors, [], cls);
      out[cls + w] = r;
      assert(!r.overflow && r.inRow, JSON.stringify(r));
      assert(r.hpWidth >= (w < 500 ? 150 : 200), 'HPバーが狭すぎる ' + JSON.stringify(r));
      if (cls === 'barbarian') assert(r.hidden, 'バーバリアンには出さない');
      if (cls === 'necromancer') assert(!r.hidden && /骸骨\d+\/\d+/.test(r.first) && /魔術師\d+\/\d+/.test(r.first), r.first);
      if (cls === 'puppeteer') assert(!r.hidden && /人形50%/.test(r.first) && /人形\d+\.\d秒/.test(r.broken), JSON.stringify(r));
      await page.close();
    }
    console.log(JSON.stringify(out));
    console.log('summon hud OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
