// 装備画面（リネレボ風。Status の画面）：左右に装備の枠、真ん中にキャラと戦闘力、右に持ち物（絞り込みのタブ）、下に能力と操作。
// 画面の下のページで、能力・リザルト／ソート／カナイの箱／地図に切りかえる（元のかばん・Status の部品をそのまま移して使う）。
// 枠・マスを選ぶと、いつもの装備の窓（src/ui.js の touchSheet）が出る。マウスを乗せると性能、右クリックで捨てる、Ctrl＋クリックでロック。並びと数値は data/equipscreen.js。
window.WYD = window.WYD || {};
WYD.equipScreen = {
  opened: false,
  tab: "all",
  bagPage: 0,
  gearSort: "default",
  opKeys: [],      // OP指定で選んだ装備の能力・特殊効果（複数。全部を持つ装備だけ出し、高い順）
  gemOpKeys: [],   // 同じく宝石
  gemSort: "tier",
  page: "equip",

  init() {
    const $ = (id) => document.getElementById(id);
    this.$ = $;
    $("equipscreen-close").onclick = () => this.close();
    const body = $("equipscreen-body"), D = WYD.data.equipScreen;
    // 骨組み：装備ページ（描きなおす所と、元の部品）と、ほかのページ（元の部品を移す）。下にページのタブ
    body.innerHTML = `<div class="es-page" data-page="equip"><div id="es-main-host"></div>` +
      `<div class="es-bottom"><div id="es-stats-host" class="es-stats"></div><div class="es-actions" id="es-actions"><span id="es-count" class="es-count"></span><span id="es-fuse-host"></span></div></div></div>` +
      D.pages.filter((p) => p.id !== "equip").map((p) => `<div class="es-page" data-page="${p.id}" hidden></div>`).join("") +
      `<nav class="es-pagetabs" aria-label="画面の切りかえ">${D.pages.map((p) => `<button data-es-page="${p.id}">${p.label}</button>`).join("")}</nav>`;
    const page = (id) => body.querySelector(`.es-page[data-page="${id}"]`);
    // 元のかばん・Status から部品を移す（動きはそのまま。src/ui.js が id で描きなおす）
    page("equip").prepend($("pending-loot-panel"));   // 未受取（持ち物がいっぱいで入らなかった装備）
    $("es-fuse-host").before(document.querySelector(".inv-buttons"));   // 並べ替え・キャダラの賭け・全て捨てる
    for (const p of D.pages) if (p.panel && $(p.panel)) page(p.id).append($(p.panel));
    page("sort").innerHTML = `<div id="es-sort-host"></div>`;
    page("sort").insertAdjacentHTML("beforeend", `<div class="es-sort-manual"><h4>持ち物の並びを固定</h4><p>レア度・部位・強さの順で持ち物自体を並べ替える。</p></div>`);
    page("sort").querySelector(".es-sort-manual").append($("sort-inv"));
    // 保存ビルドの操作は残し、独立した下タブだけを整理する。
    page("stats").insertAdjacentHTML("beforeend", `<div class="es-builds-wrap"><h3>保存ビルド</h3><p class="muted">装備とスキルの構成を保存・切り替え。</p></div>`);
    page("stats").querySelector(".es-builds-wrap").append($("builds"));
    body.onclick = (e) => {
      const p = e.target.closest("[data-es-page]");
      if (p) { this.page = p.dataset.esPage; WYD.ui.hideTooltip(); this.render(); return; }
      this.click(e);
    };
    // マウスを乗せると性能（持ち物は今の装備との比べも）。説明は かばんと同じ（src/ui.js の showTooltipFor）
    body.onmouseover = (e) => {
      const el = e.target.closest('[data-es="item"],[data-es="slot"],[data-es="gem"]');
      if (el && el.dataset.es === "gem") this.gemTip(e, el.dataset.key);
      else if (el) WYD.ui.showTooltipFor(e, el.dataset.es === "item" ? "inv" : "eq"); else WYD.ui.hideTooltip();
    };
    body.onmouseleave = () => WYD.ui.hideTooltip();
    WYD.ui.bindRightDiscard($("es-main-host"), "inv");   // 持ち物を右クリックで捨てる（かばんと同じ。ロックは捨てない）
  },

  open(page) {
    if (page) this.page = page;
    this.opened = true;
    this.$("equipscreen").hidden = false;
    this.render();
  },

  close() {
    this.opened = false;
    this.$("equipscreen").hidden = true;
    WYD.ui.hideTooltip();
    const nav = this.$("character-open"); if (nav) { nav.classList.remove("active"); nav.setAttribute("aria-pressed", "false"); }
  },

  // 画面の外で装備・持ち物が変わったとき（src/ui.js の描きなおしから呼ぶ）
  refresh() { if (this.opened) this.render(); },

  // 戦闘力（目安）：能力 × 重み（data/equipscreen.js の power）
  power(stats) {
    const W = WYD.data.equipScreen.power;
    return Math.round(Object.keys(W).reduce((n, k) => n + (stats[k] || 0) * W[k], 0));
  },

  // 手元の宝石（種類ごとに1マス）。並びはソート画面で選ぶ。
  gemKeys() {
    const s = WYD.state, G = WYD.gems, keys = Object.keys(s.gems).filter((k) => s.gems[k] > 0 && G.info(k) && !G.info(k).rune);
    const tier = (k) => { const i = G.info(k); return i.fused ? (i.god ? 2000 : 1000) + i.lines.length : i.tier * 10 + WYD.data.gems.gems.indexOf(i.def); };
    let list = keys.map((key, index) => ({ key, index }));
    const op = this.gemSort === "op" && this.gemOpKeys.length ? this.opRank(list.map((e) => e.key), this.gemOpKeys, (k, op) => this.gemOpValue(k, op)) : null;
    if (op) list = list.filter((e) => op.has(e.key));   // 選んだOPを全部持つ宝石だけ
    return list.sort((a, b) => {
      const diff = this.gemSort === "new" ? b.index - a.index :
        this.gemSort === "lines" ? (G.info(b.key).lines || []).length - (G.info(a.key).lines || []).length :
        this.gemSort === "count" ? s.gems[b.key] - s.gems[a.key] :
        this.gemSort === "name" ? G.name(a.key).localeCompare(G.name(b.key), "ja") :
        this.gemSort === "op" ? (op ? op.get(b.key) - op.get(a.key) : 0) : tier(b.key) - tier(a.key);
      return diff || tier(b.key) - tier(a.key) || a.index - b.index;
    }).map((entry) => entry.key);
  },

  gemOpChoices() {
    const G = WYD.data.gems.fusion;
    const powerNames = { killNova: "屍体の爆発", projectileWard: "弾をはじく", eliteHunter: "精鋭狩り", ascetic: "空き枠の威力" };
    return G.pool.map((p) => {
      const name = p.kind === "stat" ? WYD.data.items.stats[p.id].name :
        p.kind === "effect" ? WYD.loot.effectInfo(p.id).name :
        p.kind === "pct" ? `${G.pctNames[p.id]}（割合）` :
        p.kind === "god" ? `神・${p.name}` : `固有・${powerNames[p.id] || p.id}`;
      return [`${p.kind}:${p.id}`, name];
    });
  },

  // 通常宝石の能力値は武器・防具・装飾品に入れたときの最大値で比較。
  // 固有・神は複数パラメータを抽選範囲内の達成率で比較する。
  gemOpValue(key, opKey) {
    const i = WYD.gems.info(key), [kind, id] = opKey.split(":");
    if (!i) return null;
    if (!i.fused) {
      if (kind !== "stat") return null;
      const values = ["weapon", "armor", "jewelry"].map((group) => (i.def[group] || {})[id] || 0);
      const value = Math.max(...values) * i.tierDef.mult;
      return value > 0 ? value : null;
    }
    const line = i.lines.find((l) => l.kind === kind && l.id === id);
    if (!line) return null;
    if (Number.isFinite(line.value)) return line.value;
    const def = WYD.gems.poolDef(kind, id);
    const ranges = def && Object.entries(def.params || {});
    return ranges && ranges.length ? ranges.reduce((sum, [name, [lo, hi]]) =>
      sum + ((line.params[name] - lo) / (hi - lo || 1)), 0) / ranges.length * 100 : null;
  },

  gemOpLabel(value, opKey) {
    if (value == null) return "なし";
    const [kind, id] = opKey.split(":");
    if (kind === "power" || kind === "god") return `品質 ${Math.round(value)}%`;
    return kind === "stat" ? WYD.util.formatStat(id, value) : `${value}%`;
  },

  // OP指定の点数 Map（key → 点数）。選んだOPを全部持つものだけ入る。点数 = 各OPの値 ÷ そのOPの最大値 の合計（単位のちがうOPも同じ重さで比べる）
  opRank(keys, ops, valueOf) {
    const values = new Map(keys.map((k) => [k, ops.map((op) => valueOf(k, op))]));
    const max = ops.map((op, n) => Math.max(0, ...[...values.values()].map((v) => v[n] ?? 0)) || 1);
    const out = new Map();
    for (const [k, v] of values) if (v.every((x) => x != null)) out.set(k, v.reduce((sum, x, n) => sum + x / max[n], 0));
    return out;
  },

  // 宝石のマス
  gemCell(key) {
    const s = WYD.state, G = WYD.gems, i = G.info(key), M = WYD.data.equipScreen.gemMark, esc = WYD.results.escape;
    const mark = i.god ? M.god : i.fused ? M.fused : M.tiers[i.tier] || "";
    const art = i.god ? "divine" : i.fused ? "chaos" : ({ ruby: "ruby", amethyst: "amethyst", topaz: "topaz", emerald: "emerald" })[i.def.id];
    return `<button class="es-cell es-gemcell" data-es="gem" data-key="${esc(key)}" style="--c:${i.def.color};--g:${i.def.color}55" aria-label="${esc(G.name(key))}">` +
      `<b class="es-rarity">${mark}</b>${G.isNew(s, key) ? `<i class="new-badge es-new">NEW</i>` : ""}${art ? `<img class="es-gem-art" src="assets/ui/gem-${art}.webp" alt="">` : `<span class="es-gem-shape">◆</span>`}<small class="es-lv">×${s.gems[key]}</small></button>`;
  },

  // 持ち物のうち、今のタブに入るもの [{ item, index }]
  // 装備の能力値と特殊効果を、指定OPとして同じ入口から選ぶ。
  opChoices() {
    return [
      ...Object.entries(WYD.data.items.stats).map(([id, def]) => [`stat:${id}`, def.name]),
      ...WYD.data.effects.list.map((def) => [`effect:${def.id}`, def.name]),
    ];
  },

  opValue(item, opKey) {
    const [kind, id] = opKey.split(":");
    if (kind === "stat") {
      const lines = (item.stats || []).filter((line) => line.stat === id);
      return lines.length ? lines.reduce((sum, line) => sum + WYD.loot.lineValue(item, line), 0) : null;
    }
    const effect = (item.effects || []).find((fx) => fx.id === id);
    return effect ? Number(effect.value) : null;
  },

  opLabel(value, opKey) {
    if (value == null) return "なし";
    const [kind, id] = opKey.split(":");
    return kind === "stat" ? WYD.util.formatStat(id, value) : `${value}%`;
  },

  shown(tab) {
    const s = WYD.state, t = WYD.data.equipScreen.tabs.find((x) => x.id === tab) || {};
    if (t.gems) return [];
    const entries = s.inventory.map((item, index) => ({ item, index })).filter(({ item }) =>
      (!t.slots || t.slots.includes(item.slot)) && (!t.rarities || t.rarities.includes(item.rarity)) &&
      (!t.upgrade || WYD.ui.upgradeMark(item) !== ""));
    const D = WYD.data.items, rank = (item) => D.rarities.findIndex((r) => r.id === item.rarity), slots = Object.keys(D.slots);
    const op = this.gearSort === "op" && this.opKeys.length ? this.opRank(entries.map((e) => e.item), this.opKeys, (it, k) => this.opValue(it, k)) : null;
    if (op) return entries.filter((e) => op.has(e.item)).sort((a, b) => op.get(b.item) - op.get(a.item) || a.index - b.index);   // 選んだOPを全部持つ装備だけ、高い順
    if (this.gearSort !== "default") entries.sort((a, b) => {
      const diff = this.gearSort === "recent" ? b.index - a.index :
        this.gearSort === "rarity" ? rank(b.item) - rank(a.item) :
        this.gearSort === "power" ? WYD.inventory.itemScore(b.item) - WYD.inventory.itemScore(a.item) :
        this.gearSort === "level" ? b.item.level - a.item.level :
        this.gearSort === "slot" ? slots.indexOf(a.item.slot) - slots.indexOf(b.item.slot) :
        0;
      return diff || a.index - b.index;
    });
    return entries;
  },

  click(e) {
    const s = WYD.state, ui = WYD.ui, el = e.target.closest("[data-es]");
    if (!el) return;
    const d = el.dataset;
    // Ctrl＋クリックでロック（かばんと同じ）、ふつうのクリックで装備の窓
    const item = d.es === "slot" ? s.equipment[d.slot] : d.es === "item" ? s.inventory[Number(d.index)] : null;
    if (item && (e.ctrlKey || e.metaKey)) { ui.toggleLock(item); ui.changed(); this.render(); return; }
    if (d.es === "gem") {   // 宝石の画面を開いて、この宝石のはめ先を選ぶ
      WYD.gems.seen(s, d.key); ui.hideTooltip();
      WYD.gemVault.open(); WYD.gemVault.picking = d.key; WYD.gemVault.render();
      return;
    }
    if (d.es === "slot") { if (item) ui.touchSheet("eq", d.slot); return; }
    if (d.es === "item") { ui.touchSheet("inv", Number(d.index)); return; }
    if (d.es === "gear-sort" || d.es === "gem-sort") {
      const modes = d.es === "gear-sort" ? WYD.data.equipScreen.gearSorts : WYD.data.equipScreen.gemSorts;
      if (!modes.some(([id]) => id === d.mode)) return;
      if (d.es === "gear-sort") this.gearSort = d.mode; else this.gemSort = d.mode;
      this.bagPage = 0; this.render(); return;
    }
    if (d.es === "op-toggle" || d.es === "gem-op-toggle") {   // OPを選ぶ・外す（複数）。選ぶとOP指定の並びにする
      const gear = d.es === "op-toggle", list = gear ? this.opKeys : this.gemOpKeys, valid = gear ? this.opChoices() : this.gemOpChoices();
      if (!valid.some(([v]) => v === d.op)) return;
      const n = list.indexOf(d.op);
      if (n >= 0) list.splice(n, 1); else list.push(d.op);
      if (gear) this.gearSort = "op"; else this.gemSort = "op";
      this.bagPage = 0; this.render(); return;
    }
    if (d.es === "op-clear") { if (d.kind === "gem") this.gemOpKeys = []; else this.opKeys = []; this.bagPage = 0; this.render(); return; }
    if (d.es === "sort-jump") { this.page = "equip"; this.tab = d.tab; this.bagPage = 0; this.render(); return; }
    if (d.es === "optimizer") { ui.hideTooltip(); WYD.optimizer.open(); return; }   // おすすめ装備の窓（見るだけ）
    if (d.es === "page") { this.bagPage += Number(d.step); this.render(); return; }
    if (d.es === "tab") { this.tab = d.tab; this.bagPage = 0; this.render(); return; }
    else if (d.es === "fuse") { if (!WYD.gemVault.fuseNow()) return; }   // 宝石合成（宝石の画面と同じ。確認してから）
    ui.changed();
    this.render();
  },

  // 下のソートページ。並び方は表示だけを切り替え、持ち物の保存順と選択先は維持する。
  sortHtml() {
    const D = WYD.data.equipScreen;
    const options = (kind, modes, active) => modes.map(([id, title, description]) =>
      `<button data-es="${kind}-sort" data-mode="${id}" class="${active === id ? "on" : ""}" aria-pressed="${active === id}"><b>${title}</b><small>${description}</small></button>`).join("");
    const preview = (kind) => kind === "gear"
      ? this.shown("all").slice(0, 8).map(({ item, index }) => this.gearSort === "op" && this.opKeys.length
        ? `<div class="es-sort-op-item">${this.cell(item, `data-es="item" data-index="${index}"`)}<small>${this.opKeys.map((k) => this.opLabel(this.opValue(item, k), k)).join(" / ")}</small></div>`
        : this.cell(item, `data-es="item" data-index="${index}"`)).join("")
      : this.gemKeys().slice(0, 8).map((key) => this.gemSort === "op" && this.gemOpKeys.length
        ? `<div class="es-sort-op-item">${this.gemCell(key)}<small>${this.gemOpKeys.map((k) => this.gemOpLabel(this.gemOpValue(key, k), k)).join(" / ")}</small></div>`
        : this.gemCell(key)).join("");
    // OPは押して選ぶ（複数）。選んだOPを全部持つものだけ出し、高い順
    const chips = (kind, defs, selected) => defs.map(([value, name]) =>
      `<button data-es="${kind}" data-op="${value}" class="${selected.includes(value) ? "on" : ""}" aria-pressed="${selected.includes(value)}">${name}</button>`).join("");
    const picker = (kind, groups, selected, clearKind) => `<div class="es-sort-op-picker"><div class="es-sort-op-head"><b>指定するOP（複数OK）</b>${selected.length ? `<button data-es="op-clear" data-kind="${clearKind}">選択をクリア</button>` : ""}</div>` +
      groups.map(([title, defs]) => defs.length ? `<div class="es-op-group"><small>${title}</small><div class="es-op-chips">${chips(kind, defs, selected)}</div></div>` : "").join("") + `</div>`;
    const gearDefs = this.opChoices(), gemDefs = this.gemOpChoices(), pick = (defs, kind) => defs.filter(([v]) => v.startsWith(kind + ":"));
    const opPicker = picker("op-toggle", [["装備の能力値", pick(gearDefs, "stat")], ["特殊効果", pick(gearDefs, "effect")]], this.opKeys, "gear") +
      `<p class="es-sort-op-help">選んだOPを全部持つ装備だけを、値の高い順に出す（ほかは隠す）。複数のときは、各OPの「いちばん高い値に対する割合」の合計で並べる。</p>`;
    const gemPicker = picker("gem-op-toggle", [["能力値", pick(gemDefs, "stat")], ["特殊効果", pick(gemDefs, "effect")], ["割合", pick(gemDefs, "pct")], ["固有能力", pick(gemDefs, "power")], ["神の能力", pick(gemDefs, "god")]], this.gemOpKeys, "gem") +
      `<p class="es-sort-op-help">選んだOPを全部持つ宝石だけを、高い順に出す。通常宝石は装着部位での最大値。固有・神は抽選値の品質。</p>`;
    return `<div class="es-sort-intro"><span>ORDER THE ARMORY</span><h3>持ち物の並べ替え</h3><p>装備と宝石、それぞれの見やすい順を選ぶ。装備や宝石の性能は変わりません。</p></div>` +
      `<div class="es-sort-layout">` +
        `<section class="es-sort-card"><div class="es-sort-heading"><img src="assets/ui/nav-status.webp" alt=""><div><small>EQUIPMENT</small><h4>装備 <em>${WYD.state.inventory.length}</em></h4></div></div><div class="es-sort-options">${options("gear", D.gearSorts, this.gearSort)}</div>${opPicker}<div class="es-sort-preview">${preview("gear") || '<span class="muted">装備がない</span>'}</div><button class="es-sort-jump" data-es="sort-jump" data-tab="all">装備を見る →</button></section>` +
        `<section class="es-sort-card"><div class="es-sort-heading"><img src="assets/ui/nav-gems.webp" alt=""><div><small>GEMSTONES</small><h4>宝石 <em>${this.gemKeys().length}種類</em></h4></div></div><div class="es-sort-options">${options("gem", D.gemSorts, this.gemSort)}</div>${gemPicker}<div class="es-sort-preview">${preview("gem") || '<span class="muted">宝石がない</span>'}</div><button class="es-sort-jump" data-es="sort-jump" data-tab="gems">宝石を見る →</button></section>` +
      `</div>`;
  },

  // OPで絞り込んでいる間は、持ち物の上に何で絞っているかと「解除」を出す（隠れている装備があるとわかるように）
  opNote(onGems) {
    const keys = onGems ? (this.gemSort === "op" ? this.gemOpKeys : []) : (this.gearSort === "op" ? this.opKeys : []);
    if (!keys.length) return "";
    const names = new Map(onGems ? this.gemOpChoices() : this.opChoices()), esc = WYD.results.escape;
    return `<div class="es-op-note">OPで絞り込み中：<b>${keys.map((k) => esc(names.get(k) || k)).join("・")}</b>（全部を持つものだけ・高い順）<button data-es="op-clear" data-kind="${onGems ? "gem" : "gear"}">解除</button></div>`;
  },

  // 右下の「宝石合成」：たまり具合（今 / 必要）を出し、足りなければ押せない
  fuseButton() {
    const s = WYD.state, F = WYD.data.gems.fusion, plan = WYD.gems.fusionPlan(s);
    return `<button data-es="fuse" class="es-auto" ${plan.ok ? "" : "disabled"} title="段階の低い宝石から使って、ランダムな能力の${F.name}を1つ作る（宝石の画面と同じ）">宝石合成<small>${Math.min(plan.total, F.need)} / ${F.need}</small></button>`;
  },

  // 宝石の説明（乗せると NEW も消す）
  gemTip(e, key) {
    const s = WYD.state, G = WYD.gems, esc = WYD.results.escape;
    if (!G.info(key)) return;
    if (G.isNew(s, key)) { G.seen(s, key); WYD.ui.markDirty(); }
    WYD.ui.showTooltipHtml(e, `<div class="tip-item"><div style="color:${G.color(key)};font-weight:bold">◆ ${esc(G.name(key))} ×${s.gems[key] || 0}</div><div>${esc(WYD.gemVault.text(key)).replace(/、|／/g, "<br>")}</div></div><div class="tip-help">クリック：宝石の画面で、はめ先を選ぶ</div>`);
  },

  // 枠・マス1つ
  cell(item, attrs, label) {
    const D = WYD.data.equipScreen, ui = WYD.ui, esc = WYD.results.escape;
    if (!item) return `<button class="es-cell empty" ${attrs}><span class="es-empty">${esc(label || "")}</span></button>`;
    const color = ui.color(item), gems = (item.sockets || []).filter(Boolean).length;
    return `<button class="es-cell" ${attrs} style="--c:${color};--g:${ui.glow(item)}" aria-label="${esc(WYD.loot.label(item))}">` +
      `<b class="es-rarity">${D.rarityMark[item.rarity] || ""}</b>${item.plus ? `<b class="es-plus">+${item.plus}</b>` : ""}${item.isNew ? `<i class="new-badge es-new">NEW</i>` : ""}` +
      `${ui.iconImg(item) || `<span class="es-name">${esc(item.name)}</span>`}` +
      `<small class="es-lv">Lv.${item.level}</small>${item.locked ? `<i class="es-lock">🔒</i>` : ""}${gems ? `<i class="es-gem">◆${gems}</i>` : ""}${attrs.includes('"item"') ? ui.upgradeMark(item).replace("up-mark", "up-mark es-up") : ""}</button>`;
  },

  render() {
    const s = WYD.state, D = WYD.data.equipScreen, esc = WYD.results.escape, C = WYD.data.crafting;
    const stats = WYD.stats.compute(s), cls = WYD.data.classes[WYD.classes.id] || {}, slotName = WYD.data.items.slots;
    const col = (ids) => ids.map((slot) => `<div class="es-slot">${this.cell(s.equipment[slot], `data-es="slot" data-slot="${slot}"`, slotName[slot])}<small>${slotName[slot]}</small></div>`).join("");
    const fmt = (v, kind) => kind === "pct" ? `${Math.round(v)}%` : kind === "rate" ? `${v.toFixed(2)}/秒` : WYD.results.number(v);
    const items = this.shown(this.tab), size = WYD.data.items.inventorySize;
    const gemKeys = this.gemKeys(), onGems = !!(D.tabs.find((t) => t.id === this.tab) || {}).gems;
    const tabs = D.tabs.map((t) => `<button data-es="tab" data-tab="${t.id}" class="${this.tab === t.id ? "on" : ""}">${t.label}<b>${t.gems ? gemKeys.length : this.shown(t.id).length}</b></button>`).join("");
    const filtering = this.gearSort === "op" && this.opKeys.length > 0, padded = this.tab === "all" && !filtering;   // OPで絞っている間は空きマスを出さない
    const pageSize = WYD.data.items.inventoryPageSize, total = onGems ? gemKeys.length : padded ? size : items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    this.bagPage = Math.max(0, Math.min(this.bagPage, pageCount - 1));
    const start = this.bagPage * pageSize;
    const grid = onGems ? gemKeys.slice(start, start + pageSize).map((k) => this.gemCell(k)).join("") :
      items.slice(start, start + pageSize).map(({ item, index }) => this.cell(item, `data-es="item" data-index="${index}"`)).join("") +
      (padded ? Array.from({ length: Math.max(0, Math.min(pageSize, size - start) - Math.max(0, Math.min(pageSize, items.length - start))) }, () => `<div class="es-cell blank"></div>`).join("") : "");
    const pager = pageCount > 1 ? `<nav class="es-pager" aria-label="持ち物のページ"><button data-es="page" data-step="-1" aria-label="前のページ" ${this.bagPage === 0 ? "disabled" : ""}>◀</button><span>${this.bagPage + 1} / ${pageCount}</span><button data-es="page" data-step="1" aria-label="次のページ" ${this.bagPage === pageCount - 1 ? "disabled" : ""}>▶</button></nav>` : "";
    // ページ：まだ使えないもの（カナイの箱・地図）はタブを隠す
    for (const p of D.pages) {
      const locked = p.locked && this.$(p.panel) && this.$(p.panel).hidden;
      if (locked && this.page === p.id) this.page = "equip";
      const tab = this.$("equipscreen-body").querySelector(`[data-es-page="${p.id}"]`);
      tab.hidden = !!locked; tab.classList.toggle("on", this.page === p.id);
      this.$("equipscreen-body").querySelector(`.es-page[data-page="${p.id}"]`).hidden = this.page !== p.id;
    }
    this.$("es-sort-host").innerHTML = this.sortHtml();
    this.$("es-stats-host").innerHTML = D.stats.map(([k, name, kind]) => `<span><small>${name}</small><b>${fmt(stats[k] || 0, kind)}</b></span>`).join("");
    this.$("es-count").textContent = `${s.inventory.length} / ${size}`;
    this.$("es-fuse-host").innerHTML = `<button data-es="optimizer" title="手持ちから目的別（火力・防御・対人）におすすめの組み合わせを見る（着替えない）">おすすめ装備</button>` + this.fuseButton();
    this.$("es-main-host").innerHTML =
      `<div class="es-top"><span class="es-money" style="color:${C.materialColor}">${C.materialName} ${WYD.results.number(s.materials)}</span><span class="es-money">宝石 ${Object.values(s.gems).reduce((n, v) => n + v, 0)}</span></div>` +
      `<div class="es-main">` +
        `<section class="es-hero"><div class="es-col">${col(D.leftSlots)}</div>` +
          `<div class="es-figure"><img src="${esc(WYD.data.player.image || "assets/player.png")}" alt=""><div class="es-plate"><b>${esc(cls.name || "冒険者")}</b><span>Lv.${s.player.level}${s.player.paragon.level ? ` · 修練${s.player.paragon.level}` : ""}</span><span class="es-power">戦闘力 <b>${WYD.results.number(this.power(stats))}</b></span></div></div>` +
          `<div class="es-col">${col(D.rightSlots)}</div></section>` +
        `<section class="es-bag"><nav class="es-tabs">${tabs}</nav>${this.opNote(onGems)}${pager}<div class="es-grid">${grid || `<p class="muted">${onGems ? "手元に宝石がない" : "このタブに入る装備はない"}</p>`}</div></section>` +
      `</div>`;
  },
};
