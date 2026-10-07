// 裂け目（Path of Exile の Breach）。ふつうの冒険中に、ときどき近くに裂け目が開く。
// 開いているあいだ、異界の敵（弱めだが数が多い）が次々に出てくる。倒すと経験値が多く、装備もよく落とす。
// 時間が来ると閉じて、残った異界の敵は消え、倒した数に応じた宝箱（装備と素材）が出る。
// 試練の中とボスの間には出ない。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.breach = {
  firstDelay: 120,         // エリアに入ってから最初の裂け目までの秒数（目安）
  interval: [210, 300],    // 次の裂け目までの秒数（この間のどこか）
  duration: 20,            // 開いている秒数
  radius: 230,             // 裂け目の大きさ（この中に敵が出る）
  spawnDistance: [80, 160],   // 主人公からこの距離のどこかに開く
  spawnInterval: 0.3,      // 何秒ごとに異界の敵が出るか
  maxAlive: 20,            // 同時にいる異界の敵の数の上限
  hpMult: 0.55,            // 異界の敵のHP（ふつうの何倍か）
  attackMult: 0.7,         // 異界の敵の攻撃力
  expMult: 1.2,            // 異界の敵の経験値
  extraDropChance: 0.12,   // 異界の敵を倒したとき、追加で装備が落ちる確率
  imageFilter: "hue-rotate(250deg) saturate(1.6) brightness(1.1)",   // 異界の敵の色
  // 閉じたときの宝箱：装備 base + 倒した数 / perKills 個（max まで）、レアの出やすさ×rarityBonus、素材 倒した数×materialsPerKill
  chest: { base: 2, perKills: 15, max: 8, rarityBonus: 3, materialsPerKill: 2 },
  color: "#b07dff",
  // 見た目（絵は assets/vfx/）。portal＝真ん中の裂け目（透明の絵）、ring＝範囲のふちで回る輪（光を重ねる）
  //   portalHeight：裂け目の高さ　pulse：ゆらぎの大きさと速さ　ringAlpha・ringSpin：輪の濃さ・回る速さ
  //   openBurst・closeBurst：開いた／閉じたときの光の大きさ　spawnBurst：異界の敵が出てくるときの光の大きさ
  visual: { portalHeight: 120, pulse: 0.05, pulseSpeed: 3, ringAlpha: 0.75, ringSpin: 0.35, openBurst: 260, closeBurst: 420, spawnBurst: 70 },
};
Object.assign(WYD.data.vfx.textures, { breachPortal: "assets/vfx/breachPortal.webp", breachRing: "assets/vfx/breachRing.webp", breachBurst: "assets/vfx/breachBurst.webp" });
Object.assign(WYD.data.vfx.anim, { breachBurst: { duration: 0.6, size: 260, scaleFrom: 0.4, scaleTo: 1.15, spin: 0.4, additive: true } });
