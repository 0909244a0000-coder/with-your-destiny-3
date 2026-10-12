// 敵から受けるダメージ：防御の効きは敵のレベル（その場所のアイテムレベル）で決まり、敵の1発の大きさによらない（data/items.js の combat.takenPerLevel）。
// 高い段階でも防御が効く。対人（アリーナ）・プレイヤーの攻撃の式（calcDamage）は変えない。
// node tools/defense-taken-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    const r = await page.evaluate(() => {
      const s = WYD.state, w = WYD.ui.world, W = WYD.world, C = WYD.data.combat;
      s.settings.speed = 0; if (w.town) WYD.town.leave(w, s);
      s.trial.best = 40; WYD.trial.start(w, s, 40);
      const lv = W.itemLevel(s), red = W.takenReduction(520, s);
      const avg = (atk, def) => { let n = 0; for (let i = 0; i < 400; i++) n += W.calcTaken(atk, def, s).damage; return n / 400; };
      const small = avg(100, 520) / 100, big = avg(5000, 520) / 5000;   // 1発の大きさを変えても、減る割合は同じ
      const twice = avg(1645, 1040) / avg(1645, 520);                    // 防御を2倍にすると受けるダメージが目に見えて減る
      const cap = W.takenReduction(1e9, s);
      const pvp = W.calcDamage(1000, 1000, 0).damage;                     // 対人・プレイヤーの攻撃の式はそのまま（攻撃=防御で半分）
      WYD.trial.stop(w, s);
      return { lv, red, expect: 520 / (520 + C.takenPerLevel * lv), small, big, twice, cap, maxR: C.maxTakenReduction, pvp };
    });
    assert(Math.abs(r.red - r.expect) < 1e-9, '減る割合 = 防御 ÷（防御 ＋ 係数 × 敵のレベル）');
    assert(r.red > 0.45, '段階40でも防御520で半分近く減る');
    assert(Math.abs(r.small - r.big) < 0.02, '敵の1発の大きさで防御の効きが変わらない');
    assert(r.twice < 0.75, '防御を2倍にすると受けるダメージが2割5分以上減る');
    assert.equal(r.cap, r.maxR, '減らせる割合には上限');
    assert(r.pvp >= 450 && r.pvp <= 550, '対人・プレイヤーの攻撃の式は変えない');
    assert.deepEqual(errors, []);
    console.log('受けるダメージのテスト：成功', JSON.stringify(r));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
