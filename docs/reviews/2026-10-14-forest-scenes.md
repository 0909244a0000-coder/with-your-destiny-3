# 森の進行区間に新しい背景3枚を追加

PR #198をユーザーの指示でmainへマージした後、最新main（304e76b）から制作。組み込みimagegenを使用。旧画像は上書きせず保持。

| 区間 | 画像 | 内容 | 容量 |
| --- | --- | --- | --- |
| 入口 | assets/areas/scenes/forest-entry.webp | 木の門柱・明るい土の林道 | 625,170 bytes |
| 道中 | assets/areas/scenes/forest-road.webp | 沢沿い・深い森・石の祠 | 513,262 bytes |
| 奥地・ボス | assets/areas/scenes/forest-ruins.webp | 石畳・曼荼羅・遺跡の門 | 656,250 bytes |

全画像1536×1024、RGB WebP quality88/method6、合計約1.71MiB。生成PNGの元ファイルを保持し、プロジェクト用画像だけをWebPへ変換。中央に戦闘スペースを確保し、既存のタントラ系の森の画風に合わせた。

通常の森では各階の入口→道中→奥地に対応して画像を切り替え、前進中に滑らかにクロスフェードする。既存の背景パン・歩行・階層別切り取りを併用。ボス部屋では遺跡を使用。3枚はキャッシュで先読みし、読込前は既存の背景へ代替する。仮の図形の木・道の描画は新しい画像表示に置き換えた。

他5エリア・試練・対人・DPS・戦闘数値・ドロップ・セーブ形式は変更しない。森の全3階には同じ3枚を再利用するため、9地点をすべて別画像にした実装ではない。

生成指示全文：

## 画像1

Use case: stylized-concept. Asset type: production background artwork for WYD3 dark fantasy auto-combat game. Landscape 1536x1024 or similar 3:2. Detailed painterly pre-rendered isometric 3/4 elevated top-down environment, consistent with old Diablo-like game terrain and Indian/Tibetan tantric ruined forest shrines. NOT a first-person landscape: NO sky, NO distant horizon, NO extreme vanishing-point perspective. The entire frame is walkable terrain viewed obliquely from above, a spacious 65% central/lower clearing for moving small game characters and readable item labels. Natural textured ground, moss, roots and weathered stone, deep but readable greens and aged bronze accents. Decorative trees and structures mostly along the edges and upper corners, never dense obstructions in the center. Subtle soft directional light and real depth shadows, gorgeous game environment painting, varied irregular organic composition. No characters, no enemies, no items, no interface, no text, no border, no grid. Scene 1 FOREST ENTRANCE: an inviting yet ominous forest entrance trail opens into a mossy clearing. Weathered small gate pillars near the lower outer corners, small red prayer ribbons, large ancient trees at left/right margins, a fallen log at upper left. Sparse sunny canopy rays, damp brown earthen path meandering gently from lower center to upper right. Recognizably the entry, mostly natural woodland, very little temple masonry. Render ONE complete scene, not a collage or triptych.

## 画像2

Use case: stylized-concept. Asset type: production background artwork for WYD3 dark fantasy auto-combat game. Landscape 1536x1024 or similar 3:2. Detailed painterly pre-rendered isometric 3/4 elevated top-down environment, consistent with old Diablo-like game terrain and Indian/Tibetan tantric ruined forest shrines. NOT a first-person landscape: NO sky, NO distant horizon, NO extreme vanishing-point perspective. The entire frame is walkable terrain viewed obliquely from above, a spacious 65% central/lower clearing for moving small game characters and readable item labels. Natural textured ground, moss, roots and weathered stone, deep but readable greens and aged bronze accents. Decorative trees and structures mostly along the edges and upper corners, never dense obstructions in the center. Subtle soft directional light and real depth shadows, gorgeous game environment painting, varied irregular organic composition. No characters, no enemies, no items, no interface, no text, no border, no grid. Scene 2 DEEP FOREST ROAD: a shadowy fern grove farther inside the same sacred forest. Dense gnarled trees frame left and right, blue-green forest mist near the top edges, a shallow creek follows the far left edge, stepping stones and roots at margins. Wide open mossy gravel-earth central trail bends gently toward upper left. A broken small stone shrine at upper right with a faint amber lamp and faded red ribbon. Much denser and cooler than the entrance while retaining clear combat ground. Render ONE complete scene, not a collage or triptych.

## 画像3

Use case: stylized-concept. Asset type: production background artwork for WYD3 dark fantasy auto-combat game. Landscape 1536x1024 or similar 3:2. Detailed painterly pre-rendered isometric 3/4 elevated top-down environment, consistent with old Diablo-like game terrain and Indian/Tibetan tantric ruined forest shrines. NOT a first-person landscape: NO sky, NO distant horizon, NO extreme vanishing-point perspective. The entire frame is walkable terrain viewed obliquely from above, a spacious 65% central/lower clearing for moving small game characters and readable item labels. Natural textured ground, moss, roots and weathered stone, deep but readable greens and aged bronze accents. Decorative trees and structures mostly along the edges and upper corners, never dense obstructions in the center. Subtle soft directional light and real depth shadows, gorgeous game environment painting, varied irregular organic composition. No characters, no enemies, no items, no interface, no text, no border, no grid. Scene 3 INNER FOREST RUINS: the forest road reaches a clearly distinct ancient tantric shrine courtyard. Broad broken flagstone floor occupies the central 65%, roots pushing through cracks. A ruined ornate Indian stone gateway across the upper edge, weathered relief statues and small brass braziers with amber flame at left/right upper margins, dark red torn banners, surrounding giant jungle roots. Ominous golden-green light, worn mandala carving on the floor offset from center. No huge altar obstructing the combat clearing. Render ONE complete scene, not a collage or triptych.

## 検証結果

コード962ce52で全51テストと描画を含む森5周に成功。[Actions](https://github.com/0909244a0000-coder/with-your-destiny-3/actions/runs/38451923125)。5ボス・死亡0・12,442描画・pageerror 0・所持ID重複なし。PCクラウドChromeではLv4〜5の通常戦闘で道中→奥地の遺跡→次階の入口を目視した。390px/横画面は自動ブラウザテストで検証し、実機スマホ/Safariは未確認。
