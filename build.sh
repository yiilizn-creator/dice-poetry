#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 << 'PY'
import re, pathlib
root = pathlib.Path("js")
order = ["analytics.js", "poem.js", "drag.js", "sound.js", "poster.js", "dice.js", "app.js"]
parts = []
for name in order:
    src = (root / name).read_text(encoding="utf-8")
    src = re.sub(r"^export\s+", "", src, flags=re.M)
    src = re.sub(r"^import\s+[\s\S]*?;\s*\n", "", src, flags=re.M)
    parts.append(f"/* === {name} === */\n{src}")
(root / "app.bundle.js").write_text("(function(){\n'use strict';\n" + "\n".join(parts) + "\n})();\n", encoding="utf-8")
print("Built js/app.bundle.js")
PY
