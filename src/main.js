// ゲームのスタート地点。読み込み → 毎コマ更新・描画 → 定期的にセーブ。
window.WYD = window.WYD || {};

(function () {
  WYD.classes.apply();   // 今の職業の数値・スキル・セーブの場所を決める
  for (const src of WYD.data.player.preloadImages || []) WYD.render.getImage(src);
  const state = WYD.save.load();
  const lastSeen = state.lastSeen;
  const world = WYD.world.create();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = WYD.data.map.width;
  canvas.height = WYD.data.map.height;

  WYD.ui.init(state, world);
  WYD.results.init(world);
  WYD.arena.init();
  WYD.runeSkillsUI.init();
  WYD.sound.init();
  WYD.ui.log("ようこそ野営地へ。装備とスキルを整え、「戦場へ」から冒険に出よう。", "#ffd447");
  const cls = WYD.data.classes[WYD.classes.id];
  if (cls.desc) WYD.ui.log(`${cls.name}：${cls.desc}`, WYD.data.player.color);
  if (WYD.save.restoredFromBackup) WYD.ui.log("セーブが壊れていたので、前回の控えから読み込みました", "#ff8a2a");
  WYD.offline.apply(state, world, lastSeen);
  WYD.town.enter(world, state);   // 新規・再開とも安全な拠点から。保存したエリア・階は保つ。
  // 初めて遊ぶとき（前に遊んだ記録がないとき）だけ、遊び方を出す
  if (!state.seenHelp) {
    state.seenHelp = true;
    if (!lastSeen) {
      WYD.ui.showStory("intro");   // 短い説明（くわしくは「設定」→「遊び方」）
    }
  }

  // タブを裏にしている間は画面が止まるので、戻ってきたときに放置ぶんを渡す
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (WYD.arena && WYD.arena.opened) { hiddenAt = null; return; }
    if (document.hidden) {
      hiddenAt = Date.now();
      if (!WYD.resetting) WYD.save.write(state);
    } else if (hiddenAt) {
      WYD.offline.apply(state, world, hiddenAt);
      hiddenAt = null;
    }
  });

  let last = performance.now();
  function loop(now) {
    // タブを切り替えたあと等に一気に進みすぎないよう、1回の経過時間に上限をつける
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const steps = WYD.ui.paused || WYD.arena.opened ? 0 : state.settings.speed;   // 観戦中は冒険を止める
    const slow = steps ? WYD.world.timeScale(world, dt) : 1;   // ボスを倒した直後はゆっくり
    for (let i = 0; i < steps; i++) WYD.world.update(world, state, dt * slow);
    if (!WYD.arena.opened) WYD.render.draw(ctx, world, state);
    WYD.music.update(state, world);
    WYD.ui.frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 5秒ごと＆ページを閉じるときにセーブ
  setInterval(() => {
    if (!WYD.resetting) WYD.save.write(state);
  }, 5000);
  window.addEventListener("beforeunload", () => {
    if (!WYD.resetting) WYD.save.write(state);
  });

  // スマホでページを離れる場合も保存する（beforeunloadが発生しない環境向け）。
  window.addEventListener("pagehide", () => {
    if (!WYD.resetting) WYD.save.write(state);
  });

  WYD.state = state;
  WYD.currentWorld = world;
  WYD.runeSkillsUI.renderActive();
})();
