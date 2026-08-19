"""Remove logo matte white and tint internal whites to match the site palette."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / "public"

# globals.css — ethereal page / cloud tones
PAGE = (250, 248, 245)  # #faf8f5
CLOUD = (255, 254, 252)  # --cloud, slightly brighter for puff highlights
SKY = (220, 232, 244)  # ~#dce8f4 — header / gradient sky band


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_matte_white(r: int, g: int, b: int, a: int) -> bool:
    return a > 200 and r > 235 and g > 235 and b > 235


def flood_background(w: int, h: int, px) -> list[list[bool]]:
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if is_matte_white(*px[x, y]) and not bg[x][y]:
            bg[x][y] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[nx][ny] and is_matte_white(*px[nx, ny]):
                bg[nx][ny] = True
                q.append((nx, ny))

    return bg


def mix(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(a[0] * (1 - t) + b[0] * t),
        int(a[1] * (1 - t) + b[1] * t),
        int(a[2] * (1 - t) + b[2] * t),
    )


def blend_logo(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size
    bg = flood_background(w, h, px)

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if bg[x][y]:
                px[x, y] = (0, 0, 0, 0)
                continue

            if not is_matte_white(r, g, b, a):
                continue

            lum = luminance(r, g, b)
            # Cloud puffs (lower third) get a touch of sky; guitar cutout stays page cream.
            sky_t = max(0.0, min(1.0, (y / h - 0.45) / 0.35)) if y > h * 0.45 else 0.0
            target = mix(PAGE, mix(PAGE, SKY, 0.35), sky_t * 0.5)
            if lum > 252:
                target = mix(target, CLOUD, 0.55)
            px[x, y] = (*target, 255)

    img.save(dst, "PNG", optimize=True)
    print(f"Wrote {dst}")


if __name__ == "__main__":
    src = PUBLIC / "angel-island-mark-source.png"
    if not src.exists():
        raise SystemExit(
            f"Missing source asset: {src}\n"
            "Save the original logo PNG there before running this script."
        )

    for name in ("angel-island-mark-light.png", "angel-island-logo-light.png"):
        blend_logo(src, PUBLIC / name)
