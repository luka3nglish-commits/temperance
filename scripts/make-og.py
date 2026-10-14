"""Render public/og.png (1200 x 630) for Temperance: the Open Graph image.
Same language as public/og.svg and the app icon: obsidian field, the column under the gold goal line,
the wordmark in Cinzel 700, the tagline in Cormorant Garamond italic.
Run: python scripts/make-og.py
Fonts: Pillow cannot read woff2, so the two faces are converted to TTF with fontTools (brotli needed)
into .tmp/. Without fontTools the script still renders the column and uses Pillow's default font
as a placeholder for the text and says so.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og.png"
TMP = ROOT / ".tmp"
FONTS = ROOT / "public" / "fonts"

W, H = 1200, 630

# spec section 2 colours
OBSIDIAN_950 = (5, 5, 7)
OBSIDIAN_900 = (11, 11, 15)
OBSIDIAN_800 = (18, 18, 24)
OBSIDIAN_600 = (38, 38, 46)
PLINTH = (13, 13, 18)
BONE_DIM = (154, 148, 138)
GOLD_400 = (216, 180, 90)
GOAL = (246, 227, 161)
GOAL_TIP = (255, 247, 218)
# --gold-grad stops
GOLD = [
    (0.00, (0x5C, 0x44, 0x18)),
    (0.22, (0x9C, 0x7B, 0x33)),
    (0.42, (0xD8, 0xB4, 0x5A)),
    (0.50, (0xFF, 0xF7, 0xDA)),
    (0.56, (0xF6, 0xE3, 0xA1)),
    (0.70, (0xD8, 0xB4, 0x5A)),
    (1.00, (0x7A, 0x5E, 0x22)),
]

# geometry, mirrored in public/og.svg
GLOW_C, GLOW_R = (330, 370), (260, 220)
PLINTH_BOX = (190, 505, 470, 543)
COL_BOX = (258, 226, 402, 505)
CAP_BOX = (258, 206, 402, 226)
LINE_Y, LINE_H = 168, 3
WORD_XY, WORD_SIZE, WORD_TRACK = (560, 292), 60, 12
WORD_MAX_W = 580  # right-hand field, 560 to 1140
RULE_BOX = (564, 322, 620, 323)
TAG_XY, TAG_SIZE = (562, 374), 36
TAGLINE = "A stoic calorie and macro tracker."


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gold_at(t):
    t = max(0.0, min(1.0, t))
    for (t0, c0), (t1, c1) in zip(GOLD, GOLD[1:]):
        if t <= t1:
            return lerp(c0, c1, (t - t0) / (t1 - t0) if t1 > t0 else 0)
    return GOLD[-1][1]


def hgrad(size, color_at):
    """Horizontal gradient strip, color_at(t) for t in 0..1."""
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for x in range(w):
        c = color_at(x / max(1, w - 1))
        for y in range(h):
            px[x, y] = c
    return img


def load_fonts():
    """Convert the preloaded woff2 faces to TTF via fontTools. Returns (cinzel, cormorant, real)."""
    try:
        from fontTools.ttLib import TTFont

        TMP.mkdir(exist_ok=True)
        out = {}
        pairs = [
            ("cinzel-700.woff2", "cinzel-700.ttf"),
            ("cormorant-400-italic.woff2", "cormorant-400-italic.ttf"),
        ]
        for src, dest in pairs:
            ttf = TMP / dest
            if not ttf.exists():
                f = TTFont(FONTS / src)
                f.flavor = None
                f.save(ttf)
            out[dest] = ttf
        return (
            ImageFont.truetype(str(out["cinzel-700.ttf"]), WORD_SIZE),
            ImageFont.truetype(str(out["cormorant-400-italic.ttf"]), TAG_SIZE),
            True,
        )
    except Exception as err:
        print("font conversion unavailable, using placeholder text:", err)
        return ImageFont.load_default(size=28), ImageFont.load_default(size=18), False


def draw_tracked(d, xy, text, font, tracking, fill_fn):
    """Draw text glyph by glyph with letter spacing; fill_fn(t) gives the colour across the run."""
    x, y = xy
    widths = [d.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    cur = x
    for ch, w in zip(text, widths):
        t = (cur - x) / max(1, total)
        d.text((cur, y), ch, font=font, fill=fill_fn(t), anchor="ls")
        cur += w + tracking
    return total


def render():
    img = Image.new("RGB", (W, H), OBSIDIAN_950)

    # warm glow behind the column
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    (cx, cy), (rx, ry) = GLOW_C, GLOW_R
    gd.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=GOLD_400 + (44,))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(img)

    # plinth with a lit top edge
    x0, y0, x1, y1 = PLINTH_BOX
    d.rectangle([x0, y0, x1, y1], fill=PLINTH)
    d.rectangle([x0, y0, x1, y0 + 9], fill=OBSIDIAN_800)
    d.rectangle([x0, y0, x1, y0 + 1], fill=OBSIDIAN_600)

    # column body with a vertical light edge
    x0, y0, x1, y1 = COL_BOX
    d.rectangle([x0, y0, x1, y1], fill=OBSIDIAN_900)
    d.rectangle([x0, y0, x0 + 22, y1], fill=OBSIDIAN_800)
    d.rectangle([x0 + 22, y0, x0 + 29, y1], fill=OBSIDIAN_600)

    # brushed gold capital
    x0, y0, x1, y1 = CAP_BOX
    cap = hgrad((x1 - x0, y1 - y0), gold_at)
    img.paste(cap, (x0, y0))

    # the gold goal line across the frame, fading at both ends
    def line_at(t):
        edge = min(1.0, min(t, 1 - t) / 0.15)
        base = lerp(GOAL, GOAL_TIP, 1 - abs(t - 0.5) * 2)
        return lerp(OBSIDIAN_950, base, edge)

    img.paste(hgrad((W, LINE_H), line_at), (0, LINE_Y))
    d = ImageDraw.Draw(img)

    cinzel, cormorant, real = load_fonts()

    # wordmark in the gold gradient, letter spaced, shrunk until it fits the right-hand field
    track = WORD_TRACK if real else 6
    size = WORD_SIZE
    while True:
        widths = [d.textlength(ch, font=cinzel) for ch in "TEMPERANCE"]
        total = sum(widths) + track * 9
        if total <= WORD_MAX_W or size <= 24 or not real:
            break
        size -= 2
        cinzel = cinzel.font_variant(size=size)
    print("wordmark", int(total), "px at", size, "px")
    draw_tracked(d, WORD_XY, "TEMPERANCE", cinzel, track, gold_at)

    # rule
    d.rectangle(RULE_BOX, fill=GOLD_400)

    # tagline
    d.text(TAG_XY, TAGLINE, font=cormorant, fill=BONE_DIM, anchor="ls")

    return img, real


if __name__ == "__main__":
    image, real_fonts = render()
    image.save(OUT, optimize=True)
    check = Image.open(OUT)
    print("wrote", OUT, check.size, "real fonts" if real_fonts else "PLACEHOLDER fonts")
    assert check.size == (W, H), check.size
