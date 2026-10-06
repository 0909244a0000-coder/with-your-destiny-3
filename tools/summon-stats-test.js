// 冒険者情報の「召喚の能力」の確認。node tools/summon-stats-test.js（Playwright＋Chromium）
// 表示の数値が、実際に呼んだ手下・人形の能力と一致すること。SHOT=フォルダ で画面の写真も保存する
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const out = {};
    for (const [vw, vh] of [[1280, 800], [390, 844]]) for (const cls of ['necromancer', 'puppeteer', 'barbarian', 'sorceress']) {
      const page = await browser.newPage({ viewport: { width: vw, height: vh } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(cls => { localStorage.clear(); localStorage.setItem('wyd3-active-class', cls); }, cls);
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      await page.click('#modal-ok').catch(() => {});
      await page.evaluate(() => { const s = WYD.state; s.settings.speed = 0; s.player.level = 30; for (const id in WYD.data.skills) s.player.skills[id] = 5; WYD.ui.renderPanels(); });
      await page.click('#character-open');
      const r = await page.evaluate(() => {
        const s = WYD.state, U = WYD.ui, box = document.getElementById('summon-stats'), stats = WYD.stats.compute(s);
        const num = (label, scope = box) => { const row = [...scope.querySelectorAll('.stats div, tr')].find(x => x.firstElementChild && x.firstElementChild.textContent === label); return row && row.children[1].textContent.replace(/[^\d.]/g, ''); };
        const r = { hidden: box.hidden, visible: !box.hidden && box.getBoundingClientRect().height > 0, overflow: document.documentElement.scrollWidth > innerWidth };
        const w = WYD.world.create(); w.enemies = [];
        if (WYD.classes.id === 'necromancer') {
          WYD.world.castingId = 'nec_raise'; WYD.allies.summon(w, s, stats, WYD.runes.effectiveDef(s, 'nec_raise'), s.player.skills.nec_raise);
          const a = w.allies[0], cardEl = [...box.querySelectorAll('.summon-card')].find(c => c.textContent.includes(WYD.data.skills.nec_raise.name));
          r.match = [String(Math.round(a.maxHp)) === num('最大HP', cardEl), String(Math.round(a.attack)) === num('攻撃力', cardEl), String(w.allies.length) === num('呼べる数', cardEl)];
        }
        if (WYD.classes.id === 'puppeteer') {
          w.player.hp = stats.maxHp; WYD.puppeteer.spawn(w, stats, 4); WYD.puppeteer.update(w, s, stats); const a = WYD.puppeteer.active(w);
          const row = k => [...box.querySelectorAll('tr')].find(x => x.firstElementChild.textContent === k).children;
          r.match = [String(Math.round(a.maxHp)) === row('最大HP')[1].textContent.replace(/\D/g, ''), String(Math.round(a.attack)) === row('攻撃力')[1].textContent.replace(/\D/g, ''),
            row('最大HP')[2].textContent !== row('最大HP')[1].textContent || row('攻撃力')[2].textContent !== row('攻撃力')[1].textContent];
        }
        r.text = box.textContent.slice(0, 120);
        return r;
      });
      if (process.env.SHOT && !r.hidden) await page.locator('#summon-stats').screenshot({ path: path.join(process.env.SHOT, `${cls}-${vw}.png`) });
      assert.deepEqual(errors, [], cls); out[cls + vw] = r;
      assert(!r.overflow, JSON.stringify(r));
      if (cls === 'sorceress') assert(r.hidden, '召喚のない職業には出さない');
      else if (cls === 'barbarian') assert(r.visible && r.text.includes('祖霊の召喚'), JSON.stringify(r)); // 祖霊の召喚も出る
      else assert(r.visible && r.match.every(Boolean), cls + ' ' + JSON.stringify(r));
      await page.close();
    }
    console.log(JSON.stringify(out));
    console.log('summon stats OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
