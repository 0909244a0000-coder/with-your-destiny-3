// 修練の第1弾：数値盤面とは別に、クラス技の戦い方を変える秘技を習得。
window.WYD=window.WYD||{};WYD.data=WYD.data||{};
WYD.data.training={
 cost:20, activeLimit:1, border:20, effectSize:90, cacheSize:38, cacheAlpha:.55,
 arts:[
  {id:'bar_vortex',classId:'barbarian',skill:'whirl',name:'引潮の旋風',mode:'pull',element:'shadow',radius:150,distance:35,desc:'旋風斬の発動時、150以内の通常敵を35だけ引き寄せる。ボスは動かさない。近接連撃へ敵を集める。'},
  {id:'bar_echo',classId:'barbarian',skill:'agni',name:'踏破の残響',mode:'area',element:'fire',radius:110,delay:.55,mult:.7,desc:'焦土への突進を始めた場所に、0.55秒後、攻撃力×0.7の衝撃を残す。後方の追手も巻き込む。'},
  {id:'sorc_frostchain',classId:'sorceress',skill:'sorc_nova',name:'氷晶の導線',mode:'chain',element:'ice',range:320,count:3,mult:.35,bind:.6,bossScale:.3,desc:'フロストノヴァ発動時、近い順に320以内の敵3体へ氷の線を飛ばす。各攻撃力×0.35、拘束0.6秒（ボス30%）。'},
  {id:'sorc_coldwake',classId:'sorceress',skill:'sorc_meteor',name:'星落ちの霜',mode:'pulses',element:'ice',radius:90,delay:.85,interval:.6,count:3,mult:.25,bind:.35,bossScale:.3,desc:'隕石を狙った場所に0.85秒後から0.6秒間隔で3回の冷気。各攻撃力×0.25、拘束0.35秒（ボス30%）。落下後もその場所を守る。'},
  {id:'nec_cache',classId:'necromancer',skill:'nec_raise',name:'墓標の軍勢',mode:'corpses',element:'poison',count:2,spread:55,desc:'骸骨召喚が成功するたび本人の両側に骨塚を2個残す。骨塚は屍爆の材料になる。保持数と寿命は既存の屍体と共通。'},
  {id:'nec_fork',classId:'necromancer',skill:'nec_spear',name:'分岐する骨脈',mode:'fork',element:'poison',range:160,count:2,mult:.45,desc:'骨の槍の標的付近160以内にいる別の敵2体へ骨脈を伸ばす。各攻撃力×0.45。直線から外れた敵を拾う。'},
  {id:'pal_counter',classId:'paladin',skill:'pal_prayer',name:'慈悲の反鐘',mode:'area',element:'holy',radius:150,delay:.25,mult:.6,cooldown:8,desc:'祈りで回復したとき、0.25秒後に周囲150へ攻撃力×0.6の反撃。秘技は8秒間隔。回復を前線維持の攻撃につなげる。'},
  {id:'pal_reverse',classId:'paladin',skill:'pal_hammer',name:'双環の聖鎚',mode:'reverseOrbit',element:'holy',mult:.5,desc:'祝福の鎚に逆向きの周回を追加する。追加の1撃は元の50%。両方向の鎚で自分の周囲を守る。'},
  {id:'asn_echo',classId:'assassin',skill:'asn_blade',name:'置き去りの影',mode:'area',element:'shadow',radius:85,delay:.45,mult:.5,bind:.5,bossScale:.3,desc:'刃の舞で飛び込む前の場所に影を残す。0.45秒後、周囲85へ攻撃力×0.5と0.5秒拘束（ボス30%）。追手を遅らせる。'},
  {id:'asn_trip',classId:'assassin',skill:'asn_sentry',name:'退路の導火線',mode:'midpoint',element:'lightning',radius:75,delay:.9,mult:.65,desc:'稲妻の歩哨を設置すると本人と標的の中間にも導火線を残す。0.9秒後、周囲75へ攻撃力×0.65。追加攻撃にも対人の罠補正が乗る。'},
  {id:'dru_twins',classId:'druid',skill:'dru_tornado',name:'双頭の嵐',mode:'twinStorm',element:'ice',angle:.38,mult:.7,desc:'竜巻を左右に分かれる2本へ変える。各竜巻の1撃は元の70%。正面の集中を弱め、広い進路を覆う。'},
  {id:'dru_pack',classId:'druid',skill:'dru_howl',name:'群れの返歌',mode:'healFriend',element:'holy',radius:180,healPercent:6,desc:'野生の咆哮の発動時、180以内で最も傷ついた味方1体へ最大HPの6%を回復。本人・召喚・3対3の味方が対象。通常の対人回復補正を適用。'},
  {id:'bomb_twins',classId:'bombmancer',skill:'bomb_hunter',name:'双葬の使い魔',mode:'twinHunter',element:'fire',mult:.65,offset:24,desc:'追葬の使い魔を左右に2体出す。各爆発は元の65%。同じ爆弾保持上限を使い、標的が倒れたらそれぞれ追い直す。'},
  {id:'bomb_reprise',classId:'bombmancer',skill:'bomb_finale',name:'終幕の余韻',mode:'targetArea',element:'shadow',radius:105,delay:1.1,mult:.8,desc:'終幕の指鳴らしで狙った地点に1.1秒後、攻撃力×0.8の残響爆発。移動した敵は避けられる。'},
 ]
};
