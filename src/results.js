// 戦闘を観測するだけの集計。world 内に持ち、セーブ・戦闘計算・乱数に触らない。
window.WYD = window.WYD || {};
WYD.results = {
  empty() { return { damage: 0, hits: 0, eligible: 0, crits: 0, taken: 0, healing: 0, kills: 0, deaths: 0, casts: 0, rows: {} }; },
  get(w) {
    if (!w.results) this.reset(w);
    return w.results;
  },
  reset(w) {
    w.results = { elapsed: 0, recording: true, total: this.empty(), events: [], head: 0 };
  },
  tick(w, dt) {
    const r = this.get(w);
    if (r.recording && !w.town) r.elapsed += dt;
    this.prune(r);
  },
  prune(r) {
    const cutoff = r.elapsed - WYD.data.results.recentSeconds;
    while (r.head < r.events.length && r.events[r.head].t <= cutoff) r.head++;
    if (r.head >= WYD.data.results.compactAfter) { r.events = r.events.slice(r.head); r.head = 0; }
  },
  add(w, source, values) {
    const r = this.get(w);
    if (!r.recording) return;
    const v = {};
    for (const key of Object.keys(values)) if (Number.isFinite(values[key]) && values[key] > 0) v[key] = values[key];
    if (!Object.keys(v).length) return;
    this.accumulate(r.total, source, v);
    r.events.push({ t: r.elapsed, source, values: v });
    this.prune(r);
  },
  accumulate(out, source, values) {
    let row;
    if (source) row = out.rows[source] || (out.rows[source] = this.emptyRow());
    for (const key in values) {
      out[key] += values[key];
      if (row) row[key] += values[key];
    }
  },
  emptyRow() { const r = this.empty(); delete r.rows; return r; },
  snapshot(w, mode) {
    const r = this.get(w);
    if (mode !== "recent") return { ...r.total, elapsed: r.elapsed, recording: r.recording };
    this.prune(r);
    const out = this.empty();
    for (let i = r.head; i < r.events.length; i++) this.accumulate(out, r.events[i].source, r.events[i].values);
    return { ...out, elapsed: Math.min(r.elapsed, WYD.data.results.recentSeconds), recording: r.recording };
  },
  source(id) {
    if(id.startsWith("runeskill:")) return WYD.runeSkills.sourceInfo(id);
    const label = WYD.data.results.labels[id];
    if (label) return label;
    if (id.startsWith("skill:")) {
      const key = id.slice(6), s = WYD.data.skills[key];
      return { name: s ? s.name : key, group: s && s.kind === "raise" ? "召喚スキル" : "スキル", color: (s && s.color) || "#98c8f2", icon: WYD.data.skillIcons && WYD.data.skillIcons[key] };
    }
    if (id.startsWith("merc:")) {
      const m = WYD.data.mercenary.types.find((x) => x.id === id.slice(5));
      return { name: m ? m.name : "傭兵", group: "傭兵", color: "#d5c08b" };
    }
    return { name: id, group: "その他", color: "#b7aa91" };
  },
  number(n) { return Math.round(n).toLocaleString("ja-JP"); },
  crit(row) { return row.eligible ? `${(row.crits / row.eligible * 100).toFixed(1)}%` : "—"; },
  escape(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  init(w) {
    this.get(w);
    const mode = document.getElementById("result-mode");
    mode.onchange = () => { this.lastRefresh = null; this.render(w, true); };
    document.getElementById("result-reset").onclick = () => { this.reset(w); this.render(w, true); };
    document.getElementById("result-record").onclick = () => { const r = this.get(w); r.recording = !r.recording; this.render(w, true); };
    document.getElementById("combat-results").ontoggle = () => this.render(w, true);
    this.render(w, true);
  },
  render(w, force) {
    const now = performance.now();
    if (!force && this.lastRefresh != null && now - this.lastRefresh < WYD.data.results.refreshMs) return;
    this.lastRefresh = now;
    const mode = document.getElementById("result-mode").value;
    const r = this.snapshot(w, mode), n = (v) => this.number(v);
    const dps = r.elapsed > 0 ? r.damage / r.elapsed : 0;
    document.getElementById("result-glance").textContent = `${n(dps)} DPS · 会心 ${this.crit(r)}`;
    if (!document.getElementById("combat-results").open && !force) return;
    document.getElementById("result-record").textContent = r.recording ? "計測停止" : "計測再開";
    document.getElementById("result-status").textContent = `${r.recording ? "計測中" : "計測停止中"} · 戦場 ${r.elapsed.toFixed(1)}秒`;
    const summary = [["与ダメージ", n(r.damage)], ["DPS", n(dps)], ["実測会心率", this.crit(r)], ["被ダメージ", n(r.taken)], ["回復（自分）", n(r.healing)], ["撃破 / 倒れた回数", `${n(r.kills)} / ${n(r.deaths)}`]];
    document.getElementById("result-summary").innerHTML = summary.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
    const rows = Object.entries(r.rows).sort((a, b) => b[1].damage - a[1].damage || b[1].healing - a[1].healing || a[0].localeCompare(b[0]));
    document.getElementById("result-breakdown").innerHTML = rows.length ? rows.map(([id, row]) => {
      const s = this.source(id), share = r.damage ? row.damage / r.damage * 100 : 0;
      const heal = row.healing ? ` · 回復 ${n(row.healing)}` : "";
      const casts = row.casts ? ` · 発動 ${n(row.casts)}` : "";
      return `<div class="result-row" style="--source-color:${s.color}"><div class="result-row-head"><span>${s.icon ? `<img src="${this.escape(s.icon)}" alt="">` : ""}<b>${this.escape(s.name)}</b><small>${this.escape(s.group)}</small></span><strong>${n(row.damage)} <small>${share.toFixed(1)}%</small></strong></div><div class="result-share"><i style="width:${share}%"></i></div><div class="result-row-meta">DPS ${n(r.elapsed ? row.damage / r.elapsed : 0)} · 命中 ${n(row.hits)} · 会心 ${this.crit(row)}${row.eligible ? ` (${row.crits}/${row.eligible})` : ""}${casts}${heal}</div></div>`;
    }).join("") : '<p class="muted result-empty">戦闘が始まると、攻撃・スキル・効果の内訳がここに出ます。</p>';
  },
};
