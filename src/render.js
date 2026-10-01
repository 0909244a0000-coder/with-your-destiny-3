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

  patterns: {},
  patternFor(ctx, img) {
    if (!this.patterns[img.src]) this.patterns[img.src] = ctx.createPattern(img, "repeat");
    return this.patterns[img.src];
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

    // 画面の揺れ：地面とキャラだけずらす（文字やバーはずらさない）
    const sh = WYD.fx.shakeOffset(w);
    ctx.save();
    ctx.translate(sh.x, sh.y);

    // 地面：絵があれば敷きつめる、なければ色でぬる
    const ground = this.getImage(area.groundImage);
    ctx.fillStyle = ground ? (this.patternFor(ctx, ground) || area.bgColor) : area.bgColor;
    ctx.fillRect(0, 0, map.width, map.height);
    if (ground) {
      ctx.fillStyle = `rgba(0,0,0,${map.groundDim})`;
      ctx.fillRect(0, 0, map.width, map.height);
    }
    // 地面の絵がないときだけ、草や石の飾りを描く
    for (const d of ground ? [] : this.decorations) {
      ctx.fillStyle = d.kind === "grass" ? area.grassColor : area.stoneColor;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of w.fields) this.drawField(ctx, f);
    for (const e of w.enemies) this.drawEnemy(ctx, e);
    this.drawPlayer(ctx, w.player);
    for (const b of w.projectiles) this.drawProjectile(ctx, b);
    this.drawLight(ctx, w.player);
    // 光るものと落ちている装備は、明かりの暗さの上に描く（暗がりでも見えるように）
    for (const drop of w.drops) this.drawDrop(ctx, drop);
    for (const ef of w.effects) this.drawEffect(ctx, ef);
    WYD.fx.draw(ctx, w);

    // ダメージの数字：出た瞬間にふくらんで、上にのぼりながら消える
    const T = WYD.data.fx.text;
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    for (const t of w.texts) {
      const k = t.time / T.life;
      const pop = 1 + (T.pop - 1) * Math.max(0, 1 - t.time / 0.12);
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      ctx.font = `bold ${Math.round((t.big ? T.critSize : T.size) * pop)}px sans-serif`;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

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

  // 明かり：主人公から離れるほど暗くする
  drawLight(ctx, p) {
    const map = WYD.data.map;
    const L = map.light;
    const g = ctx.createRadialGradient(p.x, p.y, L.inner, p.x, p.y, L.outer);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${L.darkness})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, map.width, map.height);
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

  // flash = true のときは白く光らせる（攻撃が当たったとき）
  drawCircleOrImage(ctx, x, y, r, color, imageSrc, flash) {
    const img = this.getImage(imageSrc);
    if (img) {
      const M = WYD.data.map;
      const size = r * M.spriteScale;
      // 足元の影（暗い地面でも絵が浮いて見えるように）
      ctx.fillStyle = `rgba(0,0,0,${M.spriteShadow})`;
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.38, size * 0.32, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      if (flash) ctx.filter = "brightness(2.2)";
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      ctx.filter = "none";
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  // 炎の陣：消える前にだんだん薄くなる円
  drawField(ctx, f) {
    ctx.fillStyle = f.color;
    ctx.globalAlpha = 0.25 * Math.min(1, f.timeLeft / (f.duration * 0.3));
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  // 敵の弾：光る玉
  drawProjectile(ctx, b) {
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
  },

  drawPlayer(ctx, p) {
    const P = WYD.data.player;
    if (p.haste) {
      ctx.strokeStyle = p.haste.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, P.radius + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (p.buff) {
      ctx.strokeStyle = p.buff.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, P.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    const img = this.getImage(P.image);
    if (img) {
      // 絵があるとき：足元に主人公の色の輪（どこにいるか分かるように）
      const size = P.radius * WYD.data.map.spriteScale;
      ctx.strokeStyle = P.color;
      ctx.globalAlpha = WYD.data.map.playerRing;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + size * 0.38, size * 0.38, size * 0.13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (p.dead && img) ctx.globalAlpha = 0.4;
    this.drawCircleOrImage(ctx, p.x, p.y, P.radius, p.dead ? "#555" : P.color, P.image);
    ctx.globalAlpha = 1;
    if (!img) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, P.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

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
    this.drawCircleOrImage(ctx, e.x, e.y, def.radius, e.hitFlash > 0 ? "#ffffff" : def.color, def.image, e.hitFlash > 0);

    // HPバー：絵があるときは絵の上に出す
    const top = this.getImage(def.image) ? def.radius * WYD.data.map.spriteScale / 2 : def.radius;
    const bw = def.radius * 2.2, bh = 4;
    const bx = e.x - bw / 2, by = e.y - top - 9;
    ctx.fillStyle = "#300";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#e33";
    ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), bh);

    if (e.stunTimer > 0) {
      // 縛られている敵：緑の縄
      ctx.strokeStyle = WYD.data.skills.nagapasha.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
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
      // ボスの名前は画面の上の大きなHPバーに出すので、頭の上には出さない
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
    // 良い装備は光の柱で知らせる（ディアブロの「ドロップの光」）
    const beam = WYD.data.fx.lootBeam[drop.item.rarity];
    if (beam) {
      const g = ctx.createLinearGradient(0, drop.y - beam, 0, drop.y);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, r.color);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.7 + 0.2 * Math.sin(drop.age * 6);
      ctx.fillStyle = g;
      ctx.fillRect(drop.x - 4, drop.y - beam, 8, beam);
      ctx.fillRect(drop.x - 1.5, drop.y - beam * 1.2, 3, beam * 1.2);
      ctx.restore();
    }
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
    if (ef.type === "shock") {
      // ボスの大技の衝撃：一気に広がる赤い円
      const t = ef.time / ef.duration;
      ctx.fillStyle = ef.color;
      ctx.globalAlpha = 0.35 * (1 - t);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.radius * (0.3 + 0.9 * t), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (ef.type === "chain") {
      // 投げ斧の通り道
      ctx.strokeStyle = ef.color;
      ctx.globalAlpha = 1 - ef.time / ef.duration;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ef.points[0].x, ef.points[0].y);
      for (const pt of ef.points.slice(1)) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      for (const pt of ef.points.slice(1)) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
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
      // 落ちたところが光る
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = ef.color;
      ctx.globalAlpha = 0.5 * (1 - t);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 26 * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  },
};
