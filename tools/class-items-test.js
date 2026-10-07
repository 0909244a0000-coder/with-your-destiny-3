// 職業ごとの装備効果の確認。node tools/class-items-test.js（Playwright＋Chromium）
// 1) どの職業でも、落ちる（選べる）ユニーク・セット・星座に「この職業では発動しない」が残っていない
// 2) 傀儡師・冥爆術師の差し替え効果が実際に動く
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const deadList = () => {
  const dead = d => d && d.desc && d.params && /発動しない/.test(WYD.loot.uniqueDesc(d)), out = [];
  for (const u of WYD.loot.forClass(WYD.data.uniques.list)) if (dead(u)) out.push('unique:' + u.id);
  for (const s of WYD.loot.forClass(WYD.data.sets.list)) for (const [n, b] of Object.entries(WYD.loot.setBonuses(s))) if (dead(b)) out.push('set:' + s.id + n);
  for (const c of WYD.data.devotion.list) if (dead(c.bonus)) out.push('devotion:' + c.id);
  return out;
};
// 敵を並べた世界と、指定した固有能力だけを足した能力値
const setup = (power, params) => {
  const base = WYD.stats.compute(WYD.state), st = { ...base, powers: { ...base.powers, [power]: params } };
  const w = WYD.world.create(); w.time = 0; w.player.hp = st.maxHp;
  w.enemies = [0, 1, 2].map(i => ({ x: w.player.x + 40 + i * 30, y: w.player.y, kind: 'goblin', hp: 1e6, maxHp: 1e6, defense: 0 }));
  return { st, w };
};
const checks = {
  puppeteer: () => {
    const r = {}, U = id => WYD.loot.forClassDef(WYD.data.uniques.list.find(u => u.id === id)), state = WYD.state;
    // 狂王の籠手：人形の通常攻撃が周りにも当たる
    { const { st, w } = setup('puppetCleave', U('hanumanFists').params); WYD.puppeteer.spawn(w, st, 4); WYD.puppeteer.update(w, state, st);
      const a = WYD.puppeteer.active(w); WYD.puppeteer.onStrike(w, state, st, a, w.enemies[0]); r.cleave = 1e6 - w.enemies[1].hp; }
    // 劫火の腕輪：確率で燃え上がる（確率を100%にして確認）
    { const { st, w } = setup('puppetEmberStrike', { ...U('agniBangle').params, chance: 100 }); WYD.puppeteer.spawn(w, st, 4); WYD.puppeteer.update(w, state, st);
      const a = WYD.puppeteer.active(w); WYD.puppeteer.onStrike(w, state, st, a, w.enemies[0]); r.ember = 1e6 - w.enemies[0].hp; }
    // 彷徨う刃：鉄杭の突撃の威力が上がる
    { const hit = (power, params) => { const { st, w } = setup(power, params); WYD.puppeteer.spawn(w, st, 4); WYD.puppeteer.update(w, state, st);
        Math.random = () => 0.99; WYD.puppeteer.cast(w, state, st, WYD.data.skills.pup_pierce, 1); return 1e6 - w.enemies[0].hp; };
      r.spike = hit('puppetLongSpike', U('vishnuDisc').params) / hit('none', {}); }
    // 不壊の指輪：身代わり縫いの本体強化（buff）の間に反射する（説明だけ直したもの）
    { const { st, w } = setup('vajraThorns', U('indraRing').params); st.effects = { ...st.effects, thorns: 0 };
      WYD.world.reflect(w, state, st, w.enemies[0], 100); const off = 1e6 - w.enemies[0].hp;
      w.player.buff = { defense: 1, timeLeft: 4 }; WYD.world.reflect(w, state, st, w.enemies[0], 100); r.thorns = [off, 1e6 - w.enemies[0].hp]; }
    // 鎖の王冠：絡め糸で縛られた敵が倒れると爆発する（説明だけ直したもの）
    { const { st, w } = setup('bindExplode', U('nagaCrown').params); WYD.puppeteer.spawn(w, st, 4); WYD.puppeteer.update(w, state, st);
      WYD.puppeteer.cast(w, state, st, WYD.data.skills.pup_bind, 1); const e = w.enemies[0], other = w.enemies[1];
      const s2 = JSON.parse(JSON.stringify(state)), crown = WYD.loot.createUnique(s2, 10, WYD.data.uniques.list.find(u => u.id === 'nagaCrown')); s2.equipment[crown.slot] = crown;
      r.bound = e.stunTimer > 0; const before = other.hp; e.hp = 0; WYD.world.enemyDied(w, s2, e); r.bindExplode = before - other.hp; }
    // 嵐の王：傀儡師では人形の雷になる
    r.storm = WYD.loot.forClassDef(WYD.data.devotion.list.find(c => c.id === 'storm').bonus).power;
    return r;
  },
  bombmancer: () => {
    const r = {}, U = id => WYD.loot.forClassDef(WYD.data.uniques.list.find(u => u.id === id));
    const blast = (power, params) => { const { st, w } = setup(power, params); const far = w.enemies[2]; far.x = w.player.x + 150;
      WYD.bombs.explode(w, WYD.state, st, { x: w.player.x + 40, y: w.player.y, radius: 30, attack: 100, source: 'bomb_brand', extra: {} }); return { w, far }; };
    { const { w } = blast('bombEmbers', U('agniBangle').params); r.embers = w.fields.filter(f => f.source === 'effect:bombEmbers').length; }
    { const { far } = blast('bombShrapnel', U('vishnuDisc').params); r.shrapnel = 1e6 - far.hp; }
    // 残り火の同時数の上限
    { const { st, w } = setup('bombEmbers', U('agniBangle').params);
      for (let i = 0; i < 20; i++) WYD.bombs.explode(w, WYD.state, st, { x: w.player.x, y: w.player.y, radius: 30, attack: 1, source: 'bomb_brand', extra: {} });
      r.capped = w.fields.length <= U('agniBangle').params.maxFields; }
    return r;
  },
};
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    const ids = await page.evaluate(() => Object.keys(WYD.data.classes));
    for (const id of ids) {
      await page.evaluate(id => { WYD.resetting = true; localStorage.setItem('wyd3-active-class', id); }, id); await page.reload();
      assert.deepEqual(await page.evaluate(deadList), [], id + ' に発動しない装備効果がある');
      await page.evaluate(`window.setup = ${setup}`);
      if (checks[id]) {
        const r = await page.evaluate(`(${checks[id]})()`); console.log(id, JSON.stringify(r));
        if (id === 'puppeteer') assert(r.cleave > 0 && r.ember > 0 && r.spike > 1.2 && r.storm === 'puppetStormThread' && r.thorns[0] === 0 && r.thorns[1] > 0 && r.bound && r.bindExplode > 0, JSON.stringify(r));
        if (id === 'bombmancer') assert(r.embers === 1 && r.shrapnel > 0 && r.capped, JSON.stringify(r));
      }
    }
    assert.deepEqual(errors, []);
    console.log('class items OK（' + ids.length + '職）');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
