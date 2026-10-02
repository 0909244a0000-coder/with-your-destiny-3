"""外注の絵をゲーム用に整える。

使い方:
  python3 tools/prepare_sprite.py 元の絵.png assets/enemies/名前.png
  python3 tools/prepare_sprite.py シート.png assets/items/ --grid 4x4 --names dual_blades,great_blade,...
  python3 tools/prepare_sprite.py エフェクト.png assets/vfx/slash.png --size 512

- 1枚の絵：透明な余白を切り、正方形にして 256x256 の PNG にする
- シート（--grid 列x行）：等間隔のマスで切り分け、names の順番でファイルにする（空のマスは飛ばす）
必要なもの：Pillow（pip install pillow）
"""
import argparse
import os

from PIL import Image

SIZE = 256  # 出力の大きさ（ゲームでは 30〜140px くらいに縮めて表示）。--size で変えられる


def square(im):
    im = im.convert("RGBA")
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if box is None:
        return None
    im = im.crop(box)
    w, h = im.size
    s = max(w, h)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(im, ((s - w) // 2, (s - h) // 2))
    return out.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--grid", help="シートのマス目 例: 4x4")
    p.add_argument("--names", help="マスの順番のファイル名（カンマ区切り、拡張子なし）")
    p.add_argument("--size", type=int, help="出力の大きさ（px）。エフェクトの絵は 512 がおすすめ")
    a = p.parse_args()
    global SIZE
    if a.size:
        SIZE = a.size
    im = Image.open(a.src)
    if not a.grid:
        square(im).save(a.dst, optimize=True)
        print("saved", a.dst)
        return
    cols, rows = (int(x) for x in a.grid.lower().split("x"))
    names = a.names.split(",") if a.names else []
    os.makedirs(a.dst, exist_ok=True)
    cw, ch = im.width / cols, im.height / rows
    for i in range(cols * rows):
        if i >= len(names) or not names[i]:
            continue
        c, r = i % cols, i // cols
        cell = square(im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch))))
        if cell is None:
            continue
        out = os.path.join(a.dst, names[i] + ".png")
        cell.save(out, optimize=True)
        print("saved", out)


if __name__ == "__main__":
    main()
