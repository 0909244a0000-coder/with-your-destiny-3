# 絵の決まりと発注リスト

絵を作る人（人でもAIでも）は、まずこれを読んでください。

## 世界観
- **世界観にしばりはない**。新しい絵は、タントラ風でもそれ以外のダークファンタジーでもよい（ゲームの中で浮かないことを優先）
- **いまある敵・ボス・エリア（地面）**：タントラ風。チベットのタンカ画やインドの細密画の画風で、金の飾りと赤い布がある。描き直すときや同じエリアに足すときは、これに合わせる
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

### 第3回の発注：エフェクトの絵とポーズ違い（上から順に優先）

ゲーム側の受け口はできています。絵を置いて、下の「書く場所」に場所を書けば、すぐゲームに出ます（書かなければ今の見た目のまま）。

#### A. エフェクトの絵（13枚）→ `assets/vfx/<名前>.png`、書く場所は `data/vfx.js` の `textures`
- 形式：PNG。**背景は真っ黒でよい**（光を重ねる描き方をするので、黒は透けて見える）。透明でもよい
- 大きさ：正方形は 512×512。`lightning` は横長 1024×256、`fireball` は横長 512×256
- 真上から見た絵。真ん中に置く。文字・枠なし
- 入れるときは `python3 tools/prepare_sprite.py 元.png assets/vfx/<名前>.png --size 512`（横長の2枚は、そのまま置いてよい）

共通の指定（各プロンプトのあとにつける）：
```
Game visual effect texture for a dark fantasy action RPG seen from a top-down view, glowing and bright on a pure black background, centered, no text, no frame, no characters.
```
| 名前 | 何に使うか | プロンプト |
|---|---|---|
| `slash` | 通常攻撃の斬撃 | A single curved crescent sword slash arc, bright white-steel core with a pale blue edge, motion-blurred, pointing right. |
| `whirl` | 旋風斬 | A circular whirlwind of grey-white wind streaks and steel glints spinning around an empty center, seen from above. |
| `iceNova` | フロストノヴァ・凍てつく檻 | A ring of sharp ice shards and frost mist bursting outward in a circle, pale cyan, seen from above. |
| `fireBurst` | 爆発・隕石の着地 | A round fiery explosion burst with orange and yellow flames and sparks, seen from above. |
| `fireGround` | 燃える地面 | A circular patch of burning ground: cracked glowing embers and low orange flames, soft edges, seen from above. |
| `lightning` | チェインライトニング・雷鳴（1024×256） | A jagged horizontal lightning bolt running from the left edge to the right edge, white-blue core with branching sparks. |
| `axe` | 連鎖の投げ斧 | A single spinning throwing axe seen from above with a faint circular motion blur, steel blade and wooden handle. |
| `meteor` | メテオの隕石 | A flaming meteor rock falling straight down, glowing molten cracks, trailing fire upward. |
| `magicCircle` | スキルを使ったときの足元 | A glowing circular magic sigil with runes and concentric rings, golden-white light, seen from above. |
| `shield` | 鉄の皮膚・マナシールドの間 | A translucent glowing protective bubble sphere with a hexagonal energy pattern, pale blue-gold. |
| `chains` | 縛られた敵 | Heavy glowing iron chains coiled into a tight ring, seen from above, faint green-white glow. |
| `shockwave` | ボスの大技の衝撃 | An expanding circular shockwave ring of dust and red energy cracking the ground, seen from above. |
| `fireball` | ソーサレスの火の玉（512×256） | A fireball comet flying to the right: bright yellow-white head and a long orange flame trail to the left. |

#### B. 主人公とボスのポーズ違い（8枚）
**今ゲームに入っている絵（`assets/` の同じキャラの絵）を見本にして、顔・体・装備・色は同じまま、ポーズだけ変えてください。** 形式はほかのキャラの絵と同じ（透明背景、余白なしで `prepare_sprite.py` を通す）。

