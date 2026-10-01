# 絵の決まりと発注リスト

絵を作る人（人でもAIでも）は、まずこれを読んでください。

## 世界観
- **敵・ボス・エリア（地面）**：タントラの世界。チベットのタンカ画やインドの細密画の画風で、金の飾りと赤い布がある
- **主人公・装備・スキル**：ディアブロと同じ西洋のダークファンタジー。鉄・革・毛皮・古い鋼の質感。**インド風・タントラ風にしない**

## 形式
| 種類 | 大きさ | 背景 | 置き場所 |
|---|---|---|---|
| 主人公・敵・ボス | 512px 以上の正方形（ゲームに入れるときは `prepare_sprite.py` で余白なしの256pxに） | 透明 | `assets/player.png`、`assets/enemies/<id>.png` |
| アイコン（装備・スキル） | シート1枚にまとめる（下を参照） | 透明か無地の黒。**枠や飾りは入れない** | 切り取って `assets/items/<id>.png`、`assets/skills/<id>.png` |
| 地面 | 512×512、上下左右がつながる模様 | あり | `assets/areas/<id>.png` |

- 視点：斜め上から見下ろす 3/4 ビュー、正面（画面の下）を向く
- ゲームでの表示はとても小さい（キャラは30〜140px、アイコンは26〜48px）。細かい描き込みより、形と色ではっきり見分けられることを優先
- 絵の主な色は、下の表の「色」に合わせる（遊ぶ人が敵を見分けられるように）
- もらった絵は `tools/prepare_sprite.py` で切り取り・縮小してから入れる（使い方はファイルの先頭）
- 絵の場所を `data/` に書く方法は `assets/README.md`

## 受け取り済み（ゲームに入っている）
羅刹王ラーヴァナ（`ravana`）、阿修羅王（`asuraKing`）、羅刹（`rakshasa`）、夜叉（`yaksha`）、餓鬼（`preta`）、ナーガ（`naga`）

追加済み（このPR）：
- 主人公：バーバリアン（`assets/player.png`）
- 地面：`forest`、`smashana`、`patala`
- 装備アイコン13個、スキルアイコン6個
- 敵・ボス：`mahisha`、`vetala`、`pishacha`、`daitya`、`yakshaArcher`、`bhuta`、`nagaCaster`
- 切り出し用の透過シート：`assets/sheets/equipment.png`（2048×2048、4×4）、`assets/sheets/skills.png`（1536×1024、3×2）

保管中：杖を持った女性の術者（将来の職業の候補。ダークエルフ・アークメイジなど）

## まだの絵（上から順に優先）

この発注リストにある絵はすべて制作・登録済み。追加の発注はまだありません。

## 制作済みの仕様・再制作用プロンプト

以下は今回制作した絵の仕様です。再制作のために元のプロンプトとIDを残しています。

### 1. 主人公：バーバリアン（`assets/player.png`、差し色 #4fa3ff）
```
A battle-scarred barbarian warrior hero, muscular, wild dark hair, short beard, wearing fur mantle, iron pauldrons and leather straps, dual-wielding two broad steel swords, determined ready stance. Accent color steel blue (#4fa3ff) on cloth or gem so the hero stands out from the red-and-gold enemies.

Western dark fantasy action-RPG hero sprite in the style of Diablo: gritty, painterly, iron, leather, fur and worn steel, muted colors (iron grey, dark red, dull gold). Must NOT look Indian or tantric. 3/4 top-down view, facing the viewer, full body, single character on a fully transparent background, bold readable silhouette, no text, no frame, no ground shadow.
```

