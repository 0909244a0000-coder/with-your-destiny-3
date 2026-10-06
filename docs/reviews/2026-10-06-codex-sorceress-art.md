# ソーサレスの絵の描き直し

依頼：元の方向性は維持し、現行クラスの画風とサイズ感に揃える。

## 変更
- `assets/player_sorceress.png` と `assets/player_sorceress_attack.png` を差し替え。黒髪・赤金の衣装・炎の杖を継承し、暗い革/布/古い金属を立体的に描いた。
- 通常・詠唱を同じ人物の2ポーズとして生成。詠唱の横長火炎を除き、杖を斜め上に構える。火球は既存ゲームエフェクトが担当する。
- 既存参照、能力、スキル、保存形式は変更しない。PR #119のDPSテストとその前提変更を継承。

## 確認
- 組み込み画像生成ツールを使用。透明2×1シートを `python3 tools/prepare_sprite.py ../generated_images/exec-1bd3fea8-f4f4-4204-8587-4274373d3e6c.png assets --grid 2x1 --names player_sorceress,player_sorceress_attack` で整形。
- 両方RGBA/256×256、角のalpha=0。alpha>8の範囲は通常(41,0,215,256)、詠唱(52,0,204,256)。両方とも高さ256pxで横幅より縦に長く、横長の炎による縮小を解消。
- 通常83,505バイト、詠唱81,862バイト。ネクロ/パラディンと64px・128pxで並べ、頭身・全身・輪郭・ポーズを目視確認。これは画像を並べた確認であり実ゲームのスクリーンショットではない。
- `git diff --check` 成功。今回の環境にPlaywrightブラウザ実行ファイルがなく、ゲーム上の表示・実機FPSは未確認。画像のみの変更なので戦闘バランステストは追加していない。

## 生成指示
初回：元の通常/攻撃ソーサレスを人物と色の参考、ネクロ/パラディンを画風と頭身の参考に指定。黒髪・赤金・炎の杖を維持し、成人の頭身、3/4見下ろし・右寄りの向き、使い込まれた革/布/金属、小さくても読める輪郭、透明2×1シートの通常/詠唱を指示。横に広い詠唱姿勢が出たため、その点だけ再生成した。

最終の指示文（初回画像を参照）：
```
Edit this transparent 2-cell sorceress sprite sheet. KEEP LEFT CHARACTER ENTIRELY UNCHANGED. Keep same woman, face, adult body, identical costume, hair, painterly dark fantasy texture. Modify only the RIGHT casting pose so it has a COMPACT TALL silhouette matching left full-body height and footprint. Right hand holds the SAME ornate fire staff diagonally UP toward upper-right, staff head near her own head height, NOT extended horizontally away. Right elbow bent near torso, free left hand projects magic in front of chest, knees slightly bent but feet same baseline and head same height as left. Skirt hangs mostly downward close to legs, no broad fabric wings. Entire right staff+body bbox TALLER THAN WIDE, max width 65% of its cell, height85-95%cell. A small contained flame in staff orb only, no projectile/effecthalo. Render a clean evenly split TWO equal square cells side-by-side 2:1 sheet, left idle and right compact casting. All pixels belong wholly to their cell; margin from outeredges. Fully transparent background, no text/floor/shadow. Both heads same size and both boot soles same baseline. This is necessary to prevent the game from shrinking the attacking body when fitting sprites to equal squares.
```
