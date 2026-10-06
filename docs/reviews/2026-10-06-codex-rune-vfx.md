# ルーンスキルの絵・演出更新（2026-10-06 Codex）

## 変更と根拠
- 6属性×5動きの30種と属性別着弾6種を専用画像に置換。色だけでなく、火炎/氷片/雷の枝/毒の滴/影煙/聖光の材質で分ける。追尾弾は尾を引き、周回刃は3枚が回転、連鎖は実際の両端を結び、設置は立体的な噴出、貫通波は細長い槍状。30種一覧と390pxの工房・実3対3を目視。
- 分裂は属性別の枝、遅延爆発は同属性の着弾、回復は既存の聖域絵、拘束は鎖、引き寄せは内向きの弧。工房のカード/プレビューと戦闘第4枠も同じ絵を使用。150枚の別画像ではなく、30種の本体＋追加効果で150組合せを表現する。
- 追加の短時間絵はworld.effects（上限140）に保存し、攻撃オブジェクトruneEffects（上限64）を消費しない。死亡/移動など既存clearで専用短時間絵も消す。控えめ設定を適用し、画像未読込時は色の楕円へ。
- 抽選/素材/威力/範囲/CD/対人補正/保存形式は変更なし。描画サイズ・濃さ・尾・接地位置はdata/runeSkills.js.visualに集約。描画だけでは能力・状態を書き換えない。新描画は乱数を呼ばないが、既存の視覚上限と乱数消費の関係から戦闘全体の固定乱数経過の完全一致は保証しない。

## 測定
この環境のChromium用起動補助をNODE_OPTIONSで指定。製品側にブラウザ起動設定の変更はない。
```
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/rune-vfx-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/rune-skills-test.js
NODE_OPTIONS=--require=/tmp/wyd-playwright-preload.cjs node tools/arena-team-test.js
git diff --check
```
- rune-vfx-test：150組合せの発動/更新/描画/工房プレビュー、全36セルの384px切り出しと境界、有限座標、描画前後の状態・能力不変、視覚上限と攻撃上限の分離、clear、控えめ、6カード画像読込を確認。390pxで横はみ出しなし、ボタン高さ48px以上。異なる6属性を装着した実3対3で専用着弾と連鎖、元セーブ不変、例外0を確認。
- rune-skills-test：150組合せ、抽選/再抽選/未確定/移行/バックアップ/対人集計/上限/390px成功、例外0。
- arena-team-test：3編成×3試合。決着秒数36.45/41.35/33.05/37.90/31.85/34.85/41.20/31.65/32.80。支援範囲/所有者/味方攻撃なし/保存分離/編成/390px成功。
- 実機iPhoneのFPSは未測定。公開試遊URLはこの環境ではCloudflare制限があるため、ローカルブラウザで機能を検証。画像ロード後の確認であり低速回線の実時間は未測定。

## 画像制作
組み込み画像生成で6枚を別々に制作。黒背景、transparent_background=false、加算合成。原本1536×1024→1152×768 RGB WebP、quality88/method6。3列×2行の6セルで、時系列アニメーションではない。セルを自動トリミングせず位置を維持。追尾弾は尾の向きを進行方向へ合わせるため描画時に左右反転。旧画像は保存。合計661,884バイト。
全生成指示：

### fire
原本：`exec-d19bb278-212d-4de4-a861-a2b06679fb6f.png`。組み込み先：`assets/vfx/rune-fireAtlas.webp`。

```text
Create ONE production game VFX texture atlas for a single elemental rune skill family: orange and deep crimson fire, molten charcoal and sparks. Landscape canvas in 3:2 aspect, exactly THREE columns and TWO rows, SIX equally sized square cells, all separate and centered. Reading left to right then top to bottom: 1 a compact projectile orb with a short comet tail pointing RIGHT; 2 a curved sharp crescent energy blade pointing RIGHT, for an orbiting blade; 3 a thin horizontal branching energy tether from LEFT to RIGHT, middle core bright and end points readable; 4 a three-dimensional grounded area eruption with low elliptical footprint and rising wisps/shards, hollow dark center; 5 a long pointed horizontal piercing energy wave flowing from LEFT to RIGHT, like a sharp lance with layered wake; 6 a small volumetric impact burst, no full ring. EACH cell must have 14% pure BLACK margins, black gutters and edges, artwork contained independently, NO separator lines, no overlap between cells. Distinct silhouettes of six applications, visually coherent ONE material family. Gritty painterly Western dark fantasy ARPG, 3/4 overhead view for orb/blade/field/impact; tether and lance are horizontal strips centered inside square cell. Strong occlusion and shaded volume, restrained bright accents; no scenery, characters, objects, letters, icons, runes, glyphs, labels, frames, watermark. Pure black background throughout for additive compositing. Readable at 50-160 pixels.
```

