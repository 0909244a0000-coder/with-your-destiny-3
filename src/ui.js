// 画面右側のパネル（キャラ・スキル・装備・持ち物・ログ）と上のボタン。
window.WYD = window.WYD || {};

WYD.ui = {
  state: null,
  world: null,
  dirty: true,
  craftMode: false,   // つけ直しモード（クリックで特殊効果をつけ直す）

  $(id) {
    return document.getElementById(id);
  },

  init(state, world) {
    this.state = state;
    this.world = world;
    const s = state;

    this.$("area-down").onclick = () => this.changeArea(-1);
    this.$("area-up").onclick = () => this.changeArea(1);
    this.$("diff-down").onclick = () => this.changeDifficulty(-1);
    this.$("diff-up").onclick = () => this.changeDifficulty(1);
    for (const btn of document.querySelectorAll("[data-speed]")) {
      btn.onclick = () => {
        s.settings.speed = Number(btn.dataset.speed);
        this.changed();
      };
    }
    this.$("skip-normal").onchange = (e) => {
      s.settings.skipNormal = e.target.checked;
      this.changed();
    };
    this.$("reset").onclick = () => {
      if (confirm("セーブデータを消して最初からやり直しますか？")) {
        WYD.save.reset();
        WYD.resetting = true;
        location.reload();
      }
    };
    const C = WYD.data.crafting;
    this.$("discard-normal").onclick = () => {
      const r = WYD.inventory.discardRarities(s, ["normal"]);
      this.log(`ノーマル装備を${r.count}個捨てた（${C.materialName} +${r.gained}）`);
      this.changed();
    };
    this.$("discard-magic").onclick = () => {
      const r = WYD.inventory.discardRarities(s, ["normal", "magic"]);
      this.log(`マジック以下の装備を${r.count}個捨てた（${C.materialName} +${r.gained}）`);
      this.changed();
    };
    this.$("craft-mode").onclick = () => {
      this.craftMode = !this.craftMode;
      this.markDirty();
    };

    // 持ち物：左クリックで装備、右クリックで捨てる
    const inv = this.$("inventory");
    inv.onclick = (e) => {
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      if (this.craftMode) this.rerollItem(s.inventory[Number(cell.dataset.index)]);
      else WYD.inventory.equip(s, Number(cell.dataset.index));
      this.changed();
    };
    inv.oncontextmenu = (e) => {
      e.preventDefault();
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      const item = s.inventory[Number(cell.dataset.index)];
      const gained = WYD.inventory.discard(s, Number(cell.dataset.index));
      if (item) this.log(`${item.name}を捨てた（${C.materialName} +${gained}）`);
      this.changed();
    };
    inv.onmouseover = (e) => this.showTooltipFor(e, "inv");
    inv.onmouseleave = () => this.hideTooltip();

    // 装備欄：クリックで外す
    const eq = this.$("equipment");
    eq.onclick = (e) => {
      const cell = e.target.closest("[data-slot]");
      if (!cell || !s.equipment[cell.dataset.slot]) return;
      if (this.craftMode) {
        this.rerollItem(s.equipment[cell.dataset.slot]);
        this.changed();
        return;
      }
      if (!WYD.inventory.unequip(s, cell.dataset.slot)) this.log("持ち物がいっぱいで外せない", "#ff6b6b");
      this.changed();
    };
    eq.onmouseover = (e) => this.showTooltipFor(e, "eq");
    eq.onmouseleave = () => this.hideTooltip();

    // スキル：＋ボタンとON/OFF
    this.$("skills").onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.skill;
      if (btn.dataset.action === "up") this.levelUpSkill(id);
      if (btn.dataset.action === "toggle") this.toggleSkill(id);
      this.changed();
    };
  },

  // 特殊効果をつけ直す（素材が足りなければ教える）
  rerollItem(item) {
    if (!item) return;
    const C = WYD.data.crafting;
    const cost = WYD.inventory.rerollCost(item);
    if (cost <= 0) return this.log("ノーマル装備には特殊効果をつけられない", "#ff6b6b");
    if (!WYD.inventory.reroll(this.state, item)) {
      return this.log(`${C.materialName}が足りない（${cost}個必要）`, "#ff6b6b");
    }
    const names = this.itemEffects(item).map((x) => x.def.name).join("・");
    this.log(`${item.name}の特殊効果をつけ直した → ${names}`, WYD.data.effects.color);
  },

  // 何かが変わったとき：画面を作り直してセーブ
  changed() {
    this.dirty = true;
    WYD.save.write(this.state);
  },

  markDirty() {
    this.dirty = true;
  },

  onLevelUp() {
    const stats = WYD.stats.compute(this.state);
    if (this.world && !this.world.player.dead) this.world.player.hp = stats.maxHp;
    WYD.save.write(this.state);
  },

  changeDifficulty(delta) {
    const s = this.state;
    const next = WYD.util.clamp(s.difficulty + delta, 1, s.maxDifficulty);
    if (next === s.difficulty) return;
    s.difficulty = next;
    WYD.world.resetEnemies(this.world, s, true);
    this.log(`危険度を ${next} にした`);
    this.changed();
  },

  // 行けるエリアの中で、前／次のエリアへ移動する
  changeArea(delta) {
    const s = this.state;
    const list = WYD.data.areas.filter((a) => s.unlockedAreas.includes(a.id));
    const i = list.findIndex((a) => a.id === s.area);
    const next = list[i + delta];
    if (!next) return;
    s.area = next.id;
    s.bossProgress = 0;
    WYD.world.resetEnemies(this.world, s, false);
    this.world.drops = [];
    this.log(`「${next.name}」へ移動した`, "#ff8a2a");
    this.changed();
  },

  // 今ONになっている（覚えていて使う）スキルの数
  activeSkillCount() {
    const pl = this.state.player;
    return Object.keys(WYD.data.skills).filter((id) => (pl.skills[id] || 0) > 0 && pl.skillEnabled[id]).length;
  },

  toggleSkill(id) {
    const pl = this.state.player;
    if (!pl.skillEnabled[id] && this.activeSkillCount() >= WYD.data.skillSlots) {
      this.log(`スキルは同時に${WYD.data.skillSlots}つまで。先にどれかをOFFにしてください`, "#ff6b6b");
      return;
    }
    pl.skillEnabled[id] = !pl.skillEnabled[id];
  },

  levelUpSkill(id) {
    const pl = this.state.player;
    const def = WYD.data.skills[id];
    if (pl.skillPoints <= 0 || pl.skills[id] >= def.maxLevel) return;
    // 新しく覚えたスキルは、枠が空いていればON、いっぱいならOFFにする
    if ((pl.skills[id] || 0) === 0) pl.skillEnabled[id] = this.activeSkillCount() < WYD.data.skillSlots;
    pl.skills[id] = (pl.skills[id] || 0) + 1;
    pl.skillPoints--;
    this.log(`${def.name}が Lv${pl.skills[id]} になった`, def.color);
  },

  log(msg, color) {
    const box = this.$("log");
    if (!box) return;
    const line = document.createElement("div");
    line.textContent = msg;
    if (color) line.style.color = color;
    box.prepend(line);
    while (box.children.length > 60) box.lastChild.remove();
  },

  // 毎コマ呼ばれる
  frame() {
    if (this.dirty) {
      this.dirty = false;
      this.renderPanels();
    }
    this.updateBars();
  },

  updateBars() {
    const s = this.state;
    const stats = WYD.stats.compute(s);
    const hp = Math.max(0, Math.round(this.world.player.hp || 0));
    this.$("hp-bar").style.width = `${(hp / stats.maxHp) * 100}%`;
    this.$("hp-text").textContent = `HP ${hp} / ${stats.maxHp}`;
    const need = WYD.stats.expToNext(s.player.level);
    const maxed = s.player.level >= WYD.data.player.maxLevel;
    this.$("exp-bar").style.width = maxed ? "100%" : `${(s.player.exp / need) * 100}%`;
    this.$("exp-text").textContent = maxed ? "EXP MAX" : `EXP ${s.player.exp} / ${need}`;
  },

  renderPanels() {
    const s = this.state;
    const P = WYD.data.player;
    const stats = WYD.stats.compute(s);
    const diff = WYD.data.difficulty;

    // 上のバー
    const area = WYD.world.area(s);
    const opened = WYD.data.areas.filter((a) => s.unlockedAreas.includes(a.id));
    const ai = opened.indexOf(area);
    this.$("area-name").textContent = area.name;
    this.$("area-down").disabled = ai <= 0;
    this.$("area-up").disabled = ai >= opened.length - 1;
    this.$("boss-progress").textContent = `（ボスまで ${s.bossProgress}/${area.killsForBoss}体）`;
    this.$("diff-value").textContent = s.difficulty;
    this.$("diff-progress").textContent =
      s.maxDifficulty >= diff.max
        ? "（最大まで解放済み）"
        : `（最高 ${s.maxDifficulty}／次の解放まで ${s.killsAtMax}/${diff.killsToUnlockNext}体${s.difficulty === s.maxDifficulty ? "" : "：最高危険度で倒すと進む"}）`;
    for (const btn of document.querySelectorAll("[data-speed]")) {
      btn.classList.toggle("active", Number(btn.dataset.speed) === s.settings.speed);
    }
    this.$("skip-normal").checked = s.settings.skipNormal;

    // キャラ
    this.$("char-name").textContent = `${P.className}　Lv ${s.player.level}`;
    const rows = [
      ["攻撃力", Math.round(stats.attack)],
      ["防御力", Math.round(stats.defense)],
      ["攻撃速度", `${stats.attackSpeed.toFixed(2)} 回/秒`],
      ["会心率", `${Math.round(stats.critChance)}%`],
      ["HP回復", `${stats.hpRegen.toFixed(1)} /秒`],
      ["移動速度", Math.round(stats.moveSpeed)],
      ["スキル威力", `+${Math.round(stats.skillDamage)}%`],
    ];
    this.$("stats").innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");

    // スキル
    this.$("skill-points").textContent = s.player.skillPoints;
    this.$("skill-slots").textContent = `${this.activeSkillCount()} / ${WYD.data.skillSlots}`;
    this.$("skills").innerHTML = Object.keys(WYD.data.skills).map((id) => {
      const def = WYD.data.skills[id];
      const lv = s.player.skills[id] || 0;
      const on = s.player.skillEnabled[id];
      const canUp = s.player.skillPoints > 0 && lv < def.maxLevel;
      return `<div class="skill">
        <div class="skill-head">
          ${WYD.data.skillIcons[id] ? `<img class="skill-icon" src="${WYD.data.skillIcons[id]}" alt="" onerror="this.remove()">` : ""}
          <b style="color:${def.color}">${def.name}</b>
          <span>Lv ${lv}/${def.maxLevel}</span>
          <button data-skill="${id}" data-action="up" ${canUp ? "" : "disabled"}>＋</button>
          <button data-skill="${id}" data-action="toggle" class="${on && lv > 0 ? "on" : "off"}" ${lv > 0 ? "" : "disabled"}>${lv > 0 ? (on ? "ON" : "OFF") : "未習得"}</button>
        </div>
        <div class="skill-desc">${def.desc}（${def.cooldown}秒ごと）</div>
      </div>`;
    }).join("");

    // 装備
    const slots = WYD.data.items.slots;
    this.$("equipment").innerHTML = Object.keys(slots).map((slot) => {
      const item = s.equipment[slot];
      return `<div class="cell slot" data-slot="${slot}" ${item ? `style="border-color:${this.color(item)}"` : ""}>
        <small>${slots[slot]}${item ? this.fxMark(item) : ""}</small>
        ${item ? `<span style="color:${this.color(item)}">${item.name}</span>${this.iconImg(item)}` : `<span class="empty">なし</span>`}
      </div>`;
    }).join("");

    // 持ち物
    const size = WYD.data.items.inventorySize;
    this.$("inv-count").textContent = `${s.inventory.length} / ${size}`;
    const C = WYD.data.crafting;
    this.$("materials").innerHTML = `<span style="color:${C.materialColor}">${C.materialName} ${s.materials}</span>`;
    this.$("craft-mode").textContent = `つけ直しモード：${this.craftMode ? "ON" : "OFF"}`;
    this.$("craft-mode").classList.toggle("active", this.craftMode);
    this.$("inv-help").textContent = this.craftMode
      ? "つけ直しモード：持ち物や装備をクリックすると、素材を使って特殊効果をつけ直す"
      : "左クリック：装備する／右クリック：捨てる（捨てると素材になる）";
    let html = "";
    for (let i = 0; i < size; i++) {
      const item = s.inventory[i];
      html += item
        ? `<div class="cell" data-index="${i}" style="border-color:${this.color(item)}">
             <small>${slots[item.slot]}${this.fxMark(item)}</small><span style="color:${this.color(item)}">${item.name}</span>${this.iconImg(item)}
           </div>`
        : `<div class="cell blank"></div>`;
    }
    this.$("inventory").innerHTML = html;
    this.hideTooltip();
  },

  // 装備のアイコン（絵が用意されているときだけ）。読めなかったら消す
  iconImg(item) {
    const src = WYD.loot.iconOf(item);
    return src ? `<img class="item-icon" src="${src}" alt="" onerror="this.remove()">` : "";
  },

  // マスの右上に出す特殊効果の数の印（例：✦2）
  fxMark(item) {
    const n = this.itemEffects(item).length;
    return n ? ` <b class="fx-mark" style="color:${WYD.data.effects.color}">✦${n}</b>` : "";
  },

  color(item) {
    return WYD.loot.rarityInfo(item.rarity).color;
  },

  // ---------- 装備の説明（マウスを乗せたとき） ----------
  itemHtml(item, title) {
    const r = WYD.loot.rarityInfo(item.rarity);
    const lines = item.stats.map((l) =>
      `<div class="${l.main ? "main" : "affix"}">${WYD.util.formatStat(l.stat, l.value)}</div>`
    ).join("");
    const fxLines = this.itemEffects(item).map(({ def, value }) =>
      `<div class="effect" style="color:${WYD.data.effects.color}">✦ ${def.name}<br><small>${WYD.util.formatEffect(def, value)}</small></div>`
    ).join("");
    return `<div class="tip-item">
      ${title ? `<div class="tip-title">${title}</div>` : ""}
      <div style="color:${r.color};font-weight:bold">${item.name}</div>
      <div class="tip-sub">${r.name}・${WYD.data.items.slots[item.slot]}・アイテムLv ${item.level}</div>
      ${lines}
      ${fxLines}
    </div>`;
  },

  // 装備の特殊効果（古いセーブの装備や、data から消えた効果は無視する）
  itemEffects(item) {
    const list = [];
    for (const fx of item.effects || []) {
      const def = WYD.loot.effectInfo(fx.id);
      if (def) list.push({ def, value: fx.value });
    }
    return list;
  },

  // 今の装備と取り替えたら、何がどれだけ変わるか
  compareHtml(item, cur) {
    const sum = (it) => {
      const total = { stats: {}, effects: {} };
      if (!it) return total;
      for (const l of it.stats) total.stats[l.stat] = (total.stats[l.stat] || 0) + l.value;
      for (const { def, value } of this.itemEffects(it)) total.effects[def.id] = (total.effects[def.id] || 0) + value;
      return total;
    };
    const a = sum(item), b = sum(cur);
    const rows = [];
    const row = (label, diff) => {
      const up = diff > 0;
      rows.push(`<div class="${up ? "up" : "down"}">${up ? "▲" : "▼"} ${label}</div>`);
    };
    for (const stat in WYD.data.items.stats) {
      const diff = (a.stats[stat] || 0) - (b.stats[stat] || 0);
      if (Math.abs(diff) > 1e-9) row(WYD.util.formatStat(stat, diff), diff);
    }
    for (const def of WYD.data.effects.list) {
      const diff = (a.effects[def.id] || 0) - (b.effects[def.id] || 0);
      if (Math.abs(diff) > 1e-9) {
        const sign = diff > 0 ? "+" : "";
        row(`${def.name} ${sign}${diff.toFixed(def.decimals)}%`, diff);
      }
    }
    return `<div class="tip-item tip-compare">
      <div class="tip-title">装備するとこう変わる</div>
      ${rows.length ? rows.join("") : `<div class="tip-sub">変化なし</div>`}
    </div>`;
  },

  showTooltipFor(e, where) {
    const s = this.state;
    let item = null, html = "";
    if (where === "inv") {
      const cell = e.target.closest("[data-index]");
      item = cell && s.inventory[Number(cell.dataset.index)];
      if (item) {
        html = this.itemHtml(item);
        const cur = s.equipment[item.slot];
        html += cur ? this.itemHtml(cur, "いま装備中") : `<div class="tip-item tip-sub">この部位は何も装備していない</div>`;
        html += this.compareHtml(item, cur);
        html += this.craftMode
          ? this.rerollHelp(item)
          : `<div class="tip-help">左クリック：装備する／右クリック：捨てる（${WYD.data.crafting.materialName} +${WYD.data.crafting.salvage[item.rarity] || 0}）</div>`;
      }
    } else {
      const cell = e.target.closest("[data-slot]");
      item = cell && s.equipment[cell.dataset.slot];
      if (item) html = this.itemHtml(item) + (this.craftMode ? this.rerollHelp(item) : `<div class="tip-help">クリック：外す</div>`);
    }
    if (!item) return this.hideTooltip();
    const tip = this.$("tooltip");
    tip.innerHTML = html;
    tip.style.display = "block";
    const rect = tip.getBoundingClientRect();
    let x = e.clientX - rect.width - 16;
    if (x < 8) x = e.clientX + 16;
    const y = Math.min(window.innerHeight - rect.height - 8, e.clientY + 8);
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  },

  rerollHelp(item) {
    const C = WYD.data.crafting;
    const cost = WYD.inventory.rerollCost(item);
    if (cost <= 0) return `<div class="tip-help">この装備は特殊効果をつけ直せない</div>`;
    const ok = this.state.materials >= cost;
    return `<div class="tip-help" style="color:${ok ? C.materialColor : "#ff6b6b"}">クリック：特殊効果をつけ直す（${C.materialName} ${cost}個／持っている数 ${this.state.materials}）</div>`;
  },

  hideTooltip() {
    const tip = this.$("tooltip");
    if (tip) tip.style.display = "none";
  },
};
