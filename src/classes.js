// 職業の切り替え。ページを開いたときに、今の職業の数値・スキル・セーブの場所を決める。
// 職業ごとにセーブは別々（バーバリアンは今までと同じ場所）。切り替えるとページを読み直す。
window.WYD = window.WYD || {};

WYD.classes = {
  ACTIVE_KEY: "wyd3-active-class",
  id: "barbarian",
  // applyで職業別データに置き換える前の技名を、対象外装備の説明用に残す。
  baseSkills: WYD.data.skills,

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
    if (c.collect) this.collect(c);
    if (c.skills) WYD.data.skills = c.skills;
    if (c.skillOrder) WYD.data.skillOrder = c.skillOrder;
    if (c.autoBuild) WYD.data.autoBuild = c.autoBuild;
    if (c.skillIcons) WYD.data.skillIcons = c.skillIcons;
    // 最初の職業は今までと同じセーブの場所、ほかの職業は別の場所
    const first = Object.keys(WYD.data.classes)[0];
    WYD.save.KEY = this.id === first ? WYD.save.BASE_KEY : `${WYD.save.BASE_KEY}-${this.id}`;
  },

  // 蒐集者：全職業のスキルを、元のデータのまま（同じオブジェクトを指す）ひとつにまとめる。
  // 元の職業の数値や処理を直すと、蒐集者にもそのまま反映される。owner = スキル → 元の職業
  collect(c) {
    const skills = {}, order = [], icons = {}, owner = {};
    for (const id of WYD.data.collector.groups) {
      const src = WYD.data.classes[id];
      const list = src.skills || this.baseSkills;
      const ids = src.skillOrder || Object.keys(list);
      for (const sid of [...ids, ...Object.keys(list).filter((x) => !ids.includes(x))]) {
        if (!list[sid] || skills[sid]) continue;
        skills[sid] = list[sid]; order.push(sid); owner[sid] = id;
      }
      Object.assign(icons, WYD.data.skillIcons || {}, src.skillIcons || {});
    }
    c.skills = skills; c.skillOrder = order; c.skillIcons = icons;
    WYD.data.collector.owner = owner;
    // 召喚・変身などで使う他職業の絵も先に読む
    const pre = new Set(c.player.preloadImages || []);
    for (const id of WYD.data.collector.groups) for (const path of (WYD.data.classes[id].player || {}).preloadImages || []) pre.add(path);
    c.player.preloadImages = [...pre];
  },

  // その職業の処理を動かすか：その職業そのもの、または蒐集者がその職業の技を使っているとき
  acts(classId, state = WYD.state) {
    if (this.id === classId) return true;
    if (this.id !== "collector" || !state || !WYD.data.collector.owner) return false;
    const pl = state.player, owner = WYD.data.collector.owner;
    return Object.keys(owner).some((id) => owner[id] === classId && (pl.skills[id] || 0) > 0 && pl.skillEnabled[id]);
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

  // 今の職業に、そのしくみのスキルがあるか
  hasKind(kind) {
    return Object.keys(WYD.data.skills).some((id) => this.kindOf(id) === kind);
  },

  // しくみの名前から、今の職業のスキルの名前を探す（ユニーク装備の説明に使う）
  skillNameByKind(kind) {
    for (const id in WYD.data.skills) {
      if (this.kindOf(id) === kind) return WYD.data.skills[id].name;
    }
    for (const skills of [this.baseSkills, ...Object.values(WYD.data.classes).map(c => c.skills)]) {
      for (const id in skills || {}) {
        if (id === kind || (skills[id].kind || id) === kind) return skills[id].name;
      }
    }
    return "未対応のスキル";
  },
};
