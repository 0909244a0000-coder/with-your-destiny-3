// 拠点（野営地）：敵の出ない安全な場所（数値と文は data/town.js）。
// 入ると戦いを止めてHPを全快。出るともとのエリア・階にもどり、その階の敵が出直す。拠点にいるかどうかはセーブしない。
window.WYD = window.WYD || {};

WYD.town = {
  // 拠点に入る。入れたら true
  enter(w, state) {
    const T = WYD.data.town;
    if (w.town) return true;
    if (WYD.trial.active(state)) {
      WYD.ui.log(T.trialText, "#ff6b6b");
      return false;
    }
    w.town = true;
    w.enemies = [];
    WYD.bombs.clear(w);
    w.projectiles = [];
    w.hazards = [];
    w.pools = [];
    w.fields = [];
    w.traps = [];
    w.corpses = [];
    w.allies = [];
    w.breach = null;
    w.bossTimer = null;
    w.bossIntro = null;
    w.bossDefeat = null;
    const p = w.player;
    p.dead = false;
    p.hp = WYD.stats.compute(state).maxHp;
    p.x = T.playerPos.x;
    p.y = T.playerPos.y;
    p.form = null;
    WYD.ui.log(T.enterText, "#7dff8a");
    WYD.ui.markDirty();
    return true;
  },

  // 戦場へもどる（今のエリア・階のまま）
  leave(w, state) {
    if (!w.town) return;
    const map = WYD.data.map;
    w.town = false;
    WYD.world.resetEnemies(w, state, false);
    w.spawnTimer = 1.2;
    w.player.x = map.width / 2;
    w.player.y = map.height / 2;
    w.banner = { text: `${WYD.world.area(state).name}　${WYD.world.floorName(state)}`, time: 0 };
    WYD.ui.log(WYD.data.town.leaveText, "#c9b48a");
    WYD.ui.markDirty();
  },

  toggle(w, state) {
    if (w.town) this.leave(w, state);
    else this.enter(w, state);
  },

  // 拠点にいる間：戦いは止まり、HPは満タンのまま
  update(w, state, stats) {
    w.player.hp = stats.maxHp;
  },

  // 置き物の絵を、足もとが (x, y) より少し下になるように描く。描けたら true
  drawProp(ctx, P) {
    const img = WYD.render.getImage(P.image);
    if (!img) return false;
    ctx.drawImage(img, P.x - P.size / 2, P.y - P.size * 0.6, P.size, P.size);
    return true;
  },

  draw(ctx, w, state) {
    const T = WYD.data.town, map = WYD.data.map, R = WYD.render;
    const t = w.time || 0;
    // 地面
    ctx.fillStyle = T.ground;
    ctx.fillRect(0, 0, map.width, map.height);
    const img = R.getImage(T.groundImage);
    if (img) {
      ctx.fillStyle = R.patternFor(ctx, img);
      ctx.fillRect(0, 0, map.width, map.height);
      ctx.fillStyle = `rgba(0,0,0,${T.groundDim})`;
      ctx.fillRect(0, 0, map.width, map.height);
    }
    // たき火の明かり（ゆらゆら）
    const F = T.fire;
    const glow = F.glow * (1 + F.flicker * Math.sin(t * 7) * Math.sin(t * 3.1));
    const g = ctx.createRadialGradient(F.x, F.y, 0, F.x, F.y, glow);
    g.addColorStop(0, F.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, map.width, map.height);
    const N = T.tent, C = T.chest;
    // テント（絵があれば絵、なければ図形）
    if (!this.drawProp(ctx, N)) {
      ctx.fillStyle = N.color;
      ctx.strokeStyle = N.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(N.x, N.y - N.h / 2);
      ctx.lineTo(N.x + N.w / 2, N.y + N.h / 2);
      ctx.lineTo(N.x - N.w / 2, N.y + N.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#120d08";
      ctx.beginPath();
      ctx.moveTo(N.x, N.y - N.h * 0.05);
      ctx.lineTo(N.x + N.w * 0.14, N.y + N.h / 2);
      ctx.lineTo(N.x - N.w * 0.14, N.y + N.h / 2);
      ctx.closePath();
      ctx.fill();
    }
    // 倉庫の箱（絵があれば絵、なければ図形）
    if (!this.drawProp(ctx, C)) {
      ctx.fillStyle = C.color;
      ctx.strokeStyle = C.edge;
      ctx.fillRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h);
      ctx.strokeRect(C.x - C.w / 2, C.y - C.h / 2, C.w, C.h);
      ctx.beginPath();
      ctx.moveTo(C.x - C.w / 2, C.y - C.h * 0.1);
      ctx.lineTo(C.x + C.w / 2, C.y - C.h * 0.1);
      ctx.stroke();
    }
    // たき火（絵があれば絵、なければ図形）
    if (!this.drawProp(ctx, F)) {
      ctx.strokeStyle = "#3a2614";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(F.x - F.radius, F.y + 8);
      ctx.lineTo(F.x + F.radius, F.y - 2);
      ctx.moveTo(F.x - F.radius, F.y - 2);
      ctx.lineTo(F.x + F.radius, F.y + 8);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const h = F.radius * (1.1 + 0.25 * Math.sin(t * 9 + i * 2));
        ctx.fillStyle = ["#ff6a1a", "#ffa63a", "#ffe08a"][i];
        ctx.beginPath();
        ctx.ellipse(F.x + (i - 1) * 4, F.y - h * 0.35, F.radius * (0.55 - i * 0.13), h * (0.6 - i * 0.12), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineWidth = 1;
    // 主人公
    R.clock = t;
    R.drawPlayer(ctx, w.player);
    // 文字
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--serif") || "serif";
    const shown = ctx.canvas.clientWidth / map.width || 1;
    const font = Math.max(map.hud.font, Math.round(map.hud.minShownPx / shown));
    const hint = shown < map.hud.compactBelow ? T.compactHint : T.hint;
    ctx.textAlign = "left";
    ctx.font = `bold ${font}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${T.name}${T.label}`, map.hud.margin, font + map.hud.margin);
    ctx.textAlign = "center";
    ctx.font = `bold ${font}px ${serif}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(hint, map.width / 2, map.height - 70);
    ctx.fillStyle = "#e0c070";
    ctx.fillText(hint, map.width / 2, map.height - 70);
    ctx.lineWidth = 1;
  },
};
