// node tools/bombmancer-test.js：時限・宿主死亡・追尾再選択・地雷・一斉起爆・保存・390px。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('wyd3-active-class', 'bombmancer'); WYD.resetting = true; });
    await page.reload(); await page.click('#modal-ok');
    const checks = await page.evaluate(() => {
      const s = WYD.state, w = WYD.currentWorld, B = WYD.bombs, W = WYD.world;
      s.settings.speed = 0; s.settings.autoSkill = false; s.settings.autoEquip = false;
      const townStart = w.town, ownKey = WYD.save.KEY === 'wyd3-save-v1-bombmancer';
      WYD.town.leave(w, s); w.player.hp = WYD.stats.compute(s).maxHp;
      const stats = WYD.stats.compute(s); stats.critChance = 0; stats.effects.lifesteal = 0;
      const reset = () => { w.enemies = []; B.clear(w); WYD.results.reset(w); w.player.x = 400; w.player.y = 300; };
      const enemy = (x = 500, y = 300) => { const e = W.spawnEnemy(w, s, 'preta', { x, y }); e.hp = e.maxHp = 100000; e.defense = 0; return e; };
      const cast = (id, lv = 1) => { W.castingId = id; W.castExtra = WYD.runes.extra(s, id); const ok = B.cast(w, s, stats, WYD.runes.effectiveDef(s, id), lv); W.castExtra = null; return ok; };
      reset(); const a = enemy(), b = enemy(525); cast('bomb_brand'); const original = a.hp;
      B.update(w, s, stats, 1); const delay = a.hp === original; B.update(w, s, stats, .21);
      const areaHit = a.hp < original && b.hp < original && w.bombs.length === 0;
      const attributed = WYD.results.snapshot(w).rows['skill:bomb_brand'].hits >= 2;
      reset(); const dead = enemy(), nearby = enemy(525); cast('bomb_brand'); dead.hp = 0; w.enemies = [nearby]; B.update(w, s, stats, .05);
      const deathBurst = nearby.hp < nearby.maxHp;
      reset(); const old = enemy(), next = enemy(540); cast('bomb_hunter'); old.hp = 0; w.enemies = [next]; B.update(w, s, stats, .05);
      const retarget = w.bombs[0].target === next; B.update(w, s, stats, 1);
      const hunterHit = next.hp < next.maxHp && !w.bombs.length;
      reset(); const mineTarget = enemy(460); cast('bomb_mine'); B.update(w, s, stats, .2); const arming = mineTarget.hp === mineTarget.maxHp;
      B.update(w, s, stats, .16); const proximity = mineTarget.hp < mineTarget.maxHp;
      reset(); const far = enemy(650); cast('bomb_mine'); B.update(w, s, stats, 3.1); const timedMine = w.bombs.length === 0;
      reset(); enemy(); cast('bomb_brand'); cast('bomb_finale'); const first = w.bombs[0].attack;
      cast('bomb_finale'); const noRepeatBoost = w.bombs[0].attack === first;
      B.update(w, s, stats, 2); const chained = !w.bombs.length;
      reset(); enemy(); for (let i = 0; i < 100; i++) cast('bomb_hunter'); const capped = w.bombs.length === WYD.data.bombs.maxActive;
      W.changeFloor(w, s, 1); const floorClear = !w.bombs.length;
      reset(); enemy(); cast('bomb_hunter'); WYD.town.enter(w, s); const townClear = !w.bombs.length;
      const runeCount = Object.keys(WYD.data.skills).every(id => WYD.runes.list(id).length === 3);
      s.player.skills.bomb_finale = 6; s.player.runes.bomb_finale = 'blood'; reset(); const blood = enemy();
      w.player.hp = stats.maxHp / 2; cast('bomb_finale', 6); B.update(w, s, stats, .05); const runeHeal = w.player.hp > stats.maxHp / 2;
      // 旧キャラの保存領域に触れず、スキル・型・装備を復元する。
      localStorage.setItem('wyd3-save-v1', JSON.stringify({ sentinel: true })); WYD.save.write(s); const loaded = WYD.save.load();
      const save = loaded.player.skills.bomb_finale === 6 && loaded.player.runes.bomb_finale === 'blood';
      const separate = JSON.parse(localStorage.getItem('wyd3-save-v1')).sentinel === true;
      const mastery = (() => { s.player.skillEnabled.bomb_finale = false; return WYD.stats.masteryBonus(s, 'bomb_finale').critChance === 3; })();
      const ownLoot = WYD.loot.forClass(WYD.data.uniques.list).some(u => u.id === 'funeralWatch');
      return { townStart, ownKey, delay, areaHit, attributed, deathBurst, retarget, hunterHit, arming, proximity, timedMine, noRepeatBoost, chained, capped, floorClear, townClear, runeCount, runeHeal, save, separate, mastery, ownLoot };
    });
    for (const [name, ok] of Object.entries(checks)) { assert.equal(ok, true, name); console.log('ok', name); }
    const images = await page.evaluate(async () => {
      const paths = [WYD.data.player.image, WYD.data.player.poses.attack, ...Object.values(WYD.data.skillIcons), ...['bombOrb', 'bombBurst', 'bombSmoke', 'bombHunter'].map(k => WYD.data.vfx.textures[k])];
      return Promise.all(paths.map(src => new Promise(resolve => { const i = new Image(); i.onload = () => resolve({ src, ok: i.naturalWidth > 0 }); i.onerror = () => resolve({ src, ok: false }); i.src = src; })));
    });
    assert(images.every(i => i.ok), JSON.stringify(images)); console.log('ok all 15 assets loaded');
    const combinations = await page.evaluate(() => {
      const ids = Object.keys(WYD.data.skills); let count = 0;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) for (let rune = 0; rune < 3; rune++) {
        const s = WYD.save.newState(), w = WYD.world.create(); s.settings.speed = 0; s.settings.autoSkill = false; s.player.level = 40;
        for (const id of ids) { s.player.skills[id] = 6; s.player.skillEnabled[id] = [ids[i], ids[j], ids[k]].includes(id); s.player.runes[id] = WYD.runes.list(id)[rune].id; }
        const stats = WYD.stats.compute(s); w.player.hp = stats.maxHp; w.spawnTimer = 1000;
        for (let n = 0; n < 3; n++) { const e = WYD.world.spawnEnemy(w, s, 'preta', { x: 550 + n * 20, y: 300 }); e.hp = e.maxHp = 100000; e.attack = 0; }
        for (let n = 0; n < 120; n++) WYD.world.update(w, s, .05);
        if (!Number.isFinite(w.player.hp) || !Number.isFinite(WYD.results.get(w).total.damage) || (w.bombs || []).length > WYD.data.bombs.maxActive) throw new Error([ids[i], ids[j], ids[k], rune].join('/'));
        count++;
      }
      return count;
    });
    assert.equal(combinations, 252); console.log('ok 84 skill trios x 3 rune selections = 252');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 390), true, '390px overflow');
    assert.deepEqual(errors, []); console.log('errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
