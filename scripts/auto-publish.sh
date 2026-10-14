#!/bin/bash
# Watches ~/Projects/AIportafolio26: optimize media -> commit -> push -> GitHub Pages redeploys.
set -uo pipefail
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
REPO="/Users/rosedays/Projects/AI Portfolio 26"
SRC="/Users/rosedays/Projects/AIportafolio26"
LOCK=/tmp/rosedays-autopublish.lock
LOG="$HOME/Library/Logs/rosedays-autopublish.log"
exec >>"$LOG" 2>&1
notify() { osascript -e "display notification \"$1\" with title \"ROSEDAYS.AI\"" || true; }

mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK"' EXIT

# wait until the drop folder stops changing (copy finished)
prev=""
for _ in $(seq 1 30); do
  cur=$(du -sk "$SRC" | cut -f1)
  [ "$cur" = "$prev" ] && break
  prev=$cur; sleep 5
done

cd "$REPO" || exit 1
echo "== $(date) =="
MEDIA_SRC="$SRC" npm run media || { notify "media falló, ver log"; exit 1; }

git add public/media src/data
if git diff --cached --quiet; then echo "no changes"; exit 0; fi

# guard: no file >95MB (GitHub limit 100MB)
if git diff --cached --name-only | while read -r f; do [ -f "$f" ] && [ "$(stat -f%z "$f")" -gt 99614720 ] && echo "$f"; done | grep -q .; then
  git reset -q; notify "archivo >95MB, no se publicó"; exit 1
fi

npm run build >/dev/null || { git reset -q; notify "build falló, no se publicó"; exit 1; }

names=$(git diff --cached --name-only | grep '^public/media/' | cut -d/ -f3 | sort -u | grep -v '^_site$' | tr '\n' ' ')
git commit -q -m "auto: update media (${names:-site})" && git pull -q --rebase origin main && git push -q origin main \
  && notify "Publicado: ${names:-cambios}. Online en ~1 min." || notify "push falló, ver log"
