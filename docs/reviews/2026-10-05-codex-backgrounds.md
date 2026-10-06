# 戦闘背景の改善：冒険している場所が伝わる景色

## 変更と根拠
旧描画は `src/render.js` の地面タイルの繰り返しが中心で、場所を示す構造物や進行方向が乏しかった。6エリアそれぞれに完成した景色を追加し、森の参道・火葬場の祠・蛇の遺跡・聖堂の祭壇・氷洞・溶岩の要塞が見えるようにした。

- 保存場所：`assets/areas/scenes/forest.webp`、`smashana.webp`、`patala.webp`、`cathedral.webp`、`frost.webp`、`inferno.webp`。最大1280×800以内、6枚合計1,389,814バイト（約1.39MB）。
- 中央を平らな低コントラストの戦闘用地面にし、構造物を外周へ配置。キャラ／敵／拾った装備の上へ背景を描かない。
- 比率を保って画面へ一枚で表示。階ごとに4通りの切り取り。画像未ロード・欠損なら元のタイル描画へ戻す。旧PNGは削除しない。
- 試練・日替わりは地下遺跡、地図は段階ごとに6景色を巡回、双王は溶岩の要塞。場所を示す絵を使い分ける。
- `data/map.js` に `scene` を追加：`dim` 未定義→0.12、`lightScale` 未定義→0.55、`views` 未定義→4通り。従来の `groundDim: 0.35`・キャラの暗さ・敵の性能・報酬は変更しない。新しい景色にだけ暗さを適用。
- 戦闘背景の絵に描かれた構造物は、新しい障害物判定ではない。探索マップや地形経路の作り直しは行っていない。

## 確認
```
node tools/background-check.js
node tools/combo-test.js
node tools/loot-safety-test.js
```
環境：Playwright＋配置済みChromium 153（この環境のみ `NODE_OPTIONS` でブラウザを指定）。

- 全6エリア×4階：画像読み込み成功、切り取り4種類、画像の範囲外への切り取りなし。
- 試練・地図・双王の画像参照成功。欠損時に旧地面へ戻る描画も成功。
- 300回×背景あり／旧地面の比較で、描画による戦闘乱数の消費0、プレイヤーの保存状態は不変。
- 1440×1000・390×844で画面の横はみ出しなし。森・聖堂・氷洞・玉座の実際の戦闘Canvasを確認。
- `combo-test.js`：6職業ok・errors 0。`loot-safety-test.js`：成功・errors 0。
- CPUの描画呼出し時間（100回平均を3回、ms/回）：背景0.084/0.054/0.070、旧地面10.054/0.066/0.060。最初の値には初期化等が入り、GPU完了まで測る方法ではないので、この数字をFPSや実機の軽さとして扱わない。
- 新しい動く粒子・常時アニメーションなし。実機iPhoneでのFPSと日本語フォントを含む実機画面は未確認。

## 制作
組み込み画像生成ツール（imagegenスキル）で6枚を一枚ずつ制作。元画像を残し、ゲーム用にPillowで縮小してWebP（quality83、method6）へ保存。新しいファイル名で追加し、旧画像を上書きしない。

## 生成指示

### forest

```text
Use case: stylized-concept. Asset: a full battle-environment background plate for a 2D dark fantasy auto-combat RPG, landscape 1536x960, intended to be shown at 960x600. Paint the Mandala Forest: an ancient jungle pilgrimage route to a ruined South Asian shrine, Indian/Tantric dark fantasy, worn stone steps and collapsed gateways at the extreme upper edge, gigantic twisting roots, mossy weathered reliefs, dark broad-leaf trees framing the extreme sides, sparse red cloth tied to a shrine, subtle warm lantern light. Crucial camera: high overhead 3/4 top-down orthographic, looking down at WALKABLE GROUND, absolutely NO sky, horizon, vanishing-point landscape, cinematic low-angle or first-person view. Crucial gameplay: central 85% of width and 80% of height is a broad uninterrupted flat mossy earth and ancient worn paving fighting area, quiet low-contrast texture, no tree trunks, pillars, walls, cliffs or furniture in the center; all large scenery hugs the outermost border and is partly cut off by the frame. A softly winding pilgrimage path crosses the open ground, suggesting onward travel. Dark painterly ARPG environment art, readable broad shapes, rich materials and atmosphere, subdued olive green and weathered gold, medium-dark rather than black, peripheral detail stronger than center. Not a repeating texture, one complete coherent location. No characters, enemies, loot, UI, captions, letters, logos, border or watermark.
```

