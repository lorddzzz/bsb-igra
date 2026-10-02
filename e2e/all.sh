#!/bin/sh
# Plays every game end to end on simulated phones, against the production build (what GitHub Pages serves).
#   sh e2e/all.sh                        # 390x844 (iPhone 14)
#   WIDTH=375 HEIGHT=667 sh e2e/all.sh   # iPhone SE
set -e
OUT=${OUT:-e2e/shots-all}
[ -d dist ] || ./node_modules/.bin/vite build >/dev/null
./node_modules/.bin/vite preview --port 5173 --host 127.0.0.1 --strictPort >/dev/null 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null || true" EXIT
until curl -s http://127.0.0.1:5173/ >/dev/null; do sleep 0.3; done
status=0
for game in play blef wave kviz lic misija explore; do
  echo "== $game"
  node e2e/$game.mjs "$OUT/$game" || status=1
done
exit $status
