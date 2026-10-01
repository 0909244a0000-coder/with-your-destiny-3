# assets（画像）

主人公・敵・ボス・地面・装備・スキルの絵を登録済みです。絵を置いて `data/` に場所を書くと、その絵で表示されます。
画像が読み込めないときは、自動で今の表示（丸や文字）に戻ります。

## 置き場所と書く場所

| 絵 | 置き場所（例） | 書く場所 |
|---|---|---|
| 主人公 | `assets/player.png` | `data/player.js` の `image` |
| 敵・ボス | `assets/enemies/preta.png` | `data/enemies.js` の各敵の `image` |
| エリアの地面 | `assets/areas/forest.png` | `data/areas.js` の各エリアの `groundImage` |
| スキルのアイコン | `assets/skills/whirl.png` | `data/skills.js` の `WYD.data.skillIcons` |
| 装備のアイコン | `assets/items/dual_blades.png` | `data/items.js` の `icons` |

書き方の例：

```js
// data/enemies.js
preta: { name: "餓鬼", image: "assets/enemies/preta.png", ... }

// data/skills.js
WYD.data.skillIcons = { whirl: "assets/skills/whirl.png", vajra: "assets/skills/vajra.png" };

// data/items.js
icons: { dual_blades: "assets/items/dual_blades.png", turban: "assets/items/turban.png" },
```

## 絵の決まり
- PNG、背景は透明（地面だけは透明なし・つなぎ目なしの模様）
- キャラ・敵：512×512px、真ん中に全体の約70%の大きさ。ゲームでは体の大きさ×4（`data/map.js` の `spriteScale`）の正方形に縮めて表示
- アイコン：256×256px
- 地面：512×512px、上下左右がつながる模様

## アイコンのシート
- `assets/sheets/equipment.png`：2048×2048px、4列×4行。最後の3マスは透明。
- `assets/sheets/skills.png`：1536×1024px、3列×2行。
- `tools/prepare_sprite.py` で個別PNGに切り出せます。順番・コマンドは `docs/ART.md` を参照。
