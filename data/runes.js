// スキルの型（ルーン）。スキルごとに3つの型があり、1つ選ぶとスキルの性質が変わる。
//   unlock … その型が選べるようになるスキルレベル（data/runes.js の unlockLevels）
//   mods   … スキルの数値の変え方。["mul", 倍率] か ["add", 足す数] か ["set", 値]
//            名前は data/skills.js・data/classes.js の数値の名前。まとめ名も使える：
//            damage（威力）・heal（回復）・defense（防御）・haste（攻撃速度）・bind（縛る秒数）・targets（当たる数）
//   extra  … おまけの効果：lifesteal（与えたダメージの何%を回復）、bind（当てた敵を縛る秒数）、
//            leaveField（使ったあと足元に燃える地面などを残す：radius・duration・tick・mult・color）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.runes = {
  unlockLevels: [2, 4, 6],   // 1つ目・2つ目・3つ目の型が選べるスキルレベル
  bossBindMult: 0.3,         // おまけの「縛る」がボスに効く時間の倍率

  skills: {
    // ---- バーバリアン ----
    whirl: [
      { id: "wide", name: "大旋風", desc: "範囲が広い（1.4倍）。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
      { id: "blood", name: "血の渦", desc: "与えたダメージの5%を回復", extra: { lifesteal: 5 } },
      { id: "fire", name: "炎の渦", desc: "使ったあと、足元の地面が燃える",
        extra: { leaveField: { radius: 85, duration: 3, tick: 0.5, mult: 0.3, color: "#ff7a2a" } } },
    ],
    vajra: [
      { id: "steel", name: "鋼の守り", desc: "防御が大きく上がる（1.6倍）。回復は減る", mods: { defense: ["mul", 1.6], heal: ["mul", 0.6] } },
      { id: "regen", name: "再生", desc: "回復が大きい（1.6倍）。防御は下がる", mods: { heal: ["mul", 1.6], defense: ["mul", 0.6] } },
      { id: "early", name: "先手の備え", desc: "HP80%で早めに発動。使える間隔は少し長い", mods: { triggerHpPercent: ["set", 80], cooldown: ["mul", 1.2] } },
    ],
    sudarshana: [
      { id: "multi", name: "多重投げ", desc: "当たる数 +2。威力は少し下がる", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
      { id: "heavy", name: "重い一撃", desc: "当たる数 -1。威力1.6倍", mods: { targets: ["add", -1], damage: ["mul", 1.6] } },
      { id: "pin", name: "縫い止め", desc: "当てた敵を0.6秒縛る", extra: { bind: 0.6 } },
    ],
    agni: [
      { id: "big", name: "大火", desc: "燃える範囲が広い（1.35倍）", mods: { radius: ["mul", 1.35] } },
      { id: "long", name: "長く燃える", desc: "燃える時間1.8倍。1回の威力は少し下がる", mods: { duration: ["mul", 1.8], damage: ["mul", 0.8] } },
      { id: "rapid", name: "連発", desc: "使える間隔が短い（0.6倍）。威力は下がる", mods: { cooldown: ["mul", 0.6], damage: ["mul", 0.75] } },
    ],
    hanuman: [
      { id: "frenzy", name: "狂乱", desc: "攻撃速度がもっと上がる（1.4倍）。時間は短い", mods: { haste: ["mul", 1.4], duration: ["mul", 0.7] } },
      { id: "endure", name: "持続", desc: "時間1.8倍。上がり方は少し小さい", mods: { duration: ["mul", 1.8], haste: ["mul", 0.8] } },
      { id: "quick", name: "即応", desc: "使える間隔が短い（0.65倍）", mods: { cooldown: ["mul", 0.65] } },
    ],
    nagapasha: [
      { id: "long", name: "長い束縛", desc: "縛る時間1.6倍", mods: { bind: ["mul", 1.6] } },
      { id: "net", name: "広い網", desc: "範囲1.4倍。敵が1体でも使う", mods: { radius: ["mul", 1.4], minTargets: ["set", 1] } },
      { id: "crush", name: "締め上げ", desc: "威力2倍。縛る時間は短い", mods: { damage: ["mul", 2], bind: ["mul", 0.6] } },
    ],

    // ---- ソーサレス ----
    sorc_nova: [
      { id: "freeze", name: "凍結の輪", desc: "当てた敵を1秒凍らせる", extra: { bind: 1 } },
      { id: "wide", name: "拡散", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
      { id: "frost", name: "霜の地面", desc: "使ったあと、足元に冷たい地面が残って敵を削る",
        extra: { leaveField: { radius: 95, duration: 3, tick: 0.5, mult: 0.28, color: "#9fdcff" } } },
    ],
    sorc_shield: [
      { id: "steel", name: "強固な盾", desc: "防御1.6倍。回復は減る", mods: { defense: ["mul", 1.6], heal: ["mul", 0.6] } },
      { id: "regen", name: "魔力の癒し", desc: "回復1.6倍。防御は下がる", mods: { heal: ["mul", 1.6], defense: ["mul", 0.6] } },
      { id: "early", name: "先読み", desc: "HP80%で早めに発動。使える間隔は少し長い", mods: { triggerHpPercent: ["set", 80], cooldown: ["mul", 1.2] } },
    ],
    sorc_chain: [
      { id: "multi", name: "分岐", desc: "当たる数 +2。威力は少し下がる", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
      { id: "heavy", name: "雷槌", desc: "当たる数 -1。威力1.6倍", mods: { targets: ["add", -1], damage: ["mul", 1.6] } },
      { id: "shock", name: "感電", desc: "当てた敵を0.6秒しびれさせる", extra: { bind: 0.6 } },
    ],
    sorc_meteor: [
      { id: "big", name: "巨大隕石", desc: "範囲1.35倍", mods: { radius: ["mul", 1.35] } },
      { id: "long", name: "溶岩", desc: "燃える時間1.8倍。1回の威力は少し下がる", mods: { duration: ["mul", 1.8], damage: ["mul", 0.8] } },
      { id: "rapid", name: "流星群", desc: "使える間隔0.6倍。威力は下がる", mods: { cooldown: ["mul", 0.6], damage: ["mul", 0.75] } },
    ],
    sorc_haste: [
      { id: "frenzy", name: "過負荷", desc: "攻撃速度がもっと上がる（1.4倍）。時間は短い", mods: { haste: ["mul", 1.4], duration: ["mul", 0.7] } },
      { id: "endure", name: "持続", desc: "時間1.8倍。上がり方は少し小さい", mods: { duration: ["mul", 1.8], haste: ["mul", 0.8] } },
      { id: "quick", name: "即応", desc: "使える間隔0.65倍", mods: { cooldown: ["mul", 0.65] } },
    ],
    sorc_freeze: [
      { id: "long", name: "永久凍土", desc: "凍らせる時間1.6倍", mods: { bind: ["mul", 1.6] } },
      { id: "net", name: "広域凍結", desc: "範囲1.4倍。敵が1体でも使う", mods: { radius: ["mul", 1.4], minTargets: ["set", 1] } },
      { id: "crush", name: "砕氷", desc: "威力2倍。凍らせる時間は短い", mods: { damage: ["mul", 2], bind: ["mul", 0.6] } },
    ],
  },

  // まとめ名 → 実際の数値の名前
  groups: {
    damage: ["damageBase", "damagePerLevel"],
    heal: ["healPercentBase", "healPercentPerLevel"],
    defense: ["defenseBase", "defensePerLevel"],
    haste: ["hasteBase", "hastePerLevel"],
    bind: ["bindBase", "bindPerLevel"],
    targets: ["targetsBase"],
  },
};

// ネクロマンサーのスキルの型
Object.assign(WYD.data.runes.skills, {
  nec_raise: [
    { id: "army", name: "骸の軍勢", desc: "呼べる数 +2。1体ずつは弱くなる", mods: { countBase: ["add", 2], attackBase: ["mul", 0.7], hpRatio: ["mul", 0.8] } },
    { id: "golem", name: "骨の巨人", desc: "1体だけ、とても強い巨人を呼ぶ", mods: { countBase: ["set", 1], countPerLevel: ["set", 0], hpRatio: ["mul", 4], attackBase: ["mul", 2.8], radius: ["mul", 1.6] } },
    { id: "undying", name: "不死の兵", desc: "手下がいられる時間2倍、HP1.3倍", mods: { duration: ["mul", 2], hpRatio: ["mul", 1.3] } },
  ],
  nec_mage: [
    { id: "coven", name: "魔術師の会", desc: "呼べる数 +1。1体ずつは少し弱い", mods: { countBase: ["add", 1], attackBase: ["mul", 0.8] } },
    { id: "lich", name: "リッチ", desc: "1体だけ、とても強い魔術師を呼ぶ", mods: { countBase: ["set", 1], countPerLevel: ["set", 0], attackBase: ["mul", 2.5], hpRatio: ["mul", 3], radius: ["mul", 1.4] } },
    { id: "far", name: "遠見の魔術師", desc: "射程が1.4倍になり、もっと離れたところから撃つ", mods: { rangedRange: ["mul", 1.4], keepDistance: ["mul", 1.3] } },
  ],
  nec_nova: [
    { id: "wide", name: "広がる骨", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
    { id: "leech", name: "生命吸収", desc: "与えたダメージの5%を回復", extra: { lifesteal: 5 } },
    { id: "rot", name: "腐敗の地", desc: "使ったあと、足元に毒の地面が残る",
      extra: { leaveField: { radius: 90, duration: 3, tick: 0.5, mult: 0.3, color: "#7dff6a" } } },
  ],
  nec_armor: [
    { id: "steel", name: "厚い骨", desc: "防御1.6倍。回復は減る", mods: { defense: ["mul", 1.6], heal: ["mul", 0.6] } },
    { id: "regen", name: "死者の癒し", desc: "回復1.6倍。防御は下がる", mods: { heal: ["mul", 1.6], defense: ["mul", 0.6] } },
    { id: "early", name: "先回り", desc: "HP80%で早めに発動。使える間隔は少し長い", mods: { triggerHpPercent: ["set", 80], cooldown: ["mul", 1.2] } },
  ],
  nec_spear: [
    { id: "multi", name: "骨の雨", desc: "当たる数 +2。威力は少し下がる", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
    { id: "heavy", name: "大槍", desc: "当たる数 -1。威力1.6倍", mods: { targets: ["add", -1], damage: ["mul", 1.6] } },
    { id: "pin", name: "串刺し", desc: "当てた敵を0.6秒縛る", extra: { bind: 0.6 } },
  ],
  nec_plague: [
    { id: "big", name: "大疫病", desc: "範囲1.35倍", mods: { radius: ["mul", 1.35] } },
    { id: "long", name: "長い霧", desc: "時間1.8倍。1回の威力は少し下がる", mods: { duration: ["mul", 1.8], damage: ["mul", 0.8] } },
    { id: "rapid", name: "連続感染", desc: "使える間隔0.6倍。威力は下がる", mods: { cooldown: ["mul", 0.6], damage: ["mul", 0.75] } },
  ],
  nec_pact: [
    { id: "frenzy", name: "狂乱の契約", desc: "攻撃速度がもっと上がる（1.4倍）。時間は短い", mods: { haste: ["mul", 1.4], duration: ["mul", 0.7] } },
    { id: "endure", name: "長い契約", desc: "時間1.8倍。上がり方は少し小さい", mods: { duration: ["mul", 1.8], haste: ["mul", 0.8] } },
    { id: "quick", name: "即応", desc: "使える間隔0.65倍", mods: { cooldown: ["mul", 0.65] } },
  ],
  nec_grasp: [
    { id: "long", name: "離さぬ手", desc: "縛る時間1.6倍", mods: { bind: ["mul", 1.6] } },
    { id: "net", name: "亡者の群れ", desc: "範囲1.4倍。敵が1体でも使う", mods: { radius: ["mul", 1.4], minTargets: ["set", 1] } },
    { id: "crush", name: "握りつぶし", desc: "威力2倍。縛る時間は短い", mods: { damage: ["mul", 2], bind: ["mul", 0.6] } },
  ],
});

// パラディンのスキルの型
Object.assign(WYD.data.runes.skills, {
  pal_zeal: [
    { id: "wide", name: "聖なる旋回", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
    { id: "leech", name: "生命の誓い", desc: "与えたダメージの5%を回復", extra: { lifesteal: 5 } },
    { id: "holy", name: "聖地", desc: "使ったあと、足元に聖なる炎の地面が残る",
      extra: { leaveField: { radius: 85, duration: 3, tick: 0.5, mult: 0.3, color: "#ffb84a" } } },
  ],
  pal_shield: [
    { id: "steel", name: "城壁", desc: "防御1.6倍。回復は減る", mods: { defense: ["mul", 1.6], heal: ["mul", 0.6] } },
    { id: "regen", name: "癒しの光", desc: "回復1.6倍。防御は下がる", mods: { heal: ["mul", 1.6], defense: ["mul", 0.6] } },
    { id: "early", name: "備え", desc: "HP80%で早めに発動。使える間隔は少し長い", mods: { triggerHpPercent: ["set", 80], cooldown: ["mul", 1.2] } },
  ],
  pal_hammer: [
    { id: "multi", name: "鎚の嵐", desc: "当たる数 +2。威力は少し下がる", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
    { id: "heavy", name: "大鎚", desc: "当たる数 -1。威力1.6倍", mods: { targets: ["add", -1], damage: ["mul", 1.6] } },
    { id: "stun", name: "気絶", desc: "当てた敵を0.6秒気絶させる", extra: { bind: 0.6 } },
  ],
  pal_judgment: [
    { id: "big", name: "大いなる裁き", desc: "範囲1.35倍", mods: { radius: ["mul", 1.35] } },
    { id: "long", name: "続く裁き", desc: "時間1.8倍。1回の威力は少し下がる", mods: { duration: ["mul", 1.8], damage: ["mul", 0.8] } },
    { id: "rapid", name: "連なる裁き", desc: "使える間隔0.6倍。威力は下がる", mods: { cooldown: ["mul", 0.6], damage: ["mul", 0.75] } },
  ],
  pal_vow: [
    { id: "frenzy", name: "熱狂", desc: "攻撃速度がもっと上がる（1.4倍）。時間は短い", mods: { haste: ["mul", 1.4], duration: ["mul", 0.7] } },
    { id: "endure", name: "長い誓い", desc: "時間1.8倍。上がり方は少し小さい", mods: { duration: ["mul", 1.8], haste: ["mul", 0.8] } },
    { id: "quick", name: "即応", desc: "使える間隔0.65倍", mods: { cooldown: ["mul", 0.65] } },
  ],
  pal_chain: [
    { id: "long", name: "離さぬ鎖", desc: "縛る時間1.6倍", mods: { bind: ["mul", 1.6] } },
    { id: "net", name: "光の網", desc: "範囲1.4倍。敵が1体でも使う", mods: { radius: ["mul", 1.4], minTargets: ["set", 1] } },
    { id: "crush", name: "断罪", desc: "威力2倍。縛る時間は短い", mods: { damage: ["mul", 2], bind: ["mul", 0.6] } },
  ],
  // オーラの型
  pal_fire: [
    { id: "wide", name: "燎原", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.8] } },
    { id: "hot", name: "灼熱", desc: "威力1.5倍。範囲は少し狭い", mods: { damage: ["mul", 1.5], radius: ["mul", 0.8] } },
    { id: "leech", name: "浄化の炎", desc: "与えたダメージの4%を回復", extra: { lifesteal: 4 } },
  ],
  pal_prayer: [
    { id: "strong", name: "深い祈り", desc: "回復1.5倍", mods: { heal: ["mul", 1.5] } },
    { id: "fast", name: "絶えぬ祈り", desc: "0.5秒ごとに回復（1回は少し少ない）", mods: { cooldown: ["set", 0.5], heal: ["mul", 0.6] } },
    { id: "wide", name: "群れの祈り", desc: "手下に届く範囲2倍", mods: { radius: ["mul", 2] } },
  ],
  pal_might: [
    { id: "strong", name: "剛力", desc: "攻撃力の上がり方1.4倍", mods: { mightBase: ["mul", 1.4], mightPerLevel: ["mul", 1.4] } },
    { id: "early", name: "目覚め", desc: "最初から大きく上がる（Lvごとの伸びは小さい）", mods: { mightBase: ["mul", 1.7], mightPerLevel: ["mul", 0.5] } },
    { id: "growth", name: "成長", desc: "Lvごとの伸びが大きい（最初は小さい）", mods: { mightBase: ["mul", 0.6], mightPerLevel: ["mul", 1.9] } },
  ],
});

// アサシンのスキルの型
Object.assign(WYD.data.runes.skills, {
  asn_blade: [
    { id: "wide", name: "大回転", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
    { id: "leech", name: "血の刃", desc: "与えたダメージの5%を回復", extra: { lifesteal: 5 } },
    { id: "fast", name: "連舞", desc: "使える間隔0.65倍。威力は少し下がる", mods: { cooldown: ["mul", 0.65], damage: ["mul", 0.85] } },
  ],
  asn_cloak: [
    { id: "steel", name: "濃い影", desc: "防御1.6倍。回復は減る", mods: { defense: ["mul", 1.6], heal: ["mul", 0.6] } },
    { id: "regen", name: "影の癒し", desc: "回復1.6倍。防御は下がる", mods: { heal: ["mul", 1.6], defense: ["mul", 0.6] } },
    { id: "early", name: "先読み", desc: "HP80%で早めに発動。使える間隔は少し長い", mods: { triggerHpPercent: ["set", 80], cooldown: ["mul", 1.2] } },
  ],
  asn_shuriken: [
    { id: "multi", name: "乱れ投げ", desc: "当たる数 +2。威力は少し下がる", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
    { id: "heavy", name: "大手裏剣", desc: "当たる数 -1。威力1.6倍", mods: { targets: ["add", -1], damage: ["mul", 1.6] } },
    { id: "poison", name: "毒刃", desc: "当てた敵を0.6秒しびれさせる", extra: { bind: 0.6 } },
  ],
  asn_fire: [
    { id: "big", name: "大爆炎", desc: "範囲1.35倍", mods: { radius: ["mul", 1.35] } },
    { id: "long", name: "くすぶり", desc: "燃える時間1.8倍。1回の威力は少し下がる", mods: { duration: ["mul", 1.8], damage: ["mul", 0.8] } },
    { id: "rapid", name: "連鎖爆破", desc: "使える間隔0.6倍。威力は下がる", mods: { cooldown: ["mul", 0.6], damage: ["mul", 0.75] } },
  ],
  asn_burst: [
    { id: "frenzy", name: "神速", desc: "攻撃速度がもっと上がる（1.4倍）。時間は短い", mods: { haste: ["mul", 1.4], duration: ["mul", 0.7] } },
    { id: "endure", name: "持続", desc: "時間1.8倍。上がり方は少し小さい", mods: { duration: ["mul", 1.8], haste: ["mul", 0.8] } },
    { id: "quick", name: "即応", desc: "使える間隔0.65倍", mods: { cooldown: ["mul", 0.65] } },
  ],
  asn_mind: [
    { id: "long", name: "深い暗示", desc: "縛る時間1.6倍", mods: { bind: ["mul", 1.6] } },
    { id: "net", name: "念の波", desc: "範囲1.4倍。敵が1体でも使う", mods: { radius: ["mul", 1.4], minTargets: ["set", 1] } },
    { id: "crush", name: "心砕き", desc: "威力2倍。縛る時間は短い", mods: { damage: ["mul", 2], bind: ["mul", 0.6] } },
  ],
  asn_shadow: [
    { id: "twin", name: "双影", desc: "影を2体呼ぶ。1体ずつは少し弱い", mods: { countBase: ["set", 2], attackBase: ["mul", 0.75], hpRatio: ["mul", 0.8] } },
    { id: "master", name: "影の達人", desc: "影がとても強くなるが、いられる時間が短い", mods: { attackBase: ["mul", 1.8], hpRatio: ["mul", 1.5], duration: ["mul", 0.6] } },
    { id: "lasting", name: "消えぬ影", desc: "影がいられる時間2倍", mods: { duration: ["mul", 2] } },
  ],
  asn_sentry: [
    { id: "many", name: "歩哨の列", desc: "置ける数 +2。1回の威力は少し下がる", mods: { maxTrapsBase: ["add", 2], damage: ["mul", 0.8] } },
    { id: "long", name: "長持ち", desc: "置いていられる時間1.8倍", mods: { duration: ["mul", 1.8] } },
    { id: "rapid", name: "速射", desc: "撃つ間隔0.65倍。1回の威力は少し下がる", mods: { fireInterval: ["mul", 0.65], damage: ["mul", 0.85] } },
  ],
  asn_death: [
    { id: "wide", name: "死の網", desc: "撃つ数 +2、届く範囲1.2倍", mods: { targets: ["add", 2], range: ["mul", 1.2] } },
    { id: "heavy", name: "処刑", desc: "威力1.7倍。撃つ数は1体", mods: { damage: ["mul", 1.7], targets: ["set", 1] } },
    { id: "stun", name: "金縛り", desc: "当てた敵を0.5秒縛る", extra: { bind: 0.5 } },
  ],
});

// ドルイドのスキルの型
Object.assign(WYD.data.runes.skills, {
  dru_bear: [
    { id: "long", name: "眠らぬ熊", desc: "変身の時間1.6倍", mods: { duration: ["mul", 1.6] } },
    { id: "fury", name: "怒れる熊", desc: "攻撃力の上がり方1.4倍。防御の上がり方は小さい", mods: { attackPctBase: ["mul", 1.4], attackPctPerLevel: ["mul", 1.4], defensePct: ["mul", 0.5] } },
    { id: "hide", name: "厚い毛皮", desc: "最大HPと防御の上がり方2倍。攻撃力の上がり方は小さい", mods: { maxHpPct: ["mul", 2], defensePct: ["mul", 2], attackPctBase: ["mul", 0.7], attackPctPerLevel: ["mul", 0.7] } },
  ],
  dru_wolf: [
    { id: "long", name: "群れの長", desc: "変身の時間1.6倍", mods: { duration: ["mul", 1.6] } },
    { id: "frenzy", name: "狂乱", desc: "攻撃速度の上がり方1.4倍", mods: { attackSpeedPctBase: ["mul", 1.4], attackSpeedPctPerLevel: ["mul", 1.4] } },
    { id: "hunt", name: "狩りの牙", desc: "攻撃力の上がり方3倍。攻撃速度の上がり方は小さい", mods: { attackPctBase: ["mul", 3], attackPctPerLevel: ["mul", 3], attackSpeedPctBase: ["mul", 0.6], attackSpeedPctPerLevel: ["mul", 0.6] } },
  ],
  dru_wolves: [
    { id: "pack", name: "大きな群れ", desc: "呼べる数 +2。1体ずつは弱くなる", mods: { countBase: ["add", 2], attackBase: ["mul", 0.7], hpRatio: ["mul", 0.8] } },
    { id: "dire", name: "大狼", desc: "1体だけ、とても強い大狼を呼ぶ", mods: { countBase: ["set", 1], countPerLevel: ["set", 0], hpRatio: ["mul", 3.5], attackBase: ["mul", 2.6], radius: ["mul", 1.5] } },
    { id: "lasting", name: "忠実な狼", desc: "いられる時間2倍", mods: { duration: ["mul", 2] } },
  ],
  dru_tornado: [
    { id: "wide", name: "大竜巻", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.85] } },
    { id: "leech", name: "命の風", desc: "与えたダメージの5%を回復", extra: { lifesteal: 5 } },
    { id: "storm", name: "嵐のあと", desc: "使ったあと、足元に風の渦が残って敵を削る",
      extra: { leaveField: { radius: 90, duration: 3, tick: 0.5, mult: 0.3, color: "#cfeedd" } } },
  ],
  dru_bark: [
    { id: "steel", name: "鉄の樹皮", desc: "防御1.6倍。回復は減る", mods: { defense: ["mul", 1.6], heal: ["mul", 0.6] } },
    { id: "regen", name: "森の癒し", desc: "回復1.6倍。防御は下がる", mods: { heal: ["mul", 1.6], defense: ["mul", 0.6] } },
    { id: "early", name: "芽吹き", desc: "HP80%で早めに発動。使える間隔は少し長い", mods: { triggerHpPercent: ["set", 80], cooldown: ["mul", 1.2] } },
  ],
  dru_boulder: [
    { id: "multi", name: "落石", desc: "当たる数 +2。威力は少し下がる", mods: { targets: ["add", 2], damage: ["mul", 0.8] } },
    { id: "heavy", name: "大岩", desc: "当たる数 -1。威力1.6倍", mods: { targets: ["add", -1], damage: ["mul", 1.6] } },
    { id: "stun", name: "地響き", desc: "当てた敵を0.6秒動けなくする", extra: { bind: 0.6 } },
  ],
  dru_fissure: [
    { id: "big", name: "大地割れ", desc: "範囲1.35倍", mods: { radius: ["mul", 1.35] } },
    { id: "long", name: "火山", desc: "燃える時間1.8倍。1回の威力は少し下がる", mods: { duration: ["mul", 1.8], damage: ["mul", 0.8] } },
    { id: "rapid", name: "連続噴火", desc: "使える間隔0.6倍。威力は下がる", mods: { cooldown: ["mul", 0.6], damage: ["mul", 0.75] } },
  ],
  dru_howl: [
    { id: "frenzy", name: "血の咆哮", desc: "攻撃速度がもっと上がる（1.4倍）。時間は短い", mods: { haste: ["mul", 1.4], duration: ["mul", 0.7] } },
    { id: "endure", name: "長い咆哮", desc: "時間1.8倍。上がり方は少し小さい", mods: { duration: ["mul", 1.8], haste: ["mul", 0.8] } },
    { id: "quick", name: "即応", desc: "使える間隔0.65倍", mods: { cooldown: ["mul", 0.65] } },
  ],
  dru_vines: [
    { id: "long", name: "離さぬ蔓", desc: "縛る時間1.6倍", mods: { bind: ["mul", 1.6] } },
    { id: "net", name: "茨の網", desc: "範囲1.4倍。敵が1体でも使う", mods: { radius: ["mul", 1.4], minTargets: ["set", 1] } },
    { id: "crush", name: "締めつけ", desc: "威力2倍。縛る時間は短い", mods: { damage: ["mul", 2], bind: ["mul", 0.6] } },
  ],
});

// バーバリアン・ソーサレスに足したスキルの型
Object.assign(WYD.data.runes.skills, {
  bar_ancients: [
    { id: "elder", name: "長老", desc: "1体だけ、とても強い祖霊を呼ぶ", mods: { countBase: ["set", 1], hpRatio: ["mul", 3], attackBase: ["mul", 2.6], radius: ["mul", 1.5] } },
    { id: "lasting", name: "消えぬ霊", desc: "いられる時間2倍", mods: { duration: ["mul", 2] } },
    { id: "fury", name: "怒れる霊", desc: "攻撃力1.5倍。HPは少し下がる", mods: { attackBase: ["mul", 1.5], hpRatio: ["mul", 0.8] } },
  ],
  bar_orders: [
    { id: "strong", name: "鬨の声", desc: "攻撃力の上がり方1.4倍", mods: { mightBase: ["mul", 1.4], mightPerLevel: ["mul", 1.4] } },
    { id: "early", name: "初陣", desc: "最初から大きく上がる（Lvごとの伸びは小さい）", mods: { mightBase: ["mul", 1.7], mightPerLevel: ["mul", 0.5] } },
    { id: "growth", name: "歴戦", desc: "Lvごとの伸びが大きい（最初は小さい）", mods: { mightBase: ["mul", 0.6], mightPerLevel: ["mul", 1.9] } },
  ],
  bar_cry: [
    { id: "strong", name: "大音声", desc: "回復1.5倍", mods: { heal: ["mul", 1.5] } },
    { id: "fast", name: "絶えぬ叫び", desc: "0.5秒ごとに回復（1回は少し少ない）", mods: { cooldown: ["set", 0.5], heal: ["mul", 0.6] } },
    { id: "wide", name: "響く声", desc: "手下に届く範囲2倍", mods: { radius: ["mul", 2] } },
  ],
  sorc_hydra: [
    { id: "many", name: "多頭竜", desc: "置ける数 +2。1回の威力は少し下がる", mods: { maxTrapsBase: ["add", 2], damage: ["mul", 0.8] } },
    { id: "long", name: "長命の竜", desc: "いられる時間1.8倍", mods: { duration: ["mul", 1.8] } },
    { id: "rapid", name: "連射", desc: "吐く間隔0.65倍。1回の威力は少し下がる", mods: { fireInterval: ["mul", 0.65], damage: ["mul", 0.85] } },
  ],
  sorc_static: [
    { id: "wide", name: "雷雲", desc: "範囲1.4倍。威力は少し下がる", mods: { radius: ["mul", 1.4], damage: ["mul", 0.8] } },
    { id: "hot", name: "高電圧", desc: "威力1.5倍。範囲は少し狭い", mods: { damage: ["mul", 1.5], radius: ["mul", 0.8] } },
    { id: "leech", name: "吸電", desc: "与えたダメージの4%を回復", extra: { lifesteal: 4 } },
  ],
  sorc_warmth: [
    { id: "strong", name: "灼熱の心", desc: "回復1.5倍", mods: { heal: ["mul", 1.5] } },
    { id: "fast", name: "絶えぬ炎", desc: "0.5秒ごとに回復（1回は少し少ない）", mods: { cooldown: ["set", 0.5], heal: ["mul", 0.6] } },
    { id: "wide", name: "炉の輪", desc: "手下に届く範囲2倍", mods: { radius: ["mul", 2] } },
  ],
});
