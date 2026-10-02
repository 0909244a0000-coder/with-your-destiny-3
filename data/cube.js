// カナイの箱（Diablo 3 のしくみ）：ユニーク装備を箱に入れて分解すると、その固有能力を覚える。
// 覚えた能力は「武器・防具・指輪」の3つの枠に1つずつ入れられ、装備とは別に効く。
window.WYD = window.WYD || {};
WYD.data = WYD.data || {};

WYD.data.cube = {
  extractCost: 30,     // 分解して覚えるのに使う素材
  // 枠の名前（data/gems.js の slotGroup と同じ分け方：武器 / 頭・胴・手・足・盾・帯 / 指輪・首飾り）
  slots: { weapon: "武器の枠", armor: "防具の枠", jewelry: "装飾品の枠" },
  color: "#e8a84a",
};
