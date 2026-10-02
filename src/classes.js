// 職業の切り替え。ページを開いたときに、今の職業の数値・スキル・セーブの場所を決める。
// 職業ごとにセーブは別々（バーバリアンは今までと同じ場所）。切り替えるとページを読み直す。
window.WYD = window.WYD || {};

WYD.classes = {
  ACTIVE_KEY: "wyd3-active-class",
  id: "barbarian",

  activeId() {
    let id = null;
    try {
      id = localStorage.getItem(this.ACTIVE_KEY);
    } catch (e) {
      // 読めなければ最初の職業
    }
    return WYD.data.classes[id] ? id : Object.keys(WYD.data.classes)[0];
  },

  // 今の職業の値を data に入れる（ほかのファイルは今までどおり WYD.data.player などを見ればよい）
  apply() {
    this.id = this.activeId();
    const c = WYD.data.classes[this.id];
    const P = WYD.data.player;
    for (const k in c.player) {
      const v = c.player[k];
      P[k] = v && typeof v === "object" && !Array.isArray(v) ? Object.assign({}, P[k], v) : v;
    }
    if (c.skills) WYD.data.skills = c.skills;
    if (c.skillOrder) WYD.data.skillOrder = c.skillOrder;
    if (c.autoBuild) WYD.data.autoBuild = c.autoBuild;
    if (c.skillIcons) WYD.data.skillIcons = c.skillIcons;
    // 最初の職業は今までと同じセーブの場所、ほかの職業は別の場所
    const first = Object.keys(WYD.data.classes)[0];
    WYD.save.KEY = this.id === first ? WYD.save.BASE_KEY : `${WYD.save.BASE_KEY}-${this.id}`;
  },

  // 職業を切り替える（今のセーブを書いてから読み直す）
  switchTo(id, state) {
    if (!WYD.data.classes[id] || id === this.id) return;
    WYD.save.write(state);
    try {
      localStorage.setItem(this.ACTIVE_KEY, id);
    } catch (e) {
      return;
    }
    WYD.resetting = true;   // 読み直す前の自動セーブで、新しい職業の場所に書かないように
    location.reload();
  },

  // スキルの「しくみ」の名前（kind がなければスキル名そのもの）
  kindOf(id) {
    const def = WYD.data.skills[id];
    return (def && def.kind) || id;
  },

  // しくみの名前から、今の職業のスキルの名前を探す（ユニーク装備の説明に使う）
  skillNameByKind(kind) {
    for (const id in WYD.data.skills) {
      if (this.kindOf(id) === kind) return WYD.data.skills[id].name;
    }
    return kind;
  },
};