| ファイル | 見本 | ポーズ | 書く場所 |
|---|---|---|---|
| `assets/player_attack.png` | `assets/player.png` | 両手の剣を大きく振り下ろす瞬間 | `data/player.js` の `poses.attack` |
| `assets/player_sorceress_attack.png` | `assets/player_sorceress.png` | 杖を前に突き出し、先から火を放つ瞬間 | `data/classes.js` の `sorceress.player.poses.attack` |
| `assets/enemies/ravana_attack.png` | `assets/enemies/ravana.png` | 武器を一斉に振り下ろす瞬間 | `data/enemies.js` の `ravana.poses.attack` |
| `assets/enemies/ravana_windup.png` | 同上 | 全部の腕を高く振り上げ、力をためる | `ravana.poses.windup` |
| `assets/enemies/asuraKing_attack.png` | `assets/enemies/asuraKing.png` | 双剣を交差させて斬りつける瞬間 | `asuraKing.poses.attack` |
| `assets/enemies/asuraKing_windup.png` | 同上 | 双剣を頭上に掲げ、力をためる | `asuraKing.poses.windup` |
| `assets/enemies/mahisha_attack.png` | `assets/enemies/mahisha.png` | 棍棒を叩きつける瞬間 | `mahisha.poses.attack` |
| `assets/enemies/mahisha_windup.png` | 同上 | 角を下げ、棍棒を振りかぶって力をためる | `mahisha.poses.windup` |

ポーズ違いは、顔や装備が少し変わってしまいやすいです。見本と並べて、同じキャラに見えないものは作り直してください。

### ソーサレス（2つ目の職業）のアイコン
主人公の絵は、保管していた女性の術者の絵を使っています（`assets/player_sorceress.png`。持ち主の判断で、いったんこの絵）。

**スキル（3列×2行）** → `--grid 3x2 --names sorc_nova,sorc_shield,sorc_chain,sorc_meteor,sorc_haste,sorc_freeze`、置いたら `data/classes.js` の `sorceress.skillIcons` に書く
```
A single sprite sheet image, 1536x1024, arranged as an exact 3 columns by 2 rows grid of equal square cells (512x512 each) with clear empty gutters between cells. Spell icons, left-to-right, top-to-bottom: 1 Frost Nova: a ring of ice shards bursting outward, 2 Mana Shield: a glowing blue magic barrier sphere, 3 Chain Lightning: a forked white-blue lightning bolt jumping between points, 4 Meteor: a flaming rock falling with a fire trail, 5 Arcane Surge: swirling violet magic energy around a hand, 6 Frozen Prison: a cage of ice crystals.
```
（共通の指定は上の「アイコンのシート」と同じ）

**装備の「杖」（1個）** → `assets/items/staff.png`、置いたら `data/items.js` の `icons` に `staff` を足す
```
A single game item icon: a dark wooden mage staff topped with a glowing ember crystal.
```

### ネクロマンサー（3つ目の職業）の絵
今はソーサレスの絵の色を変えて仮に使っています（`data/classes.js` の `necromancer.player.imageFilter`）。手下の骸骨も、亡者（preta）の絵を白くして仮に使っています。

**主人公（1枚）** → `assets/player_necromancer.png`（512px以上・透明背景・`prepare_sprite.py` で256pxに）。置いたら `necromancer.player.image` をこの名前にし、`imageFilter` を `null` にする
```
A single full-body character sprite for a dark fantasy action RPG, 3/4 top-down view, facing right, transparent background: a gaunt necromancer in tattered black and bone-white robes, a hood, a staff topped with a small skull glowing pale green, bone ornaments on the shoulders. Western dark fantasy (Diablo-like), painterly, high contrast, accent color pale green #7dff9a. No text, no frame.
```

**手下の骸骨（1枚）** → `assets/ally_skeleton.png`。置いたら `necromancer.skills.nec_raise.image` をこの名前にし、`imageFilter` を `null` にする
```
A single full-body sprite, 3/4 top-down view, facing right, transparent background: a skeleton warrior with a rusty sword and a broken round shield, faint green glow in the eye sockets. Western dark fantasy (Diablo-like), painterly. No text, no frame.
```

**スキル（4列×2行。最後の1マスは空き）** → `--grid 4x2 --names nec_raise,nec_nova,nec_armor,nec_spear,nec_plague,nec_pact,nec_grasp`、置いたら `necromancer.skillIcons` に書く
```
A single sprite sheet image, 2048x1024, arranged as an exact 4 columns by 2 rows grid of equal square cells (512x512 each) with clear empty gutters between cells. Necromancer spell icons, left-to-right, top-to-bottom: 1 Raise Skeleton: a skeletal hand rising from the ground with green light, 2 Bone Storm: bone shards bursting outward in a ring, 3 Bone Armor: a ribcage-shaped shield of bones, 4 Bone Spear: a long sharp bone spear flying, 5 Plague Fog: a sickly green poison cloud, 6 Blood Pact: a dripping red rune in a circle, 7 Grasping Dead: many undead hands reaching out of dark earth, 8 (leave this cell empty).
```

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
