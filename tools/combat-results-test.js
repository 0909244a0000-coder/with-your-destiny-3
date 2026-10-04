// リザルトの意味を検証する：過剰ダメージ・無効化・会心率・回復・期間・遅延した発生源。
// node tools/combat-results-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const exe = require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
  const browser = await chromium.launch(exe);
  try {
    const page = await browser.newPage();
    await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    await page.click('#modal-ok');
    const result = await page.evaluate(() => {
      WYD.ui.paused = true;
      const R = WYD.results, W = WYD.world, w = W.create(), s = WYD.state;
      const checks = [];
      const check = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
      const died = W.enemyDied;
      W.enemyDied = (world, state, enemy) => { world.enemies = world.enemies.filter((e) => e !== enemy); };
      const enemy = (hp, shielded = false) => ({ kind: 'preta', x: 400, y: 300, hp, maxHp: hp, defense: 0, shielded });
      try {
        R.tick(w, 1);
        const a = enemy(100); W.damageEnemy(w, s, a, 20, false, 'attack', true); W.damageEnemy(w, s, a, 20, true, 'attack', true);
        const over = enemy(5); W.damageEnemy(w, s, over, 100, false, 'effect:thunder', false);
        const blocked = enemy(100, true); W.damageEnemy(w, s, blocked, 100, true, 'attack', true);
        let r = R.snapshot(w, 'session');
        check(r.damage === 45 && r.rows['effect:thunder'].damage === 5, '敵HP超過を除く');
        check(r.hits === 3 && r.eligible === 2 && r.crits === 1 && R.crit(r) === '50.0%', '無効化と会心判定なしを分母から除く');
        w.player.hp = 98; W.healPlayer(w, 100, 20, 'regen');
        check(R.snapshot(w).healing === 2 && w.player.hp === 100, '実際に戻ったHPだけ集計');
        w.player.hp = 10; W.receiveDamage(w, 20);
        check(R.snapshot(w).taken === 10 && w.player.hp === -10, '致死ダメージの超過を除き、既存のHP計算を維持');
        R.get(w).recording = false; R.tick(w, 20); W.damageEnemy(w, s, a, 1, false);
        check(R.snapshot(w).elapsed === 1 && R.snapshot(w).damage === 45, '計測停止は時間と記録だけを止める');
        R.get(w).recording = true; w.town = true; R.tick(w, 20); w.town = false;
        check(R.snapshot(w).elapsed === 1, '拠点時間は除外');
        R.tick(w, WYD.data.results.recentSeconds + 1);
        check(R.snapshot(w, 'recent').damage === 0 && R.snapshot(w, 'session').damage === 45, '直近期間を過ぎた攻撃は全体にだけ残る');
        const hp = w.player.hp; R.reset(w);
        check(R.snapshot(w).damage === 0 && w.player.hp === hp, 'リセットは戦闘を変更しない');
        // 古い castingId に依存せず、地面の発生源を保持する。
        w.player.hp = 100; w.enemies = [enemy(100000)];
        w.fields = [{ source: 'skill:whirl', x: 400, y: 300, radius: 50, timeLeft: 2, tickTimer: 0, tick: 1, mult: 1 }];
        W.hitSkill = 'vajra'; W.castExtra = null;
        W.updateFields(w, s, WYD.stats.compute(s), 0.05);
        check(!!R.snapshot(w).rows['skill:whirl'] && !R.snapshot(w).rows['skill:vajra'], '持続ダメージを元のスキルへ集計');
        // 撃破で起こる二次爆発を、倒したスキルへ混ぜない。
        R.reset(w); const first = enemy(1), second = enemy(10000); w.enemies = [first, second];
        W.enemyDied = (world, state, e) => { world.enemies = world.enemies.filter((x) => x !== e); W.explode(world, state, WYD.stats.compute(state), e.x, e.y, 100, 1, '#fff', 'effect:killNova'); };
        W.damageEnemy(w, s, first, 2, false, 'skill:vajra', true);
        check(!!R.snapshot(w).rows['effect:killNova'] && R.snapshot(w).rows['skill:vajra'].damage === 1, '撃破時の二次効果を分離');
      } finally { W.enemyDied = died; W.hitSkill = null; W.castExtra = null; }
      // 長時間の計測でも直近イベントを増やし続けない。
      R.reset(w);
      for (let i = 0; i < 20000; i++) { R.tick(w, 0.05); R.add(w, 'attack', { damage: 1 }); }
      check(R.get(w).events.length <= WYD.data.results.compactAfter + WYD.data.results.recentSeconds / 0.05 + 2, '直近の記録メモリが期間に応じて制限される');
      return checks;
    });
    assert.equal(result.length, 11); console.log('ok', result.join(' / '));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
