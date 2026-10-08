// 蒐集者の動き：使う技の枠・発動順・検証モード・技を外したときの後片づけ・不発の理由・専用の演出。
// 技そのものは元の職業と同じ処理（src/world.js の skillHandlers など）を呼ぶ。数値は data/collector.js。
window.WYD = window.WYD || {};
WYD.collector = {
  is() { return WYD.classes.id === "collector"; },

  ensure(state) {
    const c = state.collector || (state.collector = {});
    c.verify = !!c.verify; c.noAttack = !!c.noAttack;
    if (!["auto", "near", "far"].includes(c.stance)) c.stance = "auto";
    if (!Array.isArray(c.order)) c.order = [];
    if (!Array.isArray(c.presets)) c.presets = [];
    c.order = c.order.filter((id) => WYD.data.skills[id]);
    return c;
  },

  // 同時にONにできる数（検証モードは制限なし）
  slots(state) {
    return this.is() && state && state.collector && state.collector.verify ? WYD.data.collector.verifySlots : WYD.data.skillSlots;
  },

  // 発動を試す順：蒐集者は魔導書で決めた順（決めていない技はうしろ）
  order(state) {
    if (!this.is() || !state || !state.collector || !state.collector.order.length) return WYD.data.skillOrder;
    const first = state.collector.order.filter((id) => WYD.data.skills[id]);
    return [...first, ...WYD.data.skillOrder.filter((id) => !first.includes(id))];
  },

  // 近くで使う技（周りに当たる・近くの敵で発動する）の間合いのうち、いちばん短いもの。なければ null（遠くから撃つ）
  closeReach(state) {
    if (!this.is() || !state) return null;
    const stance = state.collector && state.collector.stance;
    if (stance === "far") return null;
    if (stance === "near") return WYD.data.player.attackRange + WYD.data.collector.nearPadding;   // 近接職と同じく、殴れる距離まで寄る
    let best = null;
    for (const id of this.activeIds(state)) {
      const def = WYD.data.skills[id], kind = WYD.classes.kindOf(id);
      const R = WYD.data.classSpecialization.skills[id];   // 職業ごとの独自の動き（data/classSpecialization.js）の本当の間合い
      const r = R && R.mode === "orbit" ? WYD.runes.effectiveDef(state, id).jumpRange * R.radiusRatio + R.hitRadius
        : R && R.range ? R.range
        : def.range ? def.range
        : ["whirl", "nagapasha"].includes(kind) || (kind === "aura" && def.auraType === "damage") ? def.radius
        : ["hanuman", "shift"].includes(kind) ? def.triggerRange : null;
      // 通常攻撃の間合い（ページの刃）より遠くまで届く技は、寄らなくてよい
      if (r > 0 && r < WYD.data.player.rangedAttack.keepDistance && (best == null || r < best)) best = r;
    }
    return best;
  },

  // 検証モード：通常攻撃を止める
  blocksAttack(state) { return this.is() && !!(state && state.collector && state.collector.verify && state.collector.noAttack); },

  activeIds(state) {
    const pl = state.player;
    return Object.keys(WYD.data.skills).filter((id) => (pl.skills[id] || 0) > 0 && pl.skillEnabled[id]);
  },

  // ON/OFF。ONは枠の空きがあるときだけ。OFFにした技が残したもの（召喚・罠・爆弾・床・オーラ・変身・守り）は消す
  setEnabled(state, id, on, w = WYD.currentWorld) {
    const pl = state.player;
    if (!WYD.data.skills[id] || !((pl.skills[id] || 0) > 0)) return false;
    if (on && !pl.skillEnabled[id] && this.activeIds(state).length >= this.slots(state)) return false;
    pl.skillEnabled[id] = !!on;
    if (!on && w) this.cleanup(w, state, id);
    return true;
  },

  cleanup(w, state, id) {
    const p = w.player, kind = WYD.classes.kindOf(id), tag = "skill:" + id;
    w.allies = (w.allies || []).filter((a) => a.source !== id);
    // 人形は、人形の技（しくみ puppet）がひとつもONでなくなったら片づける
    if (kind === "puppet" && !this.activeIds(state).some((x) => WYD.classes.kindOf(x) === "puppet")) {
      w.allies = w.allies.filter((a) => !a.puppet);
      w.puppetWasAlive = false;
    }
    w.traps = (w.traps || []).filter((t) => t.source !== id);
    if (w.bombs) w.bombs = w.bombs.filter((b) => b.source !== id);
    w.fields = (w.fields || []).filter((f) => f.source !== tag);
    if (w.classTasks) w.classTasks = w.classTasks.filter((t) => t.id !== id);
    if (p.auras) delete p.auras[id];
    if (p.form && p.form.id === id) p.form = null;
    if (p.buff && p.buff.source === id) p.buff = null;
    if (p.haste && p.haste.source === id) p.haste = null;
    if (p.skillCooldowns) delete p.skillCooldowns[id];
  },

  // 検証モードの出入り。入るときに今の構成（レベル・ON・型・順・ポイント）を覚え、出るときに戻す
  setVerify(state, on, w = WYD.currentWorld) {
    const c = this.ensure(state), pl = state.player;
    if (on === c.verify) return;
    if (on) {
      c.normal = JSON.parse(JSON.stringify({ skills: pl.skills, skillEnabled: pl.skillEnabled, runes: pl.runes, order: c.order, skillPoints: pl.skillPoints }));
      c.verify = true;
    } else {
      const before = this.activeIds(state);
      if (c.normal) Object.assign(pl, { skills: c.normal.skills, skillEnabled: c.normal.skillEnabled, runes: c.normal.runes, skillPoints: c.normal.skillPoints }), c.order = c.normal.order || [];
      c.verify = false; c.noAttack = false; c.normal = null;
      WYD.save.limitSkills(state);
      const after = this.activeIds(state);
      if (w) for (const id of before) if (!after.includes(id)) this.cleanup(w, state, id);
    }
  },

  // 検証モードだけ：レベルを自由に（1〜最大）
  setLevel(state, id, lv) {
    const def = WYD.data.skills[id];
    if (!def || !state.collector || !state.collector.verify) return false;
    state.player.skills[id] = Math.max(1, Math.min(def.maxLevel, Math.round(lv)));
    return true;
  },

  // 一括：そのグループ（職業）の技を全部ON/OFF。ONは枠のぶんだけ
  bulk(state, ids, on, w = WYD.currentWorld) {
    let n = 0;
    for (const id of ids) if (this.setEnabled(state, id, on, w)) n++;
    return n;
  },

  // 名前つきの構成（ON・型・順）。検証モードのときはレベルも
  savePreset(state, slot, name) {
    const c = this.ensure(state), pl = state.player, D = WYD.data.collector;
    if (slot < 0 || slot >= D.presetSlots) return false;
    c.presets[slot] = { name: String(name || `構成${slot + 1}`).slice(0, D.presetNameLength), enabled: this.activeIds(state), runes: { ...pl.runes }, order: [...c.order],
      levels: c.verify ? { ...pl.skills } : null };
    return true;
  },
  loadPreset(state, slot, w = WYD.currentWorld) {
    const c = this.ensure(state), b = c.presets[slot], pl = state.player;
    if (!b) return false;
    for (const id of this.activeIds(state)) if (!b.enabled.includes(id)) this.setEnabled(state, id, false, w);
    if (c.verify && b.levels) for (const id in b.levels) if (WYD.data.skills[id]) this.setLevel(state, id, b.levels[id]);
    for (const id of b.enabled) this.setEnabled(state, id, true, w);
    for (const id in b.runes) if (WYD.data.skills[id]) pl.runes[id] = b.runes[id];
    c.order = (b.order || []).filter((id) => WYD.data.skills[id]);
    return true;
  },

  // 不発の理由を数える（検証モードのとき。src/world.js の tryUseSkills から）
  misfire(w, state, stats, id, def) {
    if (!this.is() || !state.collector || !state.collector.verify) return;
    const p = w.player, kind = WYD.classes.kindOf(id), alive = w.enemies.filter((e) => e.hp > 0);
    const near = WYD.world.nearestEnemy(w, p), d = near ? WYD.util.dist(p, near) : Infinity;
    if (kind === "aura" && def.auraType === "might") return;   // 力のオーラはONのあいだずっと効いている（不発ではない）
    const reach = (def.range || def.triggerRange || def.radius || 0) + (near ? WYD.data.enemies[near.kind].radius : 0);
    let reason = "other";
    if (kind === "vajra" && def.triggerHpPercent && p.hp / stats.maxHp * 100 > def.triggerHpPercent) reason = "hp";
    else if (kind === "shift" && p.form) reason = "form";
    else if (kind === "raise" && w.allies.filter((a) => a.source === id).length >= WYD.allies.maxCount(def, state.player.skills[id] || 1, stats)) reason = "full";
    else if (kind === "aura" && def.auraType === "heal") reason = "hp";
    else if (!alive.length) reason = "noTarget";
    else if (kind === "puppet" && def.mode !== "thread" && !WYD.puppeteer.active(w)) reason = "summon";
    else if (kind === "puppet" && def.mode === "thread" && WYD.puppeteer.active(w) && WYD.puppeteer.active(w).hp >= WYD.puppeteer.active(w).maxHp) reason = "puppetFull";
    else if (kind === "puppet" && def.hpCost && !WYD.puppeteer.canPay(w, stats, def.hpCost)) reason = "cost";
    else if (kind === "puppet" && def.mode === "swap" && p.hp / stats.maxHp * 100 > def.triggerHpPercent) reason = "hp";
    else if (kind === "puppet" && def.mode === "finale" && WYD.puppeteer.active(w) && WYD.puppeteer.active(w).hp / WYD.puppeteer.active(w).maxHp * 100 > def.triggerPuppetHpPercent) reason = "hp";
    else if (reach && d > reach) reason = "range";
    const m = w.collectorMisfire || (w.collectorMisfire = {});
    const row = m[id] || (m[id] = {});
    row[reason] = (row[reason] || 0) + 1;
  },

  // 専用の演出：元の絵の上に、ページの輪（発動）と墨の閃光（命中）を重ねる。出しすぎないよう間隔と同時数を絞る
  overlay(w, which, x, y) {
    const F = WYD.data.collector.fx[which];
    if (!this.is() || !F || !WYD.vfx.has(F.key)) return;
    const t = w.collectorFx || (w.collectorFx = {});
    if ((t[which] || -Infinity) > (w.time || 0) - F.minInterval) return;
    if (w.effects.filter((e) => e.key === F.key).length >= F.maxAlive) return;
    t[which] = w.time || 0;
    WYD.vfx.spawn(w, F.key, x, y, { size: F.size, angle: which === "hit" ? Math.random() * 6.28 : 0 });
  },

  init() {
    const V = WYD.vfx, cast = V.cast, hit = V.hitSpark, self = this;
    V.cast = function(w, skillId, x, y, radius) {
      const r = cast.apply(this, arguments);
      self.overlay(w, "ring", x, y);
      return r;
    };
    V.hitSpark = function(w, e, skillId, crit) {
      const r = hit.apply(this, arguments);
      if (!this.suppressHit) self.overlay(w, "hit", e.x, e.y - 8);
      return r;
    };
  },
};
WYD.collector.init();
