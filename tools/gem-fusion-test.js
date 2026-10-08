// 宝石合成（混沌の宝石）：種類も段階も混ぜて王者10個ぶん → ランダムな能力の宝石。はめると基本の能力・特殊効果が上がる。保存・表示。
// node tools/gem-fusion-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
    await page.reload(); await page.click('#modal-ok');
    const out = await page.evaluate(() => {
      const s = WYD.state, G = WYD.gems, F = WYD.data.gems.fusion;
      // 足りない：王者9個＋至高2個（9×81＋2×27 = 783 < 810）
      s.gems = { 'ruby:4': 5, 'topaz:4': 4, 'emerald:3': 2, 'rune:el': 3 };
      const short = G.fusionPlan(s), shortFuse = G.fuse(s);
      // 足りる：欠けた30個＋王者10個 → 低い段階から使う（欠けた30＋王者10 = 840 ≥ 810）
      s.gems = { 'ruby:0': 30, 'amethyst:4': 6, 'topaz:4': 4, 'rune:el': 3 };
      const plan = G.fusionPlan(s), key = G.fuse(s), info = G.info(key), left = { ...s.gems };
      // ランダムの幅：能力の数・種類の重複なし・数値が幅の中
      const rolls = Array.from({ length: 2000 }, () => G.info(G.rollFused()).lines);
      const inRange = rolls.every(ls => ls.every(l => { const p = F.pool.find(x => x.kind === l.kind && x.id === l.id); return p && l.value >= p.range[0] && l.value <= p.range[1]; }));
      const unique = rolls.every(ls => new Set(ls.map(l => l.kind + l.id)).size === ls.length);
      const counts = [...new Set(rolls.map(ls => ls.length))].sort();
      const effectSeen = rolls.some(ls => ls.some(l => l.kind === 'effect'));
      // はめる：基本の能力と特殊効果が両方上がる
      const fixed = 'fused:attack=20,fx.lifesteal=3.5';
      s.gems[fixed] = 1;
      const weapon = WYD.loot.create(s, 10, 0); s.equipment[weapon.slot] = weapon;
      const target = weapon || null;
      let socketed = false, attackUp = 0, lifeUp = 0;
      if (target) {
        target.sockets = [null];
        const a0 = WYD.stats.compute(s).attack, l0 = WYD.stats.effectTotals(s).lifesteal;
        socketed = G.socket(s, target, fixed);
        attackUp = WYD.stats.compute(s).attack - a0; lifeUp = WYD.stats.effectTotals(s).lifesteal - l0;
      }
      const text = G.statsText(fixed);
      WYD.save.write(s); const loaded = WYD.save.load();
      return { short: { ok: short.ok, total: short.total }, shortFuse, plan: { use: plan.use, total: plan.total, ok: plan.ok }, fused: !!(info && info.fused), name: G.name(key),
        left, inRange, unique, counts, effectSeen, hasTarget: !!target, socketed, attackUp, lifeUp, text,
        persisted: loaded.gems[key] === 1, bad: G.info('fused:nope=3'), badFx: G.info('fused:fx.nope=3') };
    });
    assert.deepEqual(out.short, { ok: false, total: 783 }); assert.equal(out.shortFuse, null);
    assert.deepEqual(out.plan, { use: { 'ruby:0': 30, 'amethyst:4': 6, 'topaz:4': 4 }, total: 840, ok: true });
    assert.equal(out.fused, true); assert.equal(out.name, '混沌の宝石');
    assert.deepEqual(out.left, { 'rune:el': 3, [Object.keys(out.left).find(k => k.startsWith('fused:'))]: 1 }, 'ルーンは使わない・宝石は使い切る');
    assert(out.inRange, '数値が幅の外'); assert(out.unique, '同じ能力が重なった'); assert.deepEqual(out.counts, [1, 2, 3, 4]); assert(out.effectSeen);
    assert(out.hasTarget, '装備がない'); assert(out.socketed); assert(out.attackUp >= 20, '攻撃力が上がらない'); assert(Math.abs(out.lifeUp - 3.5) < 1e-9, '吸血が上がらない');
    assert.match(out.text, /攻撃力 \+20/); assert.match(out.text, /3\.5% をHPとして吸収/);
    assert(out.persisted); assert.equal(out.bad, null); assert.equal(out.badFx, null);
    // 画面：ボタンで合成（確認を受ける）
    await page.evaluate(() => { const s = WYD.state; s.gems = { 'emerald:4': 10 }; WYD.ui.$('gems-panel').hidden = false; WYD.ui.changed(); WYD.ui.render && WYD.ui.render(); });
    await page.evaluate(() => { document.getElementById('bag').hidden = false; });
    await page.evaluate(() => WYD.ui.putHtml('gems', WYD.ui.gemsHtml()));
    page.once('dialog', d => d.accept());
    await page.evaluate(() => document.querySelector('[data-gem-fuse]').click());
    const ui = await page.evaluate(() => Object.keys(WYD.state.gems));
    assert.equal(ui.length, 1); assert(ui[0].startsWith('fused:'));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ plan: out.plan, name: out.name, text: out.text, ui }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
