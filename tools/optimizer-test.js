// おすすめ装備：目的（火力・防御・対人）ごとに、持ち物・今の装備・倉庫から部位ごとに点数のいちばん高い装備を選ぶ。
// 今の装備のほうが強い部位は「そのまま」。見るだけで着替えない。装備画面のボタンで開き、Escで閉じる。
// node tools/optimizer-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      await page.evaluate(() => { WYD.resetting = true; localStorage.clear(); });
      await page.reload(); await page.click('#modal-ok');
      const r = await page.evaluate(() => {
        const s = WYD.state, O = WYD.optimizer;
        s.settings.speed = 0; s.equipment = {}; s.stash = [];
        // 決まった能力の装備を作る（ランダムをなくす）
        const make = (slot, stats) => { const it = WYD.loot.create(s, 10, 0, { slot, rarity: 'magic' }); it.stats = Object.entries(stats).map(([stat, value]) => ({ stat, value })); it.effects = []; it.sockets = []; it.plus = 0; return it; };
        const atkWeapon = make('weapon', { attack: 30 }), critWeapon = make('weapon', { attack: 10, critChance: 50 });
        const curHead = make('head', { defense: 10 }), defHead = make('head', { defense: 40, maxHp: 60 }), atkHead = make('head', { attack: 15 });
        const stashRing = make('ring', { maxHp: 200 }), curNeck = make('neck', { attack: 50, defense: 50 }), weakNeck = make('neck', { attack: 1 });
        s.equipment.weapon = critWeapon; s.equipment.head = curHead; s.equipment.neck = curNeck;
        s.inventory = [atkWeapon, defHead, atkHead, weakNeck]; s.stash = [stashRing];
        const before = JSON.stringify([Object.values(s.equipment).map((i) => i.id), s.inventory.map((i) => i.id), s.stash.map((i) => i.id)]);
        const plans = Object.fromEntries(WYD.data.optimizer.goals.map((g) => [g.id, O.plan(s, g.id)]));
        const row = (goal, slot) => plans[goal].rows.find((x) => x.slot === slot);
        // 手で計算した点数と同じか（能力×重み）
        const W = (goal) => O.weightsFor(goal);   /* 職業と型の実測の重み（data/optimizer.js の byClass） */
        const manual = (goal, it) => WYD.loot.statTotals(it) && Object.entries(WYD.loot.statTotals(it)).reduce((n, [k, v]) => n + v * (W(goal)[k] || 0), 0);
        // 型の切りかえ：攻撃速度アップのスキル（猛攻）をONにすると、攻撃速度を重く見る重みになる
        const profN = O.profile(s), spdN = O.weightsFor('damage').attackSpeed;
        s.player.skills.hanuman = 1; s.player.skillEnabled.hanuman = true;
        const profF = O.profile(s), spdF = O.weightsFor('damage').attackSpeed;
        s.player.skills.hanuman = 0; s.player.skillEnabled.hanuman = false;
        // 装備画面のボタンから開く
        WYD.ui.changed(); WYD.equipScreen.open();
        document.querySelector('#equipscreen [data-es="optimizer"]').click();
        const shown = !document.getElementById('optimizer').hidden;
        const tabCount = document.querySelectorAll('#optimizer [data-opt-goal]').length;
        document.querySelector('#optimizer [data-opt-goal="defense"]').click();
        const html = document.getElementById('optimizer-body').textContent;
        const neckKeep = document.querySelector('#optimizer [data-opt-slot="neck"]').classList.contains('opt-keep');
        const overflow = document.documentElement.scrollWidth > innerWidth;
        const after = JSON.stringify([Object.values(s.equipment).map((i) => i.id), s.inventory.map((i) => i.id), s.stash.map((i) => i.id)]);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        const closed = document.getElementById('optimizer').hidden, esStill = !document.getElementById('equipscreen').hidden;
        return {
          dmgWeapon: row('damage', 'weapon').best === critWeapon && row('damage', 'weapon').keep,
          dmgHead: row('damage', 'head').best === atkHead, defHead: row('defense', 'head').best === defHead,
          ring: row('defense', 'ring').best === stashRing && row('defense', 'ring').from === 'stash',
          neckKeep: row('damage', 'neck').keep && row('defense', 'neck').keep && row('pvp', 'neck').keep,
          scoreOk: Math.abs(O.score(defHead, 'defense').total - manual('defense', defHead)) < 1e-9,
          diffOk: Math.abs(row('defense', 'head').diff - (manual('defense', defHead) - manual('defense', curHead))) < 1e-9,
          totalOk: Math.abs(plans.defense.diff - plans.defense.rows.reduce((n, x) => n + x.diff, 0)) < 1e-9 && plans.defense.diff > 0,
          reason: row('defense', 'head').reasons.map((x) => x.name), pvpHeadIsDef: row('pvp', 'head').best === defHead,
          emptySlot: row('damage', 'feet').keep && !row('damage', 'feet').cur,
          profN, profF, spdUp: spdF > spdN,
          shown, tabCount, html, neckKeep, overflow, same: before === after, closed, esStill,
        };
      });
      assert(r.dmgWeapon, '火力：会心つき武器（今の装備）のほうが強いのでそのまま');
      assert(r.dmgHead, '火力：頭は攻撃つきを選ぶ'); assert(r.defHead, '防御：頭は防御・HPつきを選ぶ'); assert(r.pvpHeadIsDef, '対人：HP・防御を重めに見る');
      assert(r.ring, '倉庫の装備も候補'); assert(r.neckKeep, '今の装備が強い部位はそのまま'); assert(r.emptySlot, '候補がない部位');
      assert(r.scoreOk, '点数＝能力×重み'); assert(r.diffOk, '部位の点数の差'); assert(r.totalOk, '合計の差＝部位の差の合計');
      assert.deepEqual(r.reason.slice(0, 2).sort(), ['最大HP', '防御力'].sort(), '理由に能力の名前');
      assert.equal(r.profN, 'normal'); assert.equal(r.profF, 'frenzy', '猛攻をONにすると型が変わる'); assert(r.spdUp, '猛攻の型は攻撃速度を重く見る');
      assert(r.shown, '装備画面のボタンで開く'); assert.equal(r.tabCount, 3, '目的のタブ3つ');
      assert.match(r.html, /そのまま/); assert.match(r.html, /防御力 \+\d+点/); assert.match(r.html, /倉庫/); assert(r.neckKeep);
      assert(r.same, '見るだけで着替えない'); assert(r.closed, 'Escで閉じる'); assert(r.esStill, '装備画面は閉じない');
      assert(!r.overflow, '横にはみ出さない');
      // 宝石：装備は宝石ぬきで選び、宝石（手元＋はめている全部）は選んだ装備へ配りなおす
      const g = await page.evaluate(() => {
        const s = WYD.state, O = WYD.optimizer;
        const make = (slot, stats, sockets) => { const it = WYD.loot.create(s, 10, 0, { slot, rarity: 'magic' }); it.stats = Object.entries(stats).map(([stat, value]) => ({ stat, value })); it.effects = []; it.sockets = sockets; it.plus = 0; return it; };
        s.equipment = {}; s.inventory = []; s.stash = []; s.gems = {};
        const weakFeet = make('feet', { defense: 5 }, ['topaz:4']), strongFeet = make('feet', { defense: 20 }, [null]);
        const waist = make('waist', { defense: 10 }, ['topaz:0']);
        s.equipment.feet = weakFeet; s.equipment.waist = waist; s.inventory = [strongFeet]; s.gems = { 'topaz:3': 1 };
        const before = JSON.stringify([weakFeet.sockets, waist.sockets, s.gems]);
        const p = O.plan(s, 'defense'), row = (slot) => p.rows.find((x) => x.slot === slot);
        WYD.ui.changed(); WYD.optimizer.open(); WYD.optimizer.goal = 'defense'; WYD.optimizer.render();
        const text = document.getElementById('optimizer-body').textContent; WYD.optimizer.close();
        return { feetBest: row('feet').best === strongFeet, feetGems: row('feet').gemsNew, waistOnly: row('waist').gemsOnly, waistGems: row('waist').gemsNew, waistNow: row('waist').gemsNow,
          gemDiff: row('waist').gemDiff > 0, text, same: before === JSON.stringify([weakFeet.sockets, waist.sockets, s.gems]) };
      });
      assert(g.feetBest, '宝石ぬきで強い装備を選ぶ（弱い装備の良い宝石にだまされない）'); assert.deepEqual(g.feetGems, ['topaz:4'], '良い宝石は選んだ装備へ移す');
      assert(g.waistOnly, '装備はそのまま・宝石だけ付け替え'); assert.deepEqual(g.waistNow, ['topaz:0']); assert.deepEqual(g.waistGems, ['topaz:3'], '手元の強い宝石と入れ替える'); assert(g.gemDiff);
      assert.match(g.text, /宝石だけ付け替え/); assert.match(g.text, /宝石：/); assert(g.same, '見るだけで宝石は動かさない');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('おすすめ装備のテスト：成功');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
