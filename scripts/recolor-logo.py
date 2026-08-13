"""Recolor Angel Island logo assets for the ethereal site palette."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / "public"

# Site palette (globals.css)
PAGE = (250, 248, 245)  # #faf8f5
MAT = (235, 228, 218)  # warm mat — slightly darker than page for definition
MAT_EDGE = (212, 200, 186)  # outer ring tone
INK = (42, 42, 42)  # #2a2a2a — primary outlines
INK_MID = (74, 88, 80)  # stippling / secondary detail
SAGE = (95, 122, 107)  # #5f7a6b — accent ring


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def inside_circle(x: int, y: int, w: int, h: int, radius_scale: float = 0.485) -> bool:
    cx, cy = w / 2, h / 2
    dx, dy = x - cx, y - cy
    return (dx * dx + dy * dy) ** 0.5 <= min(w, h) * radius_scale


def mix(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(a[0] * (1 - t) + b[0] * t),
        int(a[1] * (1 - t) + b[1] * t),
        int(a[2] * (1 - t) + b[2] * t),
    )


def recolor_mark(src: Path, dst: Path) -> None:
    """
    Original art is cream line work on black.
    For a light site background: ink outlines on a warm circular mat.
    """
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size
    radius = min(w, h) * 0.485

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue

            lum = luminance(r, g, b)
            cx, cy = x - w / 2, y - h / 2
            dist = (cx * cx + cy * cy) ** 0.5

            # Square corners outside the badge → transparent
            if not inside_circle(x, y, w, h):
                px[x, y] = (0, 0, 0, 0)
                continue

            # Subtle outer ring for definition
            ring_t = max(0.0, min(1.0, (dist - radius * 0.94) / (radius * 0.06)))
            base = mix(MAT, MAT_EDGE, ring_t * 0.85)

            # Original black → mat fill; original cream → ink outlines
            if lum < 55:
                px[x, y] = (*base, 255)
            elif lum > 145:
                px[x, y] = (*INK, 255)
            else:
                # Anti-aliased edges and stipple mid-tones
                t = (lum - 55) / 90
                color = mix(base, INK_MID if t < 0.65 else INK, t)
                px[x, y] = (*color, 255)

    img.save(dst, "PNG", optimize=True)
    print(f"Wrote {dst}")


def recolor_full(src: Path, dst: Path) -> None:
    """Full badge with wordmark — same ink-on-mat treatment."""
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue

            lum = luminance(r, g, b)

            if lum < 35 and not inside_circle(x, y, w, h, radius_scale=0.49):
                px[x, y] = (0, 0, 0, 0)
                continue

            if lum < 55:
                px[x, y] = (*MAT, 255)
            elif lum > 145:
                px[x, y] = (*INK, 255)
            else:
                t = (lum - 55) / 90
                color = mix(MAT, INK, t)
                px[x, y] = (*color, 255)

    img.save(dst, "PNG", optimize=True)
    print(f"Wrote {dst}")


if __name__ == "__main__":
    recolor_mark(
        PUBLIC / "angel-island-mark.png",
        PUBLIC / "angel-island-mark-light.png",
    )
    full_src = PUBLIC / "angel-island-logo.png"
    if full_src.exists():
        recolor_full(full_src, PUBLIC / "angel-island-logo-light.png")
