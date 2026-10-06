// 独立した第4枠：ランダム抽選と奈落での部分再抽選。装備ソケットとは無関係。
window.WYD = window.WYD || {}; WYD.data = WYD.data || {};
WYD.data.runeSkills = {
  capacity: 24, starterDraws: 1, drawEssence: 3, drawStones: 1, rerollStones: 1, discardEssence: 1,
  essenceName: 'ルーンの欠片', stoneName: '奈落の変質石', uberStoneChance: 0.45, uberStoneCount: 1,
  legacyRuneValues: [1, 2, 3, 4, 5, 6, 8, 10, 14, 20, 30, 45], retiredRarities: ['normal', 'rare'], replacementRarity: 'magic',
  cooldown: 6, duration: 2.4, tick: 0.6, attackMult: 1.2, repeatedHitMult: 0.32,
  speed: 340, range: 460, radius: 80, orbitRadius: 76, beamWidth: 24, chainCount: 4, chainRange: 160,
  splitCount: 2, splitRange: 130, splitMult: 0.4, pullDistance: 28, bindTime: 0.65, bossBindMult: 0.3,
  healPercent: 2, drainPercent: 10, dotMult: 0.18, dotDuration: 1.8, delayedTime: 0.8, delayedMult: 0.5,
  maxObjects: 64, maxHits: 12, previewSeconds: 3, previewFps: 20,
  elements: [
    { id:'fire', name:'火炎', color:'#ff914a', texture:'fireball', desc:'命中後に炎の追撃' },
    { id:'ice', name:'冷気', color:'#8ee6ff', texture:'frostRing', desc:'命中した敵を短時間拘束' },
    { id:'lightning', name:'雷', color:'#b7b5ff', texture:'lightning', desc:'近くの別の敵へ小さな追撃' },
    { id:'poison', name:'毒', color:'#9dcc69', texture:'plague', desc:'命中後に持続ダメージ' },
    { id:'shadow', name:'影', color:'#c697ff', texture:'shadowWisp', desc:'実際に奪ったHPの一部を吸収' },
    { id:'holy', name:'聖', color:'#ffe6a0', texture:'holyWisp', desc:'命中時に本人を回復' },
  ],
  shapes: [
    { id:'seeker', name:'追尾弾', desc:'近くの敵へ飛ぶ追尾弾' },
    { id:'orbit', name:'周回刃', desc:'本人の周囲を回り、近くの敵に繰り返し命中' },
    { id:'chain', name:'連鎖', desc:'近接した別の敵へ渡る連鎖攻撃' },
    { id:'field', name:'設置陣', desc:'狙った場所に残り、範囲内を繰り返し攻撃' },
    { id:'beam', name:'貫通波', desc:'狙った方向へ進み、直線上の敵を貫く' },
  ],
  traits: [
    { id:'split', name:'分裂', desc:'命中時、近くの別の敵にも小さな攻撃' },
    { id:'pull', name:'引き寄せ', desc:'命中した敵を発動位置へ引き寄せる（ボス除く）' },
    { id:'delay', name:'遅延爆発', desc:'命中位置で少し後に小さな爆発' },
    { id:'heal', name:'回復', desc:'命中時、近くの傷ついた味方1人を回復' },
    { id:'bind', name:'拘束', desc:'命中した敵を短時間拘束' },
  ],
  keys: { element:'属性', shape:'動き', trait:'追加効果' },
  // 描画だけの値。戦闘のradius/speed/duration等とは別。
  visual: {
    columns: 3, rows: 2,
    cells: { seeker: 0, orbit: 1, chain: 2, field: 3, beam: 4, impact: 5 },
    flipCells: ['seeker'],
    textures: { fire:'runeFire', ice:'runeIce', lightning:'runeLightning', poison:'runePoison', shadow:'runeShadow', holy:'runeHoly' },
    sizes: { seeker: 60, orbit: 54, beam: 112, beamHeight: 46, field: 170, dot: 38, impact: 66, trait: 54 },
    alpha: { seeker: .85, orbit: .8, beam: .8, field: .65, dot: .4, impact: .85, trait: .6 },
    orbitCount: 3, orbitSpeed: 4, orbitFlatten: .65,
    pulseSpeed: 5, pulseAmount: .045, fadeSeconds: .3,
    linkDuration: .32, linkWidth: 32, impactDuration: .38, traitDuration: .6,
    trailLength: 42, trailAlpha: .3, trailScale: .8,
    fieldAnchor: .65, iconSize: 44,
  },
};

for (const [id,key] of Object.entries(WYD.data.runeSkills.visual.textures)) WYD.data.vfx.textures[key] = 'assets/vfx/rune-'+id+'Atlas.webp';
