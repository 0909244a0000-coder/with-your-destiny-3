// 傀儡師：本体の命と防御を人形の攻防へ変える。調整値はこのファイルにまとめる。
window.WYD = window.WYD || {};
WYD.data.classes.puppeteer = {
  name: "傀儡師", desc: "本体の最大HPはほかの職業の約6割。最大HPと防御力で人形の攻撃・耐久を強化し、HPを使って命令する。",
  player: {
    className: "傀儡師", weaponName: "操糸具", color: "#c75c69", image: "assets/player_puppeteer.png", imageFilter: null,
    poses: { attack: "assets/player_puppeteer_attack.png" }, preloadImages: ["assets/ally_puppet.png", "assets/ally_puppet_attack.png"],
    maxHpMult: 0.6,
    base: { maxHp: 110, attack: 8, defense: 2, attackSpeed: 0.85, critChance: 5, hpRegen: 1.2, moveSpeed: 120 },
    perLevel: { maxHp: 14, attack: 1.75, defense: 0.9 },
    rangedAttack: { range: 240, keepDistance: 170, speed: 370, size: 4, color: "#c75c69" },
  },
  skills: {
    pup_thread: { kind:"puppet", mode:"thread", name:"命の糸", desc:"本体のHPを使って人形を修復。人形がいなければ召喚する。", startLevel:1,maxLevel:10,cooldown:5,hpCost:4,repairBase:0.25,repairPerLevel:0.025,color:"#d47078" },
    pup_pierce: { kind:"puppet", mode:"pierce", name:"鉄杭の突撃", desc:"人形を敵へ突進させ、周囲の敵も貫く。",startLevel:1,maxLevel:10,cooldown:4,hpCost:3,range:260,radius:36,damageBase:1.8,damagePerLevel:0.28,color:"#e0a8a0" },
    pup_guard: { kind:"puppet", mode:"guard", name:"守りの傀儡",desc:"人形が近くの敵を引きつけ、しばらく防御力を上げる。",startLevel:0,maxLevel:10,cooldown:12,hpCost:4,duration:5,range:180,defenseMult:1.7,color:"#d0b18b" },
    pup_needles: { kind:"puppet",mode:"needles",name:"針の雨",desc:"人形の周囲にいる敵をまとめて刺す。",startLevel:0,maxLevel:10,cooldown:6,hpCost:5,radius:130,damageBase:1.35,damagePerLevel:0.2,color:"#bca0b9" },
    pup_bind: { kind:"puppet",mode:"bind",name:"絡め糸",desc:"人形の周囲の敵を縛る。ボスへの拘束は短い。",startLevel:0,maxLevel:10,cooldown:10,hpCost:4,radius:120,bindBase:1.5,bindPerLevel:0.15,bossBindMult:0.3,damageBase:0.8,damagePerLevel:0.12,color:"#be6f7e" },
    pup_swap: { kind:"puppet",mode:"swap",name:"身代わり縫い",desc:"本体のHPが減ると少し回復し、本体と人形の防御力を上げる。",startLevel:0,maxLevel:10,cooldown:12,hpCost:2,triggerHpPercent:55,duration:4,defenseMult:0.6,puppetDefenseMult:1.5,healPercentBase:10,healPercentPerLevel:1,color:"#e1b791" },
    pup_stitch: { kind:"puppet",mode:"stitch",name:"血の縫合",desc:"一定時間、人形の攻撃が当たると本体のHPを回復する。",startLevel:0,maxLevel:10,cooldown:13,hpCost:3,duration:6,healPercentBase:1.8,healPercentPerLevel:0.14,healInterval:0.8,color:"#d26771" },
    pup_cut: { kind:"puppet",mode:"cut",name:"赤糸の裁断",desc:"本体のHPを大きく使い、人形で敵を強く切り裂く。",startLevel:0,maxLevel:10,cooldown:8,hpCost:9,range:260,damageBase:3.2,damagePerLevel:0.48,color:"#ff6680" },
    pup_finale: { kind:"puppet",mode:"finale",name:"終幕",desc:"人形のHPが40%以下のとき、人形を壊して周囲の敵へ大きなダメージを与える。",startLevel:0,maxLevel:10,cooldown:15,hpCost:7,triggerPuppetHpPercent:40,radius:140,damageBase:2.8,damagePerLevel:0.44,color:"#f0ad8b" },
  },
  autoBuild: ["pup_thread","pup_pierce","pup_stitch"],
  skillOrder: ["pup_thread","pup_swap","pup_guard","pup_stitch","pup_bind","pup_needles","pup_pierce","pup_cut","pup_finale"],
  skillIcons: Object.fromEntries(["thread","pierce","guard","needles","bind","swap","stitch","cut","finale"].map(k => ["pup_" + k, "assets/skills/pup_" + k + ".png"])),
};
WYD.data.mastery.perLevel.puppet = { maxHp: 3, defense: 0.6 };
WYD.data.puppeteer = {
  puppet: { hpPerBodyHp: 2, hpPerDefense: 4, attackPerBodyAttack: 0.55, attackPerBodyHp: 0.16, attackPerDefense: 0.75,
    defensePerBodyDefense: 1, moveSpeed: 145, attackSpeed: 0.9, range: 28, radius: 14, followDistance: 58, firstAttackDelay: 0.35,
    color: "#9b8f86", visualScale:1.35, duration:3600, spawnSpread:38, hpRatio:1, defenseRatio:1, image: "assets/ally_puppet.png", poses: { attack: "assets/ally_puppet_attack.png" } },
  respawnCooldown: 6, summonCost: 4, lowHpReserve: 0.15, stitchRange:220,
  // 冒険（PvE）用と対人（アリーナ・PvP）用の人形。上の puppet を土台に、倍率と規則だけを変える。
  //   hpMult/attackMult/defenseMult … 人形の能力の倍率　costMult … 命令で払う本体HPの倍率
  //   lowHpReserve … 命令で本体HPをこれ未満にしない　summonHpReserve … 人形を呼ぶときはこれ未満にしない（人形なしで立ち往生しないよう低め）　respawnCooldown … 壊れてから呼び直せるまでの秒数
  //   guardSharePercent … 本体が受けるダメージのうち人形が肩代わりする割合（藁の心臓と大きいほうを使う）
  //   PvP だけ：damageTakenScale/hitHpCap/windowHpCap … 人形が受けるダメージの規則（data/arena.js の combat と同じ意味。
  //   ふつうの召喚は summonDamageScale などで脆いが、傀儡師の人形は本体と同じ主戦力なので別にする）
  modes: {
    pve: { hpMult: 1, attackMult: 1.2, defenseMult: 1, costMult: 1, lowHpReserve: 0.2, summonHpReserve: 0.15, respawnCooldown: 6, guardSharePercent: 20 },
    pvp: { hpMult: 1, attackMult: 1.3, defenseMult: 1, costMult: 0.75, lowHpReserve: 0.2, summonHpReserve: 0.15, respawnCooldown: 6, guardSharePercent: 45,
           damageTakenScale: 0.25, hitHpCap: 0.2, windowHpCap: 0.3 },
  },
  effects: {
    thread:{key:"puppetThread",size:104}, guard:{key:"puppetThread",size:116}, swap:{key:"puppetThread",size:92}, stitch:{key:"puppetThread",size:88},
    pierce:{key:"puppetSlash",size:100},cut:{key:"puppetSlash",size:126},needles:{key:"puppetBind",size:140},bind:{key:"puppetBind",size:130},finale:{key:"puppetBurst",size:170},
  },
};
// 3つの型：命の節約、早い指示、強い指示。コストと間隔も変化する。
for (const id of WYD.data.classes.puppeteer.skillOrder) {
  WYD.data.runes.skills[id] = [
    { id:"frugal", name:"節約の糸", desc:"HP消費0.7倍。再使用までの時間1.15倍。", mods:{hpCost:["mul",0.7],cooldown:["mul",1.15]} },
    { id:"swift", name:"速糸", desc:"再使用までの時間0.7倍。HP消費1.1倍。", mods:{cooldown:["mul",0.7],hpCost:["mul",1.1]} },
    { id:"deep", name:"深い契約", desc:"命令の効果1.3倍。HP消費1.15倍。", mods:{effectMult:["set",1.3],hpCost:["mul",1.15]} },
  ];
}

