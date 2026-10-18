// 天下三分：マス戦闘（六角形のマス）の数値
var SG = typeof SG !== 'undefined' ? SG : {};
SG.data = SG.data || {};
SG.data.tactics = {
  cols: 18, rows: 12,         // 戦場の大きさ
  maxDays: 30,                // この日数で落とせなければ攻撃側の負け（撤退）
  move: { base: 4, bonusLead: 80 }, // 1日に動けるマス（統率が bonusLead 以上なら +1）
  // 地形：cost＝入るのに使う移動力（null は入れない）、def＝そこにいる部隊が受ける損害の割り算、atk＝そこから攻めるときの掛け算、fire＝火計の決まりやすさ
  terrain: {
    plain: { name: '平地', cost: 1, def: 1, atk: 1, fire: 1, color: '#cdbb84' },
    forest: { name: '森', cost: 2, def: 1.2, atk: 1, fire: 1.5, color: '#6e8a48', glyph: '林' },
    mountain: { name: '山', cost: 3, def: 1.4, atk: 1, fire: 0.7, color: '#9a8768', glyph: '山' },
    river: { name: '川', cost: 4, def: 0.8, atk: 0.8, fire: 0.3, color: '#5b8fbf', glyph: '〜' },
    bridge: { name: '橋', cost: 1, def: 0.9, atk: 1, fire: 0.8, color: '#a07c4e', glyph: '橋' },
    town: { name: '城内', cost: 1, def: 1.2, atk: 1, fire: 1, color: '#bba98a', wall: true },
    keep: { name: '本陣', cost: 1, def: 1.4, atk: 1, fire: 0.8, color: '#d9b45a', wall: true, glyph: '陣' },
    gate: { name: '城門', cost: 1, def: 1.4, atk: 1, fire: 0.8, color: '#7a4a2a', wall: true, glyph: '門' },
    broken: { name: '壊れた城門', cost: 1, def: 1, atk: 1, fire: 1, color: '#8d7357', glyph: '破' },
    wall: { name: '城壁', cost: null, color: '#4a423a' },
  },
  wallDefPer: 1000,           // 城の中（wall: true の地形）の守備側は、さらに 1 + 都市の城壁 / wallDefPer で守る
  attackK: 0.16,              // 攻撃1回の損害の大きさ（部隊の強さ × これ）
  counter: 0.5,               // 攻撃されたほうの反撃の強さ
  bow: { range: 2, k: 0.5 },  // 弓：2マス先まで。攻撃の半分の強さで、反撃なし
  gate: { base: 1000, perDef: 6, k: 1.5 }, // 城門の耐久 = base + 城壁 × perDef。k＝城門への攻撃の強さ
  fire: { range: 2, loss: [0.08, 0.15], min: 0.05, max: 0.9 }, // 火計：知力の比 × 地形で決まる。決まれば兵の8〜15%を焼く
  duelRefuse: 0.5,            // 武力の低いほうが一騎打ちを断る確率
  // 戦場を作る：山の多い州、森・山の多さ（[ふつう, 山の多い州]）、川のそばの都市には川（経度・緯度の度数で、この近さまで）
  hilly: ['益州', '涼州', '并州'],
  forestRate: [0.12, 0.16], mountainRate: [0.05, 0.13], riverDist: 0.6,
  // AI
  ai: { duelGap: 15, duelChance: 0.3, fireInt: 70, fireChance: 0.5, engage: 5 },
};