### smashana

```text
Use case: stylized-concept. Asset: full battle-environment background plate for a 2D dark fantasy auto-combat RPG, landscape 1536x960, shown at 960x600. High overhead 3/4 top-down orthographic camera looking down at walkable ground. NO sky, horizon, vanishing point, cinematic landscape or first-person view. Central 85% width and 80% height: uninterrupted flat low-contrast fighting ground with no pillars, walls, cliffs or blocking objects. Large scenery only at outermost edges, partially cut off. One complete coherent location, NOT a repeating tile. Dark painterly ARPG art, broad readable shapes, subdued realistic materials, medium-dark not black. No people, enemies, loot, UI, text, logos, border or watermark. Scene: Smashana, an abandoned South Asian cremation ground beside ancient burial shrines. Ash-grey earth and weathered broad paving across the clear center, a faint old procession path. At the very top and extreme corners: squat cracked stone shrine doors, cremation platforms with ember remains and low smoke, charred logs, scattered urns and old red prayer cloth, stark bare trees and a crumbling boundary. Subdued rusty brown, charcoal and desaturated amber; restrained firelight on peripheral stone, no giant blazing flame or bright central symbol. Evoke a haunted place with a history, not gore. Match a Diablo-like painterly gameplay map with Indian/Tantric architecture, not a scenic horizon.
```

### patala

```text
Use case: stylized-concept. Asset: full battle-environment background plate for a 2D dark fantasy auto-combat RPG, landscape 1536x960, shown at 960x600. High overhead 3/4 top-down orthographic camera looking down at walkable ground. NO sky, horizon, vanishing point, cinematic landscape or first-person view. Central 85% width and 80% height: uninterrupted flat low-contrast fighting ground with no pillars, walls, cliffs or blocking objects. Large scenery only at outermost edges, partially cut off. One complete coherent location, NOT a repeating tile. Dark painterly ARPG art, broad readable shapes, subdued realistic materials, medium-dark not black. No people, enemies, loot, UI, text, logos, border or watermark. Scene: Patala, a lost subterranean naga sanctuary. An enormous ancient stone chamber with cool blue-grey and muted teal paving, softly curving engraved serpent patterns in the open central ground, subtle dust and cracks. Extreme upper edge: a worn monumental serpent gate opening into blackness, collapsed stone reliefs with two serpent shapes and sparse small teal lamps. Extreme side edges: half-collapsed South Asian columns, low rocky cavern shelves with sparse dim luminous mineral veins. Lower corners small rubble piles partly out of frame. Vast atmospheric cave depth suggested only at peripheral arches, never an abyss or raised platform in the walkable center. Moody underground journey, very restrained cyan luminescence, tarnished old gold, no large magic circle or bright center symbol. Medium-dark stone remains legible. Keep all central ground flat and visually quiet. Match overhead Diablo-like painted environment art with Indian mythological stone ruins.
```

### cathedral

```text
Use case: stylized-concept. Asset: full battle-environment background plate for a 2D dark fantasy auto-combat RPG, landscape 1536x960, shown at 960x600. High overhead 3/4 top-down orthographic camera looking down at walkable ground. NO sky, horizon, vanishing point, cinematic landscape or first-person view. Central 85% width and 80% height: uninterrupted flat low-contrast fighting ground with no pillars, walls, cliffs or blocking objects. Large scenery only at outermost edges, partially cut off. One complete coherent location, NOT a repeating tile. Dark painterly ARPG art, broad readable shapes, subdued realistic materials, medium-dark not black. No people, enemies, loot, UI, text, logos, border or watermark. Scene: Cathedral of the Abyss, a ruined western gothic sanctuary. The open central nave is one wide uninterrupted flat surface of cracked slate-grey and worn pale stone slabs, a very faint desaturated old geometric mosaic, no giant bright magic symbol. Extreme upper edge: shadowed ruined apse and old altar, broken pointed-arch doorway, sparse warm candle clusters at the border, deep plum-black recesses. Extreme left and right edges: partially cropped gothic column bases, collapsed low masonry and dark ruined stained-glass fragments, small heaps of rubble, cloth remnants. Foreground corners are partly cropped old stone foundations, not enclosing walls inside the central playfield. Gothic western medieval dark fantasy, not South Asian temple. Beautiful painterly ARPG texture, steel-grey and subdued mauve with restrained candle amber. Architectural details convey an abandoned cathedral and a dangerous destination; camera MUST remain high overhead and center must remain quiet open walkable stone.
```

