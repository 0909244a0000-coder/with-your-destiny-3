// バランス確認用：新しいセーブから自動で遊ばせて、ボスを倒した時間や倒れた回数を出す。
// 使い方：  node tools/balance-sim.js [遊ばせる分数（省略すると15）] [職業（省略するとバーバリアン）]
// 必要なもの：Node.js と Playwright（npm i playwright）。ゲームの数値は変えない（ブラウザの中だけで動く）。
const path = require('path');
const { chromium } = require('playwright');
const MINUTES = Number(process.argv[2]) || 15;
const CLASS = process.argv[3] || 'barbarian';
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await pg.evaluate((c) => { localStorage.clear(); localStorage.setItem('wyd3-active-class', c); WYD.resetting = true; }, CLASS);
  await pg.reload();
  const t0 = Date.now(); const res = await pg.evaluate((MINUTES) => {
    const s = WYD.state, w = WYD.currentWorld;
    s.settings.speed = 0; // stop the live loop from advancing
    const score = (it) => it ? it.stats.reduce((a, l) => a + l.value * ({ attack: 4, defense: 2.5, maxHp: 0.4, hpRegen: 4, attackSpeed: 1.5, critChance: 1.5, moveSpeed: 0.3, skillDamage: 0.8 }[l.stat] || 0), 0) + (it.effects || []).length * 6 + (it.unique ? 30 : 0) : 0;
    const ids = Object.keys(WYD.data.skills); const order = [ids[0], ids[1], ids[2], ids[0], ids[1], ids[0], ids[2], ids[0]];
    let deaths = 0, wasDead = false, t = 0;
    const events = [];
    const log = (m) => events.push(`${Math.round(t / 60)}分 Lv${s.player.level} ${m}`);
    const origLog = WYD.ui.log.bind(WYD.ui);
    WYD.ui.log = (m, c) => { if (/ボス|解放|ユニーク装備「/.test(m)) log(m); origLog(m, c); };
    const dt = 0.05, limit = MINUTES * 60; // ゲーム内の秒数
    let nextManage = 0, oi = 0;
    while (t < limit) {
      WYD.world.update(w, s, dt);
      t += dt;
      if (w.player.dead && !wasDead) { deaths++; if (w.enemies.some(e => e.boss)) log('ボス戦で倒れた'); }
      wasDead = w.player.dead;
      if (t >= nextManage) {
        nextManage += 10;
        // equip upgrades
        for (let i = s.inventory.length - 1; i >= 0; i--) {
          const it = s.inventory[i];
          if (score(it) > score(s.equipment[it.slot])) WYD.inventory.equip(s, i);
        }
        if (s.inventory.length > 20) WYD.inventory.discardRarities(s, ['normal', 'magic']);
        for (let k = 0; k < 20 && s.player.skillPoints > 0; k++) { const id = order[oi % order.length]; oi++; if (s.player.skills[id] < 10) { if (s.player.skills[id] === 0) s.player.skillEnabled[id] = true; s.player.skills[id]++; s.player.skillPoints--; } }
        // move to newest area when unlocked
        const last = s.unlockedAreas[s.unlockedAreas.length - 1];
        if (s.area !== last) { s.area = last; s.bossProgress = 0; WYD.world.resetEnemies(w, s, false); log('次のエリアへ'); }
      }
    }
    return { events, deaths, level: s.player.level, area: s.area, maxDiff: s.maxDifficulty, mats: s.materials,
      eq: Object.values(s.equipment).map(i => i.name + '(' + i.rarity + ')') };
  }, MINUTES);
  console.log(JSON.stringify(res, null, 1), 'secs', (Date.now()-t0)/1000);
  console.log('ERRORS', errs);
  await b.close();
})();
