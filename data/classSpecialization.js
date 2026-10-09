// 既存の技ID/しくみ/型/装備連動を保ち、職業ごとの戦い方を変える。
window.WYD = window.WYD || {};
WYD.data.classSpecialization = {
  maxTasks: 96, effectDuration: 0.35,
  skills: {
    whirl: { mode: "whirlwind", pulses: 3, interval: 0.35, hitScale: 0.55, note: "移動しながら3連撃。1撃は表示威力の55%。", desc: "移動しながら旋風を3回放ち、接近した敵を巻き込む。型と装備の効果は各連撃に乗る。" },
    agni: { mode: "charge", stopAt: 32, impactScale: 2, note: "敵へ突進し、表示の1回威力×2の衝撃＋焦土。", desc: "敵へ突進して地面を砕き、周囲へ衝撃を与える。着地点に焦土を残す。" },
    sorc_nova: { mode: "freeze", freeze: 1.2, bossScale: 0.3, note: "冷気命中で1.2秒凍結（ボスは30%）。", desc: "冷気の衝撃で周囲を凍らせる。接近した敵を止め、距離を取り直すための魔法。" },
    sorc_meteor: { mode: "meteor", impactScale: 3.5, note: "隕石の着弾時に表示の1回威力×3.5。その後に炎の地面。", desc: "敵の集まりを狙って隕石を落とす。落下中は避けられるが、着弾で大きな範囲ダメージを与え、その後に地面が燃える。" },
    nec_nova: { mode: "corpses", maxCorpses: 6, corpseLife: 12, consume: 3, range: 300, radiusScale: 0.8, damageScale: 1.5, allyScale: 0.8, note: "屍体を最大3つ爆破（各1.5倍）。屍体がなければ近くの骸骨から骨の嵐（0.8倍）。", desc: "屍体を最大3つ爆破する。屍体がない時は骸骨の周りに骨の嵐を起こす。骸骨もいなければ自分の周囲で発動する。" },
    sorc_static: { mode: "staticArc", range: 270, radius: 95, maxTargets: 3, note: "270以内の敵を起点に、周囲95以内へ最大3体に放電。1秒ごと。", desc: "敵を起点に静電気を放ち、そばにいる最大3体へ連続して雷を流す。遠距離から群れを削る。" },
    nec_decay: { mode: "minionAura", note: "本体と骸骨の周りで発動。同じ敵へのダメージは1回分。", desc: "自分と骸骨の周りから腐敗の気を放つ。骸骨が前線にいるほど、離れた敵にも届く。" },
    nec_spear: { mode: "pierce", widthRatio: 0.12, knockback: 0, note: "最寄りの敵に向かう直線上を貫通。当たる数が貫通上限。", desc: "骨の槍を一直線に放ち、並んだ敵を貫通する。敵から敵へ跳ね返らず、射線に並ぶほど強い。" },
    pal_zeal: { mode: "zeal", strikes: 3, interval: 0.16, hitScale: 0.6, note: "近い1体へ3連打。1撃は表示威力の60%。標的が倒れたら近い敵へ。", desc: "近い敵1体へ素早く3連打する。群れへの一斉攻撃より、硬い敵に張り付いて倒すための技。" },
    pal_hammer: { mode: "orbit", interval: 0.45, radiusRatio: 0.4, hitRadius: 50, hitScale: 0.8, angleStep: 1.5707963267948966, note: "光の鎚が自分の周囲を巡る。当たる数が周回の打撃回数。1撃80%。", desc: "光の鎚が自分と一緒に移動しながら周囲を巡る。敵へ跳ね返らず、近接し続けるほど複数回巻き込める。" },
    asn_blade: { mode: "ambush", range: 240, offset: 28, executeHp: 0.35, executeScale: 2, note: "240以内の敵へ急襲。HP35%以下の標的には威力2倍。", desc: "近い敵の背後へ飛び込み、周囲を切り裂く。HP35%以下の敵には威力2倍。素早く狙いを仕留める。" },
    asn_sentry: { mode: "executeTrap", executeHp: 0.35, executeScale: 2, note: "HP35%以下の敵には罠の射撃威力2倍。", desc: "敵を自動で撃つ罠。HP35%以下の敵への射撃は威力2倍となり、急襲後のとどめを任せられる。" },
    dru_tornado: { mode: "storm", range: 280, speed: 100, duration: 2.4, interval: 0.4, hitScale: 0.4, bearScale: 1.5, wolfSpeedScale: 1.6, note: "竜巻が前進し、0.4秒ごとに表示威力40%。熊は威力1.5倍、狼は速度1.6倍。", desc: "敵に向かって前進する竜巻を放つ。熊の姿では重く強い竜巻、狼の姿では速い竜巻になる。" },
    dru_boulder: { mode: "pierce", widthRatio: 0.18, knockback: 55, bossKnockbackScale: 0.1, bearScale: 1.6, note: "直線貫通＋押し返し55（ボスは10%）。熊の姿では威力1.6倍。", desc: "岩を一直線に転がし、射線上の敵を押し返す。熊の姿では威力1.6倍。獣の前線と自然魔法を組み合わせる。" },
    bomb_hunter: { mode: "markedHunter", note: "死の種を仕込まれた敵を優先して追う。", desc: "使い魔が死の種を仕込まれた敵を優先して追い、接触で爆発する。仕込み対象を倒し、時限爆弾の誘爆につなぐ。" },
    bomb_finale: { mode: "preparedFinale", perBomb: 0.05, maxBonusBombs: 8, note: "仕込んだ時限爆弾・地雷1個につき誘爆倍率+0.05（最大8個）。", desc: "仕込んだ時限爆弾と地雷を一斉起爆する。未起爆の仕込みが多いほど誘爆倍率が上がる。爆弾がない時は1体へ仕込んで即起爆。" },
  },
  classes: {
    barbarian: "旋風をまとって前進し、突進で群れへ飛び込む近接戦士。連撃・焦土・祖霊を組み合わせて接近戦を押し切る。",
    sorceress: "凍結で敵を止め、隕石の着弾と炎で群れを砕く魔術師。稲妻・ハイドラとの組み合わせで遠距離から戦う。",
    necromancer: "骸骨軍団で敵を倒し、残った屍体を爆破して次の群れを崩す。骨の槍は射線上を貫通する。",
    paladin: "オーラをまとい、連打と周回する鎚で前線を維持する聖騎士。敵へ張り付き、味方も支えて戦う。",
    assassin: "敵の背後へ急襲し、瀕死の標的を仕留める。罠も弱った敵への威力が上がり、設置と急襲を組み合わせる。",
    druid: "熊は重い岩と強い竜巻、狼は速い竜巻。変身で自然魔法の性質も変わる、獣と魔法の複合職。",
    bombmancer: "敵に死の種を仕込み、使い魔で誘爆を狙う。地雷も含む仕込みの数を増やしてから一斉起爆する爆弾使い。",
  },
};
for (const [id, text] of Object.entries(WYD.data.classSpecialization.classes)) WYD.data.classes[id].desc = text;
for (const [id, rule] of Object.entries(WYD.data.classSpecialization.skills)) {
  const def = WYD.data.skills[id] || Object.values(WYD.data.classes).map(c => c.skills && c.skills[id]).find(Boolean);
  if (def) def.desc = rule.desc;
}
// 新規の自動育成も、その職業の主力を体験する構成へ。既存のON/OFFは触らない。
WYD.data.autoBuild = ["whirl", "vajra", "agni"];
WYD.data.classes.sorceress.autoBuild = ["sorc_nova", "sorc_shield", "sorc_meteor"];
WYD.data.classes.paladin.autoBuild = ["pal_zeal", "pal_prayer", "pal_hammer"];
WYD.data.classes.assassin.autoBuild = ["asn_blade", "asn_cloak", "asn_sentry"];
WYD.data.classes.druid.autoBuild = ["dru_bear", "dru_tornado", "dru_wolves"];
// targetsの意味が変わる技は型の説明も更新。型IDと倍率は維持する。
for (const id of ["nec_spear", "dru_boulder"]) {
  const list = WYD.data.runes.skills[id];
  list.find(r => r.id === "multi").desc = "直線上の貫通数 +2。威力0.8倍";
  list.find(r => r.id === "heavy").desc = "貫通数 -1。威力1.6倍";
}
WYD.data.runes.skills.pal_hammer.find(r => r.id === "multi").desc = "周回の打撃回数 +2。1撃の威力0.8倍";
WYD.data.runes.skills.pal_hammer.find(r => r.id === "heavy").desc = "周回の打撃回数 -1。1撃の威力1.6倍";
