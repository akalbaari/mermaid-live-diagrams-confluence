"""Builds the Marketplace highlight images from the raw product screenshots.

Atlassian asks for highlight images at 1840x900 with a cropped 580x330
version of each. The raw captures are the real UI, so this only frames and
scales them; it does not draw anything that is not in the product.
"""
from PIL import Image, ImageDraw, ImageFont
import pathlib

OUT = pathlib.Path("marketing/out")
BG = (244, 245, 247)
BORDER = (218, 222, 228)
TEXT = (66, 82, 110)

W, H = 1840, 900
CROP_W, CROP_H = 580, 330


def font(size, bold=False):
    names = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
    ]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def rounded(img, radius=10):
    """Rounds the corners of a screenshot so the frame does not look pasted."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.convert("RGBA"), (0, 0), mask)
    return out


def frame(shots, caption, outname):
    """shots: list of (PIL image, label or None). Laid out in one row."""
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    gap = 48
    label_h = 40 if any(lbl for _, lbl in shots) else 0
    cap_h = 70

    avail_w = W - gap * (len(shots) + 1)
    avail_h = H - cap_h - label_h - gap * 2

    cell_w = avail_w // len(shots)
    placed = []
    for img, _ in shots:
        scale = min(cell_w / img.width, avail_h / img.height)
        placed.append(img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS))

    total_w = sum(p.width for p in placed) + gap * (len(placed) - 1)
    x = (W - total_w) // 2
    top = gap + label_h

    for (img, label), p in zip(shots, placed):
        y = top + (avail_h - p.height) // 2
        if label:
            draw.text((x + 2, y - 30), label.upper(), font=font(19, True), fill=TEXT)
        draw.rounded_rectangle([x - 1, y - 1, x + p.width, y + p.height], 11, outline=BORDER, width=2)
        canvas.paste(rounded(p), (x, y), rounded(p))
        x += p.width + gap

    draw.text((gap, H - cap_h + 6), caption, font=font(30, True), fill=(23, 43, 77))

    canvas.save(OUT / outname)

    crop = canvas.resize((CROP_W, int(CROP_W * H / W)), Image.LANCZOS)
    top_off = max(0, (crop.height - CROP_H) // 2)
    crop.crop((0, top_off, CROP_W, top_off + CROP_H)).save(
        OUT / outname.replace("1840x900", "580x330")
    )
    print("wrote", outname, "and its 580x330 crop")


editor = Image.open(OUT / "raw-editor.png")
light = Image.open(OUT / "raw-gallery-light.png")
dark = Image.open(OUT / "raw-gallery-dark.png")

frame(
    [(editor, None)],
    "The preview redraws as you type, and tells you where the syntax broke",
    "highlight-1-editor-1840x900.png",
)
frame(
    [(light, None)],
    "Flowcharts, sequence, class, state, ER, Gantt, pie, git graph, mindmap and more",
    "highlight-2-diagrams-1840x900.png",
)
frame(
    [(light, "Light"), (dark, "Dark")],
    "Diagrams follow your Confluence theme, including dark mode",
    "highlight-3-theme-1840x900.png",
)