### ice
原本：`exec-8b77816b-7238-4e8c-8384-25915309d327.png`。組み込み先：`assets/vfx/rune-iceAtlas.webp`。

```text
Create ONE production game VFX texture atlas for a single elemental rune skill family: cyan-white crystalline ice, translucent blue shards and cold mist. Landscape canvas in 3:2 aspect, exactly THREE columns and TWO rows, SIX equally sized square cells, all separate and centered. Reading left to right then top to bottom: 1 a compact projectile orb with a short comet tail pointing RIGHT; 2 a curved sharp crescent energy blade pointing RIGHT, for an orbiting blade; 3 a thin horizontal branching energy tether from LEFT to RIGHT, middle core bright and end points readable; 4 a three-dimensional grounded area eruption with low elliptical footprint and rising wisps/shards, hollow dark center; 5 a long pointed horizontal piercing energy wave flowing from LEFT to RIGHT, like a sharp lance with layered wake; 6 a small volumetric impact burst, no full ring. EACH cell must have 14% pure BLACK margins, black gutters and edges, artwork contained independently, NO separator lines, no overlap between cells. Distinct silhouettes of six applications, visually coherent ONE material family. Gritty painterly Western dark fantasy ARPG, 3/4 overhead view for orb/blade/field/impact; tether and lance are horizontal strips centered inside square cell. Strong occlusion and shaded volume, restrained bright accents; no scenery, characters, objects, letters, icons, runes, glyphs, labels, frames, watermark. Pure black background throughout for additive compositing. Readable at 50-160 pixels.
```

### lightning
原本：`exec-f78d394a-45a9-4568-ac47-485e4a7de47f.png`。組み込み先：`assets/vfx/rune-lightningAtlas.webp`。

```text
Create ONE production game VFX texture atlas for a single elemental rune skill family: violet-white lightning, jagged branching electric filaments, no fire. Landscape canvas in 3:2 aspect, exactly THREE columns and TWO rows, SIX equally sized square cells, all separate and centered. Reading left to right then top to bottom: 1 a compact projectile orb with a short comet tail pointing RIGHT; 2 a curved sharp crescent energy blade pointing RIGHT, for an orbiting blade; 3 a thin horizontal branching energy tether from LEFT to RIGHT, middle core bright and end points readable; 4 a three-dimensional grounded area eruption with low elliptical footprint and rising wisps/shards, hollow dark center; 5 a long pointed horizontal piercing energy wave flowing from LEFT to RIGHT, like a sharp lance with layered wake; 6 a small volumetric impact burst, no full ring. EACH cell must have 14% pure BLACK margins, black gutters and edges, artwork contained independently, NO separator lines, no overlap between cells. Distinct silhouettes of six applications, visually coherent ONE material family. Gritty painterly Western dark fantasy ARPG, 3/4 overhead view for orb/blade/field/impact; tether and lance are horizontal strips centered inside square cell. Strong occlusion and shaded volume, restrained bright accents; no scenery, characters, objects, letters, icons, runes, glyphs, labels, frames, watermark. Pure black background throughout for additive compositing. Readable at 50-160 pixels.
```

### poison
原本：`exec-cd6bf38a-ded3-44b9-96a2-9ca3052126c5.png`。組み込み先：`assets/vfx/rune-poisonAtlas.webp`。

