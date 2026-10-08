// 蒐集者の魔導書：左＝職業別の技、中央＝選んだ技の詳細、右＝使用中の構成・保存・検証。
// 計測は DPSテストと同じ隔離フレーム（dps-engine.html）で行い、育成データは変えない。動きの決まりは src/collector.js。
window.WYD = window.WYD || {};
WYD.grimoire = {
  selected: null, running: false,

  init() {
    const $ = id => document.getElementById(id);
    this.$ = $;
    const isCollector = WYD.collector.is();
    $("grimoire-open").hidden = !isCollector;
    if (!isCollector) return;
    $("grimoire-open").onclick = () => this.open();
    $("grimoire-close").onclick = () => this.close();
    $("grimoire-verify").onchange = e => { WYD.collector.setVerify(WYD.state, e.target.checked); this.changed(); };
    $("grimoire-noattack").onchange = e => { WYD.state.collector.noAttack = e.target.checked; this.changed(); };
    $("grimoire-stance").onchange = e => { WYD.state.collector.stance = e.target.value; this.changed(); };
    const D = WYD.data.collector;
    $("grimoire-preset-slot").innerHTML = Array.from({ length: D.presetSlots }, (_, i) => `<option value="${i}">枠${i + 1}</option>`).join("");
    $("grimoire-preset-slot").onchange = () => this.renderPresetName();
    $("grimoire-preset-save").onclick = () => { WYD.collector.savePreset(WYD.state, this.slot(), $("grimoire-preset-name").value); this.changed(); this.status("構成を保存しました"); };
    $("grimoire-preset-load").onclick = () => { if (WYD.collector.loadPreset(WYD.state, this.slot())) { this.changed(); this.status("構成を呼び出しました"); } else this.status("この枠は空です"); };
    $("grimoire-copy").onclick = () => this.copyFrom($("grimoire-base").value);
    $("grimoire-measure").onclick = () => this.measure().catch(e => this.status("計測できません：" + e.message));
    $("grimoire-list").onclick = e => {
      const b = e.target.closest("[data-skill]"), g = e.target.closest("[data-bulk]");
      if (g) { WYD.collector.bulk(WYD.state, this.groupIds(g.dataset.group), g.dataset.bulk === "on"); this.changed(); return; }
      if (b) { this.selected = b.dataset.skill; this.render(); }
    };
    $("grimoire-detail").onclick = e => this.detailAction(e.target.closest("[data-act]"));
    $("grimoire-detail").onchange = e => { if (e.target.id === "grimoire-rune") { WYD.state.player.runes[this.selected] = e.target.value; this.changed(); } };
    $("grimoire-active").onclick = e => this.activeAction(e.target.closest("[data-act]"));
  },

  open() { WYD.collector.ensure(WYD.state); this.$("grimoire").hidden = false; this.selected = this.selected || WYD.collector.activeIds(WYD.state)[0] || WYD.data.skillOrder[0]; this.render(); this.$("grimoire-close").focus(); },
  close() { this.$("grimoire").hidden = true; this.$("grimoire-open").focus(); },
  slot() { return Number(this.$("grimoire-preset-slot").value); },
  status(text) { this.$("grimoire-status").textContent = text; },
  changed() { WYD.save.write(WYD.state); WYD.ui.renderPanels && WYD.ui.renderPanels(); this.render(); },
  groupIds(classId) { const owner = WYD.data.collector.owner; return WYD.data.skillOrder.filter(id => owner[id] === classId); },
  icon(id) { const src = WYD.data.skillIcons[id]; return src ? `<img src="${src}" alt="" onerror="this.remove()">` : ""; },

  render() {
    const s = WYD.state, c = WYD.collector.ensure(s), pl = s.player, esc = WYD.results.escape, D = WYD.data.collector;
    this.$("grimoire-verify").checked = c.verify;
    this.$("grimoire-stance").value = c.stance;
    this.$("grimoire-noattack").checked = c.noAttack; this.$("grimoire-noattack").disabled = !c.verify;
    this.$("grimoire-slots").textContent = `使用中 ${WYD.collector.activeIds(s).length} / ${c.verify ? "制限なし" : WYD.collector.slots(s)}`;
    this.$("grimoire-list").innerHTML = D.groups.map(g => `<div class="grimoire-group"><h4><span>${esc(WYD.data.classes[g].name)}</span><button data-bulk="on" data-group="${g}">全部ON</button><button data-bulk="off" data-group="${g}">全部OFF</button></h4>` +
      this.groupIds(g).map(id => { const def = WYD.data.skills[id], on = pl.skillEnabled[id] && pl.skills[id] > 0;
        return `<button class="grimoire-skill${on ? " on" : ""}${id === this.selected ? " selected" : ""}" data-skill="${id}" aria-pressed="${on}">${this.icon(id)}${esc(def.name)}<small>Lv${pl.skills[id] || 0}${on ? "・ON" : ""}</small></button>`; }).join("") + "</div>").join("");
    this.renderDetail();
    const active = WYD.collector.order(s).filter(id => pl.skillEnabled[id] && pl.skills[id] > 0);
    this.$("grimoire-active").innerHTML = active.map((id, i) => `<li><span>${this.icon(id)}${esc(WYD.data.skills[id].name)} <small class="muted">${esc(WYD.data.classes[D.owner[id]].name)}</small></span>` +
      `<button data-act="up" data-id="${id}" ${i ? "" : "disabled"} aria-label="先に">↑</button><button data-act="down" data-id="${id}" ${i < active.length - 1 ? "" : "disabled"} aria-label="後に">↓</button><button data-act="off" data-id="${id}">外す</button></li>`).join("") || "<li class='muted'>なし</li>";
    this.renderPresetName();
    const base = this.$("grimoire-base"), keep = base.value;
    base.innerHTML = `<option value="">自分（蒐集者）</option>` + D.groups.map(g => `<option value="${g}">${esc(WYD.data.classes[g].name)}${c.lab && c.lab.from === g ? "（コピー済み）" : ""}</option>`).join("");
    base.value = keep;
  },

  renderPresetName() {
    const p = WYD.state.collector.presets[this.slot()];
    this.$("grimoire-preset-name").value = p ? p.name : "";
  },

  renderDetail() {
    const id = this.selected, def = WYD.data.skills[id], s = WYD.state, pl = s.player, esc = WYD.results.escape, c = s.collector;
    if (!def) { this.$("grimoire-detail").innerHTML = ""; return; }
    const lv = pl.skills[id] || 0, on = pl.skillEnabled[id] && lv > 0, runes = WYD.runes.list(id);
    const shown = Object.entries(def).filter(([k, v]) => typeof v === "number" && !/color/i.test(k));
    this.$("grimoire-detail").innerHTML = `<h3>${this.icon(id)}${esc(def.name)}</h3><p class="muted">${esc(WYD.data.classes[WYD.data.collector.owner[id]].name)}の技 · しくみ ${esc(WYD.classes.kindOf(id))}${def.mode ? "（" + esc(def.mode) + "）" : ""}</p>` +
      `<p>${esc(def.desc || "")}</p>` +
      `<div class="grimoire-row"><button data-act="toggle">${on ? "外す" : "使う"}</button>` +
      (c.verify ? `<button data-act="lv-" ${lv <= 1 ? "disabled" : ""}>Lv−</button><b>Lv${lv}</b><button data-act="lv+" ${lv >= def.maxLevel ? "disabled" : ""}>Lv＋</button>` : `<b>Lv${lv} / ${def.maxLevel}</b><button data-act="point" ${pl.skillPoints > 0 && lv < def.maxLevel ? "" : "disabled"}>＋（ポイント）</button>`) + `</div>` +
      (runes.length ? `<label class="grimoire-row">型 <select id="grimoire-rune">${runes.map(r => `<option value="${r.id}" ${pl.runes[id] === r.id ? "selected" : ""}>${esc(r.name)}：${esc(r.desc || "")}</option>`).join("")}</select></label>` : "") +
      `<dl>${shown.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>` +
      (on ? `<button data-act="compare">この技を外して比較（同じ標的・乱数）</button>` : "");
  },

  detailAction(b) {
    if (!b) return;
    const s = WYD.state, id = this.selected, pl = s.player;
    if (b.dataset.act === "toggle") {
      const on = !(pl.skillEnabled[id] && pl.skills[id] > 0);
      if (!WYD.collector.setEnabled(s, id, on)) { this.status(`同時に使えるのは${WYD.collector.slots(s)}つまで。先にどれかを外してください`); return; }
    } else if (b.dataset.act === "lv-" || b.dataset.act === "lv+") WYD.collector.setLevel(s, id, (pl.skills[id] || 1) + (b.dataset.act === "lv+" ? 1 : -1));
    else if (b.dataset.act === "point") WYD.ui.levelUpSkill(id);
    else if (b.dataset.act === "compare") { this.compare(id).catch(e => this.status("比較できません：" + e.message)); return; }
    this.changed();
  },

  activeAction(b) {
    if (!b) return;
    const s = WYD.state, c = s.collector, id = b.dataset.id;
    if (b.dataset.act === "off") WYD.collector.setEnabled(s, id, false);
    else {
      const order = WYD.collector.order(s).filter(x => s.player.skillEnabled[x] && s.player.skills[x] > 0), i = order.indexOf(id), j = i + (b.dataset.act === "up" ? -1 : 1);
      if (i < 0 || j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      c.order = order;
    }
    this.changed();
  },

  // 元職のセーブから、能力・装備まわりを検証用にコピーする（元のセーブは読むだけ）
  copyFrom(classId) {
    if (!classId) { this.status("コピー元の職業を選んでください"); return; }
    let src = null;
    try { src = JSON.parse(localStorage.getItem(WYD.arena.key(classId))); } catch (e) { src = null; }
    if (!src || !src.player) { this.status(`${WYD.data.classes[classId].name}の保存データがありません`); return; }
    const pick = ({ player, equipment, lgems, devotion, cube, trial, unlockedAreas, cleared, mapBest }) => JSON.parse(JSON.stringify({ level: player.level, paragon: player.paragon, skills: player.skills, skillEnabled: player.skillEnabled, runes: player.runes, equipment, lgems, devotion, cube, trial, unlockedAreas, cleared, mapBest }));
    WYD.state.collector.lab = { from: classId, data: pick(src) };
    this.changed();
    this.$("grimoire-base").value = classId;
    this.status(`${WYD.data.classes[classId].name}の能力・装備をコピーしました（元のセーブは変えていません）`);
  },

  // 計測用のセーブ：今の蒐集者のコピー。能力・装備を元職にするときは、検証用コピーを重ねる
  snapshot(without) {
    const s = JSON.parse(JSON.stringify(WYD.state)), base = this.$("grimoire-base").value, lab = s.collector.lab;
    s.collector.verify = true;   // 枠の制限なし・不発の理由を数える
    if (base && lab && lab.from === base) {
      const d = lab.data;
      Object.assign(s, { equipment: d.equipment, lgems: d.lgems, devotion: d.devotion, cube: d.cube, trial: d.trial, unlockedAreas: d.unlockedAreas, cleared: d.cleared, mapBest: d.mapBest });
      s.player.level = d.level; s.player.paragon = d.paragon;
      if (this.$("grimoire-copy-skills").checked) {
        for (const id of Object.keys(WYD.data.skills)) s.player.skillEnabled[id] = false;
        for (const id of Object.keys(d.skills)) if (WYD.data.skills[id]) { s.player.skills[id] = Math.max(1, d.skills[id] || 0); s.player.skillEnabled[id] = !!d.skillEnabled[id] && d.skills[id] > 0; if (d.runes[id]) s.player.runes[id] = d.runes[id]; }
      }
    } else if (base) throw new Error("先に「元職をコピー」を押してください");
    if (without) s.player.skillEnabled[without] = false;
    return { state: s, statsFrom: base && lab && lab.from === base ? base : null };
  },

  // 隔離フレームで30秒計測。seed が同じなら同じ結果になる
  async run(snap, seed) {
    const frame = document.createElement("iframe");
    frame.hidden = true; frame.src = "dps-engine.html"; this.$("grimoire-frames").append(frame);
    try {
      await new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = () => reject(Error("計測用の画面を読み込めません")); });
      const F = frame.contentWindow;
      let x = seed >>> 0 || 1;
      F.Math.random = () => { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; };
      const options = { duration: 30, count: Number(this.$("grimoire-count").value), hpRatio: 1, playerHpRatio: Number(this.$("grimoire-php").value), boss: false, defense: 0 };
      const engine = F.WYD.dpsEngine.init("collector", snap.state, options, { images: WYD.render.images, getImage: src => WYD.render.getImage(src) });
      // 元職の能力（基本値・成長・本体HPの補正）で試す
      if (snap.statsFrom) { const P = F.WYD.data.player, src = WYD.data.classes[snap.statsFrom].player; P.base = { ...src.base || WYD.data.player.base }; P.perLevel = { ...src.perLevel || WYD.data.player.perLevel }; P.maxHpMult = src.maxHpMult || 1; }
      let steps = 0;
      while (engine.world.time < options.duration - 1e-8) {
        engine.advance(Math.min(F.WYD.data.dps.step, options.duration - engine.world.time));
        if (++steps % 200 === 0) await new Promise(r => setTimeout(r, 0));
      }
      const r = engine.snapshot(), mis = engine.world.collectorMisfire || {};
      return { elapsed: r.elapsed, damage: r.damage, rows: r.rows, misfire: mis };
    } finally { frame.remove(); }
  },

  rowsOf(result) {
    const out = {};
    for (const [key, row] of Object.entries(result.rows)) out[key] = { damage: row.damage || 0, healing: row.healing || 0, casts: row.casts || 0 };
    for (const id in result.misfire) (out["skill:" + id] ||= { damage: 0, healing: 0, casts: 0 }).misfire = result.misfire[id];
    return out;
  },

  misfireText(m) {
    const names = WYD.data.collector.misfireNames;
    return m ? Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${names[k] || k}${n}`).join("・") : "";
  },

  async measure() {
    if (this.running) return;
    this.running = true; this.status("計測中…");
    try {
      const r = await this.run(this.snapshot(), Number(this.$("grimoire-seed").value));
      this.renderResult(r);
      this.status(`計測完了：${WYD.results.number(r.damage / r.elapsed)} DPS（30秒・乱数${this.$("grimoire-seed").value}）`);
      return r;
    } finally { this.running = false; }
  },

  async compare(id) {
    if (this.running) return;
    this.running = true; this.status(`「${WYD.data.skills[id].name}」あり・なしを同じ条件で計測中…`);
    try {
      const seed = Number(this.$("grimoire-seed").value);
      const a = await this.run(this.snapshot(), seed), b = await this.run(this.snapshot(id), seed);
      this.renderResult(a, b, id);
      const da = a.damage / a.elapsed, db = b.damage / b.elapsed;
      this.status(`「${WYD.data.skills[id].name}」あり ${WYD.results.number(da)} DPS → なし ${WYD.results.number(db)} DPS（${db >= da ? "+" : ""}${da ? ((db / da - 1) * 100).toFixed(1) : 0}%）`);
      return { with: a, without: b };
    } finally { this.running = false; }
  },

  renderResult(a, b, removed) {
    const esc = WYD.results.escape, n = WYD.results.number, A = this.rowsOf(a), B = b ? this.rowsOf(b) : null;
    const keys = [...new Set([...Object.keys(A), ...Object.keys(B || {})])].filter(k => (A[k] || {}).damage || (A[k] || {}).healing || (A[k] || {}).casts || (A[k] || {}).misfire || (B && B[k]));
    keys.sort((x, y) => ((A[y] || {}).damage || 0) - ((A[x] || {}).damage || 0));
    const cell = (r, k) => r && r[k] ? n(r[k]) : "-";
    this.$("grimoire-result").innerHTML = `<div class="grimoire-table"><table><thead><tr><th>技・効果</th><th>与ダメ</th><th>回復</th><th>発動</th>${B ? "<th>外した時の与ダメ</th>" : "<th>不発（理由）</th>"}</tr></thead><tbody>` +
      keys.map(k => { const src = WYD.results.source(k), r = A[k];
        return `<tr><td>${esc(src.name)}${removed && k === "skill:" + removed ? "（外した技）" : ""}</td><td>${cell(r, "damage")}</td><td>${cell(r, "healing")}</td><td>${cell(r, "casts")}</td>${B ? `<td>${cell(B[k], "damage")}</td>` : `<td>${esc(this.misfireText(r && r.misfire))}</td>`}</tr>`; }).join("") +
      `</tbody></table></div>`;
  },
};
