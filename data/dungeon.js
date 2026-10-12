// 通常冒険を空間で見せる設定。戦闘・討伐数・抽選には補正しない。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};
WYD.data.dungeon = {
  sections: ['入口', '道中', '奥地'],
  moveSeconds: 1.1, quietMoveSeconds: 0.8,
  rewardSeconds: 3, quietRewardSeconds: 1.4, campSeconds: 0.8,
  walk: { x: 100, y: -60, padding: 70 },
  sceneZoom: 1.28, pan: { x: [0.08, 0.5, 0.92], y: [0.85, 0.5, 0.15] },
  introZoom: 0.06,
  props: { count: 12, size: 32, travelX: 125, travelY: 65, alpha: 0.7 },
  summary: { width: 570, top: 170, rowHeight: 23, font: 16, minShownPx: 11, maxItems: 6 },
  // 最初は森だけで検証し、同じしくみを他エリアへ展開する。
  areas: { forest: { kind: 'tree', color: '#334e35', light: '#79925b' } },
};
