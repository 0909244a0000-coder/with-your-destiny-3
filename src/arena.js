// 自分の保存済みキャラ同士の練習試合。元のセーブに試合結果を書かない。
window.WYD = window.WYD || {};
WYD.arena = {
  opened: false, running: false, loading: false, token: 0, frames: [], fighters: [],
  init() {
    const $ = id => document.getElementById(id);
    this.$ = $;
    $("arena-time-limit").textContent = WYD.data.arena.timeLimit;
    const C = WYD.data.arena.combat;
    $("arena-rule-summary").textContent = `開戦時：本人へのダメージは本編の${C.damageScale * 100}%、一撃は最大HPの${C.hitHpCap * 100}%まで、${C.windowSeconds}秒の合計は${C.windowHpCap * 100}%まで。召喚・傭兵へのダメージは${C.summonDamageScale * 100}%。回復は${C.healScale * 100}%。吸血・反射は実際に奪ったHPから計算し、反射率は本編の${C.reflectScale * 100}%（最大${C.reflectRatioCap * 100}%）。拘束は最大${C.bindMax}秒、解除後${C.bindImmunity}秒は再拘束なし。${C.pressureStart}秒から消耗が進み、${C.pressureStart + C.pressureRamp}秒で火力補正・ダメージ上限が最大${C.pressureDamageMax}倍、回復は開戦時の${C.pressureHealMin * 100}%になります。`;
    $("arena-speed").innerHTML = WYD.data.arena.speeds.map(speed => `<option value="${speed}">×${speed}</option>`).join("");
    $("arena-open").onclick = () => this.open();
    $("arena-close").onclick = () => this.close();
    $("arena-refresh").onclick = () => this.refresh();
    $("arena-start").onclick = () => this.start().catch(e => this.fail(e));
    $("arena-stop").onclick = () => this.stop("試合を中止しました。育成データはそのままです。");
    $("arena-mode").onchange = () => this.chooseDefaults();
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
    this.$("arena-open").closest("details").open = false;
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
    this.$("arena-roster").innerHTML = this.rosterEntries.map(r => `<label class="arena-roster-card${r.snapshot ? "" : " unavailable"}"><input type="checkbox" value="${r.id}" ${r.snapshot ? "" : "disabled"}><img src="${esc(r.image)}" alt=""><span><b>${esc(r.name)}</b><small>${r.snapshot ? "Lv" + r.level + (r.current ? " · 現在の構成" : " · 最後の保存") : esc(r.unavailable)}</small></span></label>`).join("");
    this.chooseDefaults();
    this.$("arena-status").textContent = "参加キャラを選んで開戦。元の装備・ポイント・戦利品は変わりません。";
    this.$("arena-results").innerHTML = ""; this.draw();
  },
  chooseDefaults() {
    const all = [...this.$("arena-roster").querySelectorAll("input")];
    const available = all.filter(x => this.rosterEntries.find(r => r.id === x.value).snapshot);
    available.sort((a, b) => Number(b.value === WYD.classes.id) - Number(a.value === WYD.classes.id));
    const mode = this.$("arena-mode").value;
    for (const input of all) input.checked = available.includes(input) && (mode === "royale" || available.indexOf(input) < 2);
    this.selectionChanged();
  },
  selected() { return [...this.$("arena-roster").querySelectorAll("input:checked")].map(x => x.value); },
  selectionChanged() {
    if (!this.rosterEntries) return;
    const mode = WYD.data.arena.modes[this.$("arena-mode").value], count = this.selected().length;
    const ok = count >= mode.min && count <= mode.max;
    for (const input of this.$("arena-roster").querySelectorAll("input")) {
      const exists = !!this.rosterEntries.find(r => r.id === input.value).snapshot;
      input.disabled = this.loading || this.running || !exists || (!input.checked && count >= mode.max);
    }
    this.$("arena-start").disabled = this.loading || this.running || !ok;
    this.$("arena-selection").textContent = `${count}陣営を選択 · ${mode.name}は${mode.min === mode.max ? mode.min : mode.min + "〜" + mode.max}陣営（召喚・傭兵込み）`;
    this.$("arena-mode").disabled = this.loading || this.running;
    this.$("arena-refresh").disabled = this.loading || this.running;
    this.$("arena-stop").disabled = !this.loading && !this.running;
    this.$("arena-pause").disabled = !this.running;
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
  async start(ids = this.selected(), mode = this.$("arena-mode").value, automatic = true) {
    const rule = WYD.data.arena.modes[mode];
    if (!rule || ids.length < rule.min || ids.length > rule.max || new Set(ids).size !== ids.length) throw new Error("参加するキャラの数を確認してください");
    const entries = ids.map(id => this.rosterEntries.find(r => r.id === id));
    if (entries.some(r => !r || !r.snapshot)) throw new Error("育成済みのキャラを選んでください");
    this.stop(); const token = ++this.token;
    this.loading = true; this.selectionChanged(); this.$("arena-results").innerHTML = "";
    this.$("arena-status").textContent = "各キャラの装備・スキルを読み込み中…";
    this.unitSerial = 1;
    this.bridge = {
      images: WYD.render.images,
      getImage: src => WYD.render.getImage(src),
      time: () => this.time || 0,
      nextId: () => this.unitSerial++,
      owner: unit => this.fighters.find(f => f.team === unit.arenaTeam)?.engine,
      hit: (attacker, receiver, target, amount, source) => { this.lastHit = { from: attacker.team, to: receiver.team, amount, source }; },
    };
    try {
      const loaded = await Promise.all(entries.map((r, i) => this.makeFrame(r, "team" + i, WYD.data.arena.colors[i], token)));
      if (token !== this.token) return false;
      this.fighters = loaded; this.mode = mode; this.time = 0; this.turn = 0; this.paused = false;
      this.speed = Number(this.$("arena-speed").value); this.$("arena-pause").textContent = "試合を停止";
      const A = WYD.data.arena, offset = Math.random() * Math.PI * 2;
      this.fighters.forEach((f, i) => {
        const angle = offset + i * Math.PI * 2 / this.fighters.length, p = f.engine.world.player;
        p.x = A.width / 2 + Math.cos(angle) * A.startRadius; p.y = A.height / 2 + Math.sin(angle) * A.startRadius;
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
      f.engine.setEnemies(units); f.engine.tick(dt); f.engine.prepare();
    }
    this.turn = (this.turn + 1) % this.fighters.length;
    const previouslyAlive = this.fighters.filter(f => f.eliminatedAt == null);
    const fallen = previouslyAlive.filter(f => f.engine.world.player.hp <= 0);
    for (const f of fallen) { f.eliminatedAt = this.time; f.rank = previouslyAlive.length - fallen.length + 1; f.engine.die(); }
    const alive = this.fighters.filter(f => f.eliminatedAt == null);
    if (alive.length <= 1) this.finish(alive.length === 1 ? "winner" : "draw");
    else if (this.time >= WYD.data.arena.timeLimit) this.finish("timeout");
  },
  finish(reason) {
    this.running = false; this.reason = reason;
    for (const f of this.fighters) if (f.eliminatedAt == null) f.rank = 1;
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
    if (this.running) this.$("arena-status").textContent = `${WYD.data.arena.modes[this.mode].name} · ${this.time.toFixed(1)}秒 / ${WYD.data.arena.timeLimit}秒 · 残り${alive.length}陣営${this.time >= WYD.data.arena.combat.pressureStart ? " · 消耗：火力↑ 回復↓" : ""}`;
    else if (this.reason) this.$("arena-status").textContent = this.reason === "winner" ? `${alive[0].entry.name}の勝利！ ${this.time.toFixed(1)}秒` : this.reason === "timeout" ? `時間切れ。残った${alive.length}陣営は同順位です。` : "相打ち・引き分け！";
    this.$("arena-live").innerHTML = this.fighters.map((f, i) => {
      const p = f.engine.world.player, r = f.engine.summary(), hp = Math.max(0, p.hp);
      return `<div class="arena-live-card" style="--team:${f.color}"><b><span>${i + 1}</span> ${esc(f.entry.name)} <small>Lv${f.entry.level}</small></b><div class="arena-hp"><i style="width:${hp / p.maxHp * 100}%"></i></div><small>${n(hp)} / ${n(p.maxHp)} HP · 与ダメ ${n(r.damage)}${f.rank ? " · " + f.rank + "位" : ""}</small></div>`;
    }).join("");
  },
  renderResults() {
    const esc = WYD.results.escape, n = WYD.results.number;
    this.$("arena-results").innerHTML = '<h3>試合結果</h3><p class="muted">与・被ダメージは召喚・傭兵を含む陣営全体。回復は本人。育成データへの報酬・消費・変更はありません。</p>' + this.fighters.slice().sort((a, b) => a.rank - b.rank).map(f => {
      const r = f.engine.summary();
      return `<details class="arena-result" ${f.rank === 1 ? "open" : ""} style="--team:${f.color}"><summary>${f.rank}位 · ${esc(f.entry.name)} · 与ダメ ${n(r.damage)}</summary><p>被ダメージ ${n(r.taken)} · 回復 ${n(r.healing)} · 実測会心 ${esc(r.crit)} · ${f.eliminatedAt == null ? "最後まで生存" : f.eliminatedAt.toFixed(1) + "秒で脱落"}</p><div class="arena-breakdown">${r.rows.filter(row => row.damage || row.healing || row.casts).map(row => `<div><span>${row.icon ? `<img src="${esc(row.icon)}" alt="">` : ""}${esc(row.name)}</span><b>${n(row.damage)}</b><small>会心 ${esc(row.crit)} · 命中 ${row.hits} · 発動 ${row.casts}${row.healing ? " · 回復 " + n(row.healing) : ""}</small></div>`).join("")}</div></details>`;
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
