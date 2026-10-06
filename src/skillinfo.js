// スキルの説明に出す数値（今のレベル → 次のレベル）。しくみ（kind）ごとに、大事な数値を短く並べる。
// 数値はスキルの型（ルーン）と装備の強化（skillBoost）を反映したもの。スキル威力（%）はこのあとにかかる。
window.WYD = window.WYD || {};

WYD.skillInfo = {
  r1(v) {
    return Math.round(v * 10) / 10;
  },
  r2(v) {
    return Math.round(v * 100) / 100;
  },

  // [名前, そのレベルの値を文字にする関数] の並び
  fields(kind, s) {
    const f = (base, per) => (lv) => s[base] + s[per] * (lv - 1);
    const mult = f("damageBase", "damagePerLevel");
    const x = (fn) => (lv) => `攻撃力×${this.r2(fn(lv))}`;
    switch (kind) {
      case "bomb": {
        const out = [["爆発の威力", x(mult)], ["爆発範囲", () => Math.round(s.radius)]];
        if (s.mode === "brand") out.push(["仕込む数", lv => Math.floor(s.targetsBase + s.targetsPerLevel * (lv - 1))], ["起爆まで", () => `${s.fuse}秒`]);
        if (s.mode === "hunter") out.push(["移動速度", () => s.speed], ["追尾時間", () => `${s.lifetime}秒`]);
        if (s.mode === "mine") out.push(["同時設置", () => s.maxBombs], ["時限", () => `${s.fuse}秒`]);
        if (s.mode === "finale") out.push(["誘爆の威力", () => `${s.chainBoost}倍`]);
        return out;
      }
      case "whirl": return [["威力", x(mult)], ["範囲", () => Math.round(s.radius)]];
      case "vajra": return [
        ["防御", (lv) => `+${this.r1(s.defenseBase + s.defensePerLevel * (lv - 1))}`],
        ["回復", (lv) => `最大HPの${this.r1(s.healPercentBase + s.healPercentPerLevel * (lv - 1))}%`],
        ["発動", () => `HP${s.triggerHpPercent}%以下`], ["時間", () => `${this.r1(s.duration)}秒`]];
      case "sudarshana": return [["威力", x(mult)], ["当たる数", (lv) => Math.floor(s.targetsBase + s.targetsPerLevel * (lv - 1))]];
      case "agni": return [["1回の威力", x(mult)], ["範囲", () => Math.round(s.radius)], ["燃える時間", () => `${this.r1(s.duration)}秒（${s.tick}秒ごと）`]];
      case "hanuman": return [["攻撃速度", (lv) => `+${Math.round(s.hasteBase + s.hastePerLevel * (lv - 1))}%`], ["時間", () => `${this.r1(s.duration)}秒`]];
      case "nagapasha": return [["威力", x(mult)], ["縛る", (lv) => `${this.r1(s.bindBase + s.bindPerLevel * (lv - 1))}秒`], ["範囲", () => Math.round(s.radius)]];
      case "raise": return [
        ["数", (lv) => WYD.allies.maxCount(s, lv)],
        ["攻撃", (lv) => `主人公の×${this.r2(s.attackBase + s.attackPerLevel * (lv - 1))}`],
        ["HP", () => `主人公の×${this.r2(s.hpRatio)}`], ["時間", () => `${this.r1(s.duration)}秒`]];
      case "aura":
        if (s.auraType === "damage") return [["1回の威力", x(mult)], ["範囲", () => Math.round(s.radius)]];
        if (s.auraType === "heal") return [["回復", (lv) => `最大HPの${this.r2(s.healPercentBase + s.healPercentPerLevel * (lv - 1))}%`]];
        return [["攻撃力", (lv) => `+${this.r1(s.mightBase + s.mightPerLevel * (lv - 1))}%`]];
      case "shift": {
        const out = [];
        const pct = (b, pl) => (lv) => `+${Math.round((s[b] || 0) + (s[pl] || 0) * (lv - 1))}%`;
        if (s.attackPctBase) out.push(["攻撃力", pct("attackPctBase", "attackPctPerLevel")]);
        if (s.attackSpeedPctBase) out.push(["攻撃速度", pct("attackSpeedPctBase", "attackSpeedPctPerLevel")]);
        if (s.maxHpPct) out.push(["最大HP", () => `+${s.maxHpPct}%`]);
        if (s.defensePct) out.push(["防御", () => `+${s.defensePct}%`]);
        if (s.moveSpeedPct) out.push(["移動速度", () => `+${s.moveSpeedPct}%`]);
        out.push(["時間", () => `${this.r1(s.duration)}秒`]);
        return out;
      }
      case "trap": return [
        ["1回の威力", x(mult)], ["撃つ数", () => Math.max(1, Math.floor(s.targetsBase || 1))],
        ["置ける数", (lv) => WYD.traps.maxCount(s, lv)], ["置いていられる", () => `${this.r1(s.duration)}秒（${this.r2(s.fireInterval)}秒ごと）`]];
    }
    return [];
  },

  // 次の値は、前と同じ頭の文字（「攻撃力×」など）を省く："攻撃力×2.1" → "2.4"
  shorten(a, b) {
    let k = 0;
    while (k < a.length && a[k] === b[k] && !/[0-9.+]/.test(a[k])) k++;
    return b.slice(k);
  },

  // HTML（Lv0 なら Lv1 の値、最大でなければ次のレベルの値も）
  html(state, id, lv) {
    const def = WYD.data.skills[id];
    const s = WYD.runes.effectiveDef(state, id);
    const now = Math.max(1, lv);
    const next = lv > 0 && lv < def.maxLevel ? lv + 1 : null;
    const parts = this.fields(WYD.classes.kindOf(id), s).map(([name, fn]) => {
      const a = String(fn(now)), b = next ? String(fn(next)) : a;
      return `${name} <b>${a}</b>${b !== a ? ` <span class="skill-next">→ ${this.shorten(a, b)}</span>` : ""}`;
    });
    if (!parts.length) return "";
    const head = lv > 0 ? "" : "<span class=\"muted\">覚えると：</span>";
    const rule = WYD.data.classSpecialization && WYD.data.classSpecialization.skills[id];
    const remains = id === "nec_nova" && rule ? `　屍体 ${(WYD.currentWorld.necRemains || []).length}/${rule.maxCorpses}` : "";
    return `<div class="skill-info">${head}${parts.join("　")}${rule ? `<br>${rule.note}${remains}` : ""}</div>`;
  },
};
