// 遠距離職の技と傀儡師の優先順位が、通常の自動発動で働くかを確かめる。
const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch();
  try {
    for (const cls of ['sorceress', 'necromancer', 'puppeteer']) {
      const page = await browser.newPage();
      await page.addInitScript(id => localStorage.setItem('wyd3-active-class', id), cls);
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      const out = await page.evaluate(() => {
        const W = WYD.world, state = WYD.save.newState(), w = W.create();
        WYD.currentWorld = w;
        w.time = 0;
        const stats = WYD.stats.compute(state), p = w.player;
        p.hp = stats.maxHp;
        for (const id of Object.keys(state.player.skills)) {
          state.player.skills[id] = 0;
          state.player.skillEnabled[id] = false;
        }
        const enable = (...ids) => ids.forEach(id => { state.player.skills[id] = 6; state.player.skillEnabled[id] = true; });
        const enemy = W.spawnEnemy(w, state, 'preta', { x: p.x + 180, y: p.y });
        enemy.hp = enemy.maxHp = 1e7;
        enemy.defense = 0;
        const cast = id => (W.tryUseSkills(w, state, stats), WYD.results.get(w).total.rows['skill:' + id]?.casts || 0);
        if (WYD.classes.id === 'sorceress') {
          enable('sorc_static');
          const before = enemy.hp, uses = cast('sorc_static');
          return { uses, hit: enemy.hp < before };
        }
        if (WYD.classes.id === 'necromancer') {
          const skel = { source: 'nec_raise', x: enemy.x - 20, y: enemy.y, hp: 100, maxHp: 100 };
          w.allies.push(skel);
          enable('nec_decay', 'nec_nova');
          const before = enemy.hp;
          W.tryUseSkills(w, state, stats);
          const rows = WYD.results.get(w).total.rows;
          return { decay: rows['skill:nec_decay']?.casts || 0, nova: rows['skill:nec_nova']?.casts || 0, hit: enemy.hp < before, remains: (w.necRemains || []).length };
        }
        WYD.puppeteer.spawn(w, stats, 0);
        const puppet = WYD.puppeteer.active(w);
        puppet.x = enemy.x - 20; puppet.y = enemy.y;
        puppet.hp = puppet.maxHp * 0.3;
        enable('pup_thread', 'pup_finale');
        const before = enemy.hp;
        W.tryUseSkills(w, state, stats);
        const rows = WYD.results.get(w).total.rows;
        return { finale: rows['skill:pup_finale']?.casts || 0, thread: rows['skill:pup_thread']?.casts || 0, hit: enemy.hp < before, time: w.time, respawnAt: w.puppetRespawnAt, puppetHp: puppet.hp };
      });
      if (cls === 'sorceress') assert(out.uses === 1 && out.hit, `静電気の場: ${JSON.stringify(out)}`);
      if (cls === 'necromancer') assert(out.decay === 1 && out.nova === 1 && out.hit && out.remains === 0, `骸骨を起点にした技: ${JSON.stringify(out)}`);
      if (cls === 'puppeteer') assert(out.finale === 1 && out.thread === 0 && out.hit, `終幕の優先順位: ${JSON.stringify(out)}`);
      await page.close();
    }
    console.log('skill utility OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
