// 宝石合成（混沌の宝石）：種類も段階も混ぜて王者10個ぶん → ランダムな能力の宝石。基本の能力・特殊効果・割合・固有能力・神（身につけて1つ）。一度だけの巻き戻し。宝石を外すモード。保存・表示。
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
      const rolls = Array.from({ length: 20000 }, () => G.info(G.rollFused()).lines);
      const inRange = rolls.every(ls => ls.every(l => { const p = F.pool.find(x => x.kind === l.kind && x.id === l.id); if (!p) return false;
        return p.params ? Object.entries(p.params).every(([k, [lo, hi]]) => l.params[k] >= lo && l.params[k] <= hi) : l.value >= p.range[0] && l.value <= p.range[1]; }));
      const kindsSeen = [...new Set(rolls.flat().map(l => l.kind))].sort(), oneGod = rolls.every(ls => ls.filter(l => l.kind === 'god').length <= 1);
      const allIds = new Set(rolls.flat().map(l => l.kind + l.id)).size;
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
      // 極レア：割合・全ステータス・固有能力（はめる数に制限なし）
      const pctKey = 'fused:pct.attack=5,pct.all=2,pw.eliteHunter=percent~20';
      s.gems[pctKey] = 2; target.sockets.push(null, null);
      const b0 = WYD.stats.compute(s);
      const twoPct = G.socket(s, target, pctKey) && G.socket(s, target, pctKey);
      const b1 = WYD.stats.compute(s);
      const pctOk = Math.abs(b1.attack / b0.attack - 1.14) < 0.01 && Math.abs(b1.defense / b0.defense - 1.04) < 0.01, hunter = b1.powers.eliteHunter && b1.powers.eliteHunter.percent;
      // 神：身につけて1つまで。2つ目は、はめられない。持ち物の装備にははめられるが、効くのは最初の1つだけ
      const god1 = 'fused:god.stun=chance~100|sec~0.5', god2 = 'fused:attack=10,god.mark=v~20|sec~3';
      s.gems[god1] = 1; s.gems[god2] = 1; target.sockets.push(null, null);
      const firstGod = G.socket(s, target, god1), secondGod = G.socket(s, target, god2);
      const spare = WYD.loot.create(s, 10, 0); spare.sockets = [null]; const spareGod = G.socket(s, spare, god2);
      const god = WYD.stats.compute(s).god;
      // 神の能力が通常攻撃で動く：スタン100%
      const W = WYD.world, w = W.create(), st = WYD.stats.compute(s);
      const kind = Object.keys(WYD.data.enemies)[0], e = { id: 1, kind, x: 0, y: 0, hp: 1e6, maxHp: 1e6, defense: 0, stunTimer: 0 };
      w.enemies = [e]; W.tryGod(w, s, st, e); const stunned = e.stunTimer;
      // 烙印：受けるダメージ+20%
      const mark = { ...st, god: { id: 'mark', v: 20, sec: 3 } }; W.tryGod(w, s, mark, e); const hp0 = e.hp; W.damageEnemy(w, s, e, 100, false, 'attack', false); const marked = hp0 - e.hp;
      // 断罪：HP15%以下を100%で即死（ボスは除く）
      const ex = { ...st, god: { id: 'execute', hp: 20, chance: 100 } }; const low = { ...e, id: 2, hp: 100, maxHp: 1000 }, boss = { ...low, id: 3, boss: true };
      w.enemies.push(low, boss); W.tryGod(w, s, ex, low); W.tryGod(w, s, ex, boss);
      const godText = G.statsText(god1), godName = G.name(god1), bad = G.info('fused:god.stun=chance~3|sec~0.5,god.echo=chance~9');
      WYD.save.write(s); const loaded = WYD.save.load();
      // 一度だけの巻き戻し：フラグのない旧セーブの混沌の宝石（持ち物・はめた分）を外し、1つにつき王者10個を返す。2回目は何もしない
      const old = JSON.parse(JSON.stringify(s)); delete old.fusionRollback1; for (const it of Object.values(old.equipment)) if (it) it.sockets = [];
      old.gems = { 'fused:attack=5': 2, 'ruby:0': 1 }; const oi = WYD.loot.create(s, 10, 0, { slot: 'ring' }); oi.sockets = ['fused:god.echo=chance~10', 'ruby:1']; old.inventory = [oi];
      const ow = WYD.loot.create(s, 10, 0, { slot: 'weapon' }); ow.sockets = ['fused:attack=1', null]; old.equipment = { ...old.equipment, weapon: ow };
      localStorage.setItem(WYD.save.KEY, JSON.stringify(old)); WYD.save.fusionRolledBack = 0;
      const rb = WYD.save.load(), rbCount = WYD.save.fusionRolledBack;
      const kings = Object.entries(rb.gems).filter(([k]) => k.endsWith(':4')).reduce((n, [, v]) => n + v, 0);
      const rbClean = !Object.keys(rb.gems).some(k => k.startsWith('fused:')) && rb.inventory[0].sockets.join() === ',ruby:1' && rb.equipment.weapon.sockets.every(k => k === null) && rb.gems['ruby:0'] === 1 && rb.fusionRollback1 === true;
      rb.gems['fused:attack=7'] = 1; localStorage.setItem(WYD.save.KEY, JSON.stringify(rb)); WYD.save.fusionRolledBack = 0;
      const again = WYD.save.load(), keptNew = again.gems['fused:attack=7'] === 1 && !WYD.save.fusionRolledBack;
      const fresh = WYD.save.newState().fusionRollback1 === true;
      return { short: { ok: short.ok, total: short.total }, shortFuse, plan: { use: plan.use, total: plan.total, ok: plan.ok }, fused: !!(info && info.fused), name: G.name(key),
        left, inRange, unique, counts, effectSeen, hasTarget: !!target, socketed, attackUp, lifeUp, text,
        persisted: loaded.gems[key] === 1, rbCount, kings, rbClean, keptNew, fresh, kindsSeen, oneGod, allIds, twoPct, pctOk, hunter, firstGod, secondGod, spareGod, god: god && god.id, stunned, marked,
        executed: low.hp <= 0, bossAlive: boss.hp > 0, godText, godName, twoGods: bad, bad: G.info('fused:nope=3'), badFx: G.info('fused:fx.nope=3') };
    });
    assert.deepEqual(out.short, { ok: false, total: 783 }); assert.equal(out.shortFuse, null);
    assert.deepEqual(out.plan, { use: { 'ruby:0': 30, 'amethyst:4': 6, 'topaz:4': 4 }, total: 840, ok: true });
    assert.equal(out.fused, true); assert.equal(out.name, '混沌の宝石');
    assert.deepEqual(out.left, { 'rune:el': 3, [Object.keys(out.left).find(k => k.startsWith('fused:'))]: 1 }, 'ルーンは使わない・宝石は使い切る');
    assert(out.inRange, '数値が幅の外'); assert(out.unique, '同じ能力が重なった'); assert.deepEqual(out.counts, [1, 2, 3, 4]); assert(out.effectSeen);
    assert(out.hasTarget, '装備がない'); assert(out.socketed); assert(out.attackUp >= 20, '攻撃力が上がらない'); assert(Math.abs(out.lifeUp - 3.5) < 1e-9, '吸血が上がらない');
    assert.match(out.text, /攻撃力 \+20/); assert.match(out.text, /3\.5% をHPとして吸収/);
    assert(out.persisted);
    assert.equal(out.rbCount, 4, '巻き戻した数'); assert.equal(out.kings, 40, '王者を返す'); assert(out.rbClean, '巻き戻しのあと'); assert(out.keptNew, '巻き戻しは一度だけ'); assert(out.fresh);
    assert.deepEqual(out.kindsSeen, ['effect', 'god', 'pct', 'power', 'stat']); assert(out.oneGod, '神が2つ'); assert.equal(out.allIds, 28, '出る能力の種類');
    assert(out.twoPct, '極レアは何個でもはめられる'); assert(out.pctOk, '割合が効かない'); assert.equal(out.hunter, 20);
    assert(out.firstGod); assert.equal(out.secondGod, false, '神は身につけて1つまで'); assert(out.spareGod); assert.equal(out.god, 'stun');
    assert.equal(out.stunned, 0.5); assert.equal(out.marked, 120); assert(out.executed, '断罪'); assert(out.bossAlive, 'ボスは即死しない');
    assert.match(out.godText, /【神・雷霆】通常攻撃に 100% で 0\.5秒スタン/); assert.equal(out.godName, '神の混沌石'); assert.equal(out.twoGods, null); assert.equal(out.bad, null); assert.equal(out.badFx, null);
    // 画面：ボタンで合成（確認を受ける）
    await page.evaluate(() => { const s = WYD.state; s.gems = { 'emerald:4': 10 }; WYD.ui.$('gems-panel').hidden = false; WYD.ui.changed(); WYD.ui.render && WYD.ui.render(); });
    await page.evaluate(() => { document.getElementById('bag').hidden = false; });
    await page.evaluate(() => WYD.ui.putHtml('gems', WYD.ui.gemsHtml()));
    page.once('dialog', d => d.accept());
    await page.evaluate(() => document.querySelector('[data-gem-fuse]').click());
    const ui = await page.evaluate(() => Object.keys(WYD.state.gems));
    assert.equal(ui.length, 1); assert(ui[0].startsWith('fused:'));
    // 宝石を外すモード：装備をクリックすると、はまっている宝石（混沌の宝石・神・ふつうの宝石）を全部外して手元に。ルーンは残す
    const un = await page.evaluate(() => {
      const s = WYD.state, w = WYD.loot.create(s, 10, 0, { slot: 'weapon' });
      for (const it of Object.values(s.equipment)) if (it) it.sockets = []; w.sockets = ['fused:god.stun=chance~3|sec~0.5', 'ruby:2', 'rune:el']; s.equipment.weapon = w; s.gems = {};
      WYD.ui.changed(); WYD.ui.toggleBag(true); WYD.ui.render && WYD.ui.render();
      WYD.ui.putHtml('gems', WYD.ui.gemsHtml());
      document.querySelector('[data-gem-unsocket]').click();
      const on = WYD.ui.unsocketMode;
      document.querySelector('#equipment [data-slot="weapon"]').click();
      const after = { sockets: [...s.equipment.weapon.sockets], gems: { ...s.gems }, equipped: s.equipment.weapon === w };
      // 外した神の混沌石は、またはめられる
      WYD.ui.unsocketMode = false; const again = WYD.gems.socket(s, w, 'fused:god.stun=chance~3|sec~0.5');
      return { on, ...after, again, none: WYD.gems.unsocket(s, null).length };
    });
    assert.equal(un.on, true); assert.equal(un.equipped, true, '外すモードでは装備は外れない');
    assert.deepEqual(un.sockets, [null, null, 'rune:el']); assert.deepEqual(un.gems, { 'fused:god.stun=chance~3|sec~0.5': 1, 'ruby:2': 1 });
    assert(un.again); assert.equal(un.none, 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ plan: out.plan, name: out.name, text: out.text, ui }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
