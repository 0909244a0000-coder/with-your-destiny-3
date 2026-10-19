"""マスにそろっていないアイコンのシート（透明背景）を、形ごとに切り分ける。

使い方:
  python3 tools/cut_icons.py シート.png 出力先/ --names a,b,c,... [--cols 4] [--size 256] [--webp] [--grid | --bands]

- 透明でない部分のかたまりを探し、近い小さなかたまり（火の粉・虫の群れなど）は大きいほうにまとめて、names の数にそろえる
- 上の行から、各行は左から names の順にファイルにする（1行 cols 個）
- それぞれ余白を切って正方形にし、size×size の PNG（--webp なら WebP。小さく軽い）にする
- マスの線をはみ出して描かれたシートでも切れる
- --bands：透明なすき間で、まず横の帯（行）に分け、それぞれを透明な縦のすき間で分ける。絵どうしがすき間なく並ぶ六角形のシートなど用
- --grid：マス（cols×cols）で切る。絵どうしがくっついているシート用。マスの端からはみ出してきた、となりの絵の小さな切れ端は捨てる
必要なもの：Pillow
"""
import argparse
import os
from collections import deque

from PIL import Image, ImageFilter


def components(mask, w, h):
    seen = bytearray(w * h)
    out = []
    for i in range(w * h):
        if not mask[i] or seen[i]:
            continue
        q = deque([i]); seen[i] = 1
        x0 = y0 = 10 ** 9; x1 = y1 = -1; n = 0
        while q:
            j = q.popleft(); x, y = j % w, j // w; n += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for k in (j - 1 if x else -1, j + 1 if x < w - 1 else -1, j - w, j + w):
                if 0 <= k < w * h and mask[k] and not seen[k]:
                    seen[k] = 1; q.append(k)
        out.append([x0, y0, x1, y1, n])
    return out


def gap(a, b):
    dx = max(0, max(a[0], b[0]) - min(a[2], b[2]))
    dy = max(0, max(a[1], b[1]) - min(a[3], b[3]))
    return (dx * dx + dy * dy) ** 0.5


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--names", required=True)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--size", type=int, default=256)
    ap.add_argument("--webp", action="store_true")
    ap.add_argument("--grid", action="store_true")
    ap.add_argument("--bands", action="store_true")
    a = ap.parse_args()
    names = a.names.split(",")
    im = Image.open(a.src).convert("RGBA")
    W, H = im.size
    if a.grid:
        return cut_grid(im, names, a)
    if a.bands:
        return cut_bands(im, names, a)
    S = 4  # 1/4 に縮めてかたまりを探す
    small = im.getchannel("A").resize((W // S, H // S)).point(lambda v: 255 if v > 24 else 0).filter(ImageFilter.MaxFilter(3))
    w, h = small.size
    boxes = [b for b in components(small.tobytes(), w, h) if b[4] >= 2]
    while len(boxes) > len(names):  # いちばん小さいかたまりを、いちばん近いかたまりにまとめる
        boxes.sort(key=lambda b: b[4])
        s = boxes.pop(0)
        t = min(boxes, key=lambda b: gap(s, b))
        t[0], t[1], t[2], t[3], t[4] = min(t[0], s[0]), min(t[1], s[1]), max(t[2], s[2]), max(t[3], s[3]), t[4] + s[4]
    if len(boxes) != len(names):
        raise SystemExit(f"かたまりが {len(boxes)} 個で、names の {len(names)} 個と合わない")
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    order = []
    for r in range(0, len(boxes), a.cols):
        order += sorted(boxes[r:r + a.cols], key=lambda b: b[0])
    os.makedirs(a.out, exist_ok=True)
    for name, b in zip(names, order):
        crop = im.crop((b[0] * S - S, b[1] * S - S, (b[2] + 2) * S, (b[3] + 2) * S))
        save(crop.crop(crop.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()), name, a)
        print(name, (b[0] * S, b[1] * S, b[2] * S, b[3] * S))


def cut_grid(im, names, a):
    W, H = im.size
    cw, ch = W / a.cols, H / a.cols
    os.makedirs(a.out, exist_ok=True)
    for i, name in enumerate(names):
        cell = im.crop((round(i % a.cols * cw), round(i // a.cols * ch), round((i % a.cols + 1) * cw), round((i // a.cols + 1) * ch)))
        mask = cell.getchannel("A").point(lambda v: 255 if v > 24 else 0)
        w, h = mask.size
        parts = components(mask.tobytes(), w, h)
        total = sum(p[4] for p in parts) or 1
        keep = [p for p in parts if p[4] >= total * 0.002 and not ((p[0] == 0 or p[1] == 0 or p[2] == w - 1 or p[3] == h - 1) and p[4] < total * 0.1)]
        if not keep:
            continue
        cut = Image.new("RGBA", cell.size, (0, 0, 0, 0))
        for p in keep:
            part = mask.crop((p[0], p[1], p[2] + 1, p[3] + 1))
            cut.paste(cell.crop((p[0], p[1], p[2] + 1, p[3] + 1)), (p[0], p[1]), part)
        box = (min(p[0] for p in keep), min(p[1] for p in keep), max(p[2] for p in keep) + 1, max(p[3] for p in keep) + 1)
        save(cut.crop(box), name, a)
        print(name, box)


def spans(values):
    out, start = [], None
    for i, v in enumerate(values + [0]):
        if v and start is None: start = i
        if not v and start is not None: out.append((start, i)); start = None
    return out


def cut_bands(im, names, a):
    alpha = im.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    W, H = im.size
    px = alpha.load()
    pieces = []
    for y0, y1 in spans([sum(1 for x in range(0, W, 2) if px[x, y]) for y in range(H)]):
        if y1 - y0 < 8: continue
        for x0, x1 in spans([sum(1 for y in range(y0, y1, 2) if px[x, y]) for x in range(W)]):
            if x1 - x0 >= 8: pieces.append((x0, y0, x1, y1))
    if len(pieces) != len(names):
        raise SystemExit(f"絵が {len(pieces)} 個で、names の {len(names)} 個と合わない")
    os.makedirs(a.out, exist_ok=True)
    for name, b in zip(names, pieces):
        crop = im.crop(b)
        save(crop.crop(crop.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()), name, a)
        print(name, b)


def save(crop, name, a):
    cw, ch = crop.size; s = max(cw, ch)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(crop, ((s - cw) // 2, (s - ch) // 2))
    sq = sq.resize((a.size, a.size), Image.LANCZOS)
    if a.webp: sq.save(os.path.join(a.out, name + ".webp"), quality=88, method=6)
    else: sq.save(os.path.join(a.out, name + ".png"), optimize=True)


if __name__ == "__main__":
    main()
