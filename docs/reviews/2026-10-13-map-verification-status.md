# MAP改修の確認状況

全体自動検証：51/51成功。コードdef68b2、[GitHub Actions](https://github.com/0909244a0000-coder/with-your-destiny-3/actions/runs/38334761608)。以降は確認記録・画像だけの更新で、ゲーム処理は同じ。

## PCでの背景・ボス登場の目視

| エリア | 確認範囲 | 記録 |
| --- | --- | --- |
| マンダラの森 | 背景・前進・ボス・戦利品・帰還・再出発 | [MAP報告](2026-10-13-auto-forward-dungeon.md) |
| シュマシャーナ | 背景・阿修羅王・位置調整後の登場 | [火葬場](2026-10-13-smashana-screen.md) |
| パーターラ | 背景・水牛魔マヒシャの登場 | [地底界](2026-10-13-patala-screen.md) |
| 奈落の大聖堂 | 背景・堕天の大司教の登場 | [聖堂](2026-10-13-cathedral-screen.md) |
| 凍てつく深淵 | 背景・氷獄の竜王の登場 | [氷](2026-10-13-frost-screen.md) |
| 業火の玉座 | 背景・業火の魔王の登場 | [炎](2026-10-13-inferno-screen.md) |

クラウドChromeの検証専用セーブを使用。全6エリアの背景・ボス登場は一巡したが、森以外の全周回を目視したわけではない。全6エリアの進行・報酬・帰還は状態テストで検証済み。

## 残件

- 実機スマートフォン/Safariの操作・見え方。
- 通常育成装備での各エリアの戦闘テンポ。
- 数時間の描画を伴う連続実行、GPUメモリ、実機FPS（[Chromium描画を含む森5周](2026-10-13-dungeon-render-soak.md)と[描画なしの森100周](2026-10-13-dungeon-soak.md)は完了）。
- 森以外の道中・報酬の連続した目視確認。

P1の狩り目的表示や報酬バランス調整は今回の必須実装に含めない。mainは未マージ、PR #198はDraft。

[試用版](https://raw.githack.com/0909244a0000-coder/with-your-destiny-3/auto-forward-dungeon/index.html)
