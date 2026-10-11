// セットの完成の力：全部（4つ）そろえると攻撃力が data/sets.js の complete.attackMult 倍（傀儡師のセットは最大HP・防御も statMult 倍）。
// 3つまでは効かない。おすすめ装備・育てる候補は、そろったセットの部位を替えない。装備の説明に「完成の力」。
// node tools/set-complete-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const cls of ['barbarian', 'puppeteer']) {
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      await page.evaluate((c) => { WYD.resetting = true; localStorage.clear(); localStorage.setItem('wyd3-active-class', c); }, cls);
      await page.reload();
      const r = await page.evaluate((cls) => {
        const s = WYD.state, L = WYD.loot, C = WYD.data.sets.complete;
        s.settings.speed = 0; s.equipment = {}; s.inventory = []; s.stash = [];
        const setId = cls === 'puppeteer' ? 'facelessTroupe' : 'pyre', set = WYD.data.sets.list.find((x) => x.id === setId);
        const pieces = set.pieces.map((p) => L.createSetPiece(s, 50, setId, p.id));
        for (const it of pieces.slice(0, 3)) s.equipment[it.slot] = it;
        const last = pieces[3];
        s.equipment[last.slot] = last;
        const four = WYD.stats.compute(s), mult = WYD.stats.setCompleteMult(s);
        // 4つ目の装備そのものの能力を引いて、倍率だけを確かめる
        delete s.equipment[last.slot]; const noLast = WYD.stats.compute(s); s.equipment[last.slot] = last;
        const sm = (C.statMult || {})[setId] || {};
        // おすすめ：そろったセットの部位を、もっと点数の高いレジェンドがあっても替えない
        const strong = L.create(s, 50, 0, { slot: last.slot, rarity: 'legend' }); strong.stats = [{ stat: 'attack', value: 999 }, { stat: 'skillDamage', value: 999 }]; strong.effects = []; strong.sockets = [];
        s.inventory = [strong];
        const row = WYD.optimizer.plan(s, 'damage').rows.find((x) => x.slot === last.slot);
        const grow = WYD.optimizer.growCandidates(s, 'damage').some((c) => c.item === strong);
        // 3つにすると、替える提案が出る（完成していないセットは守らない）
        delete s.equipment[pieces[0].slot];
        const row3 = WYD.optimizer.plan(s, 'damage').rows.find((x) => x.slot === last.slot);
        s.equipment[pieces[0].slot] = pieces[0];
        // 装備の説明
        WYD.ui.changed(); const html = WYD.ui.setHtml(last);
        return { mult, attackMult: C.attackMult[setId], sm, threeMult: (() => { const t = { ...s.equipment }; delete s.equipment[last.slot]; const m = WYD.stats.setCompleteMult(s); s.equipment = t; return m; })(),
          attackRatioOk: four.attack > noLast.attack * C.attackMult[setId] * 0.99, keep: row.keep && row.setHeld, row3Change: !row3.keep, grow, html };
      }, cls);
      assert.equal(r.threeMult.attack, 1, '3つでは完成の力なし'); assert.equal(r.mult.attack, r.attackMult, '4つで攻撃力の倍率');
      for (const [k, v] of Object.entries(r.sm)) assert.equal(r.mult[k], v, `${cls} の ${k} の倍率`);
      assert(r.attackRatioOk, '攻撃力が倍率ぶん上がる');
      assert(r.keep, 'おすすめは、そろったセットの部位を替えない（セット完成中）'); assert(r.row3Change, '3つのときは替える提案が出る');
      assert(!r.grow, '育てる候補にも出さない'); assert.match(r.html, /完成の力/);
    }
    assert.deepEqual(errors, []);
    console.log('セットの完成の力のテスト：成功');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
