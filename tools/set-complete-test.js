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
        // 同じセットの同じ部位で強いもの（レベル違いなど）には替える（セットはそろったまま）
        const same = L.createSetPiece(s, 50, setId, set.pieces[3].id); same.stats = [{ stat: 'attack', value: 999 }, { stat: 'skillDamage', value: 999 }]; same.effects = []; same.sockets = [];
        s.inventory = [strong, same];
        const rowSame = WYD.optimizer.plan(s, 'damage').rows.find((x) => x.slot === last.slot);
        const growSame = WYD.optimizer.growCandidates(s, 'damage').some((c) => c.item === same);
        s.inventory = [strong];
        // 3つにすると、替える提案が出る（完成していないセットは守らない）
        delete s.equipment[pieces[0].slot];
        const row3 = WYD.optimizer.plan(s, 'damage').rows.find((x) => x.slot === last.slot);
        s.equipment[pieces[0].slot] = pieces[0];
        // 装備の説明
        WYD.ui.changed(); const html = WYD.ui.setHtml(last);
        return { mult, attackMult: C.attackMult[setId], sm, threeMult: (() => { const t = { ...s.equipment }; delete s.equipment[last.slot]; const m = WYD.stats.setCompleteMult(s); s.equipment = t; return m; })(),
          attackRatioOk: four.attack > noLast.attack * C.attackMult[setId] * 0.99, keep: row.keep && row.setHeld, same: rowSame.best === same && !rowSame.keep, growSame, row3Change: !row3.keep, grow, html };
      }, cls);
      assert.equal(r.threeMult.attack, 1, '3つでは完成の力なし'); assert.equal(r.mult.attack, r.attackMult, '4つで攻撃力の倍率');
      for (const [k, v] of Object.entries(r.sm)) assert.equal(r.mult[k], v, `${cls} の ${k} の倍率`);
      assert(r.attackRatioOk, '攻撃力が倍率ぶん上がる');
      assert(r.keep, 'おすすめは、そろったセットの部位を替えない（セット完成中）'); assert(r.row3Change, '3つのときは替える提案が出る');
      assert(!r.grow, '育てる候補にも出さない'); assert(r.same, '同じセットの同じ部位で強いものには替える'); assert(r.growSame, '育てる候補にも出す'); assert.match(r.html, /完成の力/);
      // 育てる候補のセットの重み：持っている装備で完成できるセットは「完成の力 − 替える部位の育てた下限の差」の点で出す
      const g = await page.evaluate((cls) => {
        const s = WYD.state, L = WYD.loot, O = WYD.optimizer, setId = cls === 'puppeteer' ? 'facelessTroupe' : 'pyre', set = WYD.data.sets.list.find((x) => x.id === setId);
        const pieces = set.pieces.map((p) => L.createSetPiece(s, 50, setId, p.id));
        const weak = (slot) => { const it = L.create(s, 50, 0, { slot, rarity: 'magic' }); it.stats = []; it.effects = []; it.sockets = []; return it; };
        s.equipment = {}; s.stash = []; s.gems = {};
        s.equipment[pieces[0].slot] = pieces[0]; s.equipment[pieces[1].slot] = pieces[1];
        s.equipment[pieces[2].slot] = weak(pieces[2].slot); s.equipment[pieces[3].slot] = weak(pieces[3].slot);
        s.inventory = [pieces[2], pieces[3]];
        const sp = O.setPlans(s, 'damage'), plan = sp.plans.find((p) => p.set.id === setId);
        const loss = [pieces[2], pieces[3]].reduce((a, it) => a + O.growth(s.equipment[it.slot], 'damage', O.gemPool(s)).score - O.growth(it, 'damage', O.gemPool(s)).score, 0);
        const cands = O.growCandidates(s, 'damage').filter((c) => c.set && c.set.id === setId).map((c) => c.item);
        O.goal = 'damage'; WYD.ui.changed(); WYD.equipScreen.open(); WYD.equipScreen.tab = 'grow'; WYD.equipScreen.render();
        const tab = [...document.querySelectorAll('#equipscreen .es-grid [data-es="item"]')].map((el) => Number(el.dataset.index));
        WYD.equipScreen.tab = 'all'; WYD.equipScreen.close();
        const html = O.growHtml(s, O.goalDef('damage'));
        // あと1つ：3つしか持っていない
        s.inventory = [pieces[2]];
        const near = O.setPlans(s, 'damage').near.find((n) => n.set.id === setId), html3 = O.growHtml(s, O.goalDef('damage'));
        // 替える部位がとても強いと、差し引きがマイナスで出さない
        s.inventory = [pieces[2], pieces[3]];
        for (const it of [s.equipment[pieces[2].slot], s.equipment[pieces[3].slot]]) it.stats = [{ stat: 'attack', value: 99999 }];
        const minus = O.setPlans(s, 'damage').plans.some((p) => p.set.id === setId);
        return { plan: !!plan, items: plan && plan.items.length, gainOk: plan && Math.abs(plan.gain - (O.completePoints(set, 'damage') - loss)) < 1e-6,
          points: O.completePoints(set, 'damage'), mult: WYD.data.sets.complete.attackMult[setId], cands: cands.length, tab, html, near: near && near.missing.id === pieces[3].piece, nearAny: !!near, html3, minus };
      }, cls);
      assert(g.plan, `${cls}：持っている装備で完成できるセットは候補`); assert.equal(g.items, 2, '替えるのは装備していない2つ');
      assert(Math.abs(g.points - 1000 * (g.mult - 1)) < 1e-6, '完成の力の点 = 1000 ×（攻撃力の倍率 − 1）'); assert(g.gainOk, '伸び = 完成の力 − 替える部位の育てた下限の差');
      assert.equal(g.cands, 2, '育てる候補にセットの2つ'); assert.deepEqual([...g.tab].sort(), [0, 1], '「★育てる」タブにも出る');
      assert.match(g.html, /セット完成/); assert(g.nearAny, 'あと1つのセット'); assert.match(g.html3, /あと1つ/);
      assert(!g.minus, '差し引きがマイナスなら出さない');
    }
    // レジェンドの名前は、セットの部位の名前とかぶらない（「雷帝の」→「雷神の」）。古いセーブのレジェンドは名前を直し、セットはそのまま
    const n = await page.evaluate(() => {
      const s = WYD.state, L = WYD.loot, D = WYD.data.items, pieceNames = new Set(WYD.data.sets.list.flatMap((x) => x.pieces.map((p) => p.name)));
      const clash = D.legendPrefixes.flatMap((pre) => D.bases.map((b) => pre + b.name)).filter((name) => pieceNames.has(name));
      const leg = L.create(s, 50, 0, { slot: 'ring', rarity: 'legend' }); leg.name = '雷帝の指輪';
      const piece = L.createSetPiece(s, 50, 'thunderlord', 'thunder_ring');
      WYD.save.renameItem(leg); WYD.save.renameItem(piece);
      return { clash, leg: leg.name, piece: piece.name };
    });
    assert.deepEqual(n.clash, [], 'レジェンドとセットで同じ名前がない'); assert.equal(n.leg, '雷神の指輪', '古いセーブのレジェンドは「雷神の」に'); assert.equal(n.piece, '雷帝の指輪', 'セットの名前はそのまま');
    assert.deepEqual(errors, []);
    console.log('セットの完成の力のテスト：成功');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
