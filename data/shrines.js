// 祠（ほこら）とパイロン（Diablo 2・3）。戦っているとときどき地面に出て、主人公が触ると、しばらく強い効果がつく。
// 効果（mods）… attackMult（攻撃力×）・attackSpeedMult（攻撃速度×）・moveSpeedMult（移動速度×）・defenseMult（防御力×）
//               regenPercent（毎秒、最大HPの何%回復）・magicFind（レア発見 +%）・expMult（経験値×）
//               conduit（雷：interval 秒ごとに、range の中の敵 targets 体へ 攻撃力×mult のダメージ）
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.shrines = {
  interval: [60, 100],   // 次の祠が出るまでの秒数（この間のどこか）
  firstDelay: 30,        // エリアに入ってから最初の祠までの秒数
  spawnDistance: [110, 220],   // 主人公からこの距離のどこかに出る
  lifetime: 40,          // 触らないと消えるまでの秒数
  detour: 140,           // いちばん近い敵よりこの距離ぶん遠くても、先に祠へ向かう
  touchRadius: 26,
  radius: 14,            // 祠の大きさ（表示）

  list: [
    { id: "power", name: "力の祠", desc: "攻撃力 1.8倍", duration: 30, weight: 25, color: "#ff5a4a",
      mods: { attackMult: 1.8 } },
    { id: "speed", name: "疾風の祠", desc: "攻撃速度と移動速度 1.5倍", duration: 30, weight: 25, color: "#7dffcf",
      mods: { attackSpeedMult: 1.5, moveSpeedMult: 1.5 } },
    { id: "conduit", name: "雷の祠", desc: "近くの敵に雷が落ち続ける", duration: 25, weight: 20, color: "#9ad0ff",
      mods: { conduit: { interval: 0.5, range: 260, targets: 3, mult: 0.8 } } },
    { id: "protection", name: "守りの祠", desc: "防御力 2倍、HPが毎秒3%回復", duration: 30, weight: 15, color: "#ffd75e",
      mods: { defenseMult: 2, regenPercent: 3 } },
    { id: "fortune", name: "幸運の祠", desc: "レア発見 +100%、経験値 1.5倍", duration: 40, weight: 15, color: "#e8a0ff",
      mods: { magicFind: 100, expMult: 1.5 } },
  ],
};
