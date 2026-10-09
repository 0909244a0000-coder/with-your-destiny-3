// 装備画面（試作・リネレボ風）：左右に装備の枠、真ん中にキャラと戦闘力、右に持ち物（絞り込みのタブ）、下に能力と操作。
// 枠・マスを選ぶと、いつもの装備の窓（src/ui.js の touchSheet）が出る。マウスを乗せると性能、右クリックで捨てる、Ctrl＋クリックでロック。並びと数値は data/equipscreen.js。
window.WYD = window.WYD || {};
WYD.equipScreen = {
  opened: false,
  tab: "all",

  init() {
    const $ = (id) => document.getElementById(id);
    this.$ = $;
    $("equipscreen-close").onclick = () => this.close();
    $("equipscreen-open").onclick = () => { WYD.ui.toggleBag(false); this.open(); };
    const body = $("equipscreen-body");
    body.onclick = (e) => this.click(e);
    // マウスを乗せると性能（持ち物は今の装備との比べも）。説明は かばんと同じ（src/ui.js の showTooltipFor）
    body.onmouseover = (e) => {
      const el = e.target.closest('[data-es="item"],[data-es="slot"],[data-es="gem"]');
      if (el && el.dataset.es === "gem") this.gemTip(e, el.dataset.key);
      else if (el) WYD.ui.showTooltipFor(e, el.dataset.es === "item" ? "inv" : "eq"); else WYD.ui.hideTooltip();
    };
    body.onmouseleave = () => WYD.ui.hideTooltip();
    WYD.ui.bindRightDiscard(body, "inv");   // 持ち物を右クリックで捨てる（かばんと同じ。ロックは捨てない）
  },

  open() {
    this.opened = true;
    this.$("equipscreen").hidden = false;
    this.render();
  },

  close() {
    this.opened = false;
    this.$("equipscreen").hidden = true;
  },

  // 画面の外で装備・持ち物が変わったとき（src/ui.js の描きなおしから呼ぶ）
  refresh() { if (this.opened) this.render(); },

  // 戦闘力（目安）：能力 × 重み（data/equipscreen.js の power）
  power(stats) {
    const W = WYD.data.equipScreen.power;
    return Math.round(Object.keys(W).reduce((n, k) => n + (stats[k] || 0) * W[k], 0));
  },

  // 手元の宝石（種類ごと。段階・種類の順。神・混沌が先）
  gemKeys() {
    const s = WYD.state, G = WYD.gems;
    const score = (k) => { const i = G.info(k); return i.fused ? (i.god ? 2000 : 1000) + i.lines.length : i.tier * 10 + WYD.data.gems.gems.indexOf(i.def); };
    return Object.keys(s.gems).filter((k) => s.gems[k] > 0 && G.info(k) && !G.info(k).rune).sort((a, b) => score(b) - score(a) || a.localeCompare(b));
  },

  // 宝石のマス
  gemCell(key) {
    const s = WYD.state, G = WYD.gems, i = G.info(key), M = WYD.data.equipScreen.gemMark, esc = WYD.results.escape;
    const mark = i.god ? M.god : i.fused ? M.fused : M.tiers[i.tier] || "";
    return `<button class="es-cell es-gemcell" data-es="gem" data-key="${esc(key)}" style="--c:${i.def.color};--g:${i.def.color}55" aria-label="${esc(G.name(key))}">` +
      `<b class="es-rarity">${mark}</b>${G.isNew(s, key) ? `<i class="new-badge es-new">NEW</i>` : ""}<span class="es-gem-shape">◆</span><small class="es-lv">×${s.gems[key]}</small></button>`;
  },

  // 持ち物のうち、今のタブに入るもの [{ item, index }]
  shown(tab) {
    const s = WYD.state, t = WYD.data.equipScreen.tabs.find((x) => x.id === tab) || {};
    if (t.gems) return [];
    return s.inventory.map((item, index) => ({ item, index })).filter(({ item }) =>
      (!t.slots || t.slots.includes(item.slot)) && (!t.rarities || t.rarities.includes(item.rarity)) &&
      (!t.upgrade || WYD.ui.upgradeMark(item) !== ""));
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
    if (d.es === "tab") this.tab = d.tab;
    else if (d.es === "sort") WYD.inventory.sort(s.inventory);
    else if (d.es === "seenAll") for (const it of s.inventory) delete it.isNew;
    else if (d.es === "discard") { ui.$("discard-all").click(); }
    else if (d.es === "auto") {
      const n = WYD.inventory.autoEquipAll(s);
      ui.log(n ? `自動装備：${n}か所を着替えた` : "自動装備：今より強い装備は持ち物にない（自分で選んだ装備はそのまま）", n ? "#7dff8a" : "#c9bda8");
    }
    ui.changed();
    this.render();
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
    const grid = onGems ? gemKeys.map((k) => this.gemCell(k)).join("") : items.map(({ item, index }) => this.cell(item, `data-es="item" data-index="${index}"`)).join("") +
      (this.tab === "all" ? Array.from({ length: Math.max(0, size - s.inventory.length) }, () => `<div class="es-cell blank"></div>`).join("") : "");
    this.$("equipscreen-body").innerHTML =
      `<div class="es-top"><span class="es-money" style="color:${C.materialColor}">${C.materialName} ${WYD.results.number(s.materials)}</span><span class="es-money">宝石 ${Object.values(s.gems).reduce((n, v) => n + v, 0)}</span></div>` +
      `<div class="es-main">` +
        `<section class="es-hero"><div class="es-col">${col(D.leftSlots)}</div>` +
          `<div class="es-figure"><img src="${esc(WYD.data.player.image || "assets/player.png")}" alt=""><div class="es-plate"><b>${esc(cls.name || "冒険者")}</b><span>Lv.${s.player.level}${s.player.paragon.level ? ` · 修練${s.player.paragon.level}` : ""}</span><span class="es-power">戦闘力 <b>${WYD.results.number(this.power(stats))}</b></span></div></div>` +
          `<div class="es-col">${col(D.rightSlots)}</div></section>` +
        `<section class="es-bag"><nav class="es-tabs">${tabs}</nav><div class="es-grid">${grid || `<p class="muted">${onGems ? "手元に宝石がない" : "このタブに入る装備はない"}</p>`}</div></section>` +
      `</div>` +
      `<div class="es-bottom"><div class="es-stats">${D.stats.map(([k, name, kind]) => `<span><small>${name}</small><b>${fmt(stats[k] || 0, kind)}</b></span>`).join("")}</div>` +
        `<div class="es-actions"><span class="es-count">${s.inventory.length} / ${size}</span><button data-es="discard" ${s.inventory.length ? "" : "disabled"}>一括分解</button><button data-es="sort" ${s.inventory.length ? "" : "disabled"}>並べ替え</button>${s.inventory.some((it) => it.isNew) ? `<button data-es="seenAll" title="持ち物の NEW の印をすべて消す">NEWを消す</button>` : ""}<button data-es="auto" class="es-auto">自動装備</button></div></div>`;
  },
};
