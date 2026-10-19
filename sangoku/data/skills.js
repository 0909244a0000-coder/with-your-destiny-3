// 天下三分：武将の特技（マス戦闘で効く）。数値と、だれが持つか
var SG = typeof SG !== 'undefined' ? SG : {};
SG.data = SG.data || {};
SG.data.skills = {
  list: {
    charge: { name: '突撃', text: '騎兵の突撃がさらに強い', chargeMul: 1.5 },
    archer: { name: '神弓', text: '弓の損害が大きい', bowMul: 1.5 },
    wall: { name: '鉄壁', text: '受ける損害が少ない', guardMul: 1.33 },
    fire: { name: '火神', text: '火計が決まりやすく、よく燃える', fireAdd: 0.2, fireMul: 1.5 },
    insight: { name: '看破', text: '火計を見破りやすい', fireResist: 0.3 },
    hero: { name: '勇将', text: '一騎打ちで武力+10', duelWar: 10 },
    swift: { name: '神速', text: '移動+1', move: 1 },
    fame: { name: '名声', text: '反撃が強い', counterMul: 1.5 },
  },
  // 特技を持つ武将（空白区切り）。史書・演義の人物像から
  owners: {
    charge: '孫堅 呂布 張飛 馬超 孫策 許褚 文醜 顔良 龐徳 甘寧 魏延',
    archer: '黄忠 夏侯淵 太史慈 呂布 孫策',
    wall: '華雄 曹仁 高順 張遼 于禁 満寵 文聘 張郃 厳顔 臧覇',
    fire: '周瑜 陸遜 諸葛亮 龐統 呂蒙 陳宮',
    insight: '李儒 司馬懿 賈詡 郭嘉 荀攸 程昱 法正 田豊 沮授 徐庶 諸葛亮',
    hero: '関羽 張飛 趙雲 典韋 許褚 呂布 馬超 太史慈 周泰 甘寧',
    swift: '夏侯淵 張遼 甘寧 馬超 趙雲',
    fame: '孫堅 劉備 曹操 孫権 袁紹 孫策 劉表',
  },
};
// 武将名 → 特技の一覧
SG.data.skills.of = {};
for (const [k, names] of Object.entries(SG.data.skills.owners)) for (const n of names.split(' ')) (SG.data.skills.of[n] = SG.data.skills.of[n] || []).push(k);
