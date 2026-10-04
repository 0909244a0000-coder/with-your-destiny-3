// 終わりのない試練（最後のボスを倒すと挑める）。段階に上限はなく、上がるほど敵が強く、ごほうびも良くなる。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.trial = {
  timeLimit: 180,          // 制限時間（秒）
  kills: 60,               // この数倒すと守護者が出る
  deathPenalty: 10,        // 倒れると減る残り時間（秒）
  powerBase: 3.5,          // 段階1の敵の強さ（地底界と同じくらい）
  powerGrowth: 1.13,       // 段階が1上がるごとに敵が何倍強くなるか
  itemLevelBase: 9,        // 段階1で落ちる装備のアイテムレベル
  itemLevelPerStage: 1,    // 段階が1上がるごとに足すアイテムレベル
  rarityBonus: 2,          // レアの出やすさ（倍）
  maxEnemies: 8,
  spawnInterval: 0.7,
  rewardItems: 3,          // 成功したときに追加でもらえる装備の数
  rewardMaterials: [20, 5],// 成功したときの素材：[基本, 段階ごとに足す数]
  rewardRarityPerStage: 0.1, // ごほうび装備のレアの出やすさが段階ごとに何割上がるか
  dropSpread: 30,          // ごほうび装備が散らばる広さ
  nextDelay: 3,            // 終わってから次の段階（またはふつうの冒険）へ移るまでの秒数
  guardians: ["ravana", "asuraKing", "mahisha", "archbishop", "iceDragon", "hellLord"], // 守護者（ボスの中から選ばれる）
  enemies: [               // 出てくる敵（全部のエリアから）
    { kind: "preta", weight: 10 }, { kind: "yaksha", weight: 10 }, { kind: "rakshasa", weight: 6 },
    { kind: "yakshaArcher", weight: 8 }, { kind: "vetala", weight: 10 }, { kind: "pishacha", weight: 10 },
    { kind: "bhuta", weight: 8 }, { kind: "naga", weight: 10 }, { kind: "daitya", weight: 10 }, { kind: "nagaCaster", weight: 8 },
    { kind: "fallenKnight", weight: 8 }, { kind: "shadowBeast", weight: 8 }, { kind: "wailingSpirit", weight: 8 }, { kind: "boneCleric", weight: 6 },
    { kind: "frostWraith", weight: 6 }, { kind: "iceGiant", weight: 4 }, { kind: "blizzardArcher", weight: 5 }, { kind: "frostWitch", weight: 4 },
    { kind: "fireImp", weight: 6 }, { kind: "lavaGolem", weight: 4 }, { kind: "hellArcher", weight: 5 }, { kind: "pyromancer", weight: 4 },
  ],
  // 見た目（地面）
  bgColor: "#1d1a24", grassColor: "#2c2838", stoneColor: "#4a4458", groundImage: "assets/areas/patala.png", sceneImage: "assets/areas/scenes/patala.webp",
  color: "#c08aff",        // 試練の文字の色
};
