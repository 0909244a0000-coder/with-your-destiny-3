// 画面右側のパネル（キャラ・スキル・装備・持ち物・ログ）と上のボタン。
window.WYD = window.WYD || {};

WYD.ui = {
  state: null,
  world: null,
  dirty: true,
  craftMode: false,   // つけ直しモード（クリックで特殊効果をつけ直す）
  paused: false,      // 一時停止中か（セーブしない）
  enhanceMode: false, // 強化モード（クリックで +1 する）
  gemSelected: null,  // はめるために選んだ宝石（"種類:段階"）
  stashOpen: false,   // 倉庫を開いているか

  $(id) {
    return document.getElementById(id);
  },

  init(state, world) {
    this.state = state;
    this.world = world;
    const s = state;

    this.$("help").onclick = () => this.showStory("help");
    this.$("codex-open").onclick = () => {
      this.$("codex-body").innerHTML = this.codexHtml();
      this.$("codex").hidden = false;
    };
    this.$("codex-close").onclick = () => { this.$("codex").hidden = true; };
    // セーブのバックアップ
    this.$("backup-export").onclick = () => {
      WYD.save.exportAll(s);
      this.log("セーブをファイルに書き出した（ダウンロードの場所に保存されます）", "#7dff8a");
    };
    this.$("backup-import").onclick = () => this.$("backup-file").click();
    this.$("backup-file").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then((text) => {
        if (!confirm("今のセーブを、このファイルの中身で置きかえますか？（今のセーブは消えます）")) return;
        try {
          WYD.save.importAll(text);
          WYD.resetting = true;
          location.reload();
        } catch (err) {
          alert(`読み込めませんでした：${err.message}`);
        }
      });
      e.target.value = "";
    };
    // 職業の切り替え
    this.$("class-select").innerHTML = Object.keys(WYD.data.classes)
      .map((id) => `<option value="${id}">${WYD.data.classes[id].name}</option>`).join("");
    this.$("class-select").value = WYD.classes.id;
    this.$("class-select").onchange = (e) => {
      const name = WYD.data.classes[e.target.value].name;
      if (confirm(`「${name}」に切り替えますか？（今のキャラのセーブはそのまま残ります）`)) WYD.classes.switchTo(e.target.value, s);
      else e.target.value = WYD.classes.id;
    };
    // 修練ポイントを振る
    this.$("paragon").onclick = (e) => {
      const btn = e.target.closest("button[data-paragon]");
      if (!btn) return;
      const pg = s.player.paragon;
      if (pg.points <= 0) return;
      pg.points--;
      pg.alloc[btn.dataset.paragon] = (pg.alloc[btn.dataset.paragon] || 0) + 1;
      this.changed();
    };
    this.$("sound-toggle").onclick = () => {
      s.settings.sound = !s.settings.sound;
      this.changed();
    };
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
    this.$("trial-down").onclick = () => this.changeTrialLevel(-1);
    this.$("trial-up").onclick = () => this.changeTrialLevel(1);
    this.$("trial-start").onclick = () => {
      if (WYD.trial.active(s)) WYD.trial.stop(this.world, s);
      else WYD.trial.start(this.world, s, s.trial.level);
    };
    this.$("daily-start").onclick = () => WYD.daily.start(this.world, s);
    this.$("trial-auto").onchange = (e) => {
      s.trial.autoNext = e.target.checked;
      this.changed();
    };
    this.$("pause").onclick = () => this.togglePause();
    // キーボード：スペース＝一時停止、1・2・4＝速度（文字を入力している所では効かない）
    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input, select, textarea")) return;
      if (e.code === "Space") {
        e.preventDefault();
        this.togglePause();
      } else if (["1", "2", "4"].includes(e.key)) {
        s.settings.speed = Number(e.key);
        this.changed();
      }
    });
    this.$("auto-diff").onchange = (e) => {
      s.settings.autoDifficulty = e.target.checked;
      this.changed();
    };
    this.$("auto-salvage").innerHTML = WYD.data.crafting.autoSalvageOptions
      .map((o) => `<option value="${o.id}">${o.label}</option>`).join("");
    this.$("auto-equip").onchange = (e) => {
      s.settings.autoEquip = e.target.checked;
      this.changed();
    };
    this.$("auto-salvage").onchange = (e) => {
      s.settings.autoSalvage = e.target.value;
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
      if (this.craftMode) this.enhanceMode = false;
      this.markDirty();
    };
    this.$("enhance-mode").onclick = () => {
      this.enhanceMode = !this.enhanceMode;
      if (this.enhanceMode) this.craftMode = false;
      this.markDirty();
    };

    // 宝石：クリックで選ぶ（もう一度で選ぶのをやめる）、「合成」で1つ上の段階に
    this.$("gems").onclick = (e) => {
      const btn = e.target.closest("[data-gem-combine]");
      if (btn) {
        const key = btn.dataset.gemCombine;
        const info = WYD.gems.info(key);
        const next = info && WYD.gems.key(info.def.id, info.tier + 1);
        if (WYD.gems.combine(s, key)) this.log(`${WYD.gems.name(key)}を合成して、${WYD.gems.name(next)}にした`, WYD.gems.color(key));
        else this.log("合成できない（宝石の数か素材が足りない）", "#ff6b6b");
        if (!(s.gems[this.gemSelected] > 0)) this.gemSelected = null;
        this.changed();
        return;
      }
      const chip = e.target.closest("[data-gem]");
      if (!chip) return;
      this.gemSelected = this.gemSelected === chip.dataset.gem ? null : chip.dataset.gem;
      this.markDirty();
    };

    // 持ち物：左クリックで装備、右クリックで捨てる
    const inv = this.$("inventory");
    inv.onclick = (e) => {
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      const index = Number(cell.dataset.index);
      if (this.gemSelected) this.socketGem(s.inventory[index]);
      else if (this.enhanceMode) this.enhanceItem(s.inventory[index]);
      else if (this.craftMode) this.rerollItem(s.inventory[index]);
      else if (e.shiftKey) {
        if (!WYD.inventory.toStash(s, index)) this.log("倉庫がいっぱいで入れられない", "#ff6b6b");
      } else WYD.inventory.equip(s, index);
      this.changed();
    };
    inv.oncontextmenu = (e) => {
      e.preventDefault();
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      const item = s.inventory[Number(cell.dataset.index)];
      const gained = WYD.inventory.discard(s, Number(cell.dataset.index));
      if (item) this.log(`${WYD.loot.label(item)}を捨てた（${C.materialName} +${gained}）`);
      this.changed();
    };
    inv.onmouseover = (e) => this.showTooltipFor(e, "inv");
    inv.onmouseleave = () => this.hideTooltip();

    // 倉庫：クリックで持ち物へ、右クリックで捨てる
    this.$("stash-toggle").onclick = () => {
      this.stashOpen = !this.stashOpen;
      this.markDirty();
    };
    const stash = this.$("stash");
    stash.onclick = (e) => {
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      if (this.gemSelected) this.socketGem(s.stash[Number(cell.dataset.index)]);
      else if (this.enhanceMode) this.enhanceItem(s.stash[Number(cell.dataset.index)]);
      else if (this.craftMode) this.rerollItem(s.stash[Number(cell.dataset.index)]);
      else if (!WYD.inventory.fromStash(s, Number(cell.dataset.index))) this.log("持ち物がいっぱいで戻せない", "#ff6b6b");
      this.changed();
    };
    stash.oncontextmenu = (e) => {
      e.preventDefault();
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      const item = s.stash[Number(cell.dataset.index)];
      const gained = WYD.inventory.discardFromStash(s, Number(cell.dataset.index));
      if (item) this.log(`${WYD.loot.label(item)}を捨てた（${C.materialName} +${gained}）`);
      this.changed();
    };
    stash.onmouseover = (e) => this.showTooltipFor(e, "stash");
    stash.onmouseleave = () => this.hideTooltip();

    // 装備欄：クリックで外す
    const eq = this.$("equipment");
    eq.onclick = (e) => {
      const cell = e.target.closest("[data-slot]");
      if (!cell || !s.equipment[cell.dataset.slot]) return;
      if (this.gemSelected || this.enhanceMode) {
        if (this.gemSelected) this.socketGem(s.equipment[cell.dataset.slot]);
        else this.enhanceItem(s.equipment[cell.dataset.slot]);
        this.changed();
        return;
      }
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

    // スキルの型を選ぶ
    this.$("skills").onchange = (e) => {
      const sel = e.target.closest("select[data-rune-skill]");
      if (!sel) return;
      s.player.runes[sel.dataset.runeSkill] = sel.value || undefined;
      if (!sel.value) delete s.player.runes[sel.dataset.runeSkill];
      this.changed();
    };
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
  enhanceItem(item) {
    if (!item) return;
    const C = WYD.data.crafting;
    const cost = WYD.inventory.enhanceCost(item);
    if (cost == null) return this.log(`${WYD.loot.label(item)}はこれ以上強化できない`, "#ff6b6b");
    if (!WYD.inventory.enhance(this.state, item)) return this.log(`${C.materialName}が足りない（${cost}個必要）`, "#ff6b6b");
    this.log(`${WYD.loot.label(item)}に強化した（${C.materialName} -${cost}）`, C.enhance.color);
    WYD.sound.play("rareDrop");
  },

  enhanceHelp(item) {
    const C = WYD.data.crafting;
    const cost = WYD.inventory.enhanceCost(item);
    if (cost == null) return `<div class="tip-help">これ以上強化できない（最大 +${C.enhance.max}）</div>`;
    const ok = this.state.materials >= cost;
    return `<div class="tip-help" style="color:${ok ? C.enhance.color : "#ff6b6b"}">クリック：+${(item.plus || 0) + 1} に強化する（能力が ${Math.round(C.enhance.statPerLevel * 100)}% ぶん上がる。${C.materialName} ${cost}個／持っている数 ${this.state.materials}）</div>`;
  },

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

  // 真ん中に出るお知らせの画面（遊び方・おかえりなさい・クリア）
  showModal(title, text, items) {
    this.$("modal-title").textContent = title;
    this.$("modal-text").textContent = text;
    this.$("modal-list").innerHTML = items.map((x) => `<li>${x}</li>`).join("");
    this.$("modal").hidden = false;
    this.$("modal-ok").onclick = () => { this.$("modal").hidden = true; };
  },

  // 「おかえりなさい」の画面（放置中の進行）
  showWelcome(text, items) {
    this.showModal("おかえりなさい", text, items);
    this.log(`${text} ${items.join("、")}`, "#ffd447");
  },

  showStory(key) {
    const st = WYD.data.story[key];
    this.showModal(st.title, st.text, st.items);
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
    if (this.world && !this.world.player.dead) {
      this.world.player.hp = stats.maxHp;
      const p = this.world.player;
      WYD.fx.burst(this.world, p.x, p.y + 10, WYD.data.fx.levelUp, null, { angle: -Math.PI / 2, spread: 0.6, glow: true });
      WYD.sound.play("levelUp");
    }
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

  togglePause() {
    this.paused = !this.paused;
    this.markDirty();
  },

  // 試練の段階を選ぶ（最高記録の次の段階まで）
  changeTrialLevel(delta) {
    const s = this.state;
    s.trial.level = WYD.util.clamp(s.trial.level + delta, 1, s.trial.best + 1);
    this.changed();
  },

  // 行けるエリアの中で、前／次のエリアへ移動する
  changeArea(delta) {
    const s = this.state;
    if (WYD.trial.active(s)) WYD.trial.stop(this.world, s);
    const list = WYD.data.areas.filter((a) => s.unlockedAreas.includes(a.id));
    const i = list.findIndex((a) => a.id === s.area);
    const next = list[i + delta];
    if (!next) return;
    s.area = next.id;
    s.bossProgress = 0;
    s.floor = 1;
    WYD.world.resetEnemies(this.world, s, false);
    this.world.drops = [];
    this.log(`「${next.name}」へ移動した`, "#ff8a2a");
    const intro = WYD.data.story.areaIntro[next.id];
    if (intro) this.log(intro, "#c9b48a");
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
    const dps = Math.round(WYD.world.dps(this.world));
    this.$("dps").textContent = `秒間ダメージ（直近${WYD.data.combat.dpsWindow}秒）：${dps.toLocaleString()}`;
    const stats = WYD.stats.compute(s);
    const hp = Math.max(0, Math.round(this.world.player.hp || 0));
    this.$("hp-bar").style.width = `${(hp / stats.maxHp) * 100}%`;
    this.$("hp-text").textContent = `HP ${hp} / ${stats.maxHp}`;
    const need = WYD.stats.expToNext(s.player.level);
    const maxed = s.player.level >= WYD.data.player.maxLevel;
    if (maxed) {
      // レベル上限のあとは、修練の経験値を出す
      const pg = s.player.paragon;
      const pneed = WYD.stats.paragonToNext(pg.level);
      this.$("exp-bar").style.width = `${(pg.exp / pneed) * 100}%`;
      this.$("exp-text").textContent = `修練 ${Math.floor(pg.exp)} / ${pneed}`;
    } else {
      this.$("exp-bar").style.width = `${(s.player.exp / need) * 100}%`;
      this.$("exp-text").textContent = `EXP ${s.player.exp} / ${need}`;
    }
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
    this.$("boss-progress").textContent = WYD.trial.active(s) ? "" : WYD.world.isBossRoom(s)
      ? `（${WYD.world.floorName(s)}）`
      : `（${WYD.world.floorName(s)}・次の階まで ${s.bossProgress}/${area.killsPerFloor}体）`;
    this.$("diff-value").textContent = s.difficulty;
    this.$("diff-progress").textContent =
      s.maxDifficulty >= diff.max
        ? "（最大まで解放済み）"
        : `（最高 ${s.maxDifficulty}／次の解放まで ${s.killsAtMax}/${diff.killsToUnlockNext}体${s.difficulty === s.maxDifficulty ? "" : "：最高危険度で倒すと進む"}）`;
    for (const btn of document.querySelectorAll("[data-speed]")) {
      btn.classList.toggle("active", Number(btn.dataset.speed) === s.settings.speed);
    }
    this.$("auto-salvage").value = s.settings.autoSalvage;
    this.$("auto-equip").checked = !!s.settings.autoEquip;
    this.$("pause").textContent = this.paused ? "再開" : "停止";
    this.$("pause").classList.toggle("active", this.paused);
    this.$("sound-toggle").textContent = `音：${s.settings.sound ? "ON" : "OFF"}`;
    this.$("auto-diff").checked = s.settings.autoDifficulty;
    const inTrial = WYD.trial.active(s);
    this.$("trial-group").hidden = !WYD.trial.unlocked(s);
    this.$("trial-level").textContent = inTrial ? s.trialRun.level : s.trial.level;
    this.$("trial-down").disabled = inTrial || s.trial.level <= 1;
    this.$("trial-up").disabled = inTrial || s.trial.level >= s.trial.best + 1;
    this.$("trial-start").textContent = inTrial ? "やめる" : "挑む";
    this.$("trial-auto").checked = s.trial.autoNext;
    this.$("trial-best").textContent = `（最高 段階${s.trial.best}）`;
    const dailyDone = WYD.daily.doneToday(s);
    this.$("daily-start").disabled = inTrial || dailyDone;
    this.$("daily-start").textContent = dailyDone ? `日替わり：済（連続${s.daily.streak}日）` : `日替わり（段階${WYD.daily.stage(s)}）`;
    this.$("daily-start").title = `1日1回、決まった条件で挑む。成功で素材・ユニーク装備・宝石。連続で成功すると素材が増える\n今日の条件：${WYD.daily.describe()}`;
    // 試練の最中はエリアと危険度は変えられない
    this.$("diff-down").disabled = this.$("diff-up").disabled = inTrial;
    if (inTrial) this.$("area-down").disabled = this.$("area-up").disabled = true;

    // キャラ
    const pg = s.player.paragon;
    this.$("char-name").textContent = `${P.className}　Lv ${s.player.level}${pg.level > 0 ? `　修練 ${pg.level}` : ""}`;
    this.$("paragon").hidden = !(s.player.level >= P.maxLevel || pg.level > 0);
    if (!this.$("paragon").hidden) this.$("paragon").innerHTML = this.paragonHtml();
    const rows = [
      ["攻撃力", Math.round(stats.attack)],
      ["防御力", Math.round(stats.defense)],
      ["攻撃速度", `${stats.attackSpeed.toFixed(2)} 回/秒`],
      ["会心率", `${Math.round(stats.critChance)}%`],
      ["HP回復", `${stats.hpRegen.toFixed(1)} /秒`],
      ["移動速度", Math.round(stats.moveSpeed)],
      ["スキル威力", `+${Math.round(stats.skillDamage)}%`],
      ["会心ダメージ", `×${stats.critMultiplier.toFixed(2)}`],
    ];
    this.$("stats").innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
    this.$("build").innerHTML = this.buildHtml(stats);

    // スキル
    this.$("skill-points").textContent = s.player.skillPoints;
    this.$("skill-slots").textContent = `${this.activeSkillCount()} / ${WYD.data.skillSlots}`;
    const skillsHtml = Object.keys(WYD.data.skills).map((id) => {
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
        <div class="skill-desc">${def.desc}（${Math.round(WYD.runes.effectiveDef(s, id).cooldown * 10) / 10}秒ごと）</div>
        ${this.runeHtml(id, lv)}
      </div>`;
    }).join("");
    // 中身が変わったときだけ作り直す（選択欄を開いている最中に閉じないように）
    if (skillsHtml !== this.lastSkillsHtml) {
      this.$("skills").innerHTML = skillsHtml;
      this.lastSkillsHtml = skillsHtml;
    }

    // 装備
    const slots = WYD.data.items.slots;
    this.$("equipment").innerHTML = Object.keys(slots).map((slot) => {
      const item = s.equipment[slot];
      return `<div class="cell slot" data-slot="${slot}" ${item ? `style="border-color:${this.color(item)};--r:${this.glow(item)}"` : ""}>
        <small>${slots[slot]}${item ? this.fxMark(item) : ""}</small>
        ${item ? `<span style="color:${this.color(item)}">${WYD.loot.label(item)}</span>${this.iconImg(item)}` : `<span class="empty">なし</span>`}
      </div>`;
    }).join("");

    // 持ち物
    const size = WYD.data.items.inventorySize;
    this.$("inv-count").textContent = `${s.inventory.length} / ${size}`;
    const C = WYD.data.crafting;
    this.$("materials").innerHTML = `<span style="color:${C.materialColor}">${C.materialName} ${s.materials}</span>`;
    this.$("craft-mode").textContent = `つけ直しモード：${this.craftMode ? "ON" : "OFF"}`;
    this.$("craft-mode").classList.toggle("active", this.craftMode);
    this.$("enhance-mode").textContent = `強化モード：${this.enhanceMode ? "ON" : "OFF"}`;
    this.$("enhance-mode").classList.toggle("active", this.enhanceMode);
    this.$("inv-help").textContent = this.enhanceMode
      ? "強化モード：持ち物や装備をクリックすると、素材を使って +1 強化する（捨てると使った素材の半分がもどる）"
      : this.craftMode
      ? "つけ直しモード：持ち物や装備をクリックすると、素材を使って特殊効果をつけ直す"
      : "左クリック：装備する／右クリック：捨てる（捨てると素材になる）／Shift＋クリック：倉庫へ";
    this.$("inventory").innerHTML = this.cellsHtml(s.inventory, size);
    this.$("gems").innerHTML = this.gemsHtml();
    if (this.gemSelected) this.$("inv-help").textContent = `${WYD.gems.name(this.gemSelected)}を選んでいる：持ち物・装備・倉庫の装備をクリックすると、空いたソケットにはめる（もう一度宝石をクリックでやめる）`;

    // 倉庫
    const stashSize = WYD.data.items.stashSize;
    this.$("stash-count").textContent = `${s.stash.length} / ${stashSize}`;
    this.$("stash-toggle").textContent = this.stashOpen ? "閉じる" : "開く";
    this.$("stash-body").hidden = !this.stashOpen;
    if (this.stashOpen) this.$("stash").innerHTML = this.cellsHtml(s.stash, stashSize);
    this.hideTooltip();
  },

  // 持ち物・倉庫のマス目
  cellsHtml(list, size) {
    const slots = WYD.data.items.slots;
    let html = "";
    for (let i = 0; i < size; i++) {
      const item = list[i];
      html += item
        ? `<div class="cell" data-index="${i}" style="border-color:${this.color(item)};--r:${this.glow(item)}">
             <small>${slots[item.slot]}${this.upgradeMark(item)}${this.fxMark(item)}</small><span style="color:${this.color(item)}">${WYD.loot.label(item)}</span>${this.iconImg(item)}
           </div>`
        : `<div class="cell blank"></div>`;
    }
    return html;
  },

  // 今つけている装備より点数が高ければ「▲」（点数は自動装備と同じ）
  upgradeMark(item) {
    const cur = this.state.equipment[item.slot];
    const gain = WYD.inventory.itemScore(item) - WYD.inventory.itemScore(cur);
    if (cur && gain <= WYD.inventory.itemScore(cur) * WYD.data.items.autoEquip.minGain) return "";
    return ` <b class="up-mark" title="いま装備しているものより強い（自動装備と同じ点数で比べた目安）">▲</b>`;
  },

  // 装備を変えたときの点数の変わり方（％）
  scoreChangeText(item, cur) {
    const a = WYD.inventory.itemScore(item), b = WYD.inventory.itemScore(cur);
    if (!cur || b <= 0) return `<div class="up">総合の目安：この部位が空いているので強くなる</div>`;
    const pct = Math.round((a - b) / b * 100);
    if (pct === 0) return `<div class="tip-sub">総合の目安：ほぼ同じ</div>`;
    return `<div class="${pct > 0 ? "up" : "down"}">総合の目安：${pct > 0 ? "▲" : "▼"} ${pct > 0 ? "+" : ""}${pct}%</div>`;
  },

  // セットのボーナスの説明文
  // 選んだ宝石を装備にはめる
  socketGem(item) {
    if (!item) return;
    const key = this.gemSelected;
    if (WYD.gems.socket(this.state, item, key)) {
      this.log(`${item.name}に${WYD.gems.name(key)}をはめた（${WYD.gems.statsText(key, item.slot)}）`, WYD.gems.color(key));
      if (!(this.state.gems[key] > 0)) this.gemSelected = null;
    } else {
      this.log(`${item.name}には空いたソケットがない`, "#ff6b6b");
    }
  },

  // 宝石の欄
  gemsHtml() {
    const s = this.state;
    const G = WYD.data.gems;
    const keys = Object.keys(s.gems).filter((k) => s.gems[k] > 0 && WYD.gems.info(k))
      .sort((a, b) => a.localeCompare(b));
    if (keys.length === 0) return `<p class="muted">まだ宝石がない（精鋭とボスがよく落とす）</p>`;
    return keys.map((k) => {
      const info = WYD.gems.info(k);
      const cost = WYD.gems.combineCost(k);
      const canCombine = cost != null && s.gems[k] >= G.combineCount;
      const tip = Object.keys(G.groupName).map((g) => {
        const st = info.def[g] || {};
        return `${G.groupName[g]}：` + Object.keys(st).map((x) => WYD.util.formatStat(x, st[x] * info.tierDef.mult)).join("、");
      }).join("\n");
      return `<span class="gem-chip${this.gemSelected === k ? " selected" : ""}" data-gem="${k}" title="${tip}" style="border-color:${info.def.color}">` +
        `<b style="color:${info.def.color}">◆ ${WYD.gems.name(k)}</b> ×${s.gems[k]}` +
        (canCombine ? ` <button data-gem-combine="${k}" title="${G.combineCount}つと${WYD.data.crafting.materialName}${cost}個で1つ上の段階に">合成</button>` : "") +
        `</span>`;
    }).join("");
  },

  // 装備のソケットの表示
  socketsHtml(item) {
    if (!item.sockets || item.sockets.length === 0) return "";
    return item.sockets.map((key) => key
      ? `<div class="socket" style="color:${WYD.gems.color(key)}">◆ ${WYD.gems.name(key)}：${WYD.gems.statsText(key, item.slot)}</div>`
      : `<div class="socket empty">◇ 空いたソケット</div>`).join("");
  },

  // 図鑑と記録の画面
  codexHtml() {
    const s = this.state;
    const R = WYD.data.records;
    const rec = WYD.records;
    const rarity = (id) => WYD.loot.rarityInfo(id);
    const baseName = (id) => (WYD.data.items.bases.find((b) => b.id === id) || {}).name || "";
    // 記録
    const counters = R.counters.map((c) => {
      const v = s.records[c.id] || 0;
      return `<div class="codex-row"><span>${c.name}</span><b>${c.time ? rec.timeText(v) : Math.floor(v).toLocaleString()}</b></div>`;
    }).join("") +
      `<div class="codex-row"><span>最高危険度</span><b>${s.maxDifficulty}</b></div>` +
      `<div class="codex-row"><span>試練の最高段階</span><b>${s.trial.best}</b></div>` +
      `<div class="codex-row"><span>日替わりの試練（成功・最高連続）</span><b>${s.daily.total}回・${s.daily.bestStreak}日</b></div>`;
    // 実績
    const done = R.achievements.filter((a) => s.achievements[a.id]).length;
    const achievements = R.achievements.map((a) => {
      const ok = s.achievements[a.id];
      const now = Math.min(rec.progress(s, a), rec.target(a));
      return `<div class="codex-ach${ok ? " done" : ""}"><b>${ok ? "★" : "☆"} ${a.name}</b> <small>${a.desc}</small>` +
        `<span class="codex-ach-side">${ok ? "達成" : `${Math.floor(now).toLocaleString()} / ${rec.target(a).toLocaleString()}`}　${WYD.data.crafting.materialName} ${a.reward}</span></div>`;
    }).join("");
    // ユニーク図鑑
    const U = WYD.data.uniques;
    const uFound = U.list.filter((u) => s.codex.uniques[u.id]).length;
    const uniques = U.list.map((u) => s.codex.uniques[u.id]
      ? `<div class="codex-item"><b style="color:${rarity("unique").color}">${u.name}</b> <small class="muted">${baseName(u.base)}</small><br><small>${WYD.loot.uniqueDesc(u)}</small></div>`
      : `<div class="codex-item unknown"><b>？？？</b> <small class="muted">${baseName(u.base)}</small></div>`).join("");
    // セット図鑑
    const SE = WYD.data.sets;
    const sets = SE.list.map((set) => {
      const have = set.pieces.filter((p) => s.codex.setPieces[p.id]).length;
      const pieces = set.pieces.map((p) => s.codex.setPieces[p.id]
        ? `<span style="color:${SE.color}">${p.name}</span>` : `<span class="muted">？？？（${baseName(p.base)}）</span>`).join("、");
      const bonuses = Object.keys(set.bonuses).map((n) => `<div><small>（${n}つ）${this.bonusText(set.bonuses[n])}</small></div>`).join("");
      return `<div class="codex-item"><b style="color:${SE.color}">${set.name}</b> <small class="muted">${have}/${set.pieces.length}</small><br><small>${pieces}</small>${bonuses}</div>`;
    }).join("");
    return `<div class="codex-cols">
      <div><h3>記録</h3>${counters}<h3>実績 <small>${done}/${R.achievements.length}</small></h3>${achievements}</div>
      <div><h3>ユニーク図鑑 <small>${uFound}/${U.list.length}</small></h3>${uniques}<h3>セット図鑑</h3>${sets}</div>
    </div>`;
  },

  bonusText(bonus) {
    const parts = [];
    for (const k in bonus.stats || {}) parts.push(WYD.util.formatStat(k, bonus.stats[k]));
    for (const id in bonus.effects || {}) {
      const def = WYD.loot.effectInfo(id);
      if (def) parts.push(`${def.name}（${WYD.util.formatEffect(def, bonus.effects[id])}）`);
    }
    if (bonus.power) parts.push(WYD.loot.uniqueDesc(bonus));
    return parts.join("、");
  },

  // セット装備の説明（そろっている数と、ボーナス）
  setHtml(item) {
    const info = WYD.loot.setInfo(item);
    if (!info) return "";
    const C = WYD.data.sets.color;
    const have = WYD.stats.setCounts(this.state)[info.set.id] || 0;
    const owned = (p) => Object.values(this.state.equipment).some((it) => it && it.piece === p.id);
    const pieces = info.set.pieces.map((p) => `<span style="color:${owned(p) ? C : "#777"}">${p.name}</span>`).join("・");
    const bon = Object.keys(info.set.bonuses).map((need) =>
      `<div style="color:${have >= Number(need) ? C : "#777"}">（${need}つ）${this.bonusText(info.set.bonuses[need])}</div>`).join("");
    return `<div class="unique-power"><span style="color:${C}">■ ${info.set.name}（装備中 ${have}/${info.set.pieces.length}）</span><br><small>${pieces}</small><small>${bon}</small></div>`;
  },

  // スキルの型（ルーン）を選ぶ欄。覚えていないスキルには出さない
  runeHtml(id, lv) {
    const list = WYD.runes.list(id);
    if (!list.length || lv <= 0) return "";
    const cur = WYD.runes.selected(this.state, id);
    const opts = [`<option value="">基本の型</option>`].concat(list.map((r, i) => {
      const need = WYD.runes.unlockLevel(i);
      const locked = lv < need;
      return `<option value="${r.id}" ${cur && cur.id === r.id ? "selected" : ""} ${locked ? "disabled" : ""}>${r.name}${locked ? `（Lv${need}で解放）` : ""}</option>`;
    }));
    return `<div class="skill-rune">型：<select data-rune-skill="${id}">${opts.join("")}</select>
      <span class="skill-rune-desc">${cur ? cur.desc : ""}</span></div>`;
  },

  // 修練ポイントの振り分け
  paragonHtml() {
    const G = WYD.data.player.paragon;
    const pg = this.state.player.paragon;
    const rows = Object.keys(G.stats).map((k) => {
      const st = G.stats[k];
      const n = pg.alloc[k] || 0;
      const v = n * st.per;
      return `<div class="paragon-row"><span>${st.name} +${Number.isInteger(v) ? v : v.toFixed(2)}${st.percent ? "%" : ""}</span>
        <button data-paragon="${k}" ${pg.points > 0 ? "" : "disabled"}>＋</button></div>`;
    }).join("");
    return `<div class="build-title">修練ポイント：<b style="color:var(--accent)">${pg.points}</b>（レベル上限のあとの経験値でたまる）</div>${rows}`;
  },

  // 装備から今効いている特殊効果（合計）と固有能力のまとめ
  buildHtml(stats) {
    const lines = [];
    for (const def of WYD.data.effects.list) {
      const v = stats.effects[def.id];
      if (!v) continue;
      const capped = v >= def.cap ? "（上限）" : "";
      lines.push(`<div style="color:${WYD.data.effects.color}">✦ ${def.name}：<small>${WYD.util.formatEffect(def, v)}${capped}</small></div>`);
    }
    for (const slot in this.state.equipment) {
      const u = WYD.loot.uniqueInfo(this.state.equipment[slot]);
      if (u) lines.push(`<div style="color:${WYD.data.uniques.color}">◆ ${u.name}：<small>${WYD.loot.uniqueDesc(u)}</small></div>`);
    }
    for (const a of WYD.stats.activeSetBonuses(this.state)) {
      lines.push(`<div style="color:${WYD.data.sets.color}">■ ${a.set.name}（${a.need}つ）：<small>${this.bonusText(a.bonus)}</small></div>`);
    }
    return lines.length
      ? `<div class="build-title">装備の効果</div>${lines.join("")}`
      : `<div class="build-title">装備の効果：なし</div>`;
  },

  // 装備のアイコン（絵が用意されているときだけ）。読めなかったら消す
  iconImg(item) {
    const src = WYD.loot.iconOf(item);
    return src ? `<img class="item-icon" src="${src}" alt="" onerror="this.remove()">` : "";
  },

  // マスの右上に出す特殊効果の数の印（例：✦2）
  fxMark(item) {
    const n = this.itemEffects(item).length;
    const so = item.sockets || [];
    return (n ? ` <b class="fx-mark" style="color:${WYD.data.effects.color}">✦${n}</b>` : "") +
      (so.length ? ` <b class="fx-mark" title="ソケット（はめた数／穴の数）">◆${so.filter((x) => x).length}/${so.length}</b>` : "");
  },

  // マスの内側をレア度の色でうっすら光らせる（ノーマルは光らせない）
  glow(item) {
    return item.rarity === "normal" ? "transparent" : this.color(item) + "55";
  },

  color(item) {
    return WYD.loot.rarityInfo(item.rarity).color;
  },

  // ---------- 装備の説明（マウスを乗せたとき） ----------
  itemHtml(item, title) {
    const r = WYD.loot.rarityInfo(item.rarity);
    const lines = item.stats.map((l) =>
      `<div class="${l.main ? "main" : "affix"}">${WYD.util.formatStat(l.stat, WYD.loot.lineValue(item, l))}</div>`
    ).join("");
    const u = WYD.loot.uniqueInfo(item);
    const uniqueLine = (u
      ? `<div class="unique-power" style="color:${WYD.data.uniques.color}">◆ 固有能力<br><small>${WYD.loot.uniqueDesc(u)}</small></div>`
      : "") + this.setHtml(item);
    const fxLines = this.itemEffects(item).map(({ def, value }) =>
      `<div class="effect" style="color:${WYD.data.effects.color}">✦ ${def.name}<br><small>${WYD.util.formatEffect(def, value)}</small></div>`
    ).join("");
    return `<div class="tip-item">
      ${title ? `<div class="tip-title">${title}</div>` : ""}
      <div style="color:${r.color};font-weight:bold">${item.plus > 0 ? `<span style="color:${WYD.data.crafting.enhance.color}">+${item.plus}</span> ` : ""}${item.name}</div>
      <div class="tip-sub">${r.name}・${WYD.data.items.slots[item.slot]}・アイテムLv ${item.level}</div>
      ${lines}
      ${uniqueLine}
      ${fxLines}
      ${this.socketsHtml(item)}
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
      total.stats = WYD.loot.statTotals(it);
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
      ${this.scoreChangeText(item, cur)}
      ${rows.length ? rows.join("") : `<div class="tip-sub">変化なし</div>`}
    </div>`;
  },

  showTooltipFor(e, where) {
    const s = this.state;
    let item = null, html = "";
    if (where === "inv" || where === "stash") {
      const cell = e.target.closest("[data-index]");
      item = cell && (where === "inv" ? s.inventory : s.stash)[Number(cell.dataset.index)];
      if (item) {
        html = this.itemHtml(item);
        const cur = s.equipment[item.slot];
        html += cur ? this.itemHtml(cur, "いま装備中") : `<div class="tip-item tip-sub">この部位は何も装備していない</div>`;
        html += this.compareHtml(item, cur);
        html += this.enhanceMode ? this.enhanceHelp(item) : this.craftMode
          ? this.rerollHelp(item)
          : `<div class="tip-help">${where === "inv" ? "左クリック：装備する／Shift＋クリック：倉庫へ" : "クリック：持ち物へ戻す"}／右クリック：捨てる（${WYD.data.crafting.materialName} +${WYD.inventory.salvageValue(item)}）</div>`;
      }
    } else {
      const cell = e.target.closest("[data-slot]");
      item = cell && s.equipment[cell.dataset.slot];
      if (item) html = this.itemHtml(item) + (this.enhanceMode ? this.enhanceHelp(item) : this.craftMode ? this.rerollHelp(item) : `<div class="tip-help">クリック：外す</div>`);
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
