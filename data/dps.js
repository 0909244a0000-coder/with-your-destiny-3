// 拠点の訓練標的。実際の敵/装備/成長数値とは独立。
window.WYD=window.WYD||{};WYD.data=WYD.data||{};
WYD.data.dps={
 durations:[30,60,120], counts:[1,3,5], hpRatios:[1,.5,.2], playerHpRatios:[1,.5,.3], speeds:[1,4], step:.05, maxFrameDelta:.1, refreshSeconds:.2,
 maxDefense:1e12, minHp:1e9, hpAttackScale:1e7, loadTimeoutMs:15000,
 playerPos:{x:380,y:320}, targetPos:{x:530,y:320}, spacing:38,
 dummy:{name:'訓練標的',color:'#b9a474',radius:18,hp:1e9,attack:0,defense:0,moveSpeed:0,attackSpeed:0,range:0,exp:0,dropChance:0,rarityBonus:1},
 visual:{width:50,height:60,wood:'#57432c',edge:'#ad8e58',target:'#d7bb76',hit:'#f0d17b',font:16,minFont:11}
};
