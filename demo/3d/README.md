# 3D 見た目のお試し（本編とは別）

本編（`index.html`）とは関係のない、判断材料のための試作ページです。本編のコードは使っていません。

- 開き方：`demo/3d/index.html`（ファイルを直接開くと読み込めません。GitHub Pages か、試し用アドレスで開く）
- 中身：骨入りの3Dキャラ（バーバリアン）と骸骨が、斜め見下ろしで自動で戦う。歩き・攻撃・被弾・死亡・出現のモーション、ヒットストップ・のけぞり・画面の揺れ・火花・斬撃の光・ダメージ数字。武器を4種類に差し替えられる
- 数値：`demo/3d/config.js`

## 使っているもの（ライセンス）
| もの | 入手元 | ライセンス |
|---|---|---|
| Three.js 0.186.1 | npm の `three` | MIT（`lib/three/LICENSE`） |
| キャラ・武器（Barbarian, sword_2handed など） | KayKit Character Pack : Adventurers 1.0（Kay Lousberg）<br>https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | CC0 1.0（`models/LICENSE-KayKit-Adventurers.txt`） |
| 骸骨・骸骨の剣 | KayKit Character Pack : Skeletons 1.0（Kay Lousberg）<br>https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0 | CC0 1.0（`models/LICENSE-KayKit-Skeletons.txt`） |

CC0 は「著作権を放棄」：商用・改変・再配布が自由で、クレジットもいらない（作者はクレジットを歓迎している）。
