// node tools/class-specialization-test.js：独自挙動、追撃の帰属、死亡/階移動の破棄、既存育成データ保持。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    for (const cls of await page.evaluate(() => Object.keys(WYD.data.classes))) {
      await page.evaluate(cls => { localStorage.clear(); localStorage.setItem('wyd3-active-class', cls); WYD.resetting = true; }, cls);
      await page.reload(); await page.click('#modal-ok');
      const checks = await page.evaluate(() => {
        WYD.resetting = true;
        const W = WYD.world, C = WYD.classSpecialization, s = WYD.state, w = WYD.currentWorld;
        s.settings.speed = 0; s.settings.autoSkill = false; s.settings.autoEquip = false;
        WYD.town.leave(w, s); w.player.x = 400; w.player.y = 300;
        for (const id in s.player.skills) { s.player.skills[id] = 6; s.player.skillEnabled[id] = false; s.player.runes[id] = WYD.runes.list(id)[0].id; }
        s.equipment.weapon = WYD.loot.create(s, 20, 1, { slot: 'weapon', rarity: 'legend' });
        const preserved = JSON.stringify([s.player.skills, s.player.skillEnabled, s.player.runes, s.equipment]);
        const stats = WYD.stats.compute(s); stats.attack = 100; stats.critChance = 0; stats.skillDamage = 0;
        stats.effects.lifesteal = 0; stats.powers = {};
        Math.random = () => 0.5;
        W.enemyDied = (world, state, e) => { world.enemies = world.enemies.filter(x => x !== e); };
        const reset = () => { C.clear(w); w.enemies = []; w.fields = []; w.traps = []; WYD.bombs.clear(w); WYD.results.reset(w); w.player.x = 400; w.player.y = 300; w.player.dead = false; w.player.form = null; w.player.hp = stats.maxHp; };
        const enemy = (x = 450, y = 300) => { const e = W.spawnEnemy(w, s, 'preta', { x, y }); e.hp = e.maxHp = 10000; e.defense = 0; return e; };
        const cast = id => C.context(id, WYD.runes.extra(s, id), () => W.skillHandlers[WYD.classes.kindOf(id)].call(W, w, s, stats, WYD.runes.effectiveDef(s, id), 6));
        const tick = seconds => { for (let t = 0; t < seconds; t += .05) { w.time = (w.time || 0) + .05; W.updateFields(w, s, stats, .05); } };
        const out = {};
        if (WYD.classes.id === 'barbarian') {
          reset(); const a = enemy(450), b = enemy(675); cast('whirl'); const first = a.hp;
          w.player.x = 650; tick(.8); out.movingWhirlwind = a.hp === first && b.hp < b.maxHp && WYD.results.snapshot(w).rows['skill:whirl'].hits >= 3;
          reset(); const c = enemy(600); cast('agni'); out.charge = w.player.x > 500 && c.hp < c.maxHp && w.fields.length === 1;
        } else if (WYD.classes.id === 'sorceress') {
          reset(); const a = enemy(); cast('sorc_nova'); out.freeze = a.stunTimer > 0;
          reset(); const b = enemy(600); cast('sorc_meteor'); out.meteorDelayed = b.hp === b.maxHp;
          tick(WYD.data.vfx.meteorFall - .06); out.noPrematureFire = b.hp === b.maxHp;
          tick(.15); out.meteorImpact = b.hp < b.maxHp && WYD.results.snapshot(w).rows['skill:sorc_meteor'].hits >= 2;
        } else if (WYD.classes.id === 'necromancer') {
          reset(); const a = enemy(); a.hp = 1; W.damageEnemy(w, s, a, 2, false); const b = enemy(475);
          out.corpseStored = w.necRemains.length === 1; cast('nec_nova'); out.corpseConsumed = w.necRemains.length === 0 && b.hp < b.maxHp;
          reset(); const c = enemy(500), d = enemy(620), off = enemy(550, 410); cast('nec_spear');
          out.straightPierce = c.hp < c.maxHp && d.hp < d.maxHp && off.hp === off.maxHp;
          for (let i = 0; i < 20; i++) { const e = enemy(); e.hp = 1; W.damageEnemy(w, s, e, 2, false); }
          out.boundedCorpses = w.necRemains.length <= WYD.data.classSpecialization.skills.nec_nova.maxCorpses;
        } else if (WYD.classes.id === 'paladin') {
          reset(); const a = enemy(), b = enemy(480); cast('pal_zeal'); tick(.4);
          out.focusedCombo = a.hp < a.maxHp && b.hp === b.maxHp && WYD.results.snapshot(w).rows['skill:pal_zeal'].hits === 3;
          reset(); const c = enemy(480); cast('pal_hammer'); const d = enemy(664); w.player.x = 600; tick(.05);
          out.orbitFollows = c.hp === c.maxHp && d.hp < d.maxHp && w.classOrbits.length === 1;
        } else if (WYD.classes.id === 'assassin') {
          reset(); const a = enemy(600); cast('asn_blade'); out.ambush = w.player.x > a.x && a.hp < a.maxHp;
          reset(); const b = enemy(); W.playerHit(w, s, stats, b, 100, 'skill:asn_sentry'); const normal = b.maxHp - b.hp;
          b.hp = b.maxHp * .3; const before = b.hp; W.playerHit(w, s, stats, b, 100, 'skill:asn_sentry');
          out.trapFinisher = before - b.hp === normal * 2;
        } else if (WYD.classes.id === 'druid') {
          reset(); enemy(650); cast('dru_tornado'); tick(.5); const normalX = w.classTasks[0].x;
          reset(); enemy(650); w.player.form = { id: 'dru_wolf' }; cast('dru_tornado'); tick(.5); out.wolfStormFaster = w.classTasks[0].x > normalX;
          reset(); const a = enemy(), b = enemy(600), off = enemy(550, 410); cast('dru_boulder');
          out.rockPierceKnockback = a.x > 450 && b.x > 600 && off.hp === off.maxHp;
          const normal = a.maxHp - a.hp; reset(); const c = enemy(); w.player.form = { id: 'dru_bear' }; cast('dru_boulder'); out.bearRockStronger = c.maxHp - c.hp > normal;
        } else {
          reset(); const near = enemy(450), marked = enemy(650);
          WYD.bombs.cast(w, s, stats, { ...WYD.runes.effectiveDef(s, 'bomb_brand'), targetsBase: 1, targetsPerLevel: 0 }, 6);
          w.bombs[0].target = marked;
          cast('bomb_hunter'); out.markedPriority = w.bombs.find(b => b.mode === 'hunter').target === marked;
          const planted = w.bombs.find(b => b.mode === 'brand'), before = planted.attack; cast('bomb_finale'); const boosted = planted.attack;
          out.preparationBonus = boosted > before * WYD.runes.effectiveDef(s, 'bomb_finale').chainBoost;
          cast('bomb_finale'); out.noRepeatAmplification = planted.attack === boosted;
        }
        reset(); const live = enemy();
        const id = Object.keys(WYD.data.skills).find(id => WYD.data.classSpecialization.skills[id]); cast(id);
        w.player.dead = true; tick(1); out.deadClearsTasks = !w.classTasks.length;
        reset(); C.queue(w, { mode: 'area', delay: 1 }); W.resetEnemies(w, s, false); out.floorClearsTasks = !w.classTasks.length && !w.necRemains.length;
        out.buildPreserved = preserved === JSON.stringify([s.player.skills, s.player.skillEnabled, s.player.runes, s.equipment]);
        WYD.save.write(s); const loaded = WYD.save.load();
        out.saveRestored = preserved === JSON.stringify([loaded.player.skills, loaded.player.skillEnabled, loaded.player.runes, loaded.equipment]);
        WYD.ui.changed(); WYD.ui.renderPanels();
        out.mobileNoOverflow = document.documentElement.scrollWidth <= 390;
        out.skillNotes = Object.keys(WYD.data.skills).filter(id => WYD.data.classSpecialization.skills[id]).every(id => WYD.skillInfo.html(s, id, 6).includes(WYD.data.classSpecialization.skills[id].note));
        return out;
      });
      for (const [name, ok] of Object.entries(checks)) { assert.equal(ok, true, cls + ' ' + name); console.log('ok', cls, name); }
    }
    assert.deepEqual(errors, []); console.log('errors 0');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
