// 傀儡師専用のユニーク3種・セット1種の確認。node tools/puppeteer-items-test.js（Playwright＋Chromium）
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const check = () => {
  const ok = (v, m) => { if (!v) throw Error(m); };
  const U = WYD.data.uniques.list, S = WYD.data.sets.list;
  const mine = U.filter(u => u.classOnly === 'puppeteer');
  ok(mine.length === 3, 'unique count');
  const set = S.find(s => s.id === 'facelessTroupe');
  ok(set && set.classOnly === 'puppeteer' && set.pieces.length === 4, 'set');
  ok([...mine.map(u => u.power), set.bonuses[4].power].every(p => p.startsWith('puppet')), 'new powers');
  ok(WYD.loot.uniqueDesc(mine[0]).indexOf('{') < 0 && WYD.loot.uniqueDesc(set.bonuses[4]).indexOf('{') < 0, 'desc filled');
  const state = WYD.state, base = WYD.stats.compute(state);
  const withP = (name, params) => ({ ...base, powers: { ...base.powers, [name]: params } });
  const find = id => U.find(u => u.id === id).params;
  const fresh = () => { const w = WYD.world.create(); w.time = 0; w.player.hp = base.maxHp;
    w.enemies = [{ x: w.player.x + 40, y: w.player.y, kind: 'goblin', hp: 1e6, defense: 0 }]; return w; };
  const r = {};
  // 満ちる糸巻き：人形が満タンなら消費半分
  { const st = withP('puppetSpareThread', find('fullSpool')), w = fresh();
    WYD.puppeteer.spawn(w, st, 4); const hp = w.player.hp; WYD.puppeteer.pay(w, st, 10);
    r.spare = hp - w.player.hp; ok(Math.abs(r.spare - base.maxHp * 0.05) < 1e-6, 'spare half cost');
    const a = WYD.puppeteer.active(w); a.hp = a.maxHp * 0.5; const hp2 = w.player.hp; WYD.puppeteer.pay(w, st, 10);
    ok(Math.abs(hp2 - w.player.hp - base.maxHp * 0.1) < 1e-6, 'spare full cost when hurt'); }
  // 無貌座の衣装：HPが減るほど人形の攻撃が上がり、上限で止まる
  { const st = withP('puppetDesperation', set.bonuses[4].params), w = fresh();
    WYD.puppeteer.spawn(w, st, 4); const a = WYD.puppeteer.active(w);
    w.player.hp = st.maxHp; WYD.puppeteer.update(w, state, st); const full = a.attack;
    w.player.hp = st.maxHp * 0.7; WYD.puppeteer.update(w, state, st); r.desp30 = a.attack / full;
    w.player.hp = st.maxHp * 0.16; WYD.puppeteer.update(w, state, st); r.despCap = a.attack / full;
    ok(Math.abs(r.desp30 - 1.45) < 1e-6 && Math.abs(r.despCap - 1.9) < 1e-6, 'desperation ' + r.desp30 + ' ' + r.despCap); }
  // 藁の心臓：受けたダメージの35%を人形へ
  { const st = withP('puppetScapegoat', find('strawHeart')), w = fresh();
    WYD.puppeteer.spawn(w, st, 4); WYD.puppeteer.update(w, state, st); const a = WYD.puppeteer.active(w);
    const hp = w.player.hp, ahp = a.hp; WYD.world.receiveDamage(w, 20);
    ok(Math.abs(hp - w.player.hp - 13) < 1e-6 && Math.abs(ahp - a.hp - 7) < 1e-6, 'scapegoat split'); }
  // 幕引きの裁ち鋏：壊れたら回復し、2秒で呼び直せる
  { const st = withP('puppetCurtainCall', find('curtainShears')), w = fresh();
    WYD.puppeteer.spawn(w, st, 4); WYD.puppeteer.update(w, state, st);
    w.player.hp = st.maxHp * 0.5; WYD.puppeteer.active(w).hp = 0; WYD.puppeteer.update(w, state, st);
    ok(Math.abs(w.player.hp - st.maxHp * 0.62) < 1e-6 && w.puppetRespawnAt === 2, 'curtain heal/respawn');
    w.allies = []; w.time = 2.01; WYD.puppeteer.update(w, state, st); ok(WYD.puppeteer.active(w), 'respawned at 2s'); }
  // 装備なしなら、人形の型（PvE）の肩代わりだけ
  { const w = fresh(); WYD.puppeteer.spawn(w, base, 4); const a = WYD.puppeteer.active(w); WYD.puppeteer.update(w, state, base);
    const share = WYD.data.puppeteer.modes.pve.guardSharePercent, hp = w.player.hp, ahp = a.hp; WYD.world.receiveDamage(w, 20);
    ok(Math.abs(hp - w.player.hp - 20 * (1 - share / 100)) < 1e-6 && Math.abs(ahp - a.hp - 20 * share / 100) < 1e-6, 'no item: mode share only'); }
  // ほかの職業では落ちない
  ok(WYD.loot.uniqueDesc && mine.every(u => !!u.classOnly), 'classOnly');
  return r;
};
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('wyd3-active-class', 'puppeteer'));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    console.log(await page.evaluate(check));
    assert.deepEqual(errors, []);
    console.log('puppeteer items OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
module.exports = { check };
