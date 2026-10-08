// アリーナの高速シミュレーター：選んだ組み合わせを、描画せずに指定回数戦わせて結果だけ集計する。
// 試合そのものは観戦と同じ（WYD.arena.start / advance）。数値は data/arena.js の sim。
window.WYD = window.WYD || {};
WYD.arenaSim = {
  running: false,

  init() {
    const S = WYD.data.arena.sim, $ = id => document.getElementById(id);
    this.$ = $;
    $("arena-sim-count").innerHTML = S.counts.map(n => `<option value="${n}" ${n === S.defaultCount ? "selected" : ""}>${n}回</option>`).join("");
    $("arena-sim-start").onclick = () => this.run(Number($("arena-sim-count").value)).catch(e => { $("arena-sim-status").textContent = "回せませんでした：" + e.message; });
    $("arena-sim-stop").onclick = () => { this.cancel = true; };
    $("arena-view").onchange = () => this.view($("arena-view").value);
  },

  // 見かたの切りかえ：watch = 観戦（今までの1試合を見る）　sim = 高速シミュレーター
  view(name) {
    this.$("arena-view").value = name;
    this.$("arena").querySelector(".arena-box").dataset.view = name;
    if (name === "watch") WYD.arena.draw();   // 隠れていた戦場を描きなおす
  },

  controls() {
    const A = WYD.arena;
    this.$("arena-sim-start").disabled = this.running || A.loading || A.running;
    this.$("arena-sim-count").disabled = this.running;
    this.$("arena-sim-stop").disabled = !this.running;
    this.$("arena-view").disabled = this.running || A.loading || A.running;   // 試合中・シミュレーター中は切りかえない
  },

  // count 回戦わせる。終わったら集計を返す（途中で止めたときは、そこまでの集計）
  async run(count) {
    const A = WYD.arena, S = WYD.data.arena.sim;
    if (this.running || A.loading || A.running) return null;
    const ids = A.selected(), mode = A.$("arena-mode").value, teams = A.teamSelection();
    A.rosterEntries = A.roster();   // 最新の育成状態で回す（観戦の開戦と同じ）
    const rule = WYD.data.arena.modes[mode];
    if (ids.length < rule.min || ids.length > rule.max) throw new Error("参加するキャラの数を確認してください");
    this.running = true; this.cancel = false; A.simulating = true; A.selectionChanged(); this.controls();
    // 描画と途中表示を止める（試合の計算はそのまま）
    const saved = { draw: A.draw, renderStatus: A.renderStatus, renderResults: A.renderResults };
    A.draw = A.renderStatus = A.renderResults = () => {};
    const result = { mode, count: 0, ties: 0, teamWins: { A: 0, B: 0 }, rows: Object.fromEntries(ids.map(id => [id, { id, name: A.rosterEntries.find(r => r.id === id).name, wins: 0, rankSum: 0, damage: 0, taken: 0, healing: 0, hpLeft: 0, timeSum: 0 }])) };
    const started = performance.now();
    let shown = 0;
    try {
      for (let k = 0; k < count && !this.cancel && A.opened; k++) {
        if (!(await A.start(ids, mode, false, teams))) break;
        while (A.running && !this.cancel && A.opened) {
          for (let i = 0; i < S.stepsPerSlice && A.running; i++) A.advance();
          await new Promise(r => setTimeout(r, 0));   // 画面を固めない
        }
        if (A.running || !A.reason) break;   // 止めた・閉じた試合は数えない
        this.collect(result, A);
        if (performance.now() - shown > S.refreshMs) { shown = performance.now(); this.render(result, count, started); }
      }
    } finally {
      Object.assign(A, saved);
      A.stop("高速シミュレーターで回しました。結果は下の表です。");
      this.running = false; A.simulating = false; A.selectionChanged(); this.controls();   // stop が空の戦場を1回だけ描く
    }
    this.render(result, count, started, true);
    return result;
  },

  collect(result, A) {
    result.count++;
    const winner = A.reason === "winner";
    if (!winner) result.ties++;
    if (winner && A.mode === "teams") result.teamWins[A.fighters.find(f => f.rank === 1).team]++;
    for (const f of A.fighters) {
      const row = result.rows[f.entry.id], r = f.engine.summary(), p = f.engine.world.player;
      row.rankSum += f.rank; row.damage += r.damage; row.taken += r.taken; row.healing += r.healing; row.timeSum += A.time;
      if (winner && f.rank === 1) { row.wins++; row.hpLeft += Math.max(0, p.hp) / p.maxHp; }
    }
  },

  render(result, count, started, done) {
    const esc = WYD.results.escape, n = WYD.results.number, c = Math.max(1, result.count);
    const secs = ((performance.now() - started) / 1000).toFixed(1);
    this.$("arena-sim-status").textContent = `${done ? (result.count < count ? "途中で止めました" : "完了") : "実行中"}：${result.count} / ${count}試合（${secs}秒）`;
    const rows = Object.values(result.rows).sort((a, b) => b.wins - a.wins || a.rankSum - b.rankSum);
    const team = result.mode === "teams" ? `<p>チームA ${result.teamWins.A}勝 · チームB ${result.teamWins.B}勝 · 引き分け・時間切れ ${result.ties}</p>` : `<p>引き分け・時間切れ ${result.ties}試合</p>`;
    this.$("arena-sim-results").innerHTML = `<h3>高速シミュレーターの結果</h3>${team}<div class="arena-sim-table"><table><thead><tr><th>キャラ</th><th>勝率</th><th>平均順位</th><th>勝った時の残りHP</th><th>平均与ダメ</th><th>平均被ダメ</th><th>平均の試合時間</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td>${esc(r.name)}</td><td>${Math.round(r.wins / c * 100)}%（${r.wins}勝）</td><td>${(r.rankSum / c).toFixed(2)}</td><td>${r.wins ? Math.round(r.hpLeft / r.wins * 100) + "%" : "-"}</td><td>${n(r.damage / c)}</td><td>${n(r.taken / c)}</td><td>${(r.timeSum / c).toFixed(1)}秒</td></tr>`).join("") +
      `</tbody></table></div><p class="muted">観戦と同じ計算で、描画だけ省いています。毎試合、開始位置と乱数は変わります。育成データへの反映はありません。</p>`;
  },
};
