#!/usr/bin/env python3
"""Build assets/fonts/jetbrains-mono-silk.woff2, the silkscreen font embedded in every SVG.

  python tools/subset-font.py path/to/JetBrainsMono[wght].ttf-or-woff2

JetBrains Mono (SIL OFL 1.1, assets/fonts/OFL-JetBrainsMono.txt), instanced at weight 400 and cut
down to printable ASCII and the middle dot: about 4.6 KB. GitHub's image proxy loads no web font,
so the SVGs carry it as a data URI (src/font.mjs). Run once, by hand: needs fontTools and brotli.
"""
import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parents[1] / "assets" / "fonts" / "jetbrains-mono-silk.woff2"
# Keep in step with CHARSET in src/font.mjs.
TEXT = "".join(chr(c) for c in range(0x20, 0x7F)) + "·"


def main(src: str) -> None:
    font = TTFont(src)
    if "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": 400})
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = []
    opts.hinting = False
    opts.desubroutinize = True
    opts.notdef_outline = False
    sub = subset.Subsetter(opts)
    sub.populate(text=TEXT)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    OUT.write_bytes(buf.getvalue())
    print(f"{OUT.name}: {len(buf.getvalue())} bytes, {len(set(TEXT))} characters")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
