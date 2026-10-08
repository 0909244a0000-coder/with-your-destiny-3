// 自分の保存済みキャラ同士の練習試合。元のセーブに試合結果を書かない。
window.WYD = window.WYD || {};
WYD.arena = {
  opened: false, running: false, loading: false, token: 0, frames: [], fighters: [],
  init() {
    const $ = id => document.getElementById(id);
    this.$ = $;
    $("arena-time-limit").textContent = WYD.data.arena.timeLimit;
    const C = WYD.data.arena.combat;
    $("arena-rule-summary").textContent = `開戦時：本人へのダメージは本編の${C.damageScale * 100}%、一撃は最大HPの${C.hitHpCap * 100}%まで、${C.windowSeconds}秒の合計は${C.windowHpCap * 100}%まで。召喚へのダメージは${C.summonDamageScale * 100}%。${Object.entries(WYD.data.arena.classSummons || {}).map(([id, b]) => `${WYD.data.classes[id]?.name || id}の召喚はHP${b.hpMult}倍・攻撃力${b.attackMult}倍、受けるダメージ${Math.round(b.damageTakenScale * 100)}%。`).join("")}罠の攻撃はさらに${Math.round(C.trapDamageScale * 100)}%。バーバリアンの移動速度は${Math.round((C.chaseSpeed.barbarian - 1) * 100)}%増。回復は${C.healScale * 100}%。影の外套の回復はさらに${Math.round(C.skillHealScale.asn_cloak * 100)}%。吸血・反射は実際に奪ったHPから計算し、反射率は本編の${C.reflectScale * 100}%（最大${C.reflectRatioCap * 100}%）。拘束は最大${C.bindMax}秒、解除後${C.bindImmunity}秒は再拘束なし。${C.pressureStart}秒から消耗が進み、${C.pressureStart + C.pressureRamp}秒で火力補正・ダメージ上限が最大${C.pressureDamageMax}倍、回復は開戦時の${C.pressureHealMin * 100}%になります。`;
    $("arena-speed").innerHTML = WYD.data.arena.speeds.map(speed => `<option value="${speed}">×${speed}</option>`).join("");
    $("arena-open").onclick = () => this.open();
    $("arena-close").onclick = () => this.close();
    $("arena-refresh").onclick = () => this.refresh();
    $("arena-start").onclick = () => this.start().catch(e => this.fail(e));
    $("arena-stop").onclick = () => this.stop("試合を中止しました。育成データはそのままです。");
    $("arena-mode").onchange = () => this.chooseDefaults();
    $("arena-formation-save").onclick = () => this.saveFormation();
    $("arena-formation-load").onclick = () => this.loadFormation();
    $("arena-formation-slot").onchange = () => { $("arena-formation-name").value = this.formations()[Number($("arena-formation-slot").value)]?.name || ""; };
    this.renderFormations();
    $("arena-roster").onchange = () => this.selectionChanged();
    $("arena-speed").onchange = () => { this.speed = Number($("arena-speed").value); };
    $("arena-pause").onclick = () => { this.paused = !this.paused; $("arena-pause").textContent = this.paused ? "試合を再開" : "試合を停止"; };
    document.addEventListener("keydown", e => {
      if (!this.opened) return;
      if (e.key === "Escape") { e.preventDefault(); this.close(); }
      else if (e.key === "Tab") {
        const focusable = [...this.$("arena").querySelectorAll("button:not(:disabled),select:not(:disabled),input:not(:disabled),summary")].filter(x => x.getClientRects().length);
        const at = focusable.indexOf(document.activeElement);
        if (at < 0 || (!e.shiftKey && at === focusable.length - 1) || (e.shiftKey && at === 0)) {
          e.preventDefault(); focusable[e.shiftKey ? focusable.length - 1 : 0]?.focus();
        }
      }
    });
  },
  key(id) { return id === Object.keys(WYD.data.classes)[0] ? WYD.save.BASE_KEY : WYD.save.BASE_KEY + "-" + id; },
  valid(s, id) {
    return s && (!s.classId || s.classId === id) && s.player && Number.isFinite(s.player.level) && s.player.level >= 1 && s.player.skills && typeof s.player.skills === "object" && s.equipment && typeof s.equipment === "object";
  },
  roster() {
    return Object.entries(WYD.data.classes).map(([id, c]) => {
      let s, unavailable = "未育成";
      if (id === WYD.classes.id) s = JSON.parse(JSON.stringify(WYD.state));
      else {
        try { const raw = localStorage.getItem(this.key(id)); if (raw) { s = JSON.parse(raw); unavailable = "保存データを確認してください"; } } catch (e) { unavailable = "保存データを読めません"; }
      }
      if (!this.valid(s, id)) s = null;
      return { id, name: c.name, snapshot: s, level: s && s.player.level, current: id === WYD.classes.id, unavailable,
        image: c.player.image || "assets/player.png" };
    });
  },
  open() {
    if (this.opened) return;
    this.opened = true; this.wasPaused = WYD.ui.paused;
    this.inertNodes = [...document.body.children].filter(x => x.id !== "arena" && !x.inert);
    for (const x of this.inertNodes) x.inert = true;
    this.$("arena").hidden = false;
    const menu = this.$("arena-open").closest("details"); if (menu) menu.open = false; // 円形メニューでは details の外にある
    this.refresh(); this.$("arena-close").focus();
  },
  close() {
    this.stop(); this.opened = false;
    this.$("arena").hidden = true; WYD.ui.paused = this.wasPaused;
    for (const x of this.inertNodes || []) x.inert = false;
    this.inertNodes = [];
    this.$("arena-open").focus();
  },
  refresh() {
    this.stop(); this.rosterEntries = this.roster();
    this.$("arena-picks").open = true;
    const esc = WYD.results.escape;
    this.$("arena-roster").innerHTML = this.rosterEntries.map(r => `<label class="arena-roster-card${r.snapshot ? "" : " unavailable"}"><input type="checkbox" value="${r.id}" ${r.snapshot ? "" : "disabled"}><img src="${esc(r.image)}" alt=""><span><b>${esc(r.name)}</b><small>${r.snapshot ? "Lv" + r.level + (r.current ? " · 現在の構成" : " · 最後の保存") : esc(r.unavailable)}</small></span><select class="arena-team-pick" data-class="${r.id}" aria-label="${esc(r.name)}のチーム"><option value="">参加しない</option><option value="A">チームA</option><option value="B">チームB</option></select></label>`).join("");
    this.chooseDefaults();
    this.$("arena-status").textContent = "参加キャラを選んで開戦。元の装備・ポイント・戦利品は変わりません。";
    this.$("arena-results").innerHTML = ""; this.draw();
  },
  chooseDefaults() {
    const all = [...this.$("arena-roster").querySelectorAll("input")];
    const available = all.filter(x => this.rosterEntries.find(r => r.id === x.value).snapshot);
    available.sort((a, b) => Number(b.value === WYD.classes.id) - Number(a.value === WYD.classes.id));
    const mode = this.$("arena-mode").value;
    for (const input of all) input.checked = available.includes(input) && available.indexOf(input) < (mode === "royale" ? WYD.data.arena.modes.royale.max : 2);
    const size = WYD.data.arena.modes.teams.teamSize;
    for (const select of this.$("arena-roster").querySelectorAll(".arena-team-pick")) {
      const i = available.findIndex(x => x.value === select.dataset.class);
      select.value = i >= 0 && i < size ? "A" : i >= size && i < size * 2 ? "B" : "";
    }
    this.selectionChanged();
  },
  teamSelection() {
    return Object.fromEntries([...this.$("arena-roster").querySelectorAll(".arena-team-pick")].filter(s => s.value).map(s => [s.dataset.class, s.value]));
  },
  selected() { return this.$("arena-mode").value === "teams" ? Object.keys(this.teamSelection()) : [...this.$("arena-roster").querySelectorAll("input:checked")].map(x => x.value); },
  selectionChanged() {
    if (!this.rosterEntries) return;
    const mode = WYD.data.arena.modes[this.$("arena-mode").value], count = this.selected().length;
    const teams = this.$("arena-mode").value === "teams", picks = this.teamSelection();
    const a = Object.values(picks).filter(x => x === "A").length, b = Object.values(picks).filter(x => x === "B").length;
    const ok = count >= mode.min && count <= mode.max && (!teams || (a === mode.teamSize && b === mode.teamSize));
    this.$("arena-formations").hidden = !teams;
    this.$("arena-roster").classList.toggle("team-mode", teams);
    for (const select of this.$("arena-roster").querySelectorAll(".arena-team-pick")) {
      select.hidden = !teams;
      select.closest("label").dataset.team = teams ? select.value : "";
      select.disabled = this.loading || this.running || !this.rosterEntries.find(r => r.id === select.dataset.class)?.snapshot;
    }
    for (const id of ["arena-formation-slot", "arena-formation-name", "arena-formation-save", "arena-formation-load"]) this.$(id).disabled = this.loading || this.running;
    if (teams) this.$("arena-formation-save").disabled = this.loading || this.running || !ok;
    for (const input of this.$("arena-roster").querySelectorAll("input")) {
      const exists = !!this.rosterEntries.find(r => r.id === input.value).snapshot;
      input.disabled = this.loading || this.running || !exists || (!input.checked && count >= mode.max);
    }
    this.$("arena-start").disabled = this.loading || this.running || !ok;
    this.$("arena-selection").textContent = teams ? `チームA ${a}/3人 · チームB ${b}/3人 · 相手チーム全員を倒すと勝利` : `${count}陣営を選択 · ${mode.name}は${mode.min === mode.max ? mode.min : mode.min + "〜" + mode.max}陣営（召喚込み）`;
    this.$("arena-mode").disabled = this.loading || this.running;
    this.$("arena-refresh").disabled = this.loading || this.running;
    this.$("arena-stop").disabled = !this.loading && !this.running;
    this.$("arena-pause").disabled = !this.running;
  },
  formations() {
    try {
      const value = JSON.parse(localStorage.getItem("wyd3-arena-formations-v1") || "[]");
      return Array.isArray(value) ? value.slice(0, WYD.data.arena.formations.slots) : [];
    } catch { return []; }
  },
  renderFormations() {
    const selected = this.$("arena-formation-slot").value || "0", saved = this.formations(), esc = WYD.results.escape;
    this.$("arena-formation-slot").innerHTML = Array.from({length: WYD.data.arena.formations.slots}, (_, i) => `<option value="${i}">${i + 1} · ${esc(saved[i]?.name || "空き枠")}</option>`).join("");
    this.$("arena-formation-slot").value = selected;
  },
  saveFormation() {
    if (this.loading || this.running || this.$("arena-mode").value !== "teams") return;
    const teams = this.teamSelection(), size = WYD.data.arena.modes.teams.teamSize;
    const a = Object.keys(teams).filter(id => teams[id] === "A"), b = Object.keys(teams).filter(id => teams[id] === "B");
    if (a.length !== size || b.length !== size) return;
    const index = Number(this.$("arena-formation-slot").value), saved = this.formations();
    const name = this.$("arena-formation-name").value.trim().slice(0, WYD.data.arena.formations.nameLength) || `編成${index + 1}`;
    saved[index] = { name, a, b };
    try { localStorage.setItem("wyd3-arena-formations-v1", JSON.stringify(saved)); this.renderFormations(); this.$("arena-status").textContent = `${name}を保存しました（メンバーのみ）。`; }
    catch { this.$("arena-status").textContent = "編成を保存できませんでした。ブラウザの保存容量を確認してください。"; }
  },
  loadFormation() {
    if (this.loading || this.running) return;
    const saved = this.formations()[Number(this.$("arena-formation-slot").value)], size = WYD.data.arena.modes.teams.teamSize;
    if (!saved || !Array.isArray(saved.a) || !Array.isArray(saved.b) || saved.a.length !== size || saved.b.length !== size || new Set([...saved.a,...saved.b]).size !== size * 2) { this.$("arena-status").textContent = "この枠に有効な編成がありません。"; return; }
    this.$("arena-mode").value = "teams"; this.refresh();
    if ([...saved.a,...saved.b].some(id => !this.rosterEntries.find(r => r.id === id)?.snapshot)) { for (const select of this.$("arena-roster").querySelectorAll(".arena-team-pick")) select.value = ""; this.selectionChanged(); this.$("arena-status").textContent = "編成のキャラを読み込めません。育成データを確認してください。"; return; }
    for (const select of this.$("arena-roster").querySelectorAll(".arena-team-pick")) select.value = saved.a.includes(select.dataset.class) ? "A" : saved.b.includes(select.dataset.class) ? "B" : "";
    this.$("arena-formation-name").value = saved.name; this.selectionChanged();
    this.$("arena-status").textContent = `${saved.name}を呼び出しました。最新の育成状態で開戦します。`;
  },
  makeFrame(entry, team, color, token) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe"); frame.hidden = true;
      frame.setAttribute("aria-hidden", "true"); frame.src = "arena-engine.html";
      this.frames.push(frame);
      const timer = setTimeout(() => reject(new Error("戦闘データの読み込みが時間切れになりました")), WYD.data.arena.loadTimeoutMs);
      frame.cancelArena = () => { clearTimeout(timer); resolve(null); };
      frame.onerror = () => { clearTimeout(timer); reject(new Error("戦闘データを読み込めませんでした")); };
      frame.onload = () => {
        clearTimeout(timer);
        if (token !== this.token) { resolve(null); return; }
        try {
          const engine = frame.contentWindow.WYD.arenaEngine.init(entry.id, entry.snapshot, team, color, this.bridge);
          resolve({ entry, team, color, engine, frame, eliminatedAt: null, rank: null });
        } catch (e) { reject(e); }
      };
      this.$("arena-frames").appendChild(frame);
    });
  },
  async start(ids = this.selected(), mode = this.$("arena-mode").value, automatic = true, assignments = this.teamSelection()) {
    const rule = WYD.data.arena.modes[mode];
    if (!rule || ids.length < rule.min || ids.length > rule.max || new Set(ids).size !== ids.length) throw new Error("参加するキャラの数を確認してください");
    if (mode === "teams" && (!["A", "B"].every(t => ids.filter(id => assignments[id] === t).length === rule.teamSize))) throw new Error("チームA・Bをそれぞれ3人選んでください");
    if (automatic) this.rosterEntries = this.roster();
    const entries = ids.map(id => this.rosterEntries.find(r => r.id === id));
    if (entries.some(r => !r || !r.snapshot)) throw new Error("育成済みのキャラを選んでください");
    this.stop(); const token = ++this.token;
    this.loading = true; this.selectionChanged(); this.$("arena-results").innerHTML = "";
    this.$("arena-status").textContent = "各キャラの装備・スキルを読み込み中…";
    this.unitSerial = 1;
    this.bridge = {
      teamBattle: mode === "teams",
      friends: engine => this.fighters.filter(f => f.team === engine.team && !f.engine.world.player.dead).map(f => f.engine),
      images: WYD.render.images,
      getImage: src => WYD.render.getImage(src),
      time: () => this.time || 0,
      nextId: () => this.unitSerial++,
      owner: unit => this.fighters.find(f => unit.arenaOwner ? f.entry.id === unit.arenaOwner : f.team === unit.arenaTeam)?.engine,
      hit: (attacker, receiver, target, amount, source) => { this.lastHit = { from: attacker.team, to: receiver.team, amount, source }; },
    };
    try {
      const loaded = await Promise.all(entries.map((r, i) => this.makeFrame(r, mode === "teams" ? assignments[r.id] : "team" + i, WYD.data.arena.colors[mode === "teams" ? (assignments[r.id] === "A" ? 0 : 1) : i], token)));
      if (token !== this.token) return false;
      this.fighters = loaded; this.mode = mode; this.time = 0; this.turn = 0; this.paused = false;
      this.speed = Number(this.$("arena-speed").value); this.$("arena-pause").textContent = "試合を停止";
      const A = WYD.data.arena, offset = Math.random() * Math.PI * 2;
      this.fighters.forEach((f, i) => {
        const angle = offset + i * Math.PI * 2 / this.fighters.length, p = f.engine.world.player;
        if (mode === "teams") {
          const row = this.fighters.filter(x => x.team === f.team).indexOf(f);
          p.x = A.width * (f.team === "A" ? A.teamStart.x : 1 - A.teamStart.x); p.y = A.height * A.teamStart.rows[row];
        } else { p.x = A.width / 2 + Math.cos(angle) * A.startRadius; p.y = A.height / 2 + Math.sin(angle) * A.startRadius; }
        p.arenaName = f.entry.name; f.engine.prepare();
      });
      this.initiative = this.fighters.slice();
      for (let i = this.initiative.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.initiative[i], this.initiative[j]] = [this.initiative[j], this.initiative[i]];
      }
      this.loading = false; this.running = true; this.reason = null; this.selectionChanged(); this.renderStatus(true); this.draw();
      this.$("arena-picks").open = false;
      if (automatic) this.animate();
      return true;
    } catch (e) { if (token === this.token) { this.stop(); throw e; } return false; }
  },
  advance(dt = WYD.data.arena.step) {
    if (!this.running || this.paused) return;
    this.time += dt;
    for (const f of this.fighters) f.engine.prepare();
    const order = this.initiative.slice(this.turn).concat(this.initiative.slice(0, this.turn));
    for (const f of order) {
      const units = this.fighters.flatMap(x => x.engine.units());
      f.engine.setEnemies(units); this.bridge.actor = f.engine;
      try { f.engine.tick(dt); f.engine.prepare(); } finally { this.bridge.actor = null; }
    }
    this.turn = (this.turn + 1) % this.fighters.length;
    const previouslyAlive = this.fighters.filter(f => f.eliminatedAt == null);
    const fallen = previouslyAlive.filter(f => f.engine.world.player.hp <= 0);
    for (const f of fallen) { f.eliminatedAt = this.time; f.rank = previouslyAlive.length - fallen.length + 1; f.engine.die(); }
    const alive = this.fighters.filter(f => f.eliminatedAt == null);
    const aliveSides = new Set(alive.map(f => f.team));
    if (aliveSides.size <= 1) this.finish(aliveSides.size === 1 ? "winner" : "draw");
    else if (this.time >= WYD.data.arena.timeLimit) this.finish("timeout");
  },
  finish(reason) {
    this.running = false; this.reason = reason;
    for (const f of this.fighters) if (f.eliminatedAt == null) f.rank = 1;
    if (this.mode === "teams") {
      const aliveTeams = new Set(this.fighters.filter(f => f.eliminatedAt == null).map(f => f.team));
      for (const f of this.fighters) f.rank = reason === "winner" ? (aliveTeams.has(f.team) ? 1 : 2) : 1;
    }
    this.selectionChanged(); this.renderStatus(true); this.renderResults(); this.draw();
  },
  stop(message) {
    this.token++; this.running = false; this.loading = false; this.paused = false;
    cancelAnimationFrame(this.raf); this.raf = null;
    for (const frame of this.frames) { if (frame.cancelArena) frame.cancelArena(); frame.remove(); }
    this.frames = []; this.fighters = []; this.initiative = []; this.bridge = null;
    if (this.$) this.$("arena-live").innerHTML = "";
    if (this.$) { this.selectionChanged(); if (message) { this.$("arena-status").textContent = message; this.$("arena-results").innerHTML = ""; this.draw(); } }
  },
  fail(error) { this.stop(); this.$("arena-status").textContent = "開始できませんでした：" + error.message; },
  animate() {
    let last = performance.now(), accumulator = 0;
    const loop = now => {
      if (!this.opened || (!this.running && !this.fighters.length)) return;
      const A = WYD.data.arena;
      if (this.running && !this.paused) accumulator += Math.min(A.step, (now - last) / 1000) * this.speed;
      last = now;
      while (accumulator >= A.step && this.running && !this.paused) { this.advance(A.step); accumulator -= A.step; }
      this.draw(); this.renderStatus();
      if (this.running) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  renderStatus(force) {
    const now = performance.now();
    if (!force && now - (this.lastRefresh || 0) < WYD.data.arena.refreshMs) return;
    this.lastRefresh = now;
    const esc = WYD.results.escape, n = WYD.results.number;
    const alive = this.fighters.filter(f => f.eliminatedAt == null);
    if (this.running) this.$("arena-status").textContent = `${WYD.data.arena.modes[this.mode].name} · ${this.time.toFixed(1)}秒 / ${WYD.data.arena.timeLimit}秒 · ${this.mode === "teams" ? "チームA " + alive.filter(f => f.team === "A").length + "/3人 · チームB " + alive.filter(f => f.team === "B").length + "/3人" : "残り" + alive.length + "陣営"}${this.time >= WYD.data.arena.combat.pressureStart ? " · 消耗：火力↑ 回復↓" : ""}`;
    else if (this.reason) this.$("arena-status").textContent = this.reason === "winner" ? `${this.mode === "teams" ? "チーム" + alive[0].team : alive[0].entry.name}の勝利！ ${this.time.toFixed(1)}秒` : this.reason === "timeout" ? (this.mode === "teams" ? "時間切れ。両チームは同順位です。" : `時間切れ。残った${alive.length}陣営は同順位です。`) : "相打ち・引き分け！";
    this.$("arena-live").innerHTML = this.fighters.map((f, i) => {
      const p = f.engine.world.player, r = f.engine.summary(), hp = Math.max(0, p.hp);
      return `<div class="arena-live-card" style="--team:${f.color}"><b><span>${i + 1}</span> ${this.mode === "teams" ? "[" + f.team + "] " : ""}${esc(f.entry.name)} <small>Lv${f.entry.level}</small></b><div class="arena-hp"><i style="width:${hp / p.maxHp * 100}%"></i></div><small>${n(hp)} / ${n(p.maxHp)} HP · 与ダメ ${n(r.damage)}${f.rank ? (this.mode === "teams" && this.running ? " · 脱落" : " · " + f.rank + "位") : ""}</small></div>`;
    }).join("");
  },
  renderResults() {
    const esc = WYD.results.escape, n = WYD.results.number;
    this.$("arena-results").innerHTML = '<h3>試合結果</h3><p class="muted">与・被ダメージは各キャラとその召喚の合計。回復は本人の回復効果。味方回復は別集計。オーラ支援は味方への攻撃強化の累計人秒、拘束付与は耐性適用後に付与した秒数（実際に拘束した時間ではありません）。育成データへの報酬・消費・変更はありません。</p>' + this.fighters.slice().sort((a, b) => a.rank - b.rank).map(f => {
      const r = f.engine.summary();
      return `<details class="arena-result" ${f.rank === 1 ? "open" : ""} style="--team:${f.color}"><summary>${f.rank}位 · ${this.mode === "teams" ? "チーム" + f.team + " · " : ""}${esc(f.entry.name)} · 与ダメ ${n(r.damage)}</summary><p>被ダメージ ${n(r.taken)} · 回復 ${n(r.healing)} · 味方回復 ${n(r.allyHealing)} · オーラ支援 ${r.auraSeconds.toFixed(1)}人秒 · 拘束付与 ${r.bindSeconds.toFixed(1)}秒 · 実測会心 ${esc(r.crit)} · ${f.eliminatedAt == null ? "最後まで生存" : f.eliminatedAt.toFixed(1) + "秒で脱落"}</p><div class="arena-breakdown">${r.rows.filter(row => row.damage || row.healing || row.casts || row.allyHealing || row.auraSeconds || row.bindSeconds).map(row => `<div><span>${row.icon ? `<img src="${esc(row.icon)}" alt="">` : ""}${esc(row.name)}</span><b>${n(row.damage)}</b><small>会心 ${esc(row.crit)} · 命中 ${row.hits} · 発動 ${row.casts}${row.healing ? " · 回復 " + n(row.healing) : ""}${row.allyHealing ? " · 味方回復 " + n(row.allyHealing) : ""}${row.auraSeconds ? " · オーラ支援 " + row.auraSeconds.toFixed(1) + "人秒" : ""}${row.bindSeconds ? " · 拘束付与 " + row.bindSeconds.toFixed(1) + "秒" : ""}</small></div>`).join("")}</div></details>`;
    }).join("");
  },
  draw() {
    const canvas = this.$("arena-canvas"), ctx = canvas.getContext("2d"), A = WYD.data.arena;
    if (canvas.width !== A.width) canvas.width = A.width;
    if (canvas.height !== A.height) canvas.height = A.height;
    const image = WYD.render.getImage(A.background);
    ctx.fillStyle = "#19151d"; ctx.fillRect(0, 0, A.width, A.height);
    if (image) ctx.drawImage(image, 0, 0, A.width, A.height);
    ctx.fillStyle = `rgba(0,0,0,${A.visual.backgroundDim})`; ctx.fillRect(0, 0, A.width, A.height);
    ctx.save(); ctx.globalAlpha = A.visual.fieldAlpha;
    for (const f of this.fighters) f.engine.drawGround(ctx);
    ctx.restore();
    for (const f of this.fighters.slice().sort((a, b) => a.engine.world.player.y - b.engine.world.player.y)) f.engine.drawUnits(ctx);
    for (const f of this.fighters) f.engine.drawEffects(ctx, A.visual);
    const scale = A.width / (canvas.getBoundingClientRect().width || A.width);
    const font = A.visual.labelPx * Math.max(1, scale);
    this.fighters.forEach((f, i) => {
      const p = f.engine.world.player;
      if (p.dead) return;
      const bw = A.visual.barWidth, y = p.y - A.visual.labelGap;
      ctx.fillStyle = "#171217"; ctx.fillRect(p.x - bw / 2, y, bw, A.visual.barHeight);
      ctx.fillStyle = f.color; ctx.fillRect(p.x - bw / 2, y, bw * Math.max(0, p.hp / p.maxHp), A.visual.barHeight);
      ctx.font = `bold ${font}px sans-serif`; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#0a070b";
      const label = String(i + 1); ctx.strokeText(label, p.x, y - font / 3); ctx.fillText(label, p.x, y - font / 3);
    });
  },
};
