// 3Dデモの数値（本編とは別。見比べのための試作）
export const CONFIG = {
  camera: { fov: 30, offset: [0, 15, 13], follow: 7 },   // 斜め見下ろしのカメラ（主人公からのずれ）と追いかける速さ
  torch: { color: 0xffa860, intensity: 90, distance: 18, height: 5 }, // 主人公が持つ明かり
  fog: { color: 0x0b0a09, near: 12, far: 30 },

  player: {
    model: "models/Barbarian.glb",
    hp: 400, attack: [22, 34], speed: 3.2, reach: 1.6, cooldown: 0.25, regen: 6,
  },
  enemy: {
    model: "models/Skeleton_Warrior.glb",
    weapon: "models/weapons/Skeleton_Blade.gltf",
    hp: 140, attack: [8, 14], speed: 2.4, reach: 1.5, cooldown: 0.9,
    respawn: 2.2,   // 倒れてから次が出るまでの秒数
    tint: 0xffd0c0,
  },

  // 主人公の武器（モデルの中の武器を表示・非表示、または手の骨に別の武器モデルを付ける）
  weapons: {
    dual:   { label: "双斧", show: ["1H_Axe", "1H_Axe_Offhand"], idle: "Idle", run: "Running_A",
              attacks: ["Dualwield_Melee_Attack_Chop", "Dualwield_Melee_Attack_Slice", "Dualwield_Melee_Attack_Stab"], power: 1.0, speed: 1.15 },
    great:  { label: "両手斧", show: ["2H_Axe"], idle: "2H_Melee_Idle", run: "Running_B",
              attacks: ["2H_Melee_Attack_Chop", "2H_Melee_Attack_Slice", "2H_Melee_Attack_Spin"], power: 1.6, speed: 0.9 },
    shield: { label: "斧と盾", show: ["1H_Axe", "Barbarian_Round_Shield"], idle: "Idle", run: "Running_A",
              attacks: ["1H_Melee_Attack_Chop", "1H_Melee_Attack_Slice_Diagonal", "1H_Melee_Attack_Slice_Horizontal"], power: 1.1, speed: 1.0 },
    sword:  { label: "両手剣（別モデルを手に付ける）", attach: "models/weapons/sword_2handed.gltf", idle: "2H_Melee_Idle", run: "Running_B",
              attacks: ["2H_Melee_Attack_Slice", "2H_Melee_Attack_Stab", "2H_Melee_Attack_Chop"], power: 1.4, speed: 1.0 },
  },
  allWeaponMeshes: ["1H_Axe", "1H_Axe_Offhand", "2H_Axe", "Barbarian_Round_Shield", "Mug"],

  enemyAnims: { idle: "Idle_Combat", run: "Running_A", attacks: ["1H_Melee_Attack_Chop", "1H_Melee_Attack_Slice_Diagonal"],
                hit: "Hit_A", death: "Death_A", spawn: "Spawn_Ground_Skeletons" },
  playerAnims: { hit: "Hit_B", death: "Death_B" },

  // ---- キレを出す調整（画面の「キレの調整」で ON/OFF して比べられる） ----
  // 攻撃アニメの中で速さを変える：構えはそのまま → 振りは一気に速く → 戻りもやや速く
  attackCurve: [
    { until: 0.32, speed: 1.1 },   // 構え
    { until: 0.55, speed: 2.6 },   // 振り（ここで当たる）
    { until: 1.0,  speed: 1.7 },   // 戻り
  ],
  attackStart: 0.1,      // 攻撃アニメの頭（立ち姿からの動き出し）を飛ばす割合
  fadeIn: 0.04,          // 攻撃に入るときのつなぎの秒数（短いほどキビキビ）
  fadeOut: 0.12,
  lunge: 0.5,            // 振る瞬間の踏み込み（距離）
  trail: { length: 10, life: 0.12, color: 0xfff0d0, tip: 0.9 }, // 武器の軌跡（tip = 手から刃先までの距離）
  runAnimSpeed: 3.6,     // 走りアニメの足の速さ（移動の速さと合わせて、足のすべりを消す）
  oldFeel: { speed: 1, fade: 0.15 }, // 調整OFFのとき（最初の版と同じ）

  // 頭身を上げる実験：骨の大きさを変える（y = 骨の向きにのばす）
  proportions: { head: 0.62, upperLeg: 1.3, shin: 1.2 },

  hitAt: 0.45,           // 攻撃の何割のところで当たるか（調整OFFのとき）
  hitAtSharp: 0.5,       // 調整ONのとき（振りの終わりあたり）
  hitStop: 0.085,        // ヒットストップの秒数（会心は1.8倍）
  critChance: 0.2,
  knockback: 4.5,        // のけぞりで後ろにすべる速さ
  shake: 0.16,           // 画面の揺れの大きさ
  flash: 0.09,           // 当たったとき白く光る秒数
};
