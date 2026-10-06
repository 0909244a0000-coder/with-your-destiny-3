// 裂け目（数値は data/breach.js）。開く・異界の敵を出す・閉じて宝箱。今の裂け目は w.breach
window.WYD = window.WYD || {};

WYD.breach = {
  update(w, state, stats, dt) {
    const B = WYD.data.breach;
    const W = WYD.world;
    const b = w.breach;
    if (b) {
      // エリアや階が変わったら、裂け目はなくなる
      if (b.area !== state.area || b.floor !== state.floor || WYD.trial.active(state)) { w.breach = null; return; }
      b.timeLeft -= dt;
      if (b.timeLeft <= 0) return this.close(w, state);
      b.spawnTimer -= dt;
      const alive = w.enemies.filter((e) => e.breach).length;
      if (b.spawnTimer <= 0 && alive < B.maxAlive) {
        b.spawnTimer = B.spawnInterval;
        const pick = WYD.util.pickWeighted(W.area(state).enemies, (x) => x.weight);
        const ang = Math.random() * Math.PI * 2, r = Math.random() * B.radius;
        const map = WYD.data.map;
        const e = W.spawnEnemy(w, state, pick.kind, {
          x: WYD.util.clamp(b.x + Math.cos(ang) * r, 20, map.width - 20),
          y: WYD.util.clamp(b.y + Math.sin(ang) * r, 20, map.height - 20),
        });
        e.breach = true;
        e.maxHp = Math.max(1, Math.round(e.maxHp * B.hpMult));
        e.hp = e.maxHp;
        e.attack *= B.attackMult;
        e.imageFilter = [WYD.data.enemies[pick.kind].imageFilter, B.imageFilter].filter(Boolean).join(" ");
      }
      return;
    }
    // 次の裂け目
    if (WYD.trial.active(state) || W.isBossRoom(state) || w.player.dead) return;
    if (w.breachTimer == null) w.breachTimer = B.firstDelay;
    w.breachTimer -= dt;
    if (w.breachTimer <= 0) {
      w.breachTimer = WYD.util.rand(B.interval[0], B.interval[1]);
      this.open(w, state);
    }
  },

  open(w, state) {
    const B = WYD.data.breach;
    const map = WYD.data.map;
    const p = w.player;
    const ang = Math.random() * Math.PI * 2, r = WYD.util.rand(B.spawnDistance[0], B.spawnDistance[1]);
    w.breach = {
      x: WYD.util.clamp(p.x + Math.cos(ang) * r, 60, map.width - 60),
      y: WYD.util.clamp(p.y + Math.sin(ang) * r, 60, map.height - 60),
      timeLeft: B.duration, spawnTimer: 0, kills: 0, area: state.area, floor: state.floor,
    };
    WYD.ui.notice(`裂け目が開いた！ ${B.duration}秒間、異界の敵があふれ出す`, B.color);
    WYD.sound.play("bossAppear");
  },

  // 異界の敵を倒したとき（src/world.js の enemyDied）
  onKill(w, state, e) {
    if (!e.breach || !w.breach) return;
    const B = WYD.data.breach;
    w.breach.kills++;
    if (Math.random() < B.extraDropChance) {
      this.drop(w, state, WYD.loot.create(state, WYD.world.itemLevel(state), 1), e.x, e.y);
    }
  },

  // 装備を落とす（自動分解・戦利品フィルターの決まりに合うものはその場で素材に）
  drop(w, state, item, x, y) {
    if (WYD.inventory.shouldAutoSalvage(state, item)) {
      WYD.inventory.salvage(state, item);
      return;
    }
    w.drops.push({ x, y, item, age: 0 });
  },

  expMult(e) {
    return e.breach ? WYD.data.breach.expMult : 1;
  },

  close(w, state) {
    const B = WYD.data.breach;
    const C = B.chest;
    const b = w.breach;
    w.breach = null;
    // 残った異界の敵は消える
    for (const e of w.enemies.filter((x) => x.breach)) {
      w.effects.push({ type: "ring", x: e.x, y: e.y, radius: 20, color: B.color, time: 0, duration: 0.3 });
    }
    w.enemies = w.enemies.filter((x) => !x.breach);
    // 宝箱
    const n = Math.min(C.max, C.base + Math.floor(b.kills / C.perKills));
    for (let i = 0; i < n; i++) {
      this.drop(w, state, WYD.loot.create(state, WYD.world.itemLevel(state), C.rarityBonus), b.x + WYD.util.rand(-30, 30), b.y + WYD.util.rand(-30, 30));
    }
    const mats = b.kills * C.materialsPerKill;
    state.materials += mats;
    w.effects.push({ type: "ring", x: b.x, y: b.y, radius: B.radius, color: B.color, time: 0, duration: 0.6 });
    WYD.fx.burst(w, b.x, b.y, WYD.data.fx.levelUp, B.color, { glow: true });
    WYD.ui.notice(`裂け目が閉じた！ ${b.kills}体倒した：装備${n}個・${WYD.data.crafting.materialName} +${mats}`, B.color);
    WYD.sound.play("uniqueDrop");
    WYD.records.add(state, "breaches");
    WYD.ui.markDirty();
  },

  draw(ctx, w) {
    const b = w.breach;
    if (!b) return;
    const B = WYD.data.breach;
    const t = w.time || 0;
    ctx.save();
    // 広がる紫の円
    const grow = Math.min(1, (B.duration - b.timeLeft) / 1.5);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = B.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, B.radius * grow, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5);
    ctx.strokeStyle = B.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(b.x, b.y, B.radius * grow, t * 0.5, t * 0.5 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // 真ん中の裂け目と残り時間
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1a0a2a";
    ctx.strokeStyle = B.color;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, 10, 26 + Math.sin(t * 6) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = B.color;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`裂け目 ${Math.ceil(b.timeLeft)}秒・${b.kills}体`, b.x, b.y - 36);
    ctx.restore();
  },
};