### frost

```text
Use case: stylized-concept. Asset: full battle-environment background plate for a 2D dark fantasy auto-combat RPG, landscape 1536x960, shown at 960x600. High overhead 3/4 top-down orthographic camera looking down at walkable ground. NO sky, horizon, vanishing point, cinematic landscape or first-person view. Central 85% width and 80% height: uninterrupted flat low-contrast fighting ground with no pillars, walls, cliffs or blocking objects. Large scenery only at outermost edges, partially cut off. One complete coherent location, NOT a repeating tile. Dark painterly ARPG art, broad readable shapes, subdued realistic materials, medium-dark not black. No people, enemies, loot, UI, text, logos, border or watermark. Scene: Frozen Depths, a vast ancient ice cavern and ruined frozen passage. Wide flat dark blue-grey frozen stone ground in the center with patches of lightly frosted slate and faint translucent ice seams, NOT a chasm or narrow bridge. At extreme top edge: a small dark tunnel framed by jagged ancient frozen rock and thick icy stalactites, a few ruined frost-covered stone blocks. Extreme edges only: large faceted glacier walls, pale desaturated cyan ice formations and partly cropped snow-coated rocks. Soft distant cold light and a trace of frozen mist on the borders, crystal forms feel heavy and natural, NOT neon. Footpaths worn into the frosty ground imply a journey deeper into a glacial dungeon. Upper objects slightly cropped; no giant ice sculpture, no horizon, no sky. High overhead orthographic 3/4 camera and low-contrast open playable center. Dark painterly ARPG map, restrained navy slate, ice blue and silvery white, clear distinction from temple environments.
```

### inferno

```text
Use case: stylized-concept. Asset: full battle-environment background plate for a 2D dark fantasy auto-combat RPG, landscape 1536x960, shown at 960x600. High overhead 3/4 top-down orthographic camera looking down at walkable ground. NO sky, horizon, vanishing point, cinematic landscape or first-person view. Central 85% width and 80% height: uninterrupted flat low-contrast fighting ground with no pillars, walls, cliffs or blocking objects. Large scenery only at outermost edges, partially cut off. One complete coherent location, NOT a repeating tile. Dark painterly ARPG art, broad readable shapes, subdued realistic materials, medium-dark not black. No people, enemies, loot, UI, text, logos, border or watermark. Scene: Throne of Inferno, a tyrant's ruined fortress inside a volcanic cavern. Broad uninterrupted flat black basalt and muted ash-grey stone paving across the central battlefield, subtle low-contrast cracks and an old processional path toward the top. At the extreme top border: a jagged dark iron-and-basalt throne entrance, broken fortress steps, small sinister red-orange firelight, heavy weathered iron chains hanging ONLY near far walls. At extreme side edges and corners: natural lava fissures with restrained deep orange glow, black volcanic rocks, collapsed spiked stone columns and scattered cooled embers. Lava must remain on the border, not run through or surround a tiny central platform. No bright lava river in the fighting center, no giant blazing sun or magic circle, no characters or statues that could be mistaken for enemies. Deep charcoal, desaturated rust and controlled orange against grey ground. An unmistakable final dangerous destination with ruined architecture and molten cave edges, overhead orthographic 3/4 gameplay viewpoint, dark painterly Diablo-like ARPG environment.
```

## 試し用
https://raw.githack.com/0909244a0000-coder/with-your-destiny-3/codex/adventure-backgrounds-2026-10-05/index.html

前回の未マージPR #102の改善を含む。指定Claudeブランチ向け、マージはユーザーが行う。
