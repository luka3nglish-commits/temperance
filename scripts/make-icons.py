"""Generate PWA icons for Temperance: an obsidian column with a brushed gold cap on near-black.
Run: python scripts/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

OBSIDIAN = (7, 6, 6, 255)
STONE_DARK = (20, 17, 17, 255)
STONE_MID = (34, 28, 28, 255)
STONE_LIGHT = (58, 50, 50, 255)
GOLD = [(125, 92, 31), (227, 194, 114), (248, 236, 194), (212, 171, 87), (125, 92, 31)]


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gold_at(t):
    n = len(GOLD) - 1
    x = max(0.0, min(0.9999, t)) * n
    i = int(x)
    return lerp(GOLD[i], GOLD[i + 1], x - i)


def draw_icon(size, pad_ratio):
    img = Image.new("RGBA", (size, size), OBSIDIAN)

    # faint warm glow behind the column
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    r = int(size * 0.34)
    cx, cy = size // 2, int(size * 0.58)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(196, 154, 69, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)

    pad = size * pad_ratio
    inner = size - 2 * pad
    col_w = inner * 0.30
    col_h = inner * 0.62
    x0 = (size - col_w) / 2
    y1 = pad + inner * 0.86
    y0 = y1 - col_h

    # plinth
    pl_w = inner * 0.52
    pl_h = inner * 0.07
    d.rectangle([(size - pl_w) / 2, y1, (size + pl_w) / 2, y1 + pl_h], fill=STONE_MID)
    d.rectangle([(size - pl_w) / 2, y1, (size + pl_w) / 2, y1 + pl_h * 0.25], fill=STONE_LIGHT)

    # column body with a vertical light edge
    d.rectangle([x0, y0, x0 + col_w, y1], fill=STONE_DARK)
    d.rectangle([x0, y0, x0 + col_w * 0.16, y1], fill=STONE_MID)
    d.rectangle([x0 + col_w * 0.16, y0, x0 + col_w * 0.22, y1], fill=STONE_LIGHT)

    # brushed gold cap, horizontal gradient
    cap_h = max(3, int(inner * 0.045))
    for i in range(int(col_w)):
        t = i / max(1, col_w - 1)
        d.line([(x0 + i, y0 - cap_h), (x0 + i, y0)], fill=gold_at(t) + (255,))

    # gold goal line across, slightly above the cap
    line_y = y0 - cap_h - inner * 0.06
    line_w = inner * 0.78
    for i in range(int(line_w)):
        t = i / max(1, line_w - 1)
        x = (size - line_w) / 2 + i
        d.line([(x, line_y), (x, line_y + max(1, inner * 0.012))], fill=gold_at((t + 0.5) % 1) + (255,))

    return img


for name, size, pad in [
    ("icon-192.png", 192, 0.14),
    ("icon-512.png", 512, 0.14),
    ("icon-512-maskable.png", 512, 0.24),
    ("apple-touch-icon.png", 180, 0.14),
]:
    draw_icon(size, pad).convert("RGB" if name.startswith("apple") else "RGBA").save(OUT / name)
    print("wrote", name)