// 職業固有の光。値はほかのエフェクトと同じくデータ側で調整する。
Object.assign(WYD.data.vfx.textures, {
  puppetThread:"assets/vfx/puppetThread.png", puppetSlash:"assets/vfx/puppetSlash.png",
  puppetBind:"assets/vfx/puppetBind.png", puppetBurst:"assets/vfx/puppetBurst.png",
});
Object.assign(WYD.data.vfx.anim, {
  puppetThread:{duration:0.45,size:104,scaleFrom:0.65,scaleTo:1.1,spin:0.8,additive:true},
  puppetSlash:{duration:0.25,size:100,scaleFrom:0.75,scaleTo:1.2,spin:0,additive:true},
  puppetBind:{duration:0.55,size:130,scaleFrom:0.65,scaleTo:1.15,spin:0.6,additive:true},
  puppetBurst:{duration:0.55,size:170,scaleFrom:0.6,scaleTo:1.3,spin:0,additive:true},
});
WYD.data.vfx.castProfiles.puppet = { key:"puppetThread",size:85,duration:0.45,from:0.6,to:1.0,alpha:0.6,flatten:0.8,rise:8 };
WYD.data.vfx.hitByClass.puppeteer = "puppetSlash";
for (const id of ["pup_pierce","pup_cut"]) WYD.data.vfx.hitBySkill[id] = "puppetSlash";
for (const id of ["pup_bind","pup_needles"]) WYD.data.vfx.hitBySkill[id] = "puppetBind";
WYD.data.vfx.hitBySkill.pup_finale = "puppetBurst";

