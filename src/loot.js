// 装備をランダムに作る。
window.WYD = window.WYD || {};

WYD.loot = {
  rollValue(stat, range, itemLevel) {
    const D = WYD.data.items;
    const info = D.stats[stat];
    let v = WYD.util.rand(range[0], range[1]);
    if (info.scales) v *= 1 + D.levelScaling * (itemLevel - 1);
    const p = Math.pow(10, info.decimals);
    return Math.round(v * p) / p;
  },

  rollRarity(rarityBonus) {
    const D = WYD.data.items;
    return WYD.util.pickWeighted(D.rarities.filter(r => !WYD.data.runeSkills.retiredRarities.includes(r.id)), (r) =>
      r.id === "normal" ? r.weight : r.weight * rarityBonus
    );
  },

  // opts … { slot: 部位だけから選ぶ, rarity: レア度を決める }（キャダラの賭けで使う）
  create(state, itemLevel, rarityBonus, opts) {
    const D = WYD.data.items;
    const u = WYD.util;
    const base = u.pick(opts && opts.slot ? D.bases.filter((b) => b.slot === opts.slot) : D.bases);
    const rarity = opts && opts.rarity ? D.rarities.find((r) => r.id === opts.rarity) : this.rollRarity(rarityBonus);

    const stats = [];
    for (const stat in base.main) {
      stats.push({ stat, value: this.rollValue(stat, base.main[stat], itemLevel), main: true });
    }
    // 追加能力（同じ能力は2回つかない）
    const count = u.randInt(rarity.affixes[0], rarity.affixes[1]);
    const pool = D.affixes.slice();
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const affix = pool.splice(idx, 1)[0];
      stats.push({ stat: affix.stat, value: this.rollValue(affix.stat, affix.range, itemLevel), main: false });
    }

    let name = base.name;
    if (rarity.id === "rare") name = u.pick(D.rarePrefixes) + base.name;
    if (rarity.id === "legend") name = u.pick(D.legendPrefixes) + base.name;

    return this.finish({
      id: state.nextItemId++,
      name,
      slot: base.slot,
      base: base.id,
      rarity: rarity.id,
      level: itemLevel,
      stats,
      effects: this.rollEffects(rarity.id),
    });
  },

  // 今いるエリアがそのユニーク・セットの「よく落ちるエリア」（home）なら mult、ちがえば 1（試練の中は 1）
  homeMult(state, def, mult) {
    return def.home && state && def.home === state.area && !WYD.trial.active(state) ? mult : 1;
  },

  // よく落ちるエリアの名前（なければ null）
  homeName(def) {
    const a = def && def.home && WYD.data.areas.find((x) => x.id === def.home);
    return a ? a.name : null;
  },

  // ユニーク装備を作る（def を省くとランダムに選ぶ）
  createUnique(state, itemLevel, def) {
    const U = WYD.data.uniques;
    def = def || WYD.util.pickWeighted(this.forClass(U.list), (x) => x.weight * this.homeMult(state, x, U.homeMult));
    const base = WYD.data.items.bases.find((b) => b.id === def.base);
    const stats = [];
    for (const stat in base.main) {
      stats.push({ stat, value: this.rollValue(stat, base.main[stat], itemLevel), main: true });
    }
    for (const stat in def.stats) {
      stats.push({ stat, value: this.rollValue(stat, def.stats[stat], itemLevel), main: false });
    }
    return this.finish({
      id: state.nextItemId++,
      name: def.name,
      slot: base.slot,
      base: base.id,
      rarity: "unique",
      unique: def.id,
      level: itemLevel,
      stats,
      effects: this.rollEffects("unique"),
    });
  },

  // セット装備を作る（setId・pieceId を省くとランダム）
  createSetPiece(state, itemLevel, setId, pieceId) {
    const S = WYD.data.sets;
    const set = setId ? S.list.find((x) => x.id === setId) : WYD.util.pickWeighted(this.forClass(S.list), (x) => this.homeMult(state, x, S.homeMult));
    const piece = pieceId ? set.pieces.find((x) => x.id === pieceId) : WYD.util.pick(set.pieces);
    const base = WYD.data.items.bases.find((b) => b.id === piece.base);
    const stats = [];
    for (const stat in base.main) stats.push({ stat, value: this.rollValue(stat, base.main[stat], itemLevel), main: true });
    for (const stat in piece.stats) stats.push({ stat, value: this.rollValue(stat, piece.stats[stat], itemLevel), main: false });
    return this.finish({
      id: state.nextItemId++, name: piece.name, slot: base.slot, base: base.id,
      rarity: "set", set: set.id, piece: piece.id, level: itemLevel, stats,
      effects: this.rollEffects("set"),
    });
  },

  // 作った装備の仕上げ：太古・始原になるかを決め、ソケットをつける
  finish(item) {
    const A = WYD.data.items.ancient;
    if (A.rarities.includes(item.rarity)) {
      const r = Math.random();
      const grade = r < A.primalChance ? 2 : r < A.primalChance + A.ancientChance ? 1 : 0;
      if (grade) {
        item.ancient = grade;
        const mult = grade === 2 ? A.primalMult : A.ancientMult;
        for (const line of item.stats) {
          const p = Math.pow(10, WYD.data.items.stats[line.stat].decimals);
          line.value = Math.round(line.value * mult * p) / p;
        }
      }
    }
    return WYD.gems.rollSockets(item);
  },

  // セットのボーナス。classBonuses に今の職業の分があれば、その数のボーナスを差し替える
  setBonuses(set, classId = WYD.classes.id) {
    return { ...set.bonuses, ...((set.classBonuses && set.classBonuses[classId]) || {}) };
  },

  // 今の職業で出るものだけ（classOnly がほかの職業のものを除く。
  // スキルを強くする能力 skillBoost〜 は、そのしくみのスキルが今の職業にあるときだけ）
  forClass(list) {
    return list.filter((x) => (!x.classOnly || x.classOnly === WYD.classes.id) &&
      !(x.power && x.power.startsWith("skillBoost") && x.params && !WYD.classes.hasKind(x.params.kind)));
  },

  // 装備の表示名（強化していれば「+3 名前」）
  label(item) {
    const rw = WYD.gems.runeword(item);
    const name = (item.ancient ? WYD.data.items.ancient.names[item.ancient] : "") + (rw ? `「${rw.name}」${item.name}` : item.name);
    return item.plus > 0 ? `+${item.plus} ${name}` : name;
  },

  // 強化を入れた、能力1行の数値
  lineValue(item, line) {
    return line.value * (1 + (item.plus || 0) * WYD.data.crafting.enhance.statPerLevel);
  },

  // 装備1つで上がる能力の合計（強化と宝石もふくむ）
  statTotals(item) {
    const out = {};
    if (!item) return out;
    for (const line of item.stats) out[line.stat] = (out[line.stat] || 0) + this.lineValue(item, line);
    for (const key of item.sockets || []) {
      if (!key) continue;
      const st = WYD.gems.statsFor(key, item.slot);
      for (const k in st) out[k] = (out[k] || 0) + st[k];
    }
    // ルーンワードの能力
    const rw = WYD.gems.runeword(item);
    if (rw) for (const k in rw.bonus.stats || {}) out[k] = (out[k] || 0) + rw.bonus.stats[k];
    return out;
  },

  // セット装備なら { set, piece }、ちがえば null
  setInfo(item) {
    if (!item || !item.set) return null;
    const set = WYD.data.sets.list.find((x) => x.id === item.set);
    const piece = set && set.pieces.find((x) => x.id === item.piece);
    return set && piece ? { set, piece } : null;
  },

  uniqueInfo(item) {
    return this.forClassDef((item && item.unique && WYD.data.uniques.list.find((u) => u.id === item.unique)) || null);
  },

  // ユニークの固有能力。classPowers に今の職業の分があれば、power・params・desc を差し替える
  forClassDef(def, classId = WYD.classes.id) {
    const own = def && def.classPowers && def.classPowers[classId];
    return own ? { ...def, ...own } : def;
  },

  // 固有能力の説明文（{名前} を params の数値に置きかえる）
  uniqueDesc(def) {
    def = this.forClassDef(def);
    return def.desc
      .replace(/\{skill:(\w+)\}/g, (all, kind) => WYD.classes.skillNameByKind(kind) + (WYD.classes.hasKind(kind) ? "" : "（この職業では発動しない）"))
      .replace(/\{(\w+)\}/g, (all, key) => (key in def.params ? String(def.params[key]) : all));
  },

  // 特殊効果をランダムに決める（同じ効果は2回つかない）
  rollEffects(rarityId) {
    const E = WYD.data.effects;
    const u = WYD.util;
    const range = E.countByRarity[rarityId] || [0, 0];
    const count = u.randInt(range[0], range[1]);
    const pool = E.list.slice();
    const effects = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const def = u.pickWeighted(pool, (x) => x.weight);
      pool.splice(pool.indexOf(def), 1);
      const p = Math.pow(10, def.decimals);
      const value = Math.round(u.rand(def.range[0], def.range[1]) * p) / p;
      effects.push({ id: def.id, value });
    }
    return effects;
  },

  effectInfo(id) {
    return WYD.data.effects.list.find((x) => x.id === id);
  },

  // 装備の種類（古いセーブの装備は名前から探す）
  baseOf(item) {
    const bases = WYD.data.items.bases;
    return bases.find((b) => b.id === item.base) ||
      bases.find((b) => b.slot === item.slot && item.name.endsWith(b.name)) || null;
  },

  // 装備のアイコンの絵のファイル（なければ null）
  iconOf(item) {
    const u = this.uniqueInfo(item);
    if (u && u.icon) return u.icon;
    const base = this.baseOf(item);
    return (base && WYD.data.items.icons[base.id]) || null;
  },

  rarityInfo(id) {
    return WYD.data.items.rarities.find((r) => r.id === id);
  },
};
