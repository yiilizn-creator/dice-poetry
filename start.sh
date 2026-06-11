#!/usr/bin/env bash
cd "$(dirname "$0")"
./build.sh
PORT="${PORT:-3850}"
echo "骰子诗句 → http://localhost:${PORT}"
python3 -m http.server "$PORT"
