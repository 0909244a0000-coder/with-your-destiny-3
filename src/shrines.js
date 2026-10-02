// 祠とパイロン（数値は data/shrines.js）。出す・主人公が触る・効果。
// 今の効果は w.player.shrine = { id, timeLeft }（エリアを変えても続く）
window.WYD = window.WYD || {};

WYD.shrines = {
  def(id) {
    return WYD.data.shrines.list.find((s) => s.id === id) || null;
  },

  // 今効いている祠の数値（なければ {}）
  mods() {
    const w = WYD.currentWorld;
    const sh = w && w.player && w.player.shrine;
    const d = sh && this.def(sh.id);
    return d ? d.mods : {};
  },

  // src/stats.js から：能力に祠の効果をかける
  apply(out) {
    const m = this.mods();
    if (m.attackMult) out.attack *= m.attackMult;
    if (m.attackSpeedMult) out.attackSpeed *= m.attackSpeedMult;
    if (m.moveSpeedMult) out.moveSpeed *= m.moveSpeedMult;
    if (m.defenseMult) out.defense *= m.defenseMult;
    if (m.regenPercent) out.hpRegen += out.maxHp * m.regenPercent / 100;
    if (m.magicFind) out.magicFind += m.magicFind;
    return out;
  },

  expMult() {
    return this.mods().expMult || 1;
  },

  update(w, state, stats, dt) {
    const D = WYD.data.shrines;
    const p = w.player;
    // 効いている祠
    if (p.shrine) {
      p.shrine.timeLeft -= dt;
      const c = this.mods().conduit;
      if (c && !p.dead) {
        p.shrine.zap = (p.shrine.zap || 0) - dt;
        if (p.shrine.zap <= 0) {
          p.shrine.zap = c.interval;
          const near = w.enemies.filter((e) => WYD.util.dist(p, e) <= c.range)
            .sort((a, b) => WYD.util.dist(p, a) - WYD.util.dist(p, b)).slice(0, c.targets);
          for (const e of near) {
            w.effects.push({ type: "bolt", x: e.x, y: e.y, color: this.def(p.shrine.id).color, time: 0, duration: 0.2 });
            WYD.world.playerHit(w, state, stats, e, stats.attack * c.mult);
          }
        }
      }
      if (p.shrine.timeLeft <= 0) p.shrine = null;
    }
    // 地面の祠
    if (w.shrine) {
      w.shrine.timeLeft -= dt;
      if (w.shrine.timeLeft <= 0) w.shrine = null;
      else if (!p.dead && WYD.util.dist(p, w.shrine) <= D.touchRadius) this.touch(w, state);
    }
    // 次の祠を出す
    if (w.shrineTimer == null) w.shrineTimer = D.firstDelay;
    w.shrineTimer -= dt;
    if (w.shrineTimer <= 0 && !w.shrine && !p.dead) {
      w.shrineTimer = WYD.util.rand(D.interval[0], D.interval[1]);
      this.spawn(w);
    }
  },

  spawn(w) {
    const D = WYD.data.shrines;
    const map = WYD.data.map;
    const p = w.player;
    const def = WYD.util.pickWeighted(D.list, (s) => s.weight);
    const ang = Math.random() * Math.PI * 2;
    const r = WYD.util.rand(D.spawnDistance[0], D.spawnDistance[1]);
    w.shrine = {
      id: def.id,
      x: WYD.util.clamp(p.x + Math.cos(ang) * r, 40, map.width - 40),
      y: WYD.util.clamp(p.y + Math.sin(ang) * r, 40, map.height - 40),
      timeLeft: D.lifetime,
    };
  },

  touch(w, state) {
    const def = this.def(w.shrine.id);
    w.player.shrine = { id: def.id, timeLeft: def.duration };
    w.effects.push({ type: "ring", x: w.shrine.x, y: w.shrine.y, radius: 60, color: def.color, time: 0, duration: 0.5 });
    WYD.fx.burst(w, w.shrine.x, w.shrine.y, WYD.data.fx.levelUp, def.color, { glow: true });
    WYD.ui.notice(`${def.name}：${def.desc}（${def.duration}秒）`, def.color);
    WYD.sound.play("achievement");
    WYD.records.add(state, "shrinesUsed");
    w.shrine = null;
  },

  // 主人公が先に祠へ向かうか（いちばん近い敵より、あまり遠くなければ）
  goal(w, target) {
    const s = w.shrine;
    if (!s) return null;
    if (!target) return s;
    return WYD.util.dist(w.player, s) < WYD.util.dist(w.player, target) + WYD.data.shrines.detour ? s : null;
  },

  draw(ctx, w) {
    const s = w.shrine;
    if (!s) return;
    const D = WYD.data.shrines;
    const def = this.def(s.id);
    const t = w.time || 0;
    const bob = Math.sin(t * 3) * 3;
    ctx.save();
    // 足元の光
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + D.radius * 0.8, D.radius * 1.8, D.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // ひし形の石
    ctx.fillStyle = def.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - D.radius * 1.6 + bob);
    ctx.lineTo(s.x + D.radius * 0.8, s.y + bob);
    ctx.lineTo(s.x, s.y + D.radius * 0.6 + bob);
    ctx.lineTo(s.x - D.radius * 0.8, s.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(def.name, s.x, s.y - D.radius * 2.1);
    ctx.restore();
  },

  // 主人公のまわりの光と、残り時間
  drawActive(ctx, w) {
    const p = w.player;
    if (!p.shrine || p.dead) return;
    const def = this.def(p.shrine.id);
    ctx.save();
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, WYD.data.player.radius + 16 + Math.sin((w.time || 0) * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = def.color;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${def.name} ${Math.ceil(p.shrine.timeLeft)}秒`, p.x, p.y + WYD.data.player.radius + 30);
    ctx.restore();
  },
};
