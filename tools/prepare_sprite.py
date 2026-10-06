"""外注の絵をゲーム用に整える。

使い方:
  python3 tools/prepare_sprite.py 元の絵.png assets/enemies/名前.png
  python3 tools/prepare_sprite.py シート.png assets/items/ --grid 4x4 --names dual_blades,great_blade,...
  python3 tools/prepare_sprite.py エフェクト.png assets/vfx/slash.png --size 512
  python3 tools/prepare_sprite.py 黒い背景の絵.png assets/items/x.png --bg black      （まわりの黒を透明にする）
  python3 tools/prepare_sprite.py 市松模様の絵.png assets/town/x.png --bg checker     （「透明」に見せかけた白灰の市松模様を消す）

- 1枚の絵：透明な余白を切り、正方形にして 256x256 の PNG にする
- シート（--grid 列x行）：等間隔のマスで切り分け、names の順番でファイルにする（空のマスは飛ばす）
必要なもの：Pillow（pip install pillow）
"""
import argparse
import os

from collections import deque

from PIL import Image, ImageFilter

SIZE = 256  # 出力の大きさ（ゲームでは 30〜140px くらいに縮めて表示）。--size で変えられる


def remove_bg(im, kind):
    """ふちからつながった背景を透明にする。kind = "black"（黒い無地）か "checker"（白と薄い灰の市松模様）"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_bg(c):
        r, g, b, a = c
        if a < 8:
            return True
        hi, lo = max(r, g, b), min(r, g, b)
        if kind == "black":
            return hi < 28
        return lo > 170 and hi - lo < 22

    bg = Image.new("L", (w, h), 0)
    bp = bg.load()
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if bp[x, y] or not is_bg(px[x, y]):
            continue
        bp[x, y] = 255
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    # 背景のすぐそば（数px）は、黒い背景なら明るさに応じて透かして、ふちをなめらかに
    edge = bg.filter(ImageFilter.MaxFilter(5))
    ep = edge.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if bp[x, y]:
                px[x, y] = (r, g, b, 0)
            elif ep[x, y] and kind == "black":
                px[x, y] = (r, g, b, min(a, max(r, g, b) * 5))
    return im


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
    p.add_argument("--bg", choices=["black", "checker"], help="ふちからつながった背景を透明にする")
    a = p.parse_args()
    global SIZE
    if a.size:
        SIZE = a.size
    im = Image.open(a.src)
    if not a.grid:
        if a.bg:
            im = remove_bg(im, a.bg)
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
        part = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
        cell = square(remove_bg(part, a.bg) if a.bg else part)
        if cell is None:
            continue
        out = os.path.join(a.dst, names[i] + ".png")
        cell.save(out, optimize=True)
        print("saved", out)


if __name__ == "__main__":
    main()
