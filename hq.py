#!/usr/bin/env -S uv run --with pillow python
import argparse
import base64
from pathlib import Path
from typing import cast

from PIL import Image

argparser = argparse.ArgumentParser()
argparser.add_argument("image", type=Path, help="Path to image file.")
argparser.add_argument("--directory", "-d", type=Path, help="Path to output directory.")
argparser.add_argument("--scale", "-s", type=float, help="Scale factor.", default=1)
args = argparser.parse_args()
outdir = cast("Path", args.directory or args.image.parent)

encoded = base64.b64encode(args.image.read_bytes()).decode()

with Image.open(args.image) as img:
    orig_width, orig_height = img.size
    mime_type = Image.MIME[img.format]

width, height = orig_width / args.scale, orig_height / args.scale

with outdir.joinpath(args.image.stem + ".svg").open("w") as f:
    f.write(
        f"<svg"
        f' version="1.1"'
        f' xmlns="http://www.w3.org/2000/svg" '
        f' xmlns:xlink="http://www.w3.org/1999/xlink" '
        f' width="{width}" height="{height}"'
        f' viewBox="0,0,{width},{height}">'
    )
    f.write(
        f"<image"
        f' width="{orig_width}"'
        f' height="{orig_height}"'
        f' transform="scale({width / orig_width}, {height / orig_height})"'
        f' href="data:image/{mime_type};base64,{encoded}" />'
    )
    f.write("</svg>")
