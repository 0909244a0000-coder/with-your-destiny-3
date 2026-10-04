// 戦闘リザルトの表示・集計用設定。戦闘の強さは変えない。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};
WYD.data.results = {
  recentSeconds: 10,
  refreshMs: 400,
  compactAfter: 256,
  labels: {
    attack: { name: "通常攻撃", group: "通常", color: "#d8b45c" },
    "effect:thunder": { name: "雷鳴", group: "装備効果", color: "#8fcaff" },
    "effect:thorns": { name: "反射（茨・不壊）", group: "装備効果", color: "#c5a1ed" },
    "effect:hasteCleave": { name: "狂王の籠手・追撃", group: "固有能力", color: "#f2a18d" },
    "effect:whirlFire": { name: "劫火の腕輪・炎", group: "固有能力", color: "#ffa570" },
    "effect:bindExplode": { name: "鎖の王冠・爆発", group: "固有能力", color: "#bda0f0" },
    "effect:killNova": { name: "屍爆の印章・爆発", group: "固有能力", color: "#bda0f0" },
    "effect:summon": { name: "装備による召喚", group: "召喚", color: "#a5d9b0" },
    "effect:lifesteal": { name: "吸血", group: "回復", color: "#83d8a7" },
    "effect:killHeal": { name: "血の饗宴", group: "回復", color: "#83d8a7" },
    "regen": { name: "HP自然回復（加護込み）", group: "回復", color: "#83d8a7" },
    "shrine:conduit": { name: "雷の祠", group: "祠", color: "#8fcaff" },
  },
};
