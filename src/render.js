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
  rims: {},
  // 絵のふちを光らせた絵を作って取っておく（同じ絵と色なら使い回す）
  rimImage(img, src, color) {
    const key = src + "|" + color;
    if (!this.rims[key]) {
      const pad = Math.ceil(img.width * WYD.data.map.rim.blur * 2);
      const c = document.createElement("canvas");
      c.width = img.width + pad * 2;
      c.height = img.height + pad * 2;
      const g = c.getContext("2d");
      g.shadowColor = color;
      g.shadowBlur = img.width * WYD.data.map.rim.blur;
      g.drawImage(img, pad, pad);
      this.rims[key] = { canvas: c, pad };
    }
    return this.rims[key];
  },
  unitLabels: [],   // 精鋭などの名前（drawEnemy でためて、drawUnitLabels でまとめて書く）
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
    if (w.town) {
      // 拠点（野営地）：敵のいない画面。知らせ・スキルの並びは出す
      WYD.town.draw(ctx, w, state);
      this.drawSkillBar(ctx, w, state);
      this.drawNotices(ctx, w);
      return;
    }
    const map = WYD.data.map;
    const area = WYD.world.area(state);
    if (!this.decorations) this.decorations = this.makeDecorations();

    // 画面の揺れ：地面とキャラだけずらす（文字やバーはずらさない）
    const sh = WYD.fx.shakeOffset(w);
    ctx.save();
    const shakeScale = state.settings.quietFx ? WYD.data.fx.quiet.shakeScale : 1;
    ctx.translate(sh.x * shakeScale, sh.y * shakeScale);

    const scene = this.getImage(area.sceneImage);
    // 完成した景色は一枚で表示。読み込み中・画像欠損時は従来の地面に戻す。
    const ground = scene ? null : this.getImage(area.groundImage);
    ctx.fillStyle = ground ? (this.patternFor(ctx, ground) || area.bgColor) : area.bgColor;
    ctx.fillRect(0, 0, map.width, map.height);
    if (scene) this.drawScene(ctx, scene, state);
    if (ground || scene) {
      ctx.fillStyle = `rgba(0,0,0,${scene ? map.scene.dim : map.groundDim})`;
      ctx.fillRect(0, 0, map.width, map.height);
      if (area.groundTint) {
        ctx.fillStyle = area.groundTint;   // 仮の地面の色
        ctx.fillRect(0, 0, map.width, map.height);
      }
    }
    // 地面の絵がないときだけ、草や石の飾りを描く
    for (const d of ground || scene ? [] : this.decorations) {
      ctx.fillStyle = d.kind === "grass" ? area.grassColor : area.stoneColor;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 明かり：地面はしっかり暗くし、キャラは下でうすく暗くする（遠くの敵も見分けられるように）
    this.drawLight(ctx, w.player, state, scene ? "scene" : "ground");
    for (const f of w.fields) this.drawField(ctx, f);
    for (const h of w.hazards || []) this.drawHazard(ctx, h);
    for (const pool of w.pools || []) {
      // 毒の沼
      ctx.globalAlpha = 0.3 * Math.min(1, pool.timeLeft / 0.5);
      ctx.fillStyle = pool.color;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const e of w.enemies) {
      // 突進の予告の線
      const c = e.charging;
      if (!c || c.phase !== "windup") continue;
      ctx.strokeStyle = c.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = c.width * 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.from.x, c.from.y);
      ctx.lineTo(c.to.x, c.to.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = "butt";
    }
    this.clock = w.time || 0;
    this.playerPos = w.player;
    // 奥（画面の上）にいるものから描く（手前のキャラが奥のキャラにかぶさるように）
    WYD.breach.draw(ctx, w);   // 裂け目は敵の下に
    WYD.traps.draw(ctx, w);
    WYD.classSpecialization.draw(ctx, w);
    // 倒れた敵：横にたおれながら沈んで消える
    const CO = WYD.data.fx.corpse;
    for (const c of w.corpses || []) {
      const k = Math.min(1, c.time / CO.time);
      ctx.globalAlpha = 1 - k;
      const size = c.r * WYD.data.map.spriteScale;
      this.drawCircleOrImage(ctx, c.x, c.y, c.r, "#000", c.image, false,
        { dx: 0, dy: size * CO.sink * k, sx: 1, sy: 1 - 0.3 * k, rot: -CO.tilt * Math.min(1, k * 2.5), flip: c.flip }, c.filter);
    }
    ctx.globalAlpha = 1;
    this.unitLabels = [];
    for (const e of w.enemies.slice().sort((a, b) => a.y - b.y)) this.drawEnemy(ctx, e);
    WYD.shrines.draw(ctx, w);
    WYD.allies.draw(ctx, w);
    this.drawPlayer(ctx, w.player);
    this.drawPlayerBar(ctx, w.player, state);
    WYD.runeSkills.draw(ctx, w);
    WYD.shrines.drawActive(ctx, w);
    for (const b of w.projectiles) this.drawProjectile(ctx, b);
    const R = WYD.data.player.rangedAttack;
    if (R) for (const b of w.bolts) {
      // 火の玉の絵があれば、飛ぶ向きに回して描く
      const fb = WYD.vfx.img(R.texture || "fireball");
      if (fb) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.ty - b.y, b.tx - b.x));
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(fb, -R.size * 4, -R.size * 2, R.size * 8, R.size * 4);
        ctx.restore();
      } else {
        this.drawProjectile(ctx, { x: b.x, y: b.y, size: R.size, color: R.color });
      }
    }
    this.drawLight(ctx, w.player, state, WYD.data.map.light.unitDarkness);
    // 光るものと落ちている装備は、明かりの暗さの上に描く（暗がりでも見えるように）
    for (const drop of w.drops) this.drawDrop(ctx, drop);
    for (const ef of w.effects) this.drawEffect(ctx, ef);
    WYD.bombs.draw(ctx, w);
    WYD.fx.draw(ctx, w);
    // 名前は火花より手前に描き、光の中でも読めるようにする。
    this.drawDropLabels(ctx, w.drops);
    this.drawUnitLabels(ctx);

    // ダメージの数字：出た瞬間にふくらんで、上にのぼりながら消える
    const T = WYD.data.fx.text;
    // スマホなどで画面が縮んで見えるときは、そのぶん大きく描く
    const shown = ctx.canvas.clientWidth / WYD.data.map.width || 1;
    const tScale = Math.max(1, T.minShownPx / (T.size * shown));
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    for (const t of w.texts) {
      const k = t.time / T.life;
      const pop = 1 + (T.pop - 1) * Math.max(0, 1 - t.time / 0.12);
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      ctx.font = `bold ${Math.round((t.big ? T.critSize : T.size) * pop * tScale)}px sans-serif`;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    this.drawBossIntro(ctx, w);   // 上の文字やボスの体力の棒より下に描く
    this.drawBossDefeat(ctx, w, state);

    // 左上：マップ名と危険度
    const H = WYD.data.map.hud;
    const hudSize = Math.max(H.font, Math.round(H.minShownPx / shown));
    const compact = shown < H.compactBelow;
    const hx = compact ? WYD.data.map.width - H.margin : H.margin;
    const hy = compact ? WYD.data.map.height - H.margin : 8 + hudSize;
    ctx.textAlign = compact ? "right" : "left";
    ctx.font = `bold ${hudSize}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const hudText = `${area.name}　${WYD.world.floorName(state)}${WYD.trial.active(state) ? "" : `　危険度 ${state.difficulty}`}`;
    ctx.strokeText(hudText, hx, hy);
    ctx.fillText(hudText, hx, hy);
    this.drawBossBar(ctx, w);
    this.drawSkillBar(ctx, w, state);
    WYD.trial.draw(ctx, w, state);
    this.drawNotices(ctx, w);
    if (WYD.ui.paused) {
      // 一時停止中の表示
      const map = WYD.data.map;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, map.width, map.height);
      ctx.textAlign = "center";
      ctx.font = "bold 28px serif";
      ctx.fillStyle = "#e8d8a8";
      ctx.fillText("一時停止中（スペースで再開）", map.width / 2, map.height / 2);
    }
    this.drawBanner(ctx, w);

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
      // 何にやられたかと、次にためすこと
      const D = WYD.data.story.death;
      if (w.deathBy) {
        ctx.fillStyle = "#ffb0b0";
        ctx.fillText(`原因：${w.deathBy}`, map.width / 2, map.height / 2 + 56);
      }
      if (w.deathHint) {
        ctx.font = "15px sans-serif";
        ctx.fillStyle = D.hintColor;
        ctx.fillText(w.deathHint, map.width / 2, map.height / 2 + 84);
      }
    }
  },

  // 階を移ったとき：暗転から明るくなり、真ん中に階の名前を出す
  // ボスを倒したとき：白い光が消えていき、「討伐」と名前を出す
  drawBossDefeat(ctx, w, state) {
    const b = w.bossDefeat;
    if (!b) return;
    const D = WYD.data.boss.defeat;
    const map = WYD.data.map;
    if (b.time < D.flash) {
      ctx.fillStyle = `rgba(255,250,230,${0.6 * (1 - b.time / D.flash) * (state.settings.quietFx ? WYD.data.fx.quiet.flashScale : 1)})`;
      ctx.fillRect(0, 0, map.width, map.height);
    }
    const k = Math.min(1, b.time / 0.25, (D.time - b.time) / 0.6);
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--serif") || "serif";
    const y = map.height * 0.4;
    ctx.globalAlpha = Math.max(0, k);
    ctx.textAlign = "center";
    const size = Math.round(D.font * (1 + 0.4 * Math.max(0, 1 - b.time / 0.25)));
    ctx.font = `bold ${size}px ${serif}`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(D.label, map.width / 2, y);
    ctx.shadowColor = D.labelColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = D.labelColor;
    ctx.fillText(D.label, map.width / 2, y);
    ctx.shadowBlur = 0;
    ctx.font = `bold 20px ${serif}`;
    ctx.lineWidth = 4;
    ctx.strokeText(b.name, map.width / 2, y + 34);
    ctx.fillStyle = WYD.data.boss.nameColor;
    ctx.fillText(b.name, map.width / 2, y + 34);
    ctx.globalAlpha = 1;
  },

  // ボスが出たとき：上下の黒い帯がすべりこみ、名前を大きく出す
  drawBossIntro(ctx, w) {
    const b = w.bossIntro;
    if (!b) return;
    const I = WYD.data.boss.intro;
    const map = WYD.data.map;
    const fadeIn = Math.min(1, b.time / 0.35), fadeOut = Math.min(1, (I.time - b.time) / 0.5);
    const k = Math.min(fadeIn, fadeOut);
    const bar = map.height * I.bar * k;
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, map.width, bar);
    ctx.fillRect(0, map.height - bar, map.width, bar);
    const serif = getComputedStyle(document.documentElement).getPropertyValue("--serif") || "serif";
    const y = map.height * 0.42;
    ctx.globalAlpha = k;
    ctx.textAlign = "center";
    ctx.font = `bold 16px ${serif}`;
    ctx.fillStyle = I.labelColor;
    ctx.fillText(I.label, map.width / 2, y - I.font * 0.9);
    // 名前：少し大きく出てから元の大きさへ
    const size = Math.round(I.font * (1 + 0.25 * Math.max(0, 1 - b.time / 0.35)));
    ctx.font = `bold ${size}px ${serif}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(b.name, map.width / 2, y);
    ctx.shadowColor = WYD.data.boss.nameColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = WYD.data.boss.nameColor;
    ctx.fillText(b.name, map.width / 2, y);
    ctx.shadowBlur = 0;
    // 名前の下の線
    const half = 160 * Math.min(1, b.time / 0.6);
    ctx.fillStyle = I.labelColor;
    ctx.fillRect(map.width / 2 - half, y + 14, half * 2, 2);
    ctx.globalAlpha = 1;
  },

  drawBanner(ctx, w) {
    const b = w.banner;
    if (!b || w.bossIntro) return;   // ボスの演出と重ねない
    const map = WYD.data.map;
    if (b.time < 0.6) {
      ctx.fillStyle = `rgba(0,0,0,${1 - b.time / 0.6})`;
      ctx.fillRect(0, 0, map.width, map.height);
    }
    ctx.globalAlpha = Math.min(1, b.time / 0.3, (2.5 - b.time) / 0.6);
    ctx.textAlign = "center";
    ctx.font = `bold 30px ${getComputedStyle(document.documentElement).getPropertyValue("--serif") || "serif"}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(b.text, map.width / 2, map.height * 0.3);
    ctx.fillStyle = "#e0c070";
    ctx.fillText(b.text, map.width / 2, map.height * 0.3);
    ctx.globalAlpha = 1;
  },

  // 明かり：主人公から離れるほど暗くする
  // mult：暗さにかける割合（キャラの上は light.unitDarkness）。"ground" は地面用で、
  // あとでキャラの上にかける暗さと重ねたときに、地面がもとの暗さになるようにする
  drawLight(ctx, p, state, mult) {
    const map = WYD.data.map;
    const L = map.light;
    const full = Math.min(L.maxDarkness, L.darkness + L.darknessPerFloor * ((state.floor || 1) - 1));
    const unit = L.unitDarkness * full;
    const ground = mult === "ground" || mult === "scene";
    const dark = ground ? (1 - (1 - full) / (1 - unit)) * (mult === "scene" ? map.scene.lightScale : 1) : mult * full;
    const g = ctx.createRadialGradient(p.x, p.y, L.inner, p.x, p.y, L.outer);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${dark})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, map.width, map.height);
  },

  // 比率を保って一枚の景色を画面いっぱいに表示。切り取りは階ごとに固定で、戦闘乱数は使わない。
  drawScene(ctx, img, state) {
    const map = WYD.data.map;
    const views = map.scene.views;
    const floor = WYD.trial.active(state) ? 1 : (state.floor || 1);
    const view = views[Math.max(0, Math.min(views.length - 1, floor - 1))];
    const scale = Math.max(map.width / img.width, map.height / img.height) * view.zoom;
    const sw = map.width / scale, sh = map.height / scale;
    ctx.drawImage(img, (img.width - sw) * view.x, (img.height - sh) * view.y,
      sw, sh, 0, 0, map.width, map.height);
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
    ctx.fillStyle = boss.enraged ? WYD.data.boss.enrage.color : WYD.data.boss.nameColor;
    ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), bh);
    // 怒りになるHPの位置に印
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx + bw * WYD.data.boss.enrage.hpRatio - 1, by, 2, bh);
    ctx.textAlign = "center";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(boss.enraged ? `${def.name}（怒り）` : def.name, map.width / 2, by - 6);
  },

  // 1枚の絵の動き（呼吸・歩くはずみ・攻撃の踏み込み・ボスの溜め）を計算する
  // o = 主人公か敵、target = 攻撃の相手（踏み込む向き）、t = 時計
  pose(o, target, t) {
    const A = WYD.data.anim;
    const seed = (o.id || 0) * 1.7;   // 敵ごとに動きのタイミングをずらす
    const pose = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, flip: A.faceTarget ? (o.face || 1) : 1 };
    if (o.moving) {
      const ph = t * A.walk.speed + seed;
      pose.dy -= Math.abs(Math.sin(ph)) * A.walk.bob;
      pose.rot += Math.sin(ph) * A.walk.tilt;
    } else {
      const b = Math.sin(t * A.breath.speed + seed) * A.breath.amount;
      pose.sy += b;
      pose.sx -= b * 0.5;
    }
    if (o.atkAnim > 0 && target) {
      const k = Math.sin((1 - o.atkAnim / A.attack.time) * Math.PI);   // 0 → 1 → 0
      const d = Math.hypot(target.x - o.x, target.y - o.y) || 1;
      pose.dx += (target.x - o.x) / d * A.attack.lunge * k;
      pose.dy += (target.y - o.y) / d * A.attack.lunge * k;
      pose.rot += (target.x >= o.x ? 1 : -1) * A.attack.tilt * k;
    }
    if (o.hitFlash > 0 && target) {
      const d = Math.hypot(o.x - target.x, o.y - target.y) || 1;
      pose.dx += (o.x - target.x) / d * A.hitKnock;
      pose.dy += (o.y - target.y) / d * A.hitKnock;
    }
    if (o.boss) {
      const B = A.boss;
      pose.rot += Math.sin(t * 1.3) * B.idleSway;
      if (o.slamCharge != null) {
        const k = 1 - o.slamCharge / o.slamWindup;
        pose.sx *= 1 + B.windupGrow * k;
        pose.sy *= 1 + B.windupGrow * k;
        pose.dx += WYD.util.rand(-1, 1) * B.windupShake * k;
        pose.dy += WYD.util.rand(-1, 1) * B.windupShake * k - 8 * k;
      }
      if (o.slamAfter > 0) {
        const k = o.slamAfter / 0.3;
        pose.sx *= 1 + B.slamSquash * k;
        pose.sy *= 1 - B.slamSquash * k;
      }
    }
    return pose;
  },

  // ポーズ違いの絵を選ぶ（大技の溜め → 攻撃 → ふだんの絵の順。届いていない絵はとばす）
  poseImage(o, def) {
    const poses = def.poses || {};
    if (o.slamCharge != null && this.getImage(poses.windup)) return poses.windup;
    if ((o.atkAnim > 0 || o.slamAfter > 0) && this.getImage(poses.attack)) return poses.attack;
    return def.image;
  },

  // flash = true のときは白く光らせる（攻撃が当たったとき）、pose = 絵の動き
  // filter = 絵の色を変える（仮の絵に使う。例 "grayscale(1)"）
  drawCircleOrImage(ctx, x, y, r, color, imageSrc, flash, pose, filter, rim) {
    const img = this.getImage(imageSrc);
    if (img) {
      const M = WYD.data.map;
      const size = r * M.spriteScale;
      const p = pose || { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, flip: 1 };
      // 足元の影（暗い地面でも絵が浮いて見えるように）。影は地面にあるので動きに合わせない
      ctx.fillStyle = `rgba(0,0,0,${M.spriteShadow})`;
      ctx.beginPath();
      ctx.ellipse(x + p.dx, y + size * 0.38, size * 0.32 * p.sx, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      // 足元を中心にのび縮み・かたむきをつける
      ctx.translate(x + p.dx, y + p.dy + size * 0.4);
      ctx.rotate(p.rot);
      ctx.scale(p.sx * p.flip, p.sy);
      if (flash) ctx.filter = "brightness(2.2)";
      else if (filter) ctx.filter = filter;
      // ふちの光（data/map.js の rim）：光らせた絵（作り置き）を、まわりの余白のぶん大きく描く
      const glow = rim && !flash ? this.rimImage(img, imageSrc, rim) : null;
      if (glow) {
        const pad = glow.pad * size / img.width;
        ctx.drawImage(glow.canvas, -size / 2 - pad, -size * 0.9 - pad, size + pad * 2, size + pad * 2);
      } else {
        ctx.drawImage(img, -size / 2, -size * 0.9, size, size);
      }
      ctx.restore();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  // 炎の陣：消える前にだんだん薄くなる円
  drawField(ctx, f) {
    if (WYD.vfx.drawGround(ctx, f, this.clock || 0)) return;   // 燃える地面の絵があればそれで描く
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

  // 大事な知らせ（画面の真ん中・上寄り。だんだん消える）
  drawNotices(ctx, w) {
    const N = WYD.data.map.notice;
    const map = WYD.data.map;
    (w.notices || []).forEach((n, i) => {
      const left = N.duration - n.time;
      ctx.globalAlpha = Math.max(0, Math.min(1, left / N.fade, n.time / 0.15));
      ctx.font = N.font;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      const y = N.top + i * N.lineHeight;
      ctx.strokeText(n.text, map.width / 2, y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, map.width / 2, y);
    });
    ctx.globalAlpha = 1;
  },

  // 爆発の予告：輪の中がだんだん埋まっていく
  drawHazard(ctx, h) {
    const k = 1 - Math.max(0, h.timer / h.delay);
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.15 + 0.2 * k;
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  // 主人公の頭の上のHPの棒（HPが減ると赤くなる）
  // 左下のスキルの並び：絵（なければスキルの色と頭の1文字）、残り時間の影、使った瞬間の光る枠
  drawSkillBar(ctx, w, state) {
    const B = WYD.data.map.skillBar;
    const p = w.player, pl = state.player;
    const ids = WYD.data.skillOrder.filter((id) => (pl.skills[id] || 0) > 0 && pl.skillEnabled[id]);
    const rune = WYD.runeSkills.current(state);
    if(rune) ids.push("rune");
    // スマホなどで画面が縮んで見えるときは、そのぶん大きく描く
    const shown = ctx.canvas.clientWidth / WYD.data.map.width || 1;
    const size = Math.max(B.size, Math.round(B.minShownPx / shown));
    const y = WYD.data.map.height - B.bottom - size;
    ids.forEach((id, i) => {
      const x = B.x + i * (size + B.gap);
      const def = id === "rune" ? {name:"ル",color:WYD.runeSkills.def("element",rune.element).color} : WYD.data.skills[id];
      ctx.fillStyle = B.back;
      ctx.fillRect(x, y, size, size);
      const runeIcon = id === "rune" && WYD.runeSkills.icon(ctx, rune, x, y, size);
      const img = runeIcon ? null : this.getImage(id === "rune" ? WYD.data.vfx.textures[WYD.runeSkills.def("element",rune.element).texture] : WYD.data.skillIcons[id]);
      if (runeIcon) { /* 属性×動きの専用絵を切り出し済み */ }
      else if (img) ctx.drawImage(img, x, y, size, size);
      else {
        ctx.fillStyle = def.color || "#ccc";
        ctx.font = `bold ${Math.round(size * 0.5)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(def.name[0], x + size / 2, y + size * 0.68);
      }
      // 残り時間：上から下へ減っていく影
      const max = (p.skillCooldownMax || {})[id] || 0;
      const left = p.skillCooldowns[id] || 0;
      if (max > 0 && left > 0) {
        ctx.fillStyle = B.shade;
        const h = size * Math.min(1, left / max);
        ctx.fillRect(x, y + size - h, size, h);
      }
      const since = w.time - ((p.skillCastAt || {})[id] ?? -99);
      const k = Math.max(0, 1 - since / B.flash);
      ctx.lineWidth = 1 + k * 2;
      ctx.strokeStyle = k > 0 ? B.flashColor : B.border;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    });
    ctx.lineWidth = 1;
  },

  drawPlayerBar(ctx, p, state) {
    if (p.dead || p.hp == null) return;
    const B = WYD.data.map.playerBar;
    const P = WYD.data.player;
    const maxHp = WYD.stats.compute(state).maxHp;
    const ratio = Math.max(0, Math.min(1, p.hp / maxHp));
    const scale = p.form ? p.form.scale : 1;
    const x = p.x - B.width / 2;
    const y = p.y - P.radius * WYD.data.map.spriteScale * 0.5 * scale - B.gap;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - 1, y - 1, B.width + 2, B.height + 2);
    ctx.fillStyle = ratio <= B.lowAt ? B.lowColor : B.color;
    ctx.fillRect(x, y, B.width * ratio, B.height);
  },

  drawPlayer(ctx, p) {
    const P = WYD.data.player;
    if (p.chill > 0) {
      // 精鋭の「氷結」で遅くなっている
      ctx.fillStyle = WYD.data.elites.affixes.find((a) => a.id === "frozen").color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, P.radius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (p.haste) {
      ctx.strokeStyle = p.haste.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, P.radius + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // オーラ：足元にゆっくり脈打つ輪
    const AR = WYD.data.fx.auraRing;
    for (const id in p.dead ? {} : p.auras || {}) {
      const a = p.auras[id];
      if (WYD.vfx.drawAuraMist(ctx, p, a, id)) continue;
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * AR.pulseSpeed + a.radius);
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = AR.alpha + AR.pulseAlpha * pulse;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + P.radius * 0.6, a.radius, a.radius * AR.flatten, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (p.buff && !(WYD.vfx.buffStyle() && WYD.vfx.has(WYD.vfx.buffStyle().key))) {
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
    // 変身中は、姿の大きさと色で描く（獣の絵が来るまでは、まわりの光と名前でわかるように）
    const form = p.form;
    if (form && !p.dead) {
      const FR = WYD.data.fx.formGlow;
      const r = P.radius * form.scale * FR.radiusMult;
      ctx.save();
      ctx.globalAlpha = FR.alpha + FR.pulseAlpha * Math.sin((this.clock || 0) * FR.pulseSpeed);
      ctx.fillStyle = form.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = form.color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${form.name} ${Math.ceil(form.timeLeft)}秒`, p.x, p.y - r - 4);
      ctx.restore();
    }
    // 変身の絵（formImage）があればその絵を、なければ主人公の絵に色をかぶせる
    const formImg = form && !p.dead && form.image;
    const filter = formImg ? form.filter : form && form.filter ? [P.imageFilter, form.filter].filter(Boolean).join(" ") : P.imageFilter;
    this.drawCircleOrImage(ctx, p.x, p.y, P.radius * (form ? form.scale : 1), p.dead ? "#555" : form ? form.color : P.color,
      formImg || this.poseImage(p, P), false, this.pose(p, p.swingTarget, this.clock), filter, p.dead ? null : WYD.data.map.rim.player);
    // 鉄の皮膚・マナシールドの間：体を包む光（絵があるとき）
    if (p.buff && !p.dead) {
      const size = P.radius * WYD.data.map.spriteScale * 1.3;
      if (!WYD.vfx.drawBuff(ctx, p, this.clock || 0)) WYD.vfx.drawOn(ctx, "shield", p.x, p.y, size, 0.45 + 0.15 * Math.sin((this.clock || 0) * 5));
    }
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
    if (def.treasure) {
      // 宝物ゴブリン：金色にきらめく輪
      ctx.strokeStyle = WYD.data.goblin.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin((this.clock || 0) * 8);
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // 頭の上で上下にゆれる金色の矢印（暗がりでもどこにいるか分かるように）
      const G = WYD.data.goblin;
      const top = Math.max(G.arrowSize * 2 + 2, e.y - def.radius * WYD.data.map.spriteScale * 0.9 - G.arrowGap + Math.sin((this.clock || 0) * 5) * 4);
      ctx.fillStyle = G.color;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x - G.arrowSize, top - G.arrowSize);
      ctx.lineTo(e.x + G.arrowSize, top - G.arrowSize);
      ctx.lineTo(e.x, top);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
    if (e.enraged) {
      // 怒ったボス：脈打つ赤いオーラ
      const R = WYD.data.boss.enrage;
      const pulse = 0.5 + 0.5 * Math.sin((this.clock || 0) * 6);
      const g = ctx.createRadialGradient(e.x, e.y, def.radius * 0.3, e.x, e.y, def.radius * R.auraRadius);
      g.addColorStop(0, R.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.25 + 0.2 * pulse;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.radius * R.auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
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
    if (e.clone) ctx.globalAlpha = 0.55;   // 分身はうすく
    const RIM = WYD.data.map.rim;
    this.drawCircleOrImage(ctx, e.x, e.y, def.radius, e.hitFlash > 0 ? "#ffffff" : def.color, this.poseImage(e, def), e.hitFlash > 0,
      this.pose(e, this.playerPos, this.clock), e.imageFilter || def.imageFilter, e.boss ? RIM.boss : e.elite ? RIM.elite : RIM.enemy);
    ctx.globalAlpha = 1;
    if (e.shielded) {
      // 精鋭の「守護」：光の盾
      ctx.strokeStyle = E.affixes.find((a) => a.id === "shielding").color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin((this.clock || 0) * 10);
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // HPバー：絵があるときは絵の上に出す
    const top = this.getImage(def.image) ? def.radius * WYD.data.map.spriteScale / 2 : def.radius;
    const bw = def.radius * 2.2, bh = 4;
    const bx = e.x - bw / 2, by = e.y - top - 9;
    ctx.fillStyle = "#300";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#e33";
    ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), bh);

    if (e.stunTimer > 0 && !WYD.vfx.drawOn(ctx, WYD.data.vfx.bindStyle[WYD.classes.id] || "chains", e.x, e.y, def.radius * 3, 0.9)) {
      // 縛られている敵：緑の縄（鎖の絵がないとき）
      ctx.strokeStyle = WYD.data.anim.bindColor;
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
      this.unitLabels.push({ x: e.x, y: by - 4, text: e.name, color: E.color, bold: true });
    } else if (def.showName) {
      this.unitLabels.push({ x: e.x, y: by - 4, text: def.name, color: "#e6c7ff" });
    }
  },

  // 精鋭などの名前：明かりの暗さの上に、重なったら上にずらして、うすい黒の板の上に書く
  fitLabel(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let short = text;
    while (short.length && ctx.measureText(short + "…").width > maxWidth) short = short.slice(0, -1);
    return short + "…";
  },

  drawUnitLabels(ctx) {
    const L = WYD.data.map.unitLabel;
    const shown = ctx.canvas.clientWidth / WYD.data.map.width || 1;
    const font = Math.max(L.font, L.minShownPx / shown);
    const pad = L.pad * font / L.font;
    ctx.textAlign = "center";
    const placed = [];
    for (const lb of this.unitLabels.sort((a, b) => b.y - a.y)) {
      ctx.font = `${lb.bold ? "bold " : ""}${font}px sans-serif`;
      const text = this.fitLabel(ctx, lb.text, WYD.data.map.width - pad * 2);
      const w = ctx.measureText(text).width + pad * 2;
      const h = font + pad;
      const x = Math.max(w / 2, Math.min(WYD.data.map.width - w / 2, lb.x));
      let y = Math.max(font, lb.y);
      for (let tries = 0; tries < L.maxShift; tries++) {
        if (!placed.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < h)) break;
        y -= h;
      }
      y = Math.max(font, y);
      placed.push({ x, y, w });
      ctx.fillStyle = L.back;
      ctx.fillRect(x - w / 2, y - font, w, h);
      ctx.fillStyle = lb.color;
      ctx.fillText(text, x, y);
    }
    this.unitLabels = [];
  },

  drawDrop(ctx, drop) {
    const r = WYD.loot.rarityInfo(drop.item.rarity);
    const L = WYD.data.fx.dropLook;
    const bounce = Math.max(0, 1 - drop.age * 3) * 10;
    // 太古・始原は柱と光の色を変える
    const color = (drop.item.ancient && WYD.data.items.ancient.colors[drop.item.ancient]) || r.color;
    // 良い装備は足もとが光る
    if (L.glowRarities.includes(drop.item.rarity) || drop.item.ancient) {
      const k = 1 + L.glowPulse * Math.sin(drop.age * L.glowSpeed);
      const g = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, L.glowRadius * k);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y, L.glowRadius * k, L.glowRadius * k * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 良い装備は光の柱で知らせる（ディアブロの「ドロップの光」）
    const beam = WYD.data.fx.lootBeam[drop.item.rarity];
    if (beam) {
      const g = ctx.createLinearGradient(0, drop.y - beam, 0, drop.y);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, color);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.7 + 0.2 * Math.sin(drop.age * 6);
      ctx.fillStyle = g;
      ctx.fillRect(drop.x - 4, drop.y - beam, 8, beam);
      ctx.fillRect(drop.x - 1.5, drop.y - beam * 1.2, 3, beam * 1.2);
      ctx.restore();
    }
    // 装備の絵があれば絵で（うしろにレア度の色の丸）。なければひし形
    const img = this.getImage(WYD.loot.iconOf(drop.item));
    ctx.save();
    ctx.translate(drop.x, drop.y - bounce);
    if (img) {
      ctx.globalAlpha = L.backAlpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, L.backRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.drawImage(img, -L.iconSize / 2, -L.iconSize / 2, L.iconSize, L.iconSize);
    } else {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -6, 12, 12);
    }
    ctx.restore();
  },

  // 落ちている装備の名前：重なるものは上にずらし、うすい黒の板の上に書く（たくさん落ちても読める）
  drawDropLabels(ctx, drops) {
    const L = WYD.data.map.dropLabel;
    const shown = ctx.canvas.clientWidth / WYD.data.map.width || 1;
    const font = Math.max(L.font, L.minShownPx / shown);
    const pad = L.pad * font / L.font;
    ctx.font = `${font}px sans-serif`;
    ctx.textAlign = "center";
    const placed = [];
    for (const drop of drops.slice().sort((a, b) => b.y - a.y)) {
      const r = WYD.loot.rarityInfo(drop.item.rarity);
      const bounce = Math.max(0, 1 - drop.age * 3) * 10;
      const text = this.fitLabel(ctx, drop.item.name, WYD.data.map.width - pad * 2);
      const w = ctx.measureText(text).width + pad * 2;
      const h = font + pad;
      const x = Math.max(w / 2, Math.min(WYD.data.map.width - w / 2, drop.x));
      let y = drop.y - WYD.data.fx.dropLook.iconSize / 2 - 4 - bounce;
      for (let tries = 0; tries < L.maxShift; tries++) {
        const hit = placed.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < h);
        if (!hit) break;
        y -= h;
      }
      y = Math.max(font, y);
      placed.push({ x, y, w });
      ctx.fillStyle = L.back;
      ctx.fillRect(x - w / 2, y - font, w, h);
      ctx.fillStyle = r.color;
      ctx.fillText(text, x, y - 1);
    }
  },

  drawEffect(ctx, ef) {
    if (ef.type === "runeArt") { WYD.runeSkills.drawEffect(ctx, ef); return; }
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
    if (ef.type === "sprite") WYD.vfx.draw(ctx, ef);
    if (ef.type === "castMist") WYD.vfx.drawCastMist(ctx, ef);
    if (ef.type === "trapShot") WYD.vfx.drawTrapShot(ctx, ef);
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
