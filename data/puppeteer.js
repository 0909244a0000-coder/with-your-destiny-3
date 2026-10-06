// 傀儡師：本体の命と防御を人形の攻防へ変える。調整値はこのファイルにまとめる。
window.WYD = window.WYD || {};
WYD.data.classes.puppeteer = {
  name: "傀儡師", desc: "本体の最大HPはほかの職業の約半分。最大HPと防御力で人形の攻撃・耐久を強化し、HPを使って命令する。",
  player: {
    className: "傀儡師", weaponName: "操糸具", color: "#c75c69", image: "assets/player_puppeteer.png", imageFilter: null,
    poses: { attack: "assets/player_puppeteer.png" }, preloadImages: ["assets/ally_puppet.png"],
    maxHpMult: 0.52,
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
    pup_finale: { kind:"puppet",mode:"finale",name:"終幕",desc:"人形を壊し、周囲の敵へ大きなダメージを与える。",startLevel:0,maxLevel:10,cooldown:15,hpCost:7,radius:140,damageBase:2.8,damagePerLevel:0.44,color:"#f0ad8b" },
  },
  autoBuild: ["pup_thread","pup_pierce","pup_stitch"],
  skillOrder: ["pup_thread","pup_swap","pup_guard","pup_stitch","pup_bind","pup_needles","pup_pierce","pup_cut","pup_finale"],
  skillIcons: Object.fromEntries(["thread","pierce","guard","needles","bind","swap","stitch","cut","finale"].map(k => ["pup_" + k, "assets/skills/pup_" + k + ".svg"])),
};
WYD.data.mastery.perLevel.puppet = { maxHp: 3, defense: 0.6 };
WYD.data.puppeteer = {
  puppet: { hpPerBodyHp: 2, hpPerDefense: 4, attackPerBodyAttack: 0.55, attackPerBodyHp: 0.16, attackPerDefense: 0.75,
    defensePerBodyDefense: 1, moveSpeed: 145, attackSpeed: 0.9, range: 28, radius: 14, followDistance: 58, firstAttackDelay: 0.35,
    color: "#9b8f86", visualScale:1.35, duration:3600, spawnSpread:38, hpRatio:1, defenseRatio:1, image: "assets/ally_puppet.png" },
  respawnCooldown: 6, summonCost: 4, lowHpReserve: 0.15, stitchRange:220,
};
// 3つの型：命の節約、早い指示、強い指示。コストと間隔も変化する。
for (const id of WYD.data.classes.puppeteer.skillOrder) {
  WYD.data.runes.skills[id] = [
    { id:"frugal", name:"節約の糸", desc:"HP消費0.7倍。再使用までの時間1.15倍。", mods:{hpCost:["mul",0.7],cooldown:["mul",1.15]} },
    { id:"swift", name:"速糸", desc:"再使用までの時間0.7倍。HP消費1.25倍。", mods:{cooldown:["mul",0.7],hpCost:["mul",1.25]} },
    { id:"deep", name:"深い契約", desc:"命令の効果1.3倍。HP消費1.35倍。", mods:{effectMult:["set",1.3],hpCost:["mul",1.35]} },
  ];
}
