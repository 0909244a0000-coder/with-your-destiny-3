// 画面右側のパネル（キャラ・スキル・装備・持ち物・ログ）と上のボタン。
window.WYD = window.WYD || {};

WYD.ui = {
  state: null,
  world: null,
  dirty: true,
  craftMode: false,   // つけ直しモード（クリックで特殊効果をつけ直す）
  paused: false,      // 一時停止中か（セーブしない）
  enhanceMode: false, // 強化モード（クリックで +1 する）
  forgeMode: false,   // 鍛造モード（クリックで鍛造の画面をひらく）
  forgeItem: null,    // 鍛造の画面で鍛えている装備
  cubeMode: false,    // カナイの箱に入れるモード（クリックでユニークを分解して覚える）
  gemSelected: null,  // はめるために選んだ宝石（"種類:段階"）
  stashOpen: false,   // 倉庫を開いているか

  $(id) {
    return document.getElementById(id);
  },

  init(state, world) {
    this.state = state;
    this.world = world;
    const s = state;

    // 操作バーの折り返しや文字サイズに合わせ、下のHUDを重ねない。
    const updateHudLayout = () => {
      const root = document.documentElement.style;
      const canvasRect = this.$('game').getBoundingClientRect();
      const scale = Math.min(canvasRect.width / WYD.data.map.width, canvasRect.height / WYD.data.map.height);
      root.setProperty('--field-side', `${Math.max(0, (innerWidth - WYD.data.map.width * scale) / 2)}px`);
      root.setProperty('--field-bottom', `${Math.max(0, (innerHeight - WYD.data.map.height * scale) / 2)}px`);
      const header = document.querySelector('.hud-top');
      const actions = document.querySelector('.stage-btns');
      const bagHead = document.querySelector('.bag-head');
      root.setProperty('--hud-bottom', `${Math.ceil(header.getBoundingClientRect().bottom)}px`);
      const rect = actions.getBoundingClientRect();
      root.setProperty('--actions-bottom', `${Math.ceil(rect.bottom)}px`);
      root.setProperty('--actions-height', `${Math.ceil(rect.height)}px`);
      if (bagHead.getBoundingClientRect().height) root.setProperty('--bag-head-height', `${Math.ceil(bagHead.getBoundingClientRect().height)}px`);
    };
    this.updateHudLayout = updateHudLayout;
    if (window.ResizeObserver) {
      this.hudObserver = new ResizeObserver(updateHudLayout);
      for (const el of document.querySelectorAll('.hud-top,.stage-btns,.bag-head')) this.hudObserver.observe(el);
    }
    window.addEventListener('resize', updateHudLayout);
    updateHudLayout();

    this.$("help").onclick = () => this.showStory("help");
    this.$("character-open").onclick = () => this.toggleCharacterDrawer();
    this.$("character-close").onclick = () => this.toggleCharacterDrawer(false);
    document.addEventListener("pointerdown", (e) => {
      const drawer = this.$("character-drawer");
      if (drawer.classList.contains("open") && !e.target.closest("#character-drawer,#character-open,.modal")) this.toggleCharacterDrawer(false);
    });
    // まとめメニュー：1つ開いたらほかは閉じる。メニューの外をクリックしたら閉じる
    const menus = [...document.querySelectorAll("details.menu")];
    for (const m of menus) m.addEventListener("toggle", () => { if (m.open) for (const o of menus) if (o !== m) o.open = false; });
    document.addEventListener("click", (e) => { if (!e.target.closest("details.menu")) for (const m of menus) m.open = false; });
    this.$("codex-open").onclick = () => {
      this.$("codex-body").innerHTML = this.codexHtml();
      this.$("codex").hidden = false;
    };
    this.$("codex-close").onclick = () => { this.$("codex").hidden = true; };
    // セーブのバックアップ
    this.$("backup-export").onclick = () => {
      if (WYD.save.exportAll(s, this.isTouch()) === "shared") this.log("セーブを共有の窓で送る（送った先の端末で「設定」→「読み込む」）", "#7dff8a");
      else this.log("セーブをファイルに書き出した（ダウンロードの場所に保存されます）", "#7dff8a");
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
    this.$("class-select").innerHTML = Object.keys(WYD.data.classes).filter((id) => WYD.classes.visible(id))   // 隠した職業（蒐集者など）は出さない
      .map((id) => `<option value="${id}" title="${WYD.data.classes[id].desc || ""}">${WYD.data.classes[id].name}</option>`).join("");
    this.$("class-select").value = WYD.classes.id;
    this.$("class-select").title = `${WYD.data.classes[WYD.classes.id].desc || ""}（職業を切り替える。キャラごとにセーブは別々）`;
    this.$("class-select").onchange = (e) => {
      const c = WYD.data.classes[e.target.value];
      if (confirm(`「${c.name}」に切り替えますか？\n${c.desc || ""}\n（今のキャラのセーブはそのまま残ります）`)) WYD.classes.switchTo(e.target.value, s);
      else e.target.value = WYD.classes.id;
    };
    // パラゴンボード
    this.$("paragon").onclick = (e) => {
      if (!e.target.closest("#board-open")) return;
      this.$("board-body").innerHTML = this.boardHtml();
      this.$("board").hidden = false;
    };
    this.$("board-close").onclick = () => { this.$("board").hidden = true; };
    this.$("board-body").onclick = (e) => {
      const trainingButton = e.target.closest('[data-training-action]');
      if (trainingButton) {
        const T=WYD.training,action=trainingButton.dataset.trainingAction,id=trainingButton.dataset.trainingId;
        if(action==='refund') { if(!confirm('習得した秘技をすべて解除して、使った修練ポイントを全額返しますか？ 能力の盤面は維持します。'))return;T.refund(s); }
        else if(action==='learn') { if(!T.learn(s,id))return; }
        else if(!T.equip(s,action==='off'?null:id))return;
        this.$('board-body').innerHTML=this.boardHtml();this.changed();return;
      }
      const cell = e.target.closest("[data-cell]");
      if (!cell) return;
      const [r, c] = cell.dataset.cell.split(",").map(Number);
      if (!WYD.board.take(s, r, c)) return;
      this.$("board-body").innerHTML = this.boardHtml();
      this.changed();
    };
    this.$("music-toggle").onclick = () => {
      s.settings.music = !s.settings.music;
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
    this.$("uber-start").onclick = () => WYD.uber.start(this.world, s);
    this.$("uber-down").onclick = () => { WYD.uber.changeStage(s, -1); this.markDirty(); };
    this.$("uber-up").onclick = () => { WYD.uber.changeStage(s, 1); this.markDirty(); };
    this.$("trial-auto").onchange = (e) => {
      s.trial.autoNext = e.target.checked;
      this.changed();
    };
    this.$("pause").onclick = () => this.togglePause();
    this.$("respec").onclick = () => {
      const cost = WYD.inventory.respecCost(s);
      const C = WYD.data.crafting;
      if (s.materials < cost) return this.log(`振り直しには${C.materialName}が${cost}個いる（持っている数 ${s.materials}）`, "#ff6b6b");
      if (!confirm(`${C.materialName}を${cost}個使って、スキルと修練のポイントを全部もどしますか？（スキルの型も外れます）`)) return;
      const r = WYD.inventory.respec(s);
      this.log(`振り直した：スキルポイント +${r.skill}、修練ポイント +${r.paragon}（${C.materialName} -${cost}）`, "#7dff8a");
      // 自動で振る設定のままだと、次に敵を倒した瞬間に全部振られてしまうので、いったんOFFにして選び直してもらう
      if (s.settings.autoSkill) {
        s.settings.autoSkill = false;
        this.log(WYD.data.story.skillGuide.respecNote, WYD.data.story.skillGuide.color);
      }
      this.changed();
    };
    // キーボード：スペース＝一時停止、1・2・4＝速度（文字を入力している所では効かない）
    document.addEventListener("keydown", (e) => {
      if (WYD.arena?.opened || WYD.dps?.opened) return;
      // 子ウィンドウを閉じるキーで、背後の装備/人物まで閉じない。
      const childModal = [...document.querySelectorAll('.modal:not([hidden])')].find(el => el.id !== 'bag');
      if (childModal) {
        if (e.key === 'Escape' && childModal.id === 'gamble') { e.preventDefault(); this.closeGamble(); }
        else if (e.key === 'Escape' && childModal.id === 'sheet') { e.preventDefault(); this.sheetAction('close'); }
        return;
      }
      if (e.key === 'Escape') {
        if (!this.$('bag').hidden) { e.preventDefault(); this.toggleBag(false); }
        else if (this.$('character-drawer').classList.contains('open')) { e.preventDefault(); this.toggleCharacterDrawer(false); }
        return;
      }
      if (e.target.closest && e.target.closest("input, select, textarea")) return;
      // ボタン/summary上のSpaceは通常の決定操作として使う。
      if (e.code === "Space" && !e.target.closest('button,summary')) {
        e.preventDefault();
        this.togglePause();
      } else if (e.key === "i" || e.key === "I") {
        this.toggleBag();
      } else if (e.key === "m" || e.key === "M") {
        this.toggleMute();
      } else if (e.key === "h" || e.key === "H") {
        WYD.town.toggle(this.world, s);
      } else if ((e.key === "Delete" || e.key === "Backspace") && this.hovered && !this.$("bag").hidden) {
        e.preventDefault();
        this.discardHovered();
      } else if (["1", "2", "4"].includes(e.key)) {
        s.settings.speed = Number(e.key);
        this.changed();
      }
    });
    // 装備・持ち物の画面：戦いの画面の上のボタンで開く。外側（暗いところ）を押しても閉じる
    this.$("bag-open").onclick = () => this.toggleBag(true);
    this.$("town-btn").onclick = () => WYD.town.toggle(this.world, s);
    this.$("mute-btn").onclick = () => this.toggleMute();
    document.querySelector(".bag-nav").onclick = (e) => {
      const button = e.target.closest("[data-bag-target]");
      if (button) this.$(button.dataset.bagTarget).scrollIntoView({ block: "start" });
    };
    this.$("quiet-fx").onchange = (e) => {
      s.settings.quietFx = e.target.checked;
      this.changed();
    };
    this.$("bag-close").onclick = () => this.toggleBag(false);
    this.$("bag").onclick = (e) => { if (e.target.id === "bag") this.toggleBag(false); };
    this.$("auto-diff").onchange = (e) => {
      s.settings.autoDifficulty = e.target.checked;
      this.changed();
    };
    this.$("auto-salvage").innerHTML = WYD.data.crafting.autoSalvageOptions
      .map((o) => `<option value="${o.id}">${o.label}</option>`).join("");
    this.$("auto-skill").onchange = (e) => {
      s.settings.autoSkill = e.target.checked;
      if (s.settings.autoSkill) this.autoSkill();
      this.changed();
    };
    this.$("auto-equip").onchange = (e) => {
      s.settings.autoEquip = e.target.checked;
      this.changed();
    };
    this.$("full-replace").onchange = (e) => {
      s.settings.fullReplace = e.target.checked;
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
    this.$("discard-all").onclick = () => {
      const targets = s.inventory.filter((it) => !it.locked);
      if (!targets.length) return;
      const valuable = targets.filter((it) => it.rarity === "unique" || it.rarity === "set" || it.plus > 0 || it.forged > 0 || it.legacyRuneBonus).length;
      const gained = targets.reduce((n, it) => n + WYD.inventory.salvageValue(s, it), 0);
      const warning = valuable ? `\nユニーク・セット・強化・鍛造・継承効果の装備を${valuable}個含みます。` : "";
      const builds = targets.filter((it) => WYD.inventory.keepReason(it, s) === "build").length;
      const bases = targets.filter((it) => WYD.inventory.keepRunewordBase(s, it)).length;
      if (!confirm(`持ち物の装備${targets.length}個を全て捨てますか？${warning}${builds ? `\n保存ビルド用 ${builds}個も失われます。` : ""}${bases ? `\nルーンワードの土台 ${bases}個も対象です。` : ""}\n${C.materialName} +${gained}。はめた宝石・ルーンは戻ります。\nロックした装備・装備中は残ります。元には戻せません。`)) return;
      const r = WYD.inventory.discardAll(s, targets);
      this.log(`持ち物を${r.count}個捨てた（${C.materialName} +${r.gained}）`);
      this.changed();
    };
    this.$("claim-pending").onclick = () => {
      const count = WYD.inventory.claimPending(s);
      this.log(count ? `未受取から${count}個を受け取りました` : "かばんに空きを作ると受け取れます", "#c9b48a");
      WYD.save.write(s);
      this.changed();
    };
    this.$("sort-inv").onclick = () => {
      WYD.inventory.sort(s.inventory);
      this.changed();
    };
    this.$("craft-mode").onclick = () => {
      this.craftMode = !this.craftMode;
      if (this.craftMode) this.enhanceMode = this.cubeMode = this.forgeMode = false;
      this.markDirty();
    };
    this.$("devotion-open").onclick = () => {
      this.$("devotion-body").innerHTML = this.devotionHtml();
      this.$("devotion").hidden = false;
    };
    this.$("devotion-close").onclick = () => { this.$("devotion").hidden = true; };
    this.$("merc-open").onclick = () => {
      this.$("merc-body").innerHTML = this.mercHtml();
      this.$("merc").hidden = false;
    };
    this.$("bounty-open").onclick = () => {
      WYD.bounties.ensure(s);
      this.$("bounty-body").innerHTML = this.bountyHtml();
      this.$("bounty").hidden = false;
    };
    this.$("bounty-close").onclick = () => { this.$("bounty").hidden = true; };
    this.$("bounty-body").onclick = (e) => {
      const btn = e.target.closest("[data-bounty]");
      if (!btn) return;
      if (!WYD.bounties.reroll(s, Number(btn.dataset.bounty))) this.log(`${WYD.data.crafting.materialName}が足りない`, "#ff6b6b");
      this.$("bounty-body").innerHTML = this.bountyHtml();
      this.changed();
    };
    const openGamble = () => {
      this.stopGambleHold();
      this.gambleLast = null;
      this.$("gamble-body").innerHTML = this.gambleHtml();
      this.$("gamble").hidden = false;
      this.refreshGamble();
    };
    this.$("gamble-open").onclick = openGamble;
    this.$("bag-gamble-open").onclick = openGamble;
    this.$("gamble-close").onclick = () => this.closeGamble();
    this.bindGambleHold();
    this.$("lgem-open").onclick = () => {
      this.$("lgem-body").innerHTML = this.lgemHtml();
      this.$("lgem").hidden = false;
    };
    this.$("lgem-close").onclick = () => { this.$("lgem").hidden = true; };
    this.$("lgem-body").onclick = (e) => {
      const btn = e.target.closest("[data-lgem]");
      if (!btn) return;
      if (!WYD.lgems.toggle(s, btn.dataset.lgem)) this.log(`伝説の宝石は${WYD.data.legendaryGems.slots}つまで`, "#ff6b6b");
      this.$("lgem-body").innerHTML = this.lgemHtml();
      this.changed();
    };
    this.$("merc-close").onclick = () => { this.$("merc").hidden = true; };
    this.$("merc-body").onclick = (e) => {
      const btn = e.target.closest("[data-merc]");
      if (!btn) return;
      const act = btn.dataset.merc;
      const ok = act === "rank" ? WYD.mercenary.rankUp(s)
        : act === "dismiss" ? (WYD.mercenary.dismiss(s), true)
        : WYD.mercenary.hire(s, act);
      if (!ok) this.log(`${WYD.data.crafting.materialName}が足りない`, "#ff6b6b");
      this.$("merc-body").innerHTML = this.mercHtml();
      this.changed();
    };
    this.$("devotion-body").onclick = (e) => {
      const btn = e.target.closest("[data-dev]");
      if (!btn) return;
      const ok = btn.dataset.act === "take" ? WYD.devotion.take(s, btn.dataset.dev) : WYD.devotion.remove(s, btn.dataset.dev);
      if (!ok) this.log(btn.dataset.act === "take" ? "ポイントか縁が足りない" : "ほかの星座が必要としているので外せない", "#ff6b6b");
      this.$("devotion-body").innerHTML = this.devotionHtml();
      this.changed();
    };
    this.$("builds").onclick = (e) => {
      const btn = e.target.closest("[data-build]");
      if (!btn) return;
      const n = Number(btn.dataset.build);
      if (btn.dataset.act === "save") {
        const old = s.builds[n];
        const name = prompt("ビルドの名前", old ? old.name : `ビルド${n + 1}`);
        if (name == null) return;
        WYD.builds.save(s, n, name);
        this.log(`今の装備とスキルを「${name}」に保存した`, "#7dff8a");
      } else {
        const r = WYD.builds.load(s, n);
        if (!r) return;
        this.log(`「${s.builds[n].name}」に切り替えた${r.missing ? `（見つからない・持ち物がいっぱいで戻せない装備が${r.missing}個）` : ""}`, r.missing ? "#ffb05a" : "#7dff8a");
      }
      this.changed();
    };
    this.$("season").innerHTML = WYD.data.seasons.list.map((x) => `<option value="${x.id}">${x.name}</option>`).join("");
    this.$("season").onchange = (e) => {
      s.settings.season = e.target.value;
      const cur = WYD.season.current(s);
      this.log(`季節を「${cur.name}」にした：${cur.desc}（新しく出る敵から変わる）`, WYD.data.seasons.color);
      this.changed();
    };
    this.$("filter-open").onclick = () => {
      this.$("filter-body").innerHTML = this.filterHtml();
      this.$("filter").hidden = false;
    };
    this.$("filter-close").onclick = () => { this.$("filter").hidden = true; };
    this.$("filter-body").onchange = (e) => {
      const f = s.settings.filter;
      const t = e.target;
      if (t.dataset.filterSlot) f.slots[t.dataset.filterSlot] = t.value;
      else if (t.dataset.filterFlag) f[t.dataset.filterFlag] = t.checked;
      this.changed();
    };
    this.$("forge-mode").onclick = () => {
      this.forgeMode = !this.forgeMode;
      if (this.forgeMode) this.craftMode = this.enhanceMode = this.cubeMode = false;
      this.markDirty();
    };
    this.$("forge-close").onclick = () => { this.$("forge").hidden = true; this.forgeItem = null; };
    this.$("forge-body").onclick = (e) => {
      const btn = e.target.closest("[data-forge]");
      if (!btn || !this.forgeItem) return;
      const r = WYD.inventory.forge(s, this.forgeItem, btn.dataset.forge, Number(btn.dataset.line));
      if (!r.ok) this.log(r.why, "#ff6b6b");
      else {
        this.log(`${WYD.loot.label(this.forgeItem)}を鍛えた：${WYD.util.formatStat(r.line.stat, WYD.loot.lineValue(this.forgeItem, r.line))}${r.crit ? "（会心の鍛造！余地は減らない）" : `（余地 -${r.used}）`}`, WYD.data.crafting.forge.color);
        WYD.sound.play(r.crit ? "uniqueDrop" : "rareDrop");
      }
      this.$("forge-body").innerHTML = this.forgeHtml(this.forgeItem);
      this.changed();
    };
    this.$("cube-mode").onclick = () => {
      this.cubeMode = !this.cubeMode;
      if (this.cubeMode) this.craftMode = this.enhanceMode = this.forgeMode = false;
      this.markDirty();
    };
    this.$("maps").onclick = (e) => {
      const use = e.target.closest("[data-map-use]");
      const up = e.target.closest("[data-map-up]");
      if (use) WYD.maps.use(this.world, s, Number(use.dataset.mapUse));
      else if (up) {
        if (!WYD.maps.upgrade(s, Number(up.dataset.mapUp))) this.log(`${WYD.data.crafting.materialName}が足りない`, "#ff6b6b");
      } else return;
      this.changed();
    };
    this.$("maps").oncontextmenu = (e) => {
      const row = e.target.closest("[data-map-row]");
      if (!row) return;
      e.preventDefault();
      s.maps.splice(Number(row.dataset.mapRow), 1);
      this.changed();
    };
    this.$("cube").onchange = (e) => {
      const sel = e.target.closest("select[data-cube-slot]");
      if (!sel) return;
      s.cube.slots[sel.dataset.cubeSlot] = sel.value || null;
      this.changed();
    };
    this.$("enhance-mode").onclick = () => {
      this.enhanceMode = !this.enhanceMode;
      if (this.enhanceMode) this.craftMode = this.cubeMode = this.forgeMode = false;
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

    // スマホでは、持ち物の説明を「触る」操作に合わせる
    if (this.isTouch()) this.$("inv-help").textContent = "装備を触ると：説明・今の装備との比べ・装備する／ロック／捨てる";
    // スマホの「どうするか」の窓
    this.$("sheet-body").onclick = (e) => {
      const b = e.target.closest("[data-sheet]");
      if (b) this.sheetAction(b.dataset.sheet);
    };
    this.$("sheet").onclick = (e) => { if (e.target.id === "sheet") this.sheetAction("close"); };

    // 持ち物：左クリックで装備、右クリックで捨てる
    const inv = this.$("inventory");
    this.bindLongPress(inv, "[data-index]", "inv", (c) => Number(c.dataset.index));
    inv.onclick = (e) => {
      if (this.eatClick()) return;
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      const index = Number(cell.dataset.index);
      if (this.touchSheet("inv", index)) return;   // スマホ：触ると「どうするか」の窓
      if (e.ctrlKey || e.metaKey) this.toggleLock(s.inventory[index]);
      else if (this.forgeMode) this.openForge(s.inventory[index]);
      else if (this.cubeMode) this.cubeItem(s.inventory[index]);
      else if (this.gemSelected) this.socketGem(s.inventory[index]);
      else if (this.enhanceMode) this.enhanceItem(s.inventory[index]);
      else if (this.craftMode) this.rerollItem(s.inventory[index]);
      else WYD.inventory.equip(s, index);
      this.changed();
    };
    this.bindRightDiscard(inv, "inv");
    inv.onmouseover = (e) => this.showTooltipFor(e, "inv");
    inv.onmouseleave = () => { this.hideTooltip(); this.hovered = null; };

    // 倉庫：クリックで持ち物へ、右クリックで捨てる
    this.$("stash-toggle").onclick = () => {
      this.stashOpen = !this.stashOpen;
      this.markDirty();
    };
    const stash = this.$("stash");
    this.bindLongPress(stash, "[data-index]", "stash", (c) => Number(c.dataset.index));
    stash.onclick = (e) => {
      if (this.eatClick()) return;
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      if (this.touchSheet("stash", Number(cell.dataset.index))) return;
      if (e.ctrlKey || e.metaKey) this.toggleLock(s.stash[Number(cell.dataset.index)]);
      else if (this.forgeMode) this.openForge(s.stash[Number(cell.dataset.index)]);
      else if (this.cubeMode) this.cubeItem(s.stash[Number(cell.dataset.index)]);
      else if (this.gemSelected) this.socketGem(s.stash[Number(cell.dataset.index)]);
      else if (this.enhanceMode) this.enhanceItem(s.stash[Number(cell.dataset.index)]);
      else if (this.craftMode) this.rerollItem(s.stash[Number(cell.dataset.index)]);
      else if (!WYD.inventory.fromStash(s, Number(cell.dataset.index))) this.log("持ち物がいっぱいで戻せない", "#ff6b6b");
      this.changed();
    };
    this.bindRightDiscard(stash, "stash");
    stash.onmouseover = (e) => this.showTooltipFor(e, "stash");
    stash.onmouseleave = () => { this.hideTooltip(); this.hovered = null; };

    // 装備欄：クリックで外す
    const eq = this.$("equipment");
    this.bindLongPress(eq, "[data-slot]", "eq", (c) => c.dataset.slot);
    eq.onclick = (e) => {
      if (this.eatClick()) return;
      const cell = e.target.closest("[data-slot]");
      if (!cell || !s.equipment[cell.dataset.slot]) return;
      if (this.touchSheet("eq", cell.dataset.slot)) return;
      if (e.ctrlKey || e.metaKey) {
        this.toggleLock(s.equipment[cell.dataset.slot]);
        this.changed();
        return;
      }
      if (this.forgeMode) {
        this.openForge(s.equipment[cell.dataset.slot]);
        return;
      }
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
    // 余ったポイントの案内：今だけおまかせ／これからずっとおまかせ（設定の「スキルを自動で上げる」をON）
    this.$("skill-hint").onclick = (e) => {
      const btn = e.target.closest("button[data-skill-guide]");
      if (!btn) return;
      if (btn.dataset.skillGuide === "always") {
        s.settings.autoSkill = true;
        this.$("auto-skill").checked = true;
      }
      this.autoSkill();
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

  // 中身が前と同じなら書きかえない（毎回作り直すと、絵が点滅したり、マウスを乗せた説明がちらついたりする）
  putHtml(id, html) {
    const el = this.$(id);
    if (el._html === html) return false;
    el._html = html;
    el.innerHTML = html;
    if (id === "inventory" || id === "stash" || id === "equipment") this.cellsChanged = true;
    return true;
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

  // 星座の画面
  devotionHtml() {
    const s = this.state;
    const D = WYD.data.devotion;
    const af = WYD.devotion.affinity(s);
    const afText = (o) => Object.keys(o).map((k) => `<span style="color:${D.affinities[k].color}">${D.affinities[k].name}${o[k]}</span>`).join(" ") || "なし";
    const P = D.points;
    const rows = D.list.map((c) => {
      const own = !!s.devotion[c.id];
      const btn = own
        ? `<button data-dev="${c.id}" data-act="remove" ${WYD.devotion.canRemove(s, c) ? "" : "disabled"}>外す</button>`
        : `<button data-dev="${c.id}" data-act="take" ${WYD.devotion.canTake(s, c) ? "" : "disabled"}>埋める（${c.cost}）</button>`;
      return `<div class="dev-row${own ? " own" : ""}"><div><b>${own ? "★" : "☆"} ${c.name}</b> <small class="muted">必要な縁：${afText(c.requires)}／もらえる縁：${afText(c.grants)}</small><br>
        <small>${this.bonusText(c.bonus)}</small></div>${btn}</div>`;
    }).join("");
    return `<div class="dev-head">信仰ポイント：<b>${WYD.devotion.free(s)}</b> / ${WYD.devotion.totalPoints(s)}　今の縁：${afText(af)}</div>
      <p class="muted">ポイントは レベル${P.perLevels}ごとに1、はじめて倒したボス1体ごとに${P.perBoss}、試練の最高段階${P.perTrialStages}ごとに1、地図の最高段階1ごとに${P.perMapTier}。外すとポイントはもどる。</p>${rows}`;
  },

  // 賞金首の依頼の画面
  bountyHtml() {
    const s = this.state;
    const D = WYD.data.bounties;
    const R = D.reward;
    const mat = WYD.data.crafting.materialName;
    const rows = s.bounties.map((b, i) => {
      const pct = Math.round(b.progress / b.target * 100);
      const mats = R.materialsBase + R.materialsPerArea * WYD.bounties.areaIndex(s, b);
      return `<div class="dev-row"><div style="flex:1"><b>${WYD.bounties.text(b)}</b>　${b.progress} / ${b.target}
        <div class="bounty-bar"><div style="width:${pct}%;background:${D.color}"></div></div>
        <small class="muted">ご褒美：${mat} ${mats}・装備${R.items}個（レア以上）</small></div>
        <button data-bounty="${i}" ${s.materials >= D.rerollCost ? "" : "disabled"}>取り替える（${D.rerollCost}）</button></div>`;
    }).join("");
    return `<p class="muted">いつも${D.count}つの依頼があり、ふつうに遊んでいるだけで進みます。エリアの決まった依頼は、そのエリアにいるときだけ進みます（試練の中は進みません）。達成するとすぐ次の依頼が出ます。達成した数：${s.records.bounties || 0}</p>${rows}`;
  },

  // キャダラの賭けの画面
  gambleHtml() {
    const s = this.state;
    const G = WYD.data.gamble;
    const mat = WYD.data.crafting.materialName;
    if (s.player.level < G.minLevel) return `<p class="muted">レベル${G.minLevel}になると使えます。</p>`;
    const cost = WYD.gamble.cost(s);
    const total = G.odds.reduce((a, o) => a + o.weight, 0);
    const odds = G.odds.map((o) => {
      const r = WYD.loot.rarityInfo(o.rarity);
      return `<span style="color:${r.color}">${r.name} ${Math.round(o.weight / total * 100)}%</span>`;
    }).join("　");
    const slots = WYD.data.items.slots;
    const btns = Object.keys(slots).map((k) =>
      `<button data-gamble="${k}" ${s.materials >= cost && !WYD.inventory.isFull(s) ? "" : "disabled"}>${slots[k]}</button>`).join(" ");
    const last = this.gambleLast;
    const lastHtml = last ? `<div class="dev-row own"><div>もらった装備：<b style="color:${WYD.loot.rarityInfo(last.rarity).color}">${WYD.loot.label(last)}</b>（持ち物に入りました）</div></div>` : "";
    return `<div id="gamble-summary" class="dev-head"></div>
      <p class="muted">部位をタップで1個、長押しで連続購入。指を離すと停止します。出やすさ：${odds}（その部位にユニーク・セットがなければレジェンド）。</p>
      <div class="gamble-btns">${btns}</div><div id="gamble-last" aria-live="polite">${lastHtml}</div>`;
  },

  refreshGamble() {
    const s = this.state, summary = this.$("gamble-summary");
    if (!summary) return;
    const cost = WYD.gamble.cost(s), full = WYD.inventory.isFull(s);
    summary.textContent = `1回 ${WYD.data.crafting.materialName} ${cost} ／ 所持 ${s.materials} ／ 持ち物 ${s.inventory.length}/${WYD.data.items.inventorySize}`;
    for (const btn of this.$("gamble-body").querySelectorAll("[data-gamble]")) {
      btn.disabled = s.player.level < WYD.data.gamble.minLevel || s.materials < cost || full;
    }
    const last = this.gambleLast;
    this.putHtml("gamble-last", `${full ? '<p class="muted">持ち物がいっぱいです。</p>' : s.materials < cost ? '<p class="muted">素材が足りません。</p>' : ''}${last ? `<div class="dev-row own">もらった装備：<b style="color:${WYD.loot.rarityInfo(last.rarity).color}">${WYD.loot.label(last)}</b></div>` : ''}`);
    if (full || s.materials < cost || s.player.level < WYD.data.gamble.minLevel) this.stopGambleHold();
  },

  buyGamble(slot) {
    if (this.$("gamble").hidden || document.hidden) { this.stopGambleHold(); return false; }
    const item = WYD.gamble.roll(this.state, slot);
    if (!item) { this.stopGambleHold(); this.refreshGamble(); return false; }
    this.gambleLast = item;
    const rarity = WYD.loot.rarityInfo(item.rarity);
    this.log(`キャダラの賭け：${WYD.loot.label(item)}（${rarity.name}）`, rarity.color);
    if (["legend", "unique", "set"].includes(item.rarity)) WYD.sound.play("uniqueDrop");
    this.refreshGamble();
    this.changed();
    return true;
  },

  stopGambleHold() {
    clearTimeout(this.gambleHoldTimer);
    this.gambleHoldTimer = null;
    this.gamblePointer = null;
  },

  closeGamble() {
    this.gambleSuppressClick = true;
    this.stopGambleHold();
    this.$("gamble").hidden = true;
    this.markDirty();
  },

  bindGambleHold() {
    const body = this.$("gamble-body");
    body.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest("[data-gamble]");
      if (!btn || btn.disabled || e.button !== 0 || !e.isPrimary) return;
      this.stopGambleHold();
      this.gambleSuppressClick = false;
      const pointer = this.gamblePointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      btn.setPointerCapture(e.pointerId);
      const repeat = () => {
        if (this.gamblePointer !== pointer) return;
        this.gambleSuppressClick = true;
        if (this.buyGamble(btn.dataset.gamble) && this.gamblePointer === pointer)
          this.gambleHoldTimer = setTimeout(repeat, WYD.data.gamble.hold.repeatMs);
      };
      this.gambleHoldTimer = setTimeout(repeat, WYD.data.gamble.hold.delayMs);
    });
    body.addEventListener("pointermove", (e) => {
      const p = this.gamblePointer;
      if (!p || e.pointerId !== p.id) return;
      const btn = e.target.closest("[data-gamble]"), rect = btn && btn.getBoundingClientRect();
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > WYD.data.gamble.hold.moveTolerance ||
          !rect || e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        this.gambleSuppressClick = true;
        this.stopGambleHold();
      }
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) body.addEventListener(event, () => this.stopGambleHold());
    body.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-gamble]")) e.preventDefault(); });
    body.onclick = (e) => {
      const btn = e.target.closest("[data-gamble]");
      if (!btn) return;
      if (this.gambleSuppressClick && e.detail !== 0) { this.gambleSuppressClick = false; return; }
      this.buyGamble(btn.dataset.gamble);
    };
    window.addEventListener("blur", () => { this.gambleSuppressClick = true; this.stopGambleHold(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { this.gambleSuppressClick = true; this.stopGambleHold(); } });
  },

  // 伝説の宝石の画面
  lgemHtml() {
    const s = this.state;
    const D = WYD.data.legendaryGems;
    const L = s.lgems;
    const stage = s.trial.best + 1;
    const rows = D.list.map((g) => {
      const rank = L.owned[g.id];
      const on = L.equipped.includes(g.id);
      if (!rank) return `<div class="dev-row"><div><b class="muted">？ ${g.name}</b> <small class="muted">まだ持っていない</small><br><small class="muted">${WYD.lgems.descFor(g, 1)}</small></div></div>`;
      const btn = `<button data-lgem="${g.id}" ${!on && L.equipped.length >= D.slots ? "disabled" : ""}>${on ? "外す" : "つける"}</button>`;
      const chance = Math.round(WYD.lgems.upgradeChance(stage, rank) * 100);
      return `<div class="dev-row${on ? " own" : ""}"><div><b style="color:${g.color}">◆ ${g.name}</b> ランク ${rank}${rank >= D.maxRank ? "（最大）" : ""}<br>
        <small>${WYD.lgems.descFor(g, rank)}</small> <small class="muted">（試練 段階${stage}でのランク上げ成功率 ${chance}%）</small></div>${btn}</div>`;
    }).join("");
    return `<div class="dev-head">つけている数：<b>${L.equipped.length}</b> / ${D.slots}</div>
      <p class="muted">試練（日替わり・地図・双王もふくむ）に成功すると、まだ持っていない宝石が手に入ることがあります（最初の1つは必ず）。成功するたびに、つけている宝石のランクを${D.upgradeTries}回まで自動で上げます（ランクの低いものから）。高い段階ほど上がりやすい。</p>${rows}`;
  },

  // 傭兵の画面
  mercHtml() {
    const s = this.state;
    const M = WYD.data.mercenary;
    const mat = WYD.data.crafting.materialName;
    const cur = WYD.mercenary.type(s);
    if (s.player.level < M.minLevel) return `<p class="muted">レベル${M.minLevel}になると雇えます。</p>`;
    let head = `<div class="dev-head">今の傭兵：<b>なし</b></div>`;
    if (cur) {
      const cost = WYD.mercenary.rankCost(s);
      const rankBtn = cost == null ? `<small class="muted">位は最大</small>`
        : `<button data-merc="rank" ${s.materials >= cost ? "" : "disabled"}>位を上げる（${mat} ${cost}）</button>`;
      head = `<div class="dev-row own"><div><b>${cur.name}</b>（位 ${s.mercenary.rank} / ${M.rankCosts.length + 1}、HPと攻撃力 +${Math.round(M.rankMult * (s.mercenary.rank - 1) * 100)}%）<br>
        <small>${cur.bonusName}：${this.bonusText(cur.bonus)}</small></div><div>${rankBtn} <button data-merc="dismiss">解雇</button></div></div>`;
    }
    const rows = M.types.map((t) => {
      const own = cur && cur.id === t.id;
      const btn = own ? `<small class="muted">雇っている</small>`
        : `<button data-merc="${t.id}" ${WYD.mercenary.canHire(s, t.id) ? "" : "disabled"}>${cur ? "替える" : "雇う"}（${mat} ${M.hireCost}）</button>`;
      return `<div class="dev-row${own ? " own" : ""}"><div><b>${t.name}</b> <small class="muted">${t.desc}</small><br>
        <small>${t.bonusName}：${this.bonusText(t.bonus)}</small></div>${btn}</div>`;
    }).join("");
    return `${head}<p class="muted">傭兵は主人公の強さに合わせて強くなります。倒れても${M.reviveTime}秒で戻ります。雇っているあいだ「加護」がつきます。替えると位は1にもどります。</p>${rows}`;
  },

  // 戦利品フィルターの画面
  filterHtml() {
    const f = this.state.settings.filter;
    const C = WYD.data.crafting;
    const slots = WYD.data.items.slots;
    const opts = (cur) => C.filterLevels.map((l) => `<option value="${l.id}" ${l.id === cur ? "selected" : ""}>${l.label}</option>`).join("");
    const flag = (id, label) => `<label class="filter-flag"><input type="checkbox" data-filter-flag="${id}" ${f[id] ? "checked" : ""}> ${label}</label>`;
    return `${flag("on", "<b>フィルターを使う</b>（ONの間は上の「自動分解」のかわりにこちらが使われる）")}
      <div class="filter-grid">${Object.keys(slots).map((k) => `<span>${slots[k]}</span><select data-filter-slot="${k}">${opts(f.slots[k] || "normal")}</select>`).join("")}</div>
      ${flag("keepUpgrades", "今の装備より強いものは、上の決まりに関係なく拾う")}

      <p class="muted">ユニークとセットはいつも拾います。拾わない装備はその場で素材になります。</p>`;
  },

  // 鍛造の画面
  openForge(item) {
    if (!item) return;
    this.forgeItem = item;
    this.$("forge-body").innerHTML = this.forgeHtml(item);
    this.$("forge").hidden = false;
  },

  forgeHtml(item) {
    const F = WYD.data.crafting.forge;
    const C = WYD.data.crafting;
    const pot = WYD.inventory.forgePotential(item);
    const ci = WYD.inventory.forgeCost(item, "improve"), ca = WYD.inventory.forgeCost(item, "add");
    const lines = item.stats.map((l, i) => `<div class="forge-row"><span>${WYD.util.formatStat(l.stat, WYD.loot.lineValue(item, l))}${l.main ? " <small class='muted'>（基本）</small>" : ""}</span>
      <button data-forge="improve" data-line="${i}" ${pot > 0 ? "" : "disabled"}>+${F.improvePercent}%</button></div>`).join("");
    const affixes = item.stats.filter((l) => !l.main).length;
    return `<div class="tip-item" style="border:none">${this.itemHtml(item)}</div>
      <div class="forge-pot">鍛造の余地：<b style="color:${F.color}">${pot}</b>　<small class="muted">（1回で ${F.improvePotential[0]}〜${F.improvePotential[1]} 減る。${Math.round(F.critChance * 100)}%で減らない）</small></div>
      ${lines}
      <div class="forge-row"><span>新しい能力を足す（${affixes}/${F.maxAffixes}）</span><button data-forge="add" ${pot > 0 && affixes < F.maxAffixes ? "" : "disabled"}>足す</button></div>
      <p class="muted">素材：能力を上げる ${ci}個／足す ${ca}個（持っている数 ${this.state.materials}）</p>`;
  },

  // カナイの箱に入れる（ユニークを分解して力を覚える）
  cubeItem(item) {
    if (!item) return;
    const def = WYD.loot.uniqueInfo(item);
    if (def && !this.state.cube.learned[def.id] && !confirm(`「${item.name}」を箱に入れて分解し、力を覚えますか？（装備はなくなります）`)) return;
    const r = WYD.cube.extract(this.state, item);
    if (!r.ok) return this.log(r.why, "#ff6b6b");
    this.log(`カナイの箱が「${r.def.name}」の力を覚えた（${WYD.loot.uniqueDesc(r.def)}）`, WYD.data.cube.color);
    WYD.sound.play("uniqueDrop");
  },

  // 地図の欄
  mapsHtml() {
    const s = this.state;
    const M = WYD.data.maps;
    if (!s.maps.length) return `<p class="muted">まだ地図がない（危険度が高いほど、段階の高い地図が落ちる）</p>`;
    const inTrial = WYD.trial.active(s);
    return s.maps.map((m, i) => {
      const mods = WYD.maps.mods(m);
      const cost = M.upgradeCostPerTier * m.tier;
      return `<div class="map-row" data-map-row="${i}"><b style="color:${WYD.maps.color(m)}">${WYD.maps.name(m)}</b>
        <small class="muted">量×${WYD.maps.quantity(m).toFixed(2)}</small>
        <button data-map-use="${i}" ${inTrial ? "disabled" : ""}>使う</button>
        <button data-map-up="${i}" title="${WYD.data.crafting.materialName}${cost}個で、条件を3〜4つにつけ直す（むずかしいぶん、ごほうびが増える）">レアにする</button>
        <div class="map-mods">${mods.length ? mods.map((x) => `${x.name}（${x.desc}）`).join("・") : "条件なし"}</div></div>`;
    }).join("");
  },

  // カナイの箱の欄
  cubeHtml() {
    const s = this.state;
    const C = WYD.data.cube;
    return Object.keys(C.slots).map((cs) => {
      const list = WYD.cube.learnedFor(s, cs);
      const cur = s.cube.slots[cs];
      const curDef = cur && WYD.data.uniques.list.find((u) => u.id === cur);
      const opts = [`<option value="">（なし）</option>`].concat(list.map((u) =>
        `<option value="${u.id}" ${u.id === cur ? "selected" : ""}>${u.name}</option>`)).join("");
      return `<div class="cube-row"><span class="cube-name">${C.slots[cs]}</span>
        <select data-cube-slot="${cs}" ${list.length ? "" : "disabled"}>${opts}</select>
        <div class="cube-desc">${curDef ? WYD.loot.uniqueDesc(curDef) : list.length ? "" : "まだ覚えた力がない"}</div></div>`;
    }).join("") + `<p class="muted">「入れるモード」をONにしてユニーク装備をクリックすると、分解して力を覚える（${WYD.data.crafting.materialName} ${C.extractCost}個）</p>`;
  },

  // ロック：捨てられない・まとめて捨てない・自動装備で外れない
  toggleLock(item) {
    if (!item) return;
    item.locked = !item.locked;
    this.log(`${WYD.loot.label(item)}を${item.locked ? "ロックした（捨てられない）" : "ロックを外した"}`, "#c9b48a");
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
    WYD.world.clearDrops(this.world, this.state);
    this.log(`「${next.name}」へ移動した`, "#ff8a2a");
    const intro = WYD.data.story.areaIntro[next.id];
    if (intro) this.log(intro, "#c9b48a");
    this.logHomeDrops(next.id);
    this.changed();
  },

  // 今ONになっている（覚えていて使う）スキルの数
  activeSkillCount() {
    const pl = this.state.player;
    return Object.keys(WYD.data.skills).filter((id) => (pl.skills[id] || 0) > 0 && pl.skillEnabled[id]).length;
  },

  toggleSkill(id) {
    const pl = this.state.player;
    if (!pl.skillEnabled[id] && this.activeSkillCount() >= WYD.collector.slots(this.state)) {
      this.log(`スキルは同時に${WYD.collector.slots(this.state)}つまで。先にどれかをOFFにしてください`, "#ff6b6b");
      return;
    }
    pl.skillEnabled[id] = !pl.skillEnabled[id];
    if (!pl.skillEnabled[id] && WYD.collector.is()) WYD.collector.cleanup(this.world, this.state, id);   // 蒐集者：外した技の召喚などを残さない
  },

  // スキルポイントを自動で振る（設定「スキルを自動で上げる」）
  //   1. ONの枠が空いていて、まだ覚えていないスキルがあれば覚える（おすすめの autoBuild を先に、そのあとAIが試す順番）
  //   2. ONのスキルのうち、レベルの低いものから上げる
  //   3. ONのスキルが全部最大なら、覚えているほかのスキルを上げる
  autoSkill() {
    const pl = this.state.player;
    const S = WYD.data.skills;
    const order = [...new Set([...(WYD.data.autoBuild || []), ...WYD.data.skillOrder])].filter((id) => S[id]);
    let guard = 0;
    while (pl.skillPoints > 0 && guard++ < 200) {
      const lv = (id) => pl.skills[id] || 0;
      const open = (id) => lv(id) < S[id].maxLevel;
      let pick = null;
      if (this.activeSkillCount() < WYD.collector.slots(this.state)) pick = order.find((id) => lv(id) === 0);
      if (!pick) pick = order.filter((id) => lv(id) > 0 && pl.skillEnabled[id] && open(id)).sort((a, b) => lv(a) - lv(b))[0];
      if (!pick) pick = order.filter((id) => lv(id) > 0 && open(id)).sort((a, b) => lv(a) - lv(b))[0];
      if (!pick) pick = order.find((id) => open(id));
      if (!pick) break;
      this.levelUpSkill(pick);
    }
  },

  // スキルポイントが余っているとき：スキル欄の上に「＋で覚える／おまかせ」の案内を出す
  renderSkillHint() {
    const s = this.state, G = WYD.data.story.skillGuide;
    const el = this.$("skill-hint");
    const pts = s.player.skillPoints;
    el.hidden = !(pts > 0 && !s.settings.autoSkill);
    if (el.hidden) return;
    el.innerHTML = `${G.panel.replace("{n}", pts)}<span class="skill-hint-btns"><button data-skill-guide="once">${G.onceButton}</button><button data-skill-guide="always">${G.alwaysButton}</button></span>`;
  },

  // ポイントがたまったら、画面の真ん中でも1回知らせる（遊んでいる間に段階ごとに1回）
  checkSkillGuide() {
    const s = this.state, G = WYD.data.story.skillGuide;
    if (s.settings.autoSkill) return;
    this.skillGuideShown = this.skillGuideShown || {};
    const step = G.noticeAt.filter((n) => s.player.skillPoints >= n).pop();
    if (step == null || this.skillGuideShown[step]) return;
    this.skillGuideShown[step] = true;
    this.notice(G.notice.replace("{n}", s.player.skillPoints), G.color);
  },

  levelUpSkill(id) {
    const pl = this.state.player;
    const def = WYD.data.skills[id];
    if (pl.skillPoints <= 0 || pl.skills[id] >= def.maxLevel) return;
    // 新しく覚えたスキルは、枠が空いていればON、いっぱいならOFFにする
    if ((pl.skills[id] || 0) === 0) pl.skillEnabled[id] = this.activeSkillCount() < WYD.collector.slots(this.state);
    pl.skills[id] = (pl.skills[id] || 0) + 1;
    pl.skillPoints--;
    this.log(`${def.name}が Lv${pl.skills[id]} になった`, def.color);
  },

  // 大事な知らせ：ログに書き、画面の真ん中にも大きく出す
  notice(msg, color) {
    this.log(msg, color);
    const N = WYD.data.map.notice;
    const w = this.world;
    if (!w) return;
    w.notices = (w.notices || []).concat([{ text: msg, color: color || "#ffffff", time: 0 }]).slice(-N.max);
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
    const skillCanvas = this.$("hud-skills"), skillCtx = skillCanvas.getContext("2d");
    skillCtx.clearRect(0, 0, skillCanvas.width, skillCanvas.height);
    WYD.render.drawSkillBar(skillCtx, this.world, this.state, true);
    WYD.runeSkillsUI.renderActive();
    WYD.results.render(this.world);
  },

  // 冒険者情報の「召喚の能力」。今の装備・スキルで呼んだときの強さ（呼んでいなくても出す）
  renderSummonStats(stats) {
    const s = this.state, n = (v) => Math.round(v).toLocaleString(), cards = [];
    const card = (title, sub, rows) => cards.push(`<div class="summon-card"><h4>${title}${sub ? ` <small>${sub}</small>` : ""}</h4><div class="stats">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div></div>`);
    const boost = stats.powers.raiseBoost;
    for (const id in WYD.data.skills) {
      const lv = s.player.skills[id] || 0, base = WYD.data.skills[id];
      if (base.kind !== "raise" || lv <= 0) continue;
      const d = WYD.runes.effectiveDef(s, id), mult = (d.attackBase + d.attackPerLevel * (lv - 1)) * (1 + (boost ? boost.attackPercent : 0) / 100);
      card(base.name, `Lv${lv}${s.player.skillEnabled[id] ? "" : "・OFF"}`, [
        ["呼べる数", `${WYD.allies.maxCount(d, lv, stats)}体`], ["最大HP", n(stats.maxHp * d.hpRatio)],
        ["攻撃力", n(stats.attack * mult * (1 + stats.skillDamage / 100))], ["防御力", n(stats.defense * d.defenseRatio)],
        ["攻撃速度", `${d.attackSpeed}回/秒`], ["いられる時間", `${d.duration}秒`], ["攻撃", d.rangedRange ? `遠距離（${d.rangedRange}）` : "近接"]]);
    }
    const ps = stats.powers.periodicSummon;
    if (ps) card("装備で呼ぶ味方", `${ps.interval}秒ごとに${ps.count}体`, [["最大HP", n(stats.maxHp * ps.hpRatio)],
      ["攻撃力", n(stats.attack * ps.attackMult * (1 + stats.skillDamage / 100))], ["防御力", n(stats.defense * ps.defenseRatio)], ["いられる時間", `${ps.duration}秒`]]);
    if (WYD.classes.acts("puppeteer", this.state) && WYD.puppeteer) {
      const P = WYD.data.puppeteer, Pp = WYD.puppeteer, desp = stats.powers.puppetDesperation;
      const col = (m) => { const v = Pp.values(stats, m); return { hp: n(v.maxHp), atk: n(v.attack * (1 + stats.skillDamage / 100)), def: n(v.defense),
        share: `${Math.max(m.guardSharePercent || 0, (stats.powers.puppetScapegoat || {}).sharePercent || 0)}%`, cost: `×${m.costMult}`, floor: `${Math.round(m.lowHpReserve * 100)}%`, wait: `${m.respawnCooldown}秒` }; };
      const pve = col(P.modes.pve), pvp = col(P.modes.pvp), rows = [["最大HP", "hp"], ["攻撃力", "atk"], ["防御力", "def"], ["本体への攻撃の肩代わり", "share"], ["命令で払う本体HP", "cost"], ["命令で残す本体HP", "floor"], ["壊れてから呼び直すまで", "wait"]];
      cards.push(`<div class="summon-card"><h4>人形 <small>攻撃速度 ${P.puppet.attackSpeed}回/秒</small></h4><table class="summon-table"><tr><th></th><th>冒険</th><th>アリーナ</th></tr>${rows.map(([k, key]) => `<tr><td>${k}</td><td>${pve[key]}</td><td>${pvp[key]}</td></tr>`).join("")}</table>${desp ? `<p class="summon-note">無貌座の衣装：本体のHPが減るほど攻撃力が上がる（最大+${desp.maxPercent}%）</p>` : ""}</div>`);
    }
    const box = this.$("summon-stats"), html = cards.length ? `<h3>召喚の能力 <small>今の装備とスキルで呼んだときの強さ</small></h3>${cards.join("")}` : "";
    box.hidden = !html;
    if (this.summonStatsHtml !== html) { box.innerHTML = html; this.summonStatsHtml = html; }
  },

  updateBars() {
    const s = this.state;
    const dps = Math.round(WYD.world.dps(this.world));
    this.$("dps").textContent = `DPS ${dps.toLocaleString()}`;
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
    const atCamp = !!this.world.town;
    this.$("area-name").textContent = atCamp ? WYD.data.town.name : area.name;
    this.$("area-plaque").textContent = atCamp ? WYD.data.town.name : area.name;
    this.$("floor-plaque").textContent = atCamp ? "野営地" : WYD.trial.active(s) ? `試練・段階${s.trialRun.level}` : WYD.world.floorName(s);
    this.$("area-down").disabled = ai <= 0;
    this.$("area-up").disabled = ai >= opened.length - 1;
    this.$("boss-progress").textContent = atCamp ? `（出発先：${area.name}・${WYD.world.floorName(s)}）` : WYD.trial.active(s) ? "" : WYD.world.isBossRoom(s)
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
    this.$("full-replace").checked = !!s.settings.fullReplace;
    this.$("auto-skill").checked = !!s.settings.autoSkill;
    this.$("season").value = WYD.season.current(s).id;
    this.$("season").title = `季節のルール：${WYD.season.current(s).desc}`;
    this.$("filter-open").classList.toggle("active", !!s.settings.filter.on);
    this.$("auto-salvage").disabled = !!s.settings.filter.on;
    this.$("pause").textContent = this.paused ? "再開" : "停止";
    this.$("pause").classList.toggle("active", this.paused);
    this.$("quiet-fx").checked = !!s.settings.quietFx;
    this.$("sound-toggle").textContent = `効果音：${s.settings.sound ? "ON" : "OFF"}`;
    this.$("music-toggle").textContent = `音楽：${s.settings.music !== false ? "ON" : "OFF"}`;
    this.$("auto-diff").checked = s.settings.autoDifficulty;
    const inTrial = WYD.trial.active(s);
    this.$("trial-group").hidden = !WYD.trial.unlocked(s);
    this.$("trial-level").textContent = inTrial ? s.trialRun.level : s.trial.level;
    this.$("trial-down").disabled = inTrial || s.trial.level <= 1;
    this.$("trial-up").disabled = inTrial || s.trial.level >= s.trial.best + 1;
    this.$("trial-start").textContent = inTrial ? "やめる" : "挑む";
    this.$("trial-auto").checked = s.trial.autoNext;
    this.$("trial-best").textContent = `（最高 段階${s.trial.best}）`;
    const U = WYD.data.uber;
    this.$("uber-start").disabled = !WYD.uber.canStart(s);
    this.$("uber-start").textContent = `${U.name}（鍵 ${s.uber.keys}/${U.keysNeeded}）`;
    const uberStage = WYD.uber.stage(s), uberBusy = WYD.trial.active(s);
    this.$("uber-stage").textContent = `段階${uberStage}`;
    this.$("uber-down").disabled = uberBusy || uberStage <= U.minStage;
    this.$("uber-up").disabled = uberBusy || uberStage >= WYD.uber.maxStage(s);
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
    if (!this.$("paragon").hidden) this.putHtml("paragon", this.paragonHtml());
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
    this.putHtml("stats", rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join(""));
    this.renderSummonStats(stats);
    this.putHtml("build", this.buildHtml(stats));

    // スキル
    this.$("skill-points").textContent = s.player.skillPoints;
    this.renderSkillHint();
    this.$("skill-slots").textContent = `${this.activeSkillCount()} / ${WYD.collector.slots(this.state)}`;
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
        ${WYD.skillInfo.html(s, id, lv)}
        ${this.masteryHtml(id, lv, on)}
        ${this.runeHtml(id, lv)}
      </div>`;
    }).join("");
    // 中身が変わったときだけ作り直す（選択欄を開いている最中に閉じないように）
    if (skillsHtml !== this.lastSkillsHtml) {
      this.putHtml("skills", skillsHtml);
      this.lastSkillsHtml = skillsHtml;
    }

    // 装備
    const slots = WYD.data.items.slots;
    this.putHtml("equipment", Object.keys(slots).map((slot) => {
      const item = s.equipment[slot];
      return `<div class="cell slot" data-slot="${slot}" ${item ? `style="border-color:${this.color(item)};--r:${this.glow(item)}"` : ""}>
        <small>${slots[slot]}${item ? this.fxMark(item) : ""}</small>
        ${item ? `<span style="color:${this.color(item)}">${WYD.loot.label(item)}</span>${this.iconImg(item)}` : `<span class="empty">なし</span>`}
      </div>`;
    }).join(""));

    // 持ち物
    const size = WYD.data.items.inventorySize;
    this.$("inv-count").textContent = `${s.inventory.length} / ${size}`;
    const pending = (s.pendingLoot || []).length;
    this.$("pending-loot-panel").hidden = !pending;
    this.$("pending-loot-note").textContent = `未受取 ${pending}個：再読み込み・職業切替後も保管されます。${pending >= WYD.data.items.pendingLootLimit ? "戦闘停止中。受け取ると再開します。" : ""}`;
    this.$("claim-pending").textContent = `未受取 ${pending}個を受け取る`;
    this.$("claim-pending").disabled = s.inventory.length >= size && s.stash.length >= WYD.data.items.stashSize;
    this.$("bag-badge").textContent = `${s.inventory.length}/${size}${pending ? ` +${pending}` : ""}`;
    const inTown = !!(this.world && this.world.town);
    const muted = !s.settings.sound && s.settings.music === false;
    this.$("mute-btn").textContent = muted ? "🔇" : "🔊";
    this.$("mute-btn").classList.toggle("muted", muted);
    if (this.$("home-panel")) this.$("home-panel").hidden = !inTown;
    this.$("town-btn").classList.toggle("in-town", inTown);
    this.$("dps-open").disabled = !inTown;
    this.$("bag-open").classList.toggle("full", s.inventory.length >= size);
    const C = WYD.data.crafting;
    this.putHtml("materials", `<span style="color:${C.materialColor}">${C.materialName} ${s.materials}</span>`);
    this.$("craft-mode").textContent = `つけ直しモード：${this.craftMode ? "ON" : "OFF"}`;
    this.$("craft-mode").classList.toggle("active", this.craftMode);
    this.$("enhance-mode").textContent = `強化モード：${this.enhanceMode ? "ON" : "OFF"}`;
    this.$("enhance-mode").classList.toggle("active", this.enhanceMode);
    this.$("discard-all").disabled = !s.inventory.some((it) => !it.locked);
    this.$("bag-gamble-open").textContent = s.player.level < WYD.data.gamble.minLevel
      ? `キャダラの賭け（Lv${WYD.data.gamble.minLevel}〜）` : "キャダラの賭け";
    this.$("bag-gamble-open").disabled = s.player.level < WYD.data.gamble.minLevel;
    this.$("inv-help").textContent = this.enhanceMode
      ? "強化モード：装備をクリックすると、素材を使って +1 強化する"
      : this.craftMode ? "つけ直しモード：装備をクリックすると、素材を使って特殊効果をつけ直す"
      : this.isTouch() ? "装備を触ると操作を選べます。「全て捨てる」は持ち物だけを確認後に分解（ロック除く）"
      : "左クリック：装備／右クリック・Delete：捨てる／Ctrl＋クリック：ロック。「全て捨てる」は確認後に持ち物を分解（ロック除く）";
    if (!this.$("gamble").hidden) this.refreshGamble();
    this.putHtml("inventory", this.cellsHtml(s.inventory, size));
    this.putHtml("gems", this.gemsHtml());
    this.putHtml("builds", this.buildsHtml());
    this.$("maps-panel").hidden = !s.cleared && !s.maps.length;
    // 序盤は使えないものを出さない（使えるようになったら出る）
    const all = s.inventory.concat(s.stash, Object.values(s.equipment)).filter(Boolean);
    this.unlock("cube-panel", s.records.uniquesFound > 0 || Object.keys(s.cube.learned).length > 0);
    this.unlock("gems-panel", Object.keys(s.gems).length > 0 || all.some((it) => (it.sockets || []).length));
    this.unlock("merc-open", s.player.level >= WYD.data.mercenary.minLevel || !!s.mercenary.type);
    this.unlock("gamble-open", s.player.level >= WYD.data.gamble.minLevel);
    this.unlock("lgem-open", Object.keys(s.lgems.owned).length > 0);
    this.unlocksReady = true;
    this.$("maps-count").textContent = `${s.maps.length} / ${WYD.data.maps.maxHeld}　最高 段階${s.mapBest || 0}`;
    this.putHtml("maps", this.mapsHtml());
    const cubeHtml = this.cubeHtml();
    if (cubeHtml !== this.lastCubeHtml) {   // 選んでいる最中にリストが閉じないよう、変わったときだけ描き直す
      this.lastCubeHtml = cubeHtml;
      this.putHtml("cube", cubeHtml);
    }
    this.$("cube-mode").textContent = `入れるモード：${this.cubeMode ? "ON" : "OFF"}`;
    this.$("forge-mode").textContent = `鍛造モード：${this.forgeMode ? "ON" : "OFF"}`;
    this.$("forge-mode").classList.toggle("active", this.forgeMode);
    if (this.forgeMode) this.$("inv-help").textContent = "鍛造モード：持ち物・装備をクリックすると、鍛造の画面がひらく";
    this.$("cube-mode").classList.toggle("active", this.cubeMode);
    if (this.cubeMode) this.$("inv-help").textContent = "カナイの箱に入れるモード：ユニーク装備をクリックすると、分解してその力を覚える";
    if (this.gemSelected) this.$("inv-help").textContent = `${WYD.gems.name(this.gemSelected)}を選んでいる：持ち物・装備をクリックすると、空いたソケットにはめる（もう一度宝石をクリックでやめる）`;

    // 倉庫
    const stashSize = WYD.data.items.stashSize;
    this.$("stash-count").textContent = `${s.stash.length} / ${stashSize}`;
    this.$("stash-toggle").textContent = this.stashOpen ? "閉じる" : "開く";
    this.$("stash-body").hidden = !this.stashOpen;
    if (this.stashOpen) this.putHtml("stash", this.cellsHtml(s.stash, stashSize));
    // 装備のマスが作り直されたときだけ説明を消す（同じなら出したまま。毎回消すと点滅する）
    if (this.cellsChanged) this.hideTooltip();
    this.cellsChanged = false;
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

  // ビルドの欄（4つ）
  buildsHtml() {
    const s = this.state;
    const slots = WYD.data.items.buildSlots;
    let html = `<span class="muted">ビルド：</span>`;
    for (let n = 0; n < slots; n++) {
      const b = s.builds[n];
      html += `<span class="build-slot">${b ? `<button data-build="${n}" data-act="load" title="この装備・スキル・型・箱の枠に切り替える">${b.name}</button>` : `<span class="muted">（空き）</span>`}<button data-build="${n}" data-act="save" title="今の装備・スキル・型・箱の枠をここに保存">保存</button></span>`;
    }
    return html;
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

  // ルーンワードの表示（発動していれば効果、ノーマル装備でルーンがはまっていれば作れる候補）
  runewordHtml(item) {
    const G = WYD.data.gems;
    const rw = WYD.gems.runeword(item);
    if (rw) return `<div class="unique-power" style="color:${G.runewordColor}">ᚱ 旧装備の継承効果「${rw.name}」<br><small>${this.bonusText(rw.bonus)}</small></div>`;
    return "";
  },

  // 装備のソケットの表示
  socketsHtml(item) {
    if (!item.sockets || item.sockets.length === 0) return "";
    return item.sockets.map((key) => key
      ? `<div class="socket" style="color:${WYD.gems.color(key)}">◆ ${WYD.gems.name(key)}：${WYD.gems.statsText(key, item.slot)}</div>`
      : `<div class="socket empty">◇ 空いたソケット</div>`).join("");
  },

  runHistoryHtml() {
    const s = this.state;
    const R = WYD.data.records;
    const seasonName = (id) => (WYD.data.seasons.list.find((x) => x.id === id) || {}).name || "";
    const fmt = (r) => `${R.runNames[r.kind]} ${r.kind === "map" ? "地図段階" : "段階"}${r.level}　${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}`;
    const best = Object.keys(R.runNames).filter((k) => s.runBest[k]).map((k) =>
      `<div class="codex-row"><span>最高：${fmt(s.runBest[k])}</span><b class="muted">${s.runBest[k].date}</b></div>`).join("");
    const list = s.runHistory.slice(0, 10).map((r) =>
      `<div class="codex-row"><span>${fmt(r)}${r.season && r.season !== "none" ? `　<small class="muted">${seasonName(r.season)}</small>` : ""}</span><b class="muted">${r.date}</b></div>`).join("");
    return best || list ? `${best}<div class="build-title" style="margin-top:4px">最近（新しい順）</div>${list}` : `<p class="muted">まだ記録がない（試練・日替わり・地図・奈落の双王に成功すると残る）</p>`;
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
    const uList = WYD.loot.forClass(U.list);
    const uFound = uList.filter((u) => s.codex.uniques[u.id]).length;
    // よく落ちるエリア（今いるエリアなら目立たせる）
    const homeTag = (def) => {
      const name = WYD.loot.homeName(def);
      if (!name) return def.uberOnly ? ` <small class="codex-home">📍 奈落の双王</small>` : "";
      return ` <small class="codex-home${def.home === s.area ? " here" : ""}">📍 ${name}</small>`;
    };
    const uCard = (u) => s.codex.uniques[u.id]
      ? `<div class="codex-item"><b style="color:${rarity("unique").color}">${u.name}</b> <small class="muted">${baseName(u.base)}</small><br><small>${WYD.loot.uniqueDesc(u)}</small></div>`
      : `<div class="codex-item unknown"><b>？？？</b> <small class="muted">${baseName(u.base)}</small></div>`;
    // エリアごとにまとめる（どこを周回すれば何が出やすいかの表）。よく落ちるエリアがないもの（奈落の双王など）は最後
    const groups = WYD.data.areas.map((a) => ({ key: a.id, title: a.name, list: uList.filter((u) => u.home === a.id) }));
    groups.push({ key: "", title: "奈落の双王など", list: uList.filter((u) => !u.home) });
    const uniques = groups.filter((g) => g.list.length).map((g) =>
      `<div class="codex-area${g.key === s.area ? " here" : ""}">📍 ${g.title}${g.key === s.area ? "（今ここ）" : ""} <small>${g.list.filter((u) => s.codex.uniques[u.id]).length}/${g.list.length}</small></div>` +
      g.list.map(uCard).join("")).join("");
    // セット図鑑
    const SE = WYD.data.sets;
    const sets = WYD.loot.forClass(SE.list).map((set) => {
      const have = set.pieces.filter((p) => s.codex.setPieces[p.id]).length;
      const pieces = set.pieces.map((p) => s.codex.setPieces[p.id]
        ? `<span style="color:${SE.color}">${p.name}</span>` : `<span class="muted">？？？（${baseName(p.base)}）</span>`).join("、");
      const list = WYD.loot.setBonuses(set), bonuses = Object.keys(list).map((n) => `<div><small>（${n}つ）${this.bonusText(list[n])}</small></div>`).join("");
      return `<div class="codex-item"><b style="color:${SE.color}">${set.name}</b> <small class="muted">${have}/${set.pieces.length}</small>${homeTag(set)}<br><small>${pieces}</small>${bonuses}</div>`;
    }).join("");
    return `<div class="codex-cols">
      <div><h3>記録</h3>${counters}<h3>実績 <small>${done}/${R.achievements.length}</small></h3>${achievements}</div>
      <div><h3>ユニーク図鑑 <small>${uFound}/${uList.length}　📍 のエリアのボス・精鋭がよく落とす</small></h3>${uniques}<h3>セット図鑑</h3>${sets}
      <h3>挑戦の記録</h3>${this.runHistoryHtml()}
      <h3>ルーンスキル</h3><p>スキル欄の「ルーンスキル」で完成スキルを抽選。クラス技3枠とは別の専用4枠目。奈落の双王で変質石を集めて1箇所を再抽選できます。宝石だけが装備ソケットに対応します。</p></div>
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
    const list = WYD.loot.setBonuses(info.set);
    const bon = Object.keys(list).map((need) =>
      `<div style="color:${have >= Number(need) ? C : "#777"}">（${need}つ）${this.bonusText(list[need])}</div>`).join("");
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

  // 修練（キャラ欄）：ポイントとボードを開くボタン
  paragonHtml() {
    const pg = this.state.player.paragon;
    return `<div class="build-title">修練ポイント：<b style="color:var(--accent)">${pg.points}</b>（レベル上限のあとの経験値でたまる）
      <button id="board-open">秘技修練・能力の盤面</button>　取ったマス ${Object.keys(pg.board).length} · 秘技 ${WYD.training.current(this.state)?.name || "未選択"}</div>`;
  },

  // パラゴンボードの画面
  boardHtml() {
    const s = this.state;
    const B = WYD.data.player.paragon.board;
    const rows = B.layout.map((line, r) => [...line].map((ch, c) => {
      if (ch === ".") return `<div class="bcell empty"></div>`;
      const t = B.tiles[ch];
      const own = WYD.board.owned(s, r, c);
      const can = WYD.board.canTake(s, r, c);
      return `<div class="bcell ${t.kind}${own ? " own" : ""}${can ? " can" : ""}" data-cell="${r},${c}" style="--bc:${B.colors[t.kind]}"
        title="${WYD.board.tileText(t)}${own ? "（取得ずみ）" : can ? "（クリックで取る）" : ""}"></div>`;
    }).join("")).join("");
    const pb = WYD.stats.paragonBonus(s);
    const sum = Object.keys(pb).filter((k) => pb[k]).map((k) => WYD.data.items.stats[k] ? WYD.util.formatStat(k, pb[k]) : `${B.magicFindName} +${pb[k]}%`).join("、");
    return `<p class="training-wallet">修練ポイント：<b>${s.player.paragon.points}</b></p>${WYD.training.html(s)}<h3>能力の盤面（従来の修練）</h3><div class="dev-head">修練ポイント：<b>${s.player.paragon.points}</b>　<small class="muted">光っているマス（取ったマスのとなり）をクリックで取る。マスにマウスを乗せると中身が出る</small></div>
      <div class="board-grid" style="grid-template-columns: repeat(${B.layout[0].length}, 26px)">${rows}</div>
      <div class="board-legend">${Object.keys(B.colors).map((k) => `<span style="color:${B.colors[k]}">■</span>${{ normal: "ふつう", magic: "マジック", rare: "レア", legend: "伝説" }[k]}`).join("　")}</div>
      <p class="muted">今の合計：${sum || "なし"}</p>`;
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
    for (const c of WYD.devotion.owned(this.state)) {
      if (c.bonus.power) lines.push(`<div style="color:#fff0a0">✧ 星座：${c.name}：<small>${WYD.loot.uniqueDesc(c.bonus)}</small></div>`);
    }
    for (const u of WYD.cube.active(this.state)) {
      lines.push(`<div style="color:${WYD.data.cube.color}">▣ 箱：${u.name}：<small>${WYD.loot.uniqueDesc(u)}</small></div>`);
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
    return (item.ancient ? ` <b class="fx-mark" style="color:${WYD.data.items.ancient.colors[item.ancient]}" title="${WYD.data.items.ancient.names[item.ancient]}装備">${item.ancient === 2 ? "◈" : "◆"}</b>` : "") + (item.locked ? ` <b class="fx-mark lock-mark" title="ロック中（Ctrl＋クリックで外す）">🔒</b>` : "") + (n ? ` <b class="fx-mark" style="color:${WYD.data.effects.color}">✦${n}</b>` : "") +
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
    const setDef = WYD.loot.setInfo(item);
    const home = WYD.loot.homeName(u || (setDef && setDef.set));
    const uniqueLine = (u
      ? `<div class="unique-power" style="color:${WYD.data.uniques.color}">◆ 固有能力<br><small>${WYD.loot.uniqueDesc(u)}</small></div>`
      : "") + this.setHtml(item) + (home ? `<div class="tip-home">📍 よく落ちる：${home}</div>` : "");
    const keep = WYD.inventory.keepReason(item, this.state);
    const fxLines = this.itemEffects(item).map(({ def, value }) =>
      `<div class="effect" style="color:${WYD.data.effects.color}">✦ ${def.name}<br><small>${WYD.util.formatEffect(def, value)}</small></div>`
    ).join("");
    return `<div class="tip-item">
      ${title ? `<div class="tip-title">${title}</div>` : ""}
      <div style="color:${WYD.gems.runeword(item) ? WYD.data.gems.runewordColor : r.color};font-weight:bold">${item.plus > 0 ? `<span style="color:${WYD.data.crafting.enhance.color}">+${item.plus}</span> ` : ""}${WYD.gems.runeword(item) ? `「${WYD.gems.runeword(item).name}」` : ""}${item.name}</div>
      <div class="tip-sub">${item.ancient ? `<b style="color:${WYD.data.items.ancient.colors[item.ancient]}">${WYD.data.items.ancient.names[item.ancient].replace("の", "")}</b>・` : ""}${r.name}・${WYD.data.items.slots[item.slot]}・アイテムLv ${item.level}</div>
      ${keep ? `<div class="tip-sub">自動保護：${WYD.data.story.keepNote.reasons[keep]}ため${item.locked ? "（分解不可）" : "（手動の分解・全て捨てるは対象。残すならロック）"}</div>` : ""}
      ${lines}
      ${uniqueLine}
      ${fxLines}
      ${this.socketsHtml(item)}
      ${this.runewordHtml(item)}
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

  // 隠していたものを出す。はじめて出たときは「使えるようになった」と知らせる
  // （ページを開いて最初の1回は知らせない＝前から使えていたものを知らせないように）
  unlock(id, show) {
    const s = this.state;
    s.unlocks = s.unlocks || {};
    this.$(id).hidden = !show;
    if (!show || s.unlocks[id]) return;
    s.unlocks[id] = true;
    const text = WYD.data.story.unlocks[id];
    if (this.unlocksReady && text) this.notice(`新しく使えるようになった：${text}`, WYD.data.story.unlockColor);
  },

  // スマホ（マウスがない画面）か
  isTouch() {
    return !!window.matchMedia && (window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches);
  },
  // 長押し（指でもマウスでも）で「どうするか」の窓を出す。右クリックができない環境でも捨てたりできるように
  bindLongPress(el, selector, where, keyOf) {
    let timer = null, start = null;
    const clear = () => { clearTimeout(timer); timer = null; };
    el.addEventListener("pointerdown", (e) => {
      this.lastPointer = e.pointerType;
      if (e.button !== 0) return;
      const cell = e.target.closest(selector);
      if (!cell) return;
      start = { x: e.clientX, y: e.clientY };
      clear();
      timer = setTimeout(() => {
        timer = null;
        if (this.touchSheet(where, keyOf(cell), true)) this.suppressClick = true;
      }, WYD.data.items.longPressMs);
    });
    el.addEventListener("pointermove", (e) => {
      if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clear();
    });
    el.addEventListener("pointerup", clear);
    el.addEventListener("pointercancel", clear);
  },
  // 右クリックで捨てる。contextmenu が届かない・遅れる環境でもいいように、マウスの右ボタンを押した時点で捨てる。
  // 指の長押し（touch）で出る contextmenu では捨てない（窓のほうを出す）
  bindRightDiscard(el, where) {
    let done = false;
    el.addEventListener("pointerdown", (e) => {
      done = false;
      if (e.button !== 2 || e.pointerType === "touch") return;
      const cell = e.target.closest("[data-index]");
      if (!cell) return;
      done = true;
      this.discardAt(where, Number(cell.dataset.index));
    });
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (done) { done = false; return; }
      if (this.lastPointer === "touch") return;
      const cell = e.target.closest("[data-index]");
      if (cell) this.discardAt(where, Number(cell.dataset.index));
    });
  },
  // 長押しで窓を出した直後のクリックは、装備などをしない
  eatClick() {
    if (!this.suppressClick) return false;
    this.suppressClick = false;
    return true;
  },

  // スマホ：装備を触ったら、説明と「どうするか」のボタンを窓で出す（ふつうのモードのときだけ）。出したら true
  // 熟練（OFF のスキルで上がる能力）の一行。ON のときは「OFF にすると」と小さく
  masteryHtml(id, lv, on) {
    const M = WYD.data.mastery;
    const ms = WYD.stats.masteryBonus(this.state, id);
    const per = M.perLevel[WYD.classes.kindOf(id)];
    if (!per) return "";
    const show = lv > 0 ? ms : per;
    const fmt = (k, v) => { const info = WYD.data.items.stats[k]; return `${info.name} +${Math.round(v * 10) / 10}${info.percent ? "%" : ""}`; };
    const text = Object.keys(show).map((k) => fmt(k, show[k])).join("、");
    if (lv <= 0) return `<div class="skill-mastery muted">${M.label}：OFF にしておくと 1レベルごとに ${text}</div>`;
    return on
      ? `<div class="skill-mastery muted">${M.label}：OFF にすると ${text}</div>`
      : `<div class="skill-mastery" style="color:${M.color}">◇ ${M.label}（OFF 中）：${text}</div>`;
  },

  // 効果音と音楽をまとめて切り替える（どちらかが鳴っていれば両方消す。両方消えていれば両方つける）
  toggleMute() {
    const st = this.state.settings;
    const on = !!st.sound || st.music !== false;
    st.sound = !on;
    st.music = !on;
    this.log(on ? "音を消した（M キーかボタンで戻す）" : "音を出した");
    this.changed();
  },

  // このエリアでよく落ちるユニーク・セットを知らせる（まだ持っていないものの数も）
  logHomeDrops(areaId) {
    const s = this.state;
    const us = WYD.loot.forClass(WYD.data.uniques.list).filter((u) => u.home === areaId);
    const ss = WYD.loot.forClass(WYD.data.sets.list).filter((x) => x.home === areaId);
    if (!us.length && !ss.length) return;
    const newU = us.filter((u) => !s.codex.uniques[u.id]).length;
    const parts = [];
    if (us.length) parts.push(`ユニーク${us.length}種（未発見 ${newU}）`);
    if (ss.length) parts.push(`セット「${ss.map((x) => x.name).join("」「")}」`);
    this.log(`📍 このエリアのボス・精鋭がよく落とす：${parts.join("・")}（「やり込み」→「図鑑と記録」で見られる）`, WYD.data.uniques.color);
  },

  // 装備・持ち物の画面を開く・閉じる（show を省くと切り替え）
  toggleBag(show) {
    const bag = this.$("bag");
    bag.hidden = show === undefined ? !bag.hidden : !show;
    if (bag.hidden) { this.hideTooltip(); this.hovered = null; this.$('bag-open').focus(); }
    else {
      this.toggleCharacterDrawer(false);
      const cls = WYD.data.classes[WYD.classes.id];
      const portrait = this.$("equipment-portrait");
      if (portrait && cls?.player?.image) portrait.src = cls.player.image;
      this.$("equipment-class-name").textContent = cls?.name || "冒険者";
      this.updateHudLayout();
      this.$('bag-close').focus();
    }
    this.markDirty();
  },

  toggleCharacterDrawer(show) {
    const drawer = this.$("character-drawer");
    const open = show === undefined ? !drawer.classList.contains("open") : !!show;
    drawer.classList.toggle("open", open);
    document.body.classList.toggle("drawer-open", open);
    this.$("character-open").setAttribute("aria-expanded", String(open));
    if (open) this.$('character-close').focus();
    else if (drawer.contains(document.activeElement)) this.$('character-open').focus();
    return open;
  },

  // マウスを乗せている装備を捨てる（Delete キー。右クリックが効かない環境でも捨てられるように）
  discardHovered() {
    this.discardAt(this.hovered.where, this.hovered.index);
  },

  // 持ち物（"inv"）か倉庫（"stash"）の index 番目を捨てる
  discardAt(where, index) {
    const s = this.state;
    const list = where === "inv" ? s.inventory : s.stash;
    const item = list[index];
    if (!item) return;
    const gained = where === "inv" ? WYD.inventory.discard(s, index) : WYD.inventory.discardFromStash(s, index);
    if (gained < 0) this.log(`${WYD.loot.label(item)}はロックしているので捨てられない（Ctrl＋クリックで外す）`, "#ff6b6b");
    else this.log(`${WYD.loot.label(item)}を捨てた（${WYD.data.crafting.materialName} +${gained}）`);
    this.hovered = null;
    this.hideTooltip();
    this.changed();
  },

  touchSheet(where, key, force) {
    if ((!this.isTouch() && !force) || this.forgeMode || this.cubeMode || this.gemSelected || this.enhanceMode || this.craftMode) return false;
    const s = this.state;
    const item = where === "inv" ? s.inventory[key] : where === "stash" ? s.stash[key] : s.equipment[key];
    if (!item) return false;
    this.sheet = { where, key };
    const mat = WYD.data.crafting.materialName;
    let html = this.itemHtml(item);
    if (where !== "eq") {
      const cur = s.equipment[item.slot];
      html += cur ? this.itemHtml(cur, "いま装備中") : `<div class="tip-item tip-sub">この部位は何も装備していない</div>`;
      html += this.compareHtml(item, cur);
    }
    const btn = (act, label, cls) => `<button data-sheet="${act}"${cls ? ` class="${cls}"` : ""}>${label}</button>`;
    const acts = where === "inv" ? [btn("equip", "装備する")]
      : where === "stash" ? [btn("back", "持ち物へ戻す")] : [btn("unequip", "外す")];
    acts.push(btn("lock", item.locked ? "ロックを外す" : "ロックする"));
    if (where !== "eq") acts.push(btn("discard", `捨てる（${mat} +${WYD.inventory.salvageValue(s, item)}）`, "danger"));
    acts.push(btn("close", "閉じる"));
    this.$("sheet-body").innerHTML = `<div class="sheet-details">${html}</div><div class="sheet-btns">${acts.join("")}</div>`;
    this.$("sheet").hidden = false;
    return true;
  },

  // スマホの窓のボタン
  sheetAction(act) {
    const s = this.state;
    const sh = this.sheet;
    this.$("sheet").hidden = true;
    if (!sh || act === "close") return;
    const item = sh.where === "inv" ? s.inventory[sh.key] : sh.where === "stash" ? s.stash[sh.key] : s.equipment[sh.key];
    if (!item) return;
    const C = WYD.data.crafting;
    if (act === "equip") WYD.inventory.equip(s, sh.key);
    else if (act === "stash" && !WYD.inventory.toStash(s, sh.key)) this.log("倉庫がいっぱいで入れられない", "#ff6b6b");
    else if (act === "back" && !WYD.inventory.fromStash(s, sh.key)) this.log("持ち物がいっぱいで戻せない", "#ff6b6b");
    else if (act === "unequip" && !WYD.inventory.unequip(s, sh.key)) this.log("持ち物がいっぱいで外せない", "#ff6b6b");
    else if (act === "lock") this.toggleLock(item);
    else if (act === "discard") {
      const gained = sh.where === "inv" ? WYD.inventory.discard(s, sh.key) : WYD.inventory.discardFromStash(s, sh.key);
      if (gained < 0) this.log(`${WYD.loot.label(item)}はロックしているので捨てられない`, "#ff6b6b");
      else this.log(`${WYD.loot.label(item)}を捨てた（${C.materialName} +${gained}）`);
    }
    this.sheet = null;
    this.changed();
  },

  showTooltipFor(e, where) {
    if (this.isTouch()) return;   // スマホは触った窓で見る
    const s = this.state;
    let item = null, html = "";
    if (where === "inv" || where === "stash") {
      const cell = e.target.closest("[data-index]");
      item = cell && (where === "inv" ? s.inventory : s.stash)[Number(cell.dataset.index)];
      this.hovered = item ? { where, index: Number(cell.dataset.index) } : null;
      if (item) {
        html = this.itemHtml(item);
        const cur = s.equipment[item.slot];
        html += cur ? this.itemHtml(cur, "いま装備中") : `<div class="tip-item tip-sub">この部位は何も装備していない</div>`;
        html += this.compareHtml(item, cur);
        html += this.enhanceMode ? this.enhanceHelp(item) : this.craftMode
          ? this.rerollHelp(item)
          : `<div class="tip-help">${where === "inv" ? "左クリック：装備するへ／Ctrl＋クリック：ロック" : "クリック：持ち物へ戻す"}／右クリック：捨てる（${WYD.data.crafting.materialName} +${WYD.inventory.salvageValue(this.state, item)}）</div>`;
      }
    } else {
      const cell = e.target.closest("[data-slot]");
      item = cell && s.equipment[cell.dataset.slot];
      if (item) html = this.itemHtml(item) + (this.enhanceMode ? this.enhanceHelp(item) : this.craftMode ? this.rerollHelp(item) : `<div class="tip-help">クリック：外す／Ctrl＋クリック：ロック</div>`);
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
