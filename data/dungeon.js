// 通常冒険を空間で見せる設定。戦闘・討伐数・抽選には補正しない。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};
WYD.data.dungeon = {
  sections: ['入口', '道中', '奥地'],
  moveSeconds: 1.1, quietMoveSeconds: 0.8,
  rewardSeconds: 3, quietRewardSeconds: 1.4, campSeconds: 0.8,
  walk: { x: 100, y: -60, padding: 70 },
  sceneZoom: 1.28, pan: { x: [0.08, 0.5, 0.92], y: [0.85, 0.5, 0.15] },
  introZoom: 0.06, panStrength: 0.7,
  front: { columns: 3, rows: 5, spreadX: 24, spreadY: 28 },
  props: { count: 12, size: 32, travelX: 125, travelY: 65, alpha: 0.7 },
  summary: { width: 570, top: 170, padding: 16, rowHeight: 23, font: 16, minShownPx: 11, maxItems: 6,
    pauseY: 40, stoppedY: 70, resumeY: 96 },
  // 森の縦切り検証後、戦闘コードを複製せず設定だけで展開。
  areas: {
    forest: { kind: 'tree', color: '#334e35', light: '#79925b' },
    smashana: { kind: 'grave', color: '#514840', light: '#987963' },
    patala: { kind: 'crystal', color: '#42436d', light: '#9b88cb' },
    cathedral: { kind: 'column', color: '#44404a', light: '#9a8876' },
    frost: { kind: 'ice', color: '#365467', light: '#91bfca' },
    inferno: { kind: 'lava', color: '#793728', light: '#d0793a' },
  },
};
