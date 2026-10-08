// 蒐集者：全職業の全スキルを魔導書から使う職業。スキルは複製せず、元の職業のデータそのもの（同じオブジェクト）を集める。
// 集める処理は src/classes.js の apply（全部のデータを読み込んだあと）。調べる道具・魔導書の画面は src/collector.js と src/grimoire.js。
window.WYD = window.WYD || {};
WYD.data.classes.collector = {
  name: "蒐集者",
  desc: "魔導書に全職業の技を集めた術者。好きな技を3つと、ルーンスキルを装着して戦う。検証モードでは枠の制限を外して、どの技が強さや不具合の原因かを調べられる",
  collect: true,   // 全職業のスキルを集める（src/classes.js）
  player: {
    className: "蒐集者", weaponName: "魔導書", color: "#4fb3a9",
    image: "assets/player_collector.png", imageFilter: null,
    poses: { attack: "assets/player_collector_attack.png" },
    preloadImages: ["assets/player_collector_attack.png", "assets/vfx/collectorRing.webp", "assets/vfx/collectorHit.webp"],
    base: { maxHp: 108, attack: 10, defense: 1.6, attackSpeed: 1.0, critChance: 6, hpRegen: 1.1, moveSpeed: 122 },
    perLevel: { maxHp: 13, attack: 2.1, defense: 0.8 },
    // 通常攻撃：魔導書からページの刃を飛ばす
    rangedAttack: { range: 250, keepDistance: 160, speed: 440, size: 5, color: "#ece6d2" },
  },
  skills: null,        // apply で全職業のスキルを入れる
  autoBuild: ["pup_thread", "nec_raise", "dru_wolves"],   // はじめは人形・骸骨・狼
  skillOrder: null,    // apply で職業の順に並べる
  skillIcons: null,
};

WYD.data.collector = {
  // 検証モード：枠の制限なし（data/skills.js の skillSlots の代わり）・レベルは1〜最大を自由に
  verifySlots: 99,
  presetSlots: 6, presetNameLength: 24,
  // 立ち位置：auto＝近くで使う技がONならその間合いまで寄る／near＝近接職と同じく殴れる距離まで寄る（＋nearPadding）／far＝いつも離れて撃つ
  nearPadding: 10,
  // 魔導書の左の一覧に出す職業の順（蒐集者自身は出さない）
  groups: ["barbarian", "sorceress", "necromancer", "paladin", "assassin", "druid", "bombmancer", "puppeteer"],
  // 専用の演出（紙の白・墨黒・青緑・白金）。墨黒を残すため、加算ではなくふつうに重ねる
  fx: {
    ring: { key: "collectorRing", size: 120, alpha: 0.75, minInterval: 0.35, maxAlive: 3 },   // 技の発動・召喚の目印
    hit: { key: "collectorHit", size: 54, alpha: 0.8, minInterval: 0.12, maxAlive: 5 },       // 命中の目印（元の火花の上に重ねる）
  },
  // 不発の理由（src/collector.js が数える）
  misfireNames: { cooldown: "再使用待ち", noTarget: "敵がいない", range: "射程外", hp: "HP条件を満たさない", summon: "召喚体がいない",
    full: "召喚が上限", puppetFull: "人形のHPが満タン", cost: "HPが足りない", form: "すでに変身中", other: "条件を満たさない" },
};

Object.assign(WYD.data.vfx.textures, { collectorRing: "assets/vfx/collectorRing.webp", collectorHit: "assets/vfx/collectorHit.webp" });
Object.assign(WYD.data.vfx.anim, {
  collectorRing: { duration: 0.6, size: 120, scaleFrom: 0.7, scaleTo: 1.05, spin: 0.9, additive: false },
  collectorHit: { duration: 0.32, size: 54, scaleFrom: 0.6, scaleTo: 1.1, spin: 0, additive: false },
});
WYD.data.vfx.hitByClass.collector = "hitSpark";
