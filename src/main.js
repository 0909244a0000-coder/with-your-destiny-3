// ゲームのスタート地点。読み込み → 毎コマ更新・描画 → 定期的にセーブ。
window.WYD = window.WYD || {};

(function () {
  WYD.classes.apply();   // 今の職業の数値・スキル・セーブの場所を決める
  const state = WYD.save.load();
  const lastSeen = state.lastSeen;
  const world = WYD.world.create();
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = WYD.data.map.width;
  canvas.height = WYD.data.map.height;

  WYD.ui.init(state, world);
  WYD.sound.init();
  WYD.ui.log("ようこそ。戦いは自動で進みます。装備とスキルを選んで強くなろう。", "#ffd447");
  if (WYD.save.restoredFromBackup) WYD.ui.log("セーブが壊れていたので、前回の控えから読み込みました", "#ff8a2a");
  WYD.offline.apply(state, world, lastSeen);
  // 初めて遊ぶとき（前に遊んだ記録がないとき）だけ、遊び方を出す
  if (!state.seenHelp) {
    state.seenHelp = true;
    if (!lastSeen) {
      WYD.ui.showStory("help");
      const intro = WYD.data.story.areaIntro[state.area];
      if (intro) WYD.ui.log(intro, "#c9b48a");
    }
  }

  // タブを裏にしている間は画面が止まるので、戻ってきたときに放置ぶんを渡す
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = Date.now();
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
    const steps = WYD.ui.paused ? 0 : state.settings.speed;   // 一時停止中は進めない
    for (let i = 0; i < steps; i++) WYD.world.update(world, state, dt);
    WYD.render.draw(ctx, world, state);
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

  WYD.state = state;
  WYD.currentWorld = world;
})();
