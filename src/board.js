// パラゴンボード：修練ポイントで盤面のマスを取る（となりのマスしか取れない）
window.WYD = window.WYD || {};

WYD.board = {
  key(r, c) {
    return `${r},${c}`;
  },

  // そのマスの文字（マスがなければ null）
  charAt(r, c) {
    const L = WYD.data.player.paragon.board.layout;
    const ch = L[r] && L[r][c];
    return ch && ch !== "." ? ch : null;
  },

  tile(r, c) {
    const ch = this.charAt(r, c);
    return ch ? WYD.data.player.paragon.board.tiles[ch] : null;
  },

  // 取ってあるマス（始まりのマスはいつも取ってある）
  owned(state, r, c) {
    return this.charAt(r, c) === "S" || !!state.player.paragon.board[this.key(r, c)];
  },

  canTake(state, r, c) {
    if (!this.tile(r, c) || this.owned(state, r, c) || state.player.paragon.points <= 0) return false;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => this.owned(state, r + dr, c + dc));
  },

  take(state, r, c) {
    if (!this.canTake(state, r, c)) return false;
    state.player.paragon.points--;
    state.player.paragon.board[this.key(r, c)] = true;
    return true;
  },

  // 取ったマスの一覧（tile の配列）
  ownedTiles(state) {
    const out = [];
    for (const k in state.player.paragon.board) {
      const [r, c] = k.split(",").map(Number);
      const t = this.tile(r, c);
      if (t) out.push(t);
    }
    return out;
  },

  // マスの説明
  tileText(t) {
    const B = WYD.data.player.paragon.board;
    const parts = [];
    for (const k in t.stats) {
      parts.push(WYD.data.items.stats[k] ? WYD.util.formatStat(k, t.stats[k]) : `${B.magicFindName} +${t.stats[k]}%`);
    }
    for (const id in t.effects || {}) {
      const def = WYD.loot.effectInfo(id);
      if (def) parts.push(`${def.name}（${WYD.util.formatEffect(def, t.effects[id])}）`);
    }
    if (t.power) parts.push(WYD.loot.uniqueDesc(t));
    return parts.join("、") || "はじまりのマス";
  },
};
