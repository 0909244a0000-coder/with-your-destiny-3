// 装備画面（src/equipscreen.js）の数値と並び。リネレボ風：左右に装備の枠、真ん中にキャラ、右に持ち物、下に能力。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.equipScreen = {
  // キャラの左右に並べる装備の枠（data/items.js の slots）
  leftSlots: ["weapon", "head", "body", "hands", "feet"],
  rightSlots: ["offhand", "neck", "ring", "waist"],
  // 画面の下のページ。panel = 元の画面から移してくる部品（index.html の id）。locked = その部品が隠れている（まだ使えない）ときはページも出さない
  pages: [
    { id: "equip", label: "装備・持ち物" },
    { id: "stats", label: "能力・リザルト", panel: "status-content" },
    { id: "sort", label: "ソート" },
    { id: "cube", label: "カナイの箱", panel: "cube-panel", locked: true },
    { id: "maps", label: "地図", panel: "maps-panel", locked: true },
  ],
  // ソート画面の表示順（入手順・新しい順は持ち物/宝石の保存順）。
  gearSorts: [["default", "入手順", "拾った順をそのまま表示"], ["recent", "新しい順", "新しく入った装備から"], ["rarity", "レア度", "希少な装備から"], ["power", "強さ", "自動装備の評価が高い順"], ["level", "レベル", "装備レベルが高い順"], ["slot", "部位", "武器から部位順"], ["op", "OP指定", "選んだ能力・特殊効果の数値順"]],
  gemSorts: [["tier", "段階・種類", "神・混沌・高段階から"], ["new", "新しい順", "新しく手に入れた種類から"], ["lines", "能力の数", "能力の多い宝石から"], ["count", "所持数", "たくさん持つ種類から"], ["name", "名前", "名前の順"], ["op", "OP指定", "選んだ能力を持つ宝石から"]],
  // 持ち物の絞り込み。slots = 入る部位（なし = すべて）、rarities = レア度、socketed = 宝石つきだけ
  tabs: [
    { id: "all", label: "すべて" },
    { id: "weapon", label: "武器", slots: ["weapon"] },
    { id: "armor", label: "防具", slots: ["head", "body", "hands", "feet", "offhand", "waist"] },
    { id: "jewelry", label: "装飾品", slots: ["ring", "neck"] },
    { id: "special", label: "ユニーク・セット", rarities: ["unique", "set"] },
    { id: "up", label: "▲ 強い", upgrade: true },
    { id: "gems", label: "宝石", gems: true },   // 手元の宝石（種類ごとに1マス。押すと宝石の画面ではめる）
  ],
  // 宝石のマスの左上の印：ふつうの宝石は段階（data/gems.js の tiers の順）、混沌の宝石・神の混沌石は別の印
  gemMark: { tiers: ["I", "II", "III", "IV", "V"], fused: "混", god: "神" },
  // マスの左上の印（レア度）
  rarityMark: { normal: "N", magic: "M", rare: "R", legend: "L", unique: "U", set: "S" },
  // 戦闘力 = 能力 × 重み の合計（目安。実際の強さは DPS テストで）
  power: { attack: 10, defense: 6, maxHp: 1, hpRegen: 5, attackSpeed: 400, critChance: 20, moveSpeed: 0, skillDamage: 8 },
  // 下に並べる能力 [能力, 名前, 表示]（表示：int = 整数、pct = %、rate = 秒間）
  stats: [["attack", "攻撃力", "int"], ["defense", "防御力", "int"], ["maxHp", "最大HP", "int"], ["critChance", "会心率", "pct"], ["attackSpeed", "攻撃速度", "rate"], ["skillDamage", "スキル威力", "pct"]],
};