### 2. 地面（3枚）
共通の指定（各プロンプトのあとにつける）：
```
Seamless tileable top-down ground texture, 512x512, low contrast and slightly dark so characters stand out on top, no objects that break the tiling, no text. Painted in the style of Tibetan thangka art, dark fantasy mood.
```
| id | エリア | プロンプト |
|---|---|---|
| `forest` | マンダラの森 | Mossy jungle floor with dark green grass, scattered leaves and faint mandala-like patterns in the soil. Main tone dark green (#2b3a2a). |
| `smashana` | シュマシャーナ（火葬場） | Cremation ground floor: ash-grey and burnt-brown earth, scattered embers, charcoal and small bone fragments. Main tone dark ash brown (#3a2c26). |
| `patala` | パーターラ（地底界） | Underworld stone floor: dark blue-violet carved stone tiles with serpent-scale patterns and faint glowing cracks. Main tone deep indigo (#232a3a). |

### 3. アイコンのシート（2枚）
共通の指定：
```
Western dark fantasy game item icons in the style of Diablo, painterly, worn steel, leather and dull gold, muted colors. Each object large and centered in its cell, filling about 85% of the cell, bold readable silhouette at 32 pixels. NO frames, NO borders, NO background decoration, plain fully transparent (or flat solid black) background, no text, no labels.
```

**装備（4列×4行）** → `--grid 4x4 --names dual_blades,great_blade,chakram,turban,crown,chainmail,robe,gauntlets,bracelet,leggings,sandals,ring,rosary`
```
A single sprite sheet image, 2048x2048, arranged as an exact 4 columns by 4 rows grid of equal square cells (512x512 each) with clear empty gutters between cells. Fill cells left-to-right, top-to-bottom in this exact order: 1 a pair of crossed steel short swords, 2 a heavy two-handed greatsword, 3 a curved dagger, 4 an iron great helm, 5 a thin silver circlet with one gem, 6 a chainmail hauberk, 7 a dark hooded mage robe, 8 plate gauntlets, 9 leather bracers with iron studs, 10 steel greaves, 11 worn leather boots, 12 a gold ring with a red gem, 13 a heavy signet ring with a skull seal. Cells 14, 15 and 16 stay completely empty.
```
（id はセーブとのつながりのため昔の名前のまま。`chakram` = ダガー、`turban` = 兜、`crown` = サークレット、`leggings` = グリーブ、`sandals` = ブーツ、`rosary` = 印章指輪）

**スキル（3列×2行）** → `--grid 3x2 --names whirl,vajra,sudarshana,agni,hanuman,nagapasha`
```
A single sprite sheet image, 1536x1024, arranged as an exact 3 columns by 2 rows grid of equal square cells (512x512 each) with clear empty gutters between cells. Skill icons, left-to-right, top-to-bottom: 1 Whirlwind: two swords spinning in a circle of grey wind, 2 Iron Skin: a glowing steel-plated fist with a protective aura, 3 Chain Throw: a throwing axe bouncing along a zigzag trail, 4 Scorched Earth: cracked ground bursting with orange fire, 5 Berserker Rage: a roaring warrior face with red energy, 6 Iron Chains: heavy iron chains wrapping into a binding knot.
```

### 4. 残りの敵（7枚）
共通の指定：
```
Dark fantasy action-RPG enemy sprite in the style of Tibetan thangka painting and Indian tantric miniature art, matching a set of detailed painterly monsters with gold ornaments and red cloth. 3/4 top-down view, facing the viewer, full body, single character on a fully transparent background, bold readable silhouette, no text, no frame, no ground shadow.
```
| id | 名前 | 色 | プロンプト |
|---|---|---|---|
| `mahisha` | 水牛魔マヒシャ（ボス3） | #4a3a2a | Boss: Mahishasura, the buffalo demon king, massive buffalo head with huge curved horns on a muscular demonic body, dark brown hide, gold and bronze armor, heavy mace, charging stance. Larger and more imposing than normal enemies. Main color dark brown (#4a3a2a) with bright gold accents. |
| `vetala` | ヴェーターラ | #c9c9a8 | A vetala: a corpse-possessing spirit, gaunt pale bone-white body, bat-like posture, long claws, ragged burial cloth, fast and twitchy pose. Main color pale bone (#c9c9a8). |
| `pishacha` | ピシャーチャ | #5f8f6a | A pishacha flesh-eating ghoul: hunched, sickly green-grey skin, bulging veins, jagged teeth, long arms dragging, ash-smeared body. Main color murky green (#5f8f6a). |
| `daitya` | ダイティヤ | #b04a6a | A daitya demon soldier: armored demon warrior, dark magenta skin, spiked black and gold armor, curved sword and round shield, battle-ready. Main color dark magenta (#b04a6a). |
| `yakshaArcher` | 夜叉の弓兵 | #d89a5a | A yaksha archer: lean forest demon with tan-orange skin, tusks, wild hair, drawing a long curved bow, quiver on the back, light leather armor with gold ornaments. Main color tan orange (#d89a5a). |
| `bhuta` | 鬼火のブータ | #7fb0c9 | A bhuta ghost: translucent pale-blue floating spirit with a wispy tail instead of legs, hollow face, holding a ball of cold blue ghost fire, faint ash particles. Main color pale blue (#7fb0c9). |
| `nagaCaster` | ナーガの呪術師 | #7ad16a | A naga sorcerer: serpent lower body, slender human upper body with lime-green scales, cobra hood, ornate gold jewelry and red cloth, raising a staff topped with a glowing green venom orb. Main color lime green (#7ad16a). |

## 絵が届いたら（作業の手順）
1. `tools/prepare_sprite.py` で整えて、上の表の置き場所に入れる
2. `data/` に絵の場所を書く（`assets/README.md` を参照）
3. ブラウザで開いて、表示とエラーがないことを確かめる
4. この「受け取り済み」の一覧を更新して、PRを作る

## 今回の制作・整形メモ
- 制作：組み込みの ImageGen。上記プロンプトに「全体をセル内に収める」「透明な余白」「画面下向き」を補足。
- 装備シートは大剣の欠けと余白を、スキルシートは背景の透過と余白を追加の編集指示で修正。スキルの背景に見える色は透明部分のRGBであり、アルファ合成で背景が抜けることを確認。
- 地面はRGBの512×512に縮小。パーターラは上下の継ぎ目を目立たなくするため、大きな格子模様を控えめな不規則な石床に修正。
- キャラは `tools/prepare_sprite.py` の `square()` を利用。出力サイズを360pxにしてから512pxの透明キャンバス中央に配置（約70%、余白76px）。ツール本体は変更していません。
  - **あとで修正**：余白があると、ゲームでは余白のぶん小さく表示される（ほかの絵と大きさがそろわない）。キャラの絵は余白なしの 256×256（`prepare_sprite.py` そのまま）に作り直した。次からも余白は足さないこと。
- 装備の生成シートはセルの境界にずれがあったため、透明な溝で各絵を切り分けて512pxの等間隔セルへ配置し直しました。元の1254pxシートの切り取り境界：列0/327/637/963/1254、行0/343/650/961/1254。各絵を `square()` で420pxに整え、セル内の46pxの位置へ配置。装備シートの最後の3セルは透明。
- スキルシートも等間隔のセルごとに `square()` で420pxに整え、46pxの透明な余白を設けています。
- シートからの最終切り出し：
  ```sh
  python3 tools/prepare_sprite.py assets/sheets/equipment.png assets/items --grid 4x4 --names dual_blades,great_blade,chakram,turban,crown,chainmail,robe,gauntlets,bracelet,leggings,sandals,ring,rosary
  python3 tools/prepare_sprite.py assets/sheets/skills.png assets/skills --grid 3x2 --names whirl,vajra,sudarshana,agni,hanuman,nagapasha
  ```
- 新規PNG32枚の寸法・透明背景・ファイル破損を確認。画像参照36件すべての実ファイルを確認。既存のID・数値・セーブ形式を変更していません。新規セーブと、旧IDの装備を含む既存形式のセーブを読み込み、状態・能力値がmainと一致することも確認。
