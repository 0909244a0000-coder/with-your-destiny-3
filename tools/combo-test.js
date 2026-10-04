// 組み合わせテスト：3職業 × 季節 × 遊び方（ふつう・ボス・試練・日替わり・地図・双王）を60秒ずつ動かし、エラーを探す
// 使い方：node tools/combo-test.js
const { chromium } = require('playwright');
// このクラウド環境では入っているブラウザを使う。ほかの環境（Codex など）では Playwright の標準のブラウザ
const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
(async () => {
  const b = await chromium.launch(exe);
  const pg = await b.newPage();
  const errs = new Map(); pg.on('pageerror', e => { const k = e.message + ' @ ' + (e.stack || '').split('\n')[1]; errs.set(k, (errs.get(k) || 0) + 1); });
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  for (const cls of ['barbarian', 'sorceress', 'necromancer', 'paladin', 'assassin', 'druid']) {
    await pg.evaluate((c) => { localStorage.clear(); localStorage.setItem('wyd3-active-class', c); WYD.resetting = true; }, cls);
    await pg.reload(); await pg.click('#modal-ok');
    const r = await pg.evaluate(() => {
      const s = WYD.state, w = WYD.currentWorld;
      WYD.town.leave(w, s); // 拠点スタートから戦場へ出て測る
      const out = [];
      s.settings.speed = 0; s.player.level = 40; s.cleared = true; s.unlockedAreas = WYD.data.areas.map(a => a.id); s.trial.best = 4; s.difficulty = 3; s.maxDifficulty = 3;
      for (const id in WYD.data.skills) { s.player.skills[id] = 6; } const ids = Object.keys(WYD.data.skills); ids.forEach((id, i) => s.player.skillEnabled[id] = i < 3);
      for (const id of ids) { const l = WYD.runes.list(id); if (l.length) s.player.runes[id] = l[Math.floor(Math.random() * l.length)].id; }
      const modes = ['normal', 'boss', 'trial', 'daily', 'map', 'uber'];
      for (const season of WYD.data.seasons.list.map(x => x.id)) {
        s.settings.season = season;
        for (const mode of modes) {
          if (s.trialRun) WYD.trial.stop(w, s);
          s.area = WYD.util.pick(s.unlockedAreas); s.floor = 1;
          if (mode === 'boss') { s.floor = 4; WYD.world.resetEnemies(w, s, false); }
          if (mode === 'trial') WYD.trial.start(w, s, 3);
          if (mode === 'daily') { s.daily.lastDone = null; WYD.daily.start(w, s); }
          if (mode === 'map') { s.maps = [WYD.maps.create(3, 'rare')]; WYD.maps.use(w, s, 0); }
          if (mode === 'uber') { s.uber.keys = 3; WYD.uber.start(w, s); }
          for (let i = 0; i < 1200; i++) WYD.world.update(w, s, 0.05);
          if (!isFinite(w.player.hp)) out.push(season + '/' + mode + ' hp NaN');
        }
      }
      return out;
    });
    console.log(cls, r.length ? r : 'ok');
  }
  console.log('errors', errs.size); for (const [k, n] of errs) console.log(n, 'x', k);
  await b.close();
})();
