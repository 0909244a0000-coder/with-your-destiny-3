// バランス確認用：新しいセーブから自動で遊ばせて、ボスを倒した時間や倒れた回数を出す。
// 使い方：  node tools/balance-sim.js [遊ばせる分数（省略すると15）] [職業（省略するとバーバリアン）] [試練の分数] [覚えるスキル3つ（カンマ区切り、- で省略）] [傭兵]
// 必要なもの：Node.js と Playwright（npm i playwright）。ゲームの数値は変えない（ブラウザの中だけで動く）。
const path = require('path');
const { chromium } = require('playwright');
const MINUTES = Number(process.argv[2]) || 15;
const CLASS = process.argv[3] || 'barbarian';
const TRIAL_MINUTES = Number(process.argv[4]) || 0; // クリア後、終わりのない試練を何分続けるか
const SKILLS = process.argv[5] && process.argv[5] !== '-' ? process.argv[5].split(',') : null;
const MERC = process.argv[6] || null; // 雇う傭兵（spear・archer・mage。省略すると雇わない） // 覚えるスキル3つ（省略すると最初の3つ）。例：pal_zeal,pal_might,pal_fire
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await pg.evaluate((c) => { localStorage.clear(); localStorage.setItem('wyd3-active-class', c); WYD.resetting = true; }, CLASS);
  await pg.reload();
  const t0 = Date.now(); const res = await pg.evaluate(([MINUTES, TRIAL_MINUTES, SKILLS, MERC]) => {
    const s = WYD.state, w = WYD.currentWorld;
    s.settings.speed = 0; // stop the live loop from advancing
    const score = (it) => it ? it.stats.reduce((a, l) => a + l.value * ({ attack: 4, defense: 2.5, maxHp: 0.4, hpRegen: 4, attackSpeed: 1.5, critChance: 1.5, moveSpeed: 0.3, skillDamage: 0.8 }[l.stat] || 0), 0) + (it.effects || []).length * 6 + (it.unique ? 30 : 0) : 0;
    const ids = SKILLS || Object.keys(WYD.data.skills); const order = [ids[0], ids[1], ids[2], ids[0], ids[1], ids[0], ids[2], ids[0]];
    let deaths = 0, wasDead = false, t = 0;
    const deathCauses = {};
    const events = [];
    const log = (m) => events.push(`${Math.round(t / 60)}分 Lv${s.player.level} ${m}`);
    const origLog = WYD.ui.log.bind(WYD.ui);
    WYD.ui.log = (m, c) => { if (/ボス|解放|ユニーク装備「/.test(m)) log(m); origLog(m, c); };
    const dt = 0.05, limit = MINUTES * 60; // ゲーム内の秒数
    let nextManage = 0, oi = 0;
    const manage = () => {
        // equip upgrades
        for (let i = s.inventory.length - 1; i >= 0; i--) {
          const it = s.inventory[i];
          if (score(it) > score(s.equipment[it.slot])) WYD.inventory.equip(s, i);
        }
        if (s.inventory.length > 20) WYD.inventory.discardRarities(s, ['normal', 'magic']);
        if (MERC && !s.mercenary.type) WYD.mercenary.hire(s, MERC);
        else if (MERC) WYD.mercenary.rankUp(s);
        for (let k = 0; k < 20 && s.player.skillPoints > 0; k++) { const id = order[oi % order.length]; oi++; if (s.player.skills[id] < 10) { if (s.player.skills[id] === 0) s.player.skillEnabled[id] = true; s.player.skills[id]++; s.player.skillPoints--; } }
    };
    while (t < limit) {
      WYD.world.update(w, s, dt);
      t += dt;
      if (w.player.dead && !wasDead) {
        deaths++; if (w.enemies.some(e => e.boss)) log('ボス戦で倒れた');
        // どこで・何の近くで倒れたか（いちばん近い敵の種類と、精鋭かどうか）
        const near = w.enemies.slice().sort((a, b) => WYD.util.dist(a, w.player) - WYD.util.dist(b, w.player))[0];
        const key = `${s.area}:${near ? near.kind + (near.elite ? '(精鋭)' : '') : '?'}`;
        deathCauses[key] = (deathCauses[key] || 0) + 1;
      }
      wasDead = w.player.dead;
      if (t >= nextManage) {
        nextManage += 10;
        manage();
        // move to newest area when unlocked
        const last = s.unlockedAreas[s.unlockedAreas.length - 1];
        if (s.area !== last) { s.area = last; s.bossProgress = 0; WYD.world.resetEnemies(w, s, false); log('次のエリアへ'); }
      }
    }
    // クリアしていれば、終わりのない試練を続ける（連続ON）
    let trial = null;
    if (TRIAL_MINUTES && s.cleared) {
      const end = t + TRIAL_MINUTES * 60;
      WYD.ui.log = (m, c) => { if (/試練 段階/.test(m)) log(m); origLog(m, c); };
      WYD.trial.start(w, s, 1);
      while (t < end) {
        WYD.world.update(w, s, dt);
        t += dt;
        if (t >= nextManage) { nextManage += 10; manage(); }
      }
      trial = s.trial;
    }
    return { events, deathCauses, lgems: s.lgems, trial, deaths, level: s.player.level, area: s.area, maxDiff: s.maxDifficulty, mats: s.materials,
      eq: Object.values(s.equipment).map(i => i.name + '(' + i.rarity + ')') };
  }, [MINUTES, TRIAL_MINUTES, SKILLS, MERC]);
  console.log(JSON.stringify(res, null, 1), 'secs', (Date.now()-t0)/1000);
  console.log('ERRORS', errs);
  await b.close();
})();