```text
Create ONE production game VFX texture atlas for a single elemental rune skill family: acid-green toxic vapor, dark viscous droplets and thorn-like wisps. Landscape canvas in 3:2 aspect, exactly THREE columns and TWO rows, SIX equally sized square cells, all separate and centered. Reading left to right then top to bottom: 1 a compact projectile orb with a short comet tail pointing RIGHT; 2 a curved sharp crescent energy blade pointing RIGHT, for an orbiting blade; 3 a thin horizontal branching energy tether from LEFT to RIGHT, middle core bright and end points readable; 4 a three-dimensional grounded area eruption with low elliptical footprint and rising wisps/shards, hollow dark center; 5 a long pointed horizontal piercing energy wave flowing from LEFT to RIGHT, like a sharp lance with layered wake; 6 a small volumetric impact burst, no full ring. EACH cell must have 14% pure BLACK margins, black gutters and edges, artwork contained independently, NO separator lines, no overlap between cells. Distinct silhouettes of six applications, visually coherent ONE material family. Gritty painterly Western dark fantasy ARPG, 3/4 overhead view for orb/blade/field/impact; tether and lance are horizontal strips centered inside square cell. Strong occlusion and shaded volume, restrained bright accents; no scenery, characters, objects, letters, icons, runes, glyphs, labels, frames, watermark. Pure black background throughout for additive compositing. Readable at 50-160 pixels.
```

### shadow
原本：`exec-b379fb0e-ce7b-4dfa-b5c3-796b4618a0ad.png`。組み込み先：`assets/vfx/rune-shadowAtlas.webp`。

```text
Create ONE production game VFX texture atlas for a single elemental rune skill family: amethyst-black shadow smoke, narrow violet edges and ghostly dark fragments. Landscape canvas in 3:2 aspect, exactly THREE columns and TWO rows, SIX equally sized square cells, all separate and centered. Reading left to right then top to bottom: 1 a compact projectile orb with a short comet tail pointing RIGHT; 2 a curved sharp crescent energy blade pointing RIGHT, for an orbiting blade; 3 a thin horizontal branching energy tether from LEFT to RIGHT, middle core bright and end points readable; 4 a three-dimensional grounded area eruption with low elliptical footprint and rising wisps/shards, hollow dark center; 5 a long pointed horizontal piercing energy wave flowing from LEFT to RIGHT, like a sharp lance with layered wake; 6 a small volumetric impact burst, no full ring. EACH cell must have 14% pure BLACK margins, black gutters and edges, artwork contained independently, NO separator lines, no overlap between cells. Distinct silhouettes of six applications, visually coherent ONE material family. Gritty painterly Western dark fantasy ARPG, 3/4 overhead view for orb/blade/field/impact; tether and lance are horizontal strips centered inside square cell. Strong occlusion and shaded volume, restrained bright accents; no scenery, characters, objects, letters, icons, runes, glyphs, labels, frames, watermark. Pure black background throughout for additive compositing. Readable at 50-160 pixels.
```

### holy
原本：`exec-0d59fd93-8bfc-4ec3-a966-b99d658d20b2.png`。組み込み先：`assets/vfx/rune-holyAtlas.webp`。

```text
Create ONE production game VFX texture atlas for a single elemental rune skill family: ivory and antique gold divine light, gold flecks and warm vertical rays. Landscape canvas in 3:2 aspect, exactly THREE columns and TWO rows, SIX equally sized square cells, all separate and centered. Reading left to right then top to bottom: 1 a compact projectile orb with a short comet tail pointing RIGHT; 2 a curved sharp crescent energy blade pointing RIGHT, for an orbiting blade; 3 a thin horizontal branching energy tether from LEFT to RIGHT, middle core bright and end points readable; 4 a three-dimensional grounded area eruption with low elliptical footprint and rising wisps/shards, hollow dark center; 5 a long pointed horizontal piercing energy wave flowing from LEFT to RIGHT, like a sharp lance with layered wake; 6 a small volumetric impact burst, no full ring. EACH cell must have 14% pure BLACK margins, black gutters and edges, artwork contained independently, NO separator lines, no overlap between cells. Distinct silhouettes of six applications, visually coherent ONE material family. Gritty painterly Western dark fantasy ARPG, 3/4 overhead view for orb/blade/field/impact; tether and lance are horizontal strips centered inside square cell. Strong occlusion and shaded volume, restrained bright accents; no scenery, characters, objects, letters, icons, runes, glyphs, labels, frames, watermark. Pure black background throughout for additive compositing. Readable at 50-160 pixels.
```
