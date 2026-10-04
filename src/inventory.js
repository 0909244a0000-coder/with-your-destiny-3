// 持ち物と装備の操作。
window.WYD = window.WYD || {};

WYD.inventory = {
  isFull(state) {
    return state.inventory.length >= WYD.data.items.inventorySize;
  },

  add(state, item) {
    if (this.isFull(state)) return false;
    state.inventory.push(item);
    return true;
  },

  // 持ち物がいっぱいのとき、拾う装備より弱い装備を1つ素材にして場所をあける。
  // 守る装備（ロック・ユニーク・セット・強化・宝石つき）は選ばない。レア度が低いもの → 点数が低いものから選ぶ。
  // 素材にしたら { item, gained } を返す。あけられなければ null
  makeRoomFor(state, item) {
    const order = WYD.data.items.rarities.map((r) => r.id);
    const rank = (it) => order.indexOf(it.rarity);
    const score = this.itemScore(item);
    let worst = -1;
    state.inventory.forEach((it, i) => {
      if (this.keepReason(it, state)) return;
      if (rank(it) > rank(item) || (rank(it) === rank(item) && this.itemScore(it) >= score)) return;
      const w = state.inventory[worst];
      if (worst < 0 || rank(it) < rank(w) || (rank(it) === rank(w) && this.itemScore(it) < this.itemScore(w))) worst = i;
    });
    if (worst < 0) return null;
    const old = state.inventory.splice(worst, 1)[0];
    return { item: old, gained: this.salvage(state, old) };
  },

  // 持ち物の index 番目を装備する（前の装備は同じ場所に戻る）
  equip(state, index) {
    const item = state.inventory[index];
    if (!item) return;
    const old = state.equipment[item.slot];
    state.equipment[item.slot] = item;
    state.inventory.splice(index, 1);
    if (old) state.inventory.splice(index, 0, old);
  },

  // 装備1つの点数（data/items.js の autoEquip）
  itemScore(item) {
    if (!item) return 0;
    const A = WYD.data.items.autoEquip;
    const st = WYD.loot.statTotals(item);
    let score = (item.effects || []).length * A.perEffect +
      (item.rarity === "unique" ? A.uniqueBonus : 0) + (item.rarity === "set" ? A.setBonus : 0);
    for (const k in st) score += st[k] * (A.weights[k] || 0);
    return score;
  },

  // 自動で着替えないほうがいい装備（自分で選んだはずのもの）
  keepEquipped(item, state) {
    const reason = this.keepReason(item, state);
    // 空の土台は外しても持ち物へ戻る。育成中の自動装備を止めない。
    return !!reason && reason !== "base";
  },

  // 自動で着替えない理由（data/story.js の keepNote.reasons の名前）。着替えてよければ null
  keepReason(item, state) {
    if (!item) return null;
    if (item.locked) return "locked";
    if (state && (state.builds || []).some((b) => b && Object.values(b.equipment || {}).includes(item.id))) return "build";
    if (item.rarity === "unique") return "unique";
    if (item.rarity === "set") return "set";
    if (item.plus > 0) return "plus";
    if ((item.sockets || []).some((x) => x)) return "gem";
    if (item.forged > 0) return "forged";
    if (this.keepRunewordBase(state, item)) return "base";
    return null;
  },

  // フィルターで土台保護をOFFにした場合は、空のノーマル土台を保護しない。
  keepRunewordBase(state, item) {
    const f = state && state.settings.filter;
    return item.rarity === "normal" && (item.sockets || []).length >= 2 && !(f && f.on && !f.keepSocketed);
  },

  protectDrop(state, item) {
    return WYD.data.items.protectDrops.includes(item.rarity) || !!this.keepReason(item, state);
  },

  // 未受取は分解・自動装備せず、空いている持ち物／倉庫へそのまま移す。
  claimPending(state) {
    let count = 0;
    state.pendingLoot = (state.pendingLoot || []).filter((item) => {
      if (!this.add(state, item)) {
        if (state.stash.length >= WYD.data.items.stashSize) return true;
        state.stash.push(item);
      }
      WYD.records.found(state, item);
      count++;
      return false;
    });
    if (count) WYD.records.check(state);
    return count;
  },

  // 数値では強い装備を拾ったのに、守っている装備があって着替えなかったことを知らせる（同じ装備については1回だけ）
  noteKept(cur, item, state) {
    const K = WYD.data.story.keepNote;
    this.keptNoted = this.keptNoted || new WeakSet();
    if (this.keptNoted.has(cur)) return;
    this.keptNoted.add(cur);
    WYD.ui.log(K.text.replace("{new}", WYD.loot.label(item)).replace("{cur}", WYD.loot.label(cur)).replace("{why}", K.reasons[this.keepReason(cur, state)]), K.color);
  },

  // 拾った装備が強ければ着替える。着替えたら true
  autoEquip(state, item) {
    const cur = state.equipment[item.slot];
    const before = this.itemScore(cur);
    if (this.keepEquipped(cur, state)) {
      if (this.itemScore(item) > before * (1 + WYD.data.items.autoEquip.minGain)) this.noteKept(cur, item, state);
      return false;
    }
    if (cur && this.itemScore(item) <= before * (1 + WYD.data.items.autoEquip.minGain)) return false;
    const index = state.inventory.indexOf(item);
    if (index < 0) return false;
    this.equip(state, index);
    return true;
  },

  unequip(state, slot) {
    const item = state.equipment[slot];
    if (!item || this.isFull(state)) return false;
    delete state.equipment[slot];
    state.inventory.push(item);
    return true;
  },

  // 持ち物 → 倉庫。できたら true
  toStash(state, index) {
    const item = state.inventory[index];
    if (!item || state.stash.length >= WYD.data.items.stashSize) return false;
    state.inventory.splice(index, 1);
    state.stash.push(item);
    return true;
  },

  // 倉庫 → 持ち物。できたら true
  fromStash(state, index) {
    const item = state.stash[index];
    if (!item || this.isFull(state)) return false;
    state.stash.splice(index, 1);
    state.inventory.push(item);
    return true;
  },

  // 倉庫の装備を捨てる（分解）。もらった素材の数を返す
  discardFromStash(state, index) {
    if (state.stash[index] && state.stash[index].locked) return -1;
    const item = state.stash.splice(index, 1)[0];
    return item ? this.salvage(state, item) : 0;
  },

  // 捨てる（分解して素材をもらう）。もらった素材の数を返す
  // ロックした装備は捨てられない（捨てたら素材の数、捨てなかったら -1）
  // 並べ替え：ロックしたもの → レア度の高い順 → 部位の順 → 強い順
  sort(list) {
    const D = WYD.data.items;
    const rank = (it) => D.rarities.findIndex((r) => r.id === it.rarity);
    const slots = Object.keys(D.slots);
    list.sort((a, b) => (b.locked ? 1 : 0) - (a.locked ? 1 : 0) || rank(b) - rank(a)
      || slots.indexOf(a.slot) - slots.indexOf(b.slot) || this.itemScore(b) - this.itemScore(a));
  },

  discard(state, index) {
    if (state.inventory[index] && state.inventory[index].locked) return -1;
    const item = state.inventory.splice(index, 1)[0];
    return item ? this.salvage(state, item) : 0;
  },

  // 指定したレア度の装備をまとめて捨てる。{ count: 捨てた数, gained: もらった素材 } を返す
  discardRarities(state, rarityIds) {
    let count = 0, gained = 0;
    state.inventory = state.inventory.filter((it) => {
      if (!rarityIds.includes(it.rarity)) return true;
      // 強化した装備と、宝石をはめた装備は、まとめて捨てる対象にしない
      if (it.locked || it.plus > 0 || (it.sockets || []).some((x) => x)) return true;
      count++;
      gained += this.salvage(state, it);
      return false;
    });
    return { count, gained };
  },

  // 明示した持ち物を全て分解。ロックは保護し、装備中・倉庫には触れない。
  discardAll(state, targets = state.inventory.filter((it) => !it.locked)) {
    const selected = new Set(targets);
    let count = 0, gained = 0;
    state.inventory = state.inventory.filter((it) => {
      if (it.locked || !selected.has(it)) return true;
      count++;
      gained += this.salvage(state, it);
      return false;
    });
    return { count, gained };
  },

  // 自動分解の対象か（設定で選んだレア度以下。レジェンドとユニークは対象外）
  shouldAutoSalvage(state, item) {
    if (this.keepReason(item, state)) return false;
    const f = state.settings.filter;
    if (f && f.on) return !this.filterKeeps(state, item);
    const opt = WYD.data.crafting.autoSalvageOptions.find((o) => o.id === state.settings.autoSalvage);
    if (!opt || !opt.upTo) return false;
    // ソケットが2つ以上のノーマル装備はルーンワードの土台になるので残す
    if (this.keepRunewordBase(state, item)) return false;
    const order = WYD.data.items.rarities.map((r) => r.id);
    return order.indexOf(item.rarity) <= order.indexOf(opt.upTo);
  },

  // 戦利品フィルターで拾うか
  filterKeeps(state, item) {
    const f = state.settings.filter;
    if (this.keepReason(item, state)) return true;
    if (f.keepSocketed && item.rarity === "normal" && (item.sockets || []).length >= 2) return true;
    if (f.keepUpgrades) {
      const cur = state.equipment[item.slot];
      if (!cur || this.itemScore(item) > this.itemScore(cur) * (1 + WYD.data.items.autoEquip.minGain)) return true;
    }
    const min = f.slots[item.slot] || "normal";
    if (min === "none") return false;
    const order = WYD.data.items.rarities.map((r) => r.id);
    return order.indexOf(item.rarity) >= order.indexOf(min);
  },

  // 捨てたときにもらえる素材の数
  salvageValue(state, item) {
    const C = WYD.data.crafting;
    const base = Math.round((C.salvage[item.rarity] || 0) * WYD.season.mult(state, "materialsMult"));
    return base + Math.floor((item.enhanceSpent || 0) * C.enhance.refundOnSalvage);
  },

  salvage(state, item) {
    WYD.gems.returnGems(state, item);
    const n = this.salvageValue(state, item);
    state.materials = (state.materials || 0) + n;
    return n;
  },

  // ---- 鍛造 ----
  forgePotential(item) {
    if (item.forgePotential == null) item.forgePotential = WYD.data.crafting.forge.potential[item.rarity] || 0;
    return item.forgePotential;
  },

  forgeCost(item, kind) {
    const F = WYD.data.crafting.forge;
    return kind === "add" ? F.addCost + item.level : F.improveCost + Math.floor(item.level / 2);
  },

  // 鍛造する。kind = "improve"（lineIndex の能力を上げる）か "add"（新しい能力を足す）
  // 結果 { ok, why, crit, used }
  forge(state, item, kind, lineIndex) {
    const F = WYD.data.crafting.forge;
    const D = WYD.data.items;
    const pot = this.forgePotential(item);
    const cost = this.forgeCost(item, kind);
    if (pot <= 0) return { ok: false, why: "鍛造の余地がもうない" };
    if (state.materials < cost) return { ok: false, why: `${WYD.data.crafting.materialName}が${cost}個いる` };
    let line = null;
    if (kind === "improve") {
      line = item.stats[lineIndex];
      if (!line) return { ok: false, why: "その能力はない" };
    } else {
      const have = item.stats.filter((l) => !l.main).length;
      if (have >= F.maxAffixes) return { ok: false, why: "これ以上は能力を足せない" };
      const pool = D.affixes.filter((a) => !item.stats.some((l) => l.stat === a.stat));
      if (!pool.length) return { ok: false, why: "足せる能力がない" };
      const a = WYD.util.pick(pool);
      line = { stat: a.stat, value: WYD.loot.rollValue(a.stat, a.range, item.level), main: false };
    }
    state.materials -= cost;
    if (kind === "improve") {
      if (line.base == null) line.base = line.value;   // 元の値を覚えておく（上がる量が毎回同じになるように）
      line.value = Math.round((line.value + Math.abs(line.base) * F.improvePercent / 100) * 100) / 100;
    } else {
      item.stats.push(line);
    }
    const crit = Math.random() < F.critChance;
    const range = kind === "add" ? F.addPotential : F.improvePotential;
    const used = crit ? 0 : Math.min(pot, WYD.util.randInt(range[0], range[1]));
    item.forgePotential = pot - used;
    item.forged = (item.forged || 0) + 1;
    return { ok: true, crit, used, line };
  },

  // 振り直しの素材
  respecCost(state) {
    const C = WYD.data.crafting;
    return C.respecBase + C.respecPerLevel * state.player.level;
  },

  // スキルと修練の振り直し。もどしたポイントの数 { skill, paragon } か、素材が足りなければ null
  respec(state) {
    const cost = this.respecCost(state);
    if (state.materials < cost) return null;
    state.materials -= cost;
    const pl = state.player;
    let skill = 0;
    for (const id in WYD.data.skills) {
      const start = WYD.data.skills[id].startLevel;
      const lv = pl.skills[id] || 0;
      if (lv > start) skill += lv - start;
      pl.skills[id] = start;
      if (start <= 0) pl.skillEnabled[id] = false;
    }
    pl.skillPoints += skill;
    pl.runes = {};
    const pg = pl.paragon;
    const paragon = Object.keys(pg.board).length;
    pg.board = {};
    pg.points += paragon;
    return { skill, paragon };
  },

  // 次の強化に必要な素材（もう上げられなければ null）
  enhanceCost(item) {
    const E = WYD.data.crafting.enhance;
    const plus = item.plus || 0;
    if (plus >= E.max) return null;
    return Math.round(E.costBase * Math.pow(E.costGrowth, plus) * (E.rarityCostMult[item.rarity] || 1));
  },

  // 強化する。できたら true
  enhance(state, item) {
    const cost = this.enhanceCost(item);
    if (cost == null || state.materials < cost) return false;
    state.materials -= cost;
    item.plus = (item.plus || 0) + 1;
    item.enhanceSpent = (item.enhanceSpent || 0) + cost;
    return true;
  },

  rerollCost(item) {
    return WYD.data.crafting.rerollCost[item.rarity] || 0;
  },

  // 特殊効果をつけ直す。できたら true
  reroll(state, item) {
    const cost = this.rerollCost(item);
    if (cost <= 0 || state.materials < cost) return false;
    state.materials -= cost;
    item.effects = WYD.loot.rollEffects(item.rarity);
    return true;
  },
};
