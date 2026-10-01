// マップの描画。絵（image）が用意されていればそれを、なければ丸や四角を描く。
window.WYD = window.WYD || {};

WYD.render = {
  images: {},
  decorations: null,

  getImage(src) {
    if (!src) return null;
    if (!this.images[src]) {
      const img = new Image();
      img.src = src;
      this.images[src] = img;
    }
    const img = this.images[src];
    return img.complete && img.naturalWidth > 0 ? img : null;
  },

  makeDecorations() {
    const map = WYD.data.map;
    const rnd = WYD.util.seededRandom(map.decorationSeed);
    const list = [];
    for (let i = 0; i < map.decorationCount; i++) {
      list.push({
        x: rnd() * map.width, y: rnd() * map.height,
        r: 3 + rnd() * 9, kind: rnd() < 0.7 ? "grass" : "stone",
      });
    }
    return list;
  },

  draw(ctx, w, state) {
    const map = WYD.data.map;
    const area = WYD.world.area(state);
    if (!this.decorations) this.decorations = this.makeDecorations();

    ctx.fillStyle = area.bgColor;
    ctx.fillRect(0, 0, map.width, map.height);
    for (const d of this.decorations) {
      ctx.fillStyle = d.kind === "grass" ? area.grassColor : area.stoneColor;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const drop of w.drops) this.drawDrop(ctx, drop);
    for (const e of w.enemies) this.drawEnemy(ctx, e);
    this.drawPlayer(ctx, w.player);
    for (const ef of w.effects) this.drawEffect(ctx, ef);

    ctx.textAlign = "center";
    ctx.font = "bold 14px sans-serif";
    for (const t of w.texts) {
      ctx.globalAlpha = 1 - t.time / 0.8;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // 左上：マップ名と危険度
    ctx.textAlign = "left";
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${area.name}　危険度 ${state.difficulty}`, 12, 24);
    this.drawBossBar(ctx, w);

    if (w.player.dead) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, map.width, map.height);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff8080";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("倒れてしまった…", map.width / 2, map.height / 2 - 10);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${Math.ceil(w.player.respawnTimer)} 秒後に復活`, map.width / 2, map.height / 2 + 24);
    }
  },

  // ボスがいるときは、画面の上にボスのHPを大きく出す
  drawBossBar(ctx, w) {
    const boss = w.enemies.find((e) => e.boss);
    if (!boss) return;
    const map = WYD.data.map;
    const def = WYD.data.enemies[boss.kind];
    const bw = map.width * 0.5, bh = 12;
    const bx = (map.width - bw) / 2, by = 40;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = "#5a0000";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = WYD.data.boss.nameColor;
    ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), bh);
    ctx.textAlign = "center";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(def.name, map.width / 2, by - 6);
  },

  drawCircleOrImage(ctx, x, y, r, color, imageSrc) {
    const img = this.getImage(imageSrc);
    if (img) {
      ctx.drawImage(img, x - r * 1.5, y - r * 1.5, r * 3, r * 3);
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  drawPlayer(ctx, p) {
    const P = WYD.data.player;
    if (p.buff) {
      ctx.strokeStyle = p.buff.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, P.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.drawCircleOrImage(ctx, p.x, p.y, P.radius, p.dead ? "#555" : P.color, P.image);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, P.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 攻撃の線
    if (p.swing > 0 && p.swingTarget) {
      ctx.strokeStyle = `rgba(255,255,255,${p.swing / 0.15})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.swingTarget.x, p.swingTarget.y);
      ctx.stroke();
    }
  },

  drawEnemy(ctx, e) {
    const def = WYD.data.enemies[e.kind];
    const E = WYD.data.elites;
    if (e.elite) {
      // 精鋭：業火の範囲と、青い輪
      if (e.elite.affixes.includes("burning")) {
        const burning = E.affixes.find((a) => a.id === "burning");
        ctx.fillStyle = burning.auraColor;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(e.x, e.y, burning.auraRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = E.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.drawCircleOrImage(ctx, e.x, e.y, def.radius, e.hitFlash > 0 ? "#ffffff" : def.color, def.image);

    const bw = def.radius * 2.2, bh = 4;
    const bx = e.x - bw / 2, by = e.y - def.radius - 9;
    ctx.fillStyle = "#300";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#e33";
    ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), bh);

    if (e.slamCharge != null) {
      // ボスの大技の予告：だんだん濃くなる赤い円
      const t = 1 - e.slamCharge / e.slamWindup;
      ctx.fillStyle = WYD.data.boss.warnColor;
      ctx.globalAlpha = 0.1 + 0.25 * t;
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.slam.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.boss) {
      ctx.textAlign = "center";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = WYD.data.boss.nameColor;
      ctx.fillText(def.name, e.x, by - 4);
    } else if (e.elite) {
      ctx.textAlign = "center";
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = E.color;
      ctx.fillText(e.name, e.x, by - 4);
    } else if (def.showName) {
      ctx.textAlign = "center";
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#e6c7ff";
      ctx.fillText(def.name, e.x, by - 4);
    }
  },

  drawDrop(ctx, drop) {
    const r = WYD.loot.rarityInfo(drop.item.rarity);
    const bounce = Math.max(0, 1 - drop.age * 3) * 10;
    ctx.save();
    ctx.translate(drop.x, drop.y - bounce);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = r.color;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.font = "12px sans-serif";
    ctx.fillStyle = r.color;
    ctx.fillText(drop.item.name, drop.x, drop.y - 14 - bounce);
  },

  drawEffect(ctx, ef) {
    if (ef.type === "ring") {
      const t = ef.time / ef.duration;
      ctx.strokeStyle = ef.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.radius * (0.4 + 0.6 * t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (ef.type === "bolt") {
      // 雷：上から落ちるギザギザの線
      const t = ef.time / ef.duration;
      ctx.strokeStyle = ef.color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ef.x + 6, ef.y - 70);
      ctx.lineTo(ef.x - 6, ef.y - 45);
      ctx.lineTo(ef.x + 5, ef.y - 35);
      ctx.lineTo(ef.x - 4, ef.y - 12);
      ctx.lineTo(ef.x, ef.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
};