// ---------- 傀儡師専用のユニーク・セット（すべて新規の固有能力） ----------
// どれも「HPを払って人形を動かす」という職業の軸に、違う向きの答えを出す。
//   無貌座の衣装（セット）… HPを削るほど人形が強い（攻め）
//   幕引きの裁ち鋏      … 人形を壊しては呼び直す（終幕の回転）
//   満ちる糸巻き        … 人形を満タンに保つほど命令が安い（節約）
//   藁の心臓            … 人形を盾にして本体を守る（守り）
// 数値の意味は src/puppeteer.js の power 名の処理を参照。
WYD.data.uniques.list.push(
  { id: "curtainShears", home: "smashana", name: "幕引きの裁ち鋏", base: "dual_blades", weight: 10, classOnly: "puppeteer",
    stats: { attack: [4, 8], maxHp: [15, 30] }, power: "puppetCurtainCall",
    desc: "人形が壊れるたび（終幕を含む）、本体のHPを最大HPの{healPercent}%回復し、人形を呼び直せるまでの時間が{respawnSeconds}秒になる",
    params: { healPercent: 12, respawnSeconds: 2 } },
  { id: "fullSpool", home: "cathedral", name: "満ちる糸巻き", base: "bracelet", weight: 10, classOnly: "puppeteer",
    stats: { defense: [3, 6], maxHp: [15, 30] }, power: "puppetSpareThread",
    desc: "人形のHPが{threshold}%以上のとき、命令で使う本体のHPが{costPercent}%に減る",
    params: { threshold: 90, costPercent: 50 } },
  { id: "strawHeart", home: "frost", name: "藁の心臓", base: "amulet", weight: 10, classOnly: "puppeteer",
    stats: { maxHp: [20, 40], defense: [3, 6] }, power: "puppetScapegoat",
    desc: "人形がいる間、本体が受けるダメージの{sharePercent}%を人形が代わりに受ける",
    params: { sharePercent: 35 } },
);
WYD.data.sets.list.push({
  // 傀儡師でだけ落ちる
  id: "facelessTroupe", home: "patala", name: "無貌座の衣装", classOnly: "puppeteer",
  pieces: [
    { id: "troupe_rod", name: "無貌座の操り棒", base: "staff", stats: { attack: [4, 8], skillDamage: [8, 14] } },
    { id: "troupe_mask", name: "無貌座の仮面", base: "crown", stats: { maxHp: [25, 45] } },
    { id: "troupe_coat", name: "無貌座の燕尾服", base: "chainmail", stats: { defense: [5, 9] } },
    { id: "troupe_ring", name: "無貌座の指輪", base: "ring", stats: { defense: [3, 6] } },
  ],
  bonuses: {
    2: { stats: { maxHp: 60, defense: 10 } },
    4: { power: "puppetDesperation", params: { perPercent: 1.5, maxPercent: 90 },
         desc: "本体のHPが減っているほど人形の攻撃力が上がる（失ったHP1%ごとに+{perPercent}%、最大+{maxPercent}%）" },
  },
});
// 共通セットの4点ボーナスは他の職業の技（旋風斬・鉄の皮膚・連鎖の投げ斧）に結びついていて、傀儡師では発動しなかった。
// 傀儡師のときだけ、同じ方向性（守り・雷・炎）の人形向けの効果に差し替える（2点ボーナスはそのまま）。
const pupSetBonuses = {
  undying: { 4: { effects: { killHeal: 5 }, power: "puppetIronSkin", params: { percent: 50 },
                  desc: "人形の最大HPと防御力 +{percent}%" } },
  thunderlord: { 4: { stats: { skillDamage: 25 }, power: "puppetStormThread", params: { extraTargets: 3, damagePercent: 50, range: 160, color: "#9fd8ff" },
                      desc: "人形の攻撃の命令が当たると、近くの別の敵{extraTargets}体へ雷が跳ね、命令の{damagePercent}%のダメージ" } },
  pyre: { 4: { effects: { critDamage: 40 }, power: "puppetPyreTrail", params: { radius: 90, duration: 3, tick: 0.5, mult: 0.35, color: "#ff7a2a" },
               desc: "鉄杭の突撃・赤糸の裁断の着地点が{duration}秒燃え、{tick}秒ごとに人形の攻撃力×{mult}倍で焼く" } },
};
for (const set of WYD.data.sets.list) if (pupSetBonuses[set.id]) (set.classBonuses ||= {}).puppeteer = pupSetBonuses[set.id];
// 共通ユニークも同じ理由で発動しないものがあるので、傀儡師のときの固有能力を差し替える（classPowers）。
//   不壊の指輪・鎖の王冠は、身代わり縫い（本体の強化）・絡め糸（拘束）で元から発動するので、説明だけ直す。
const pupUniquePowers = {
  agniBangle: { power: "puppetEmberStrike", params: { chance: 25, radius: 70, mult: 0.6, color: "#ff7a2a" },
                desc: "人形の通常攻撃が当たると{chance}%の確率で燃え上がり、周り{radius}に人形の攻撃力×{mult}倍のダメージ" },
  vishnuDisc: { power: "puppetLongSpike", params: { rangePercent: 40, radiusPercent: 60, damagePercent: 30 },
                desc: "鉄杭の突撃の届く距離 +{rangePercent}%、貫く範囲 +{radiusPercent}%、威力 +{damagePercent}%" },
  hanumanFists: { power: "puppetCleave", params: { radius: 60, mult: 0.45 },
                  desc: "人形の通常攻撃が、周り{radius}の敵にも人形の攻撃力×{mult}倍で当たる" },
  indraRing: { desc: "身代わり縫いの発動中、受けたダメージの {percent}% を相手に返す" },
  nagaCrown: { desc: "絡め糸で縛られた敵が倒れると爆発し、周り{radius}に攻撃力×{mult}倍のダメージ" },
};
for (const u of WYD.data.uniques.list) if (pupUniquePowers[u.id]) (u.classPowers ||= {}).puppeteer = pupUniquePowers[u.id];
// 星座も同じ：巨獣は身代わり縫いで発動するので説明だけ、嵐の王は人形の雷（雷帝の装いの4点と同じ能力。重ねては効かない）
for (const c of WYD.data.devotion.list) {
  if (c.id === "behemoth") (c.bonus.classPowers ||= {}).puppeteer = { desc: "身代わり縫いの発動中、受けたダメージの {percent}% を相手に返す" };
  if (c.id === "storm") (c.bonus.classPowers ||= {}).puppeteer = { power: "puppetStormThread", params: { extraTargets: 3, damagePercent: 50, range: 160, color: "#9fd8ff" },
    desc: "人形の攻撃の命令が当たると、近くの別の敵{extraTargets}体へ雷が跳ね、命令の{damagePercent}%のダメージ" };
}
WYD.data.results.labels["effect:puppetEmberStrike"] = { name: "劫火の腕輪", group: "装備効果", color: "#ff7a2a" };
WYD.data.results.labels["effect:puppetCleave"] = { name: "狂王の籠手", group: "装備効果", color: "#e8c46a" };
WYD.data.results.labels["effect:puppetStormThread"] = { name: "雷帝の装い", group: "装備効果", color: "#9fd8ff" };
WYD.data.results.labels["effect:puppetPyreTrail"] = { name: "業火の遺産", group: "装備効果", color: "#ff7a2a" };
WYD.data.results.labels["effect:puppetCurtainCall"] = { name: "幕引きの裁ち鋏", group: "装備効果", color: "#e8c46a" };
