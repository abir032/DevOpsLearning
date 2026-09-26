#!/usr/bin/env bash
# Merge one writer workspace back into this project.
# Copies only the files a writer is allowed to create, and lists any other
# file that differs so it can be reviewed by hand.
# Usage: scripts/merge-workspace.sh /path/to/workspace
set -euo pipefail
ws="$1"
here="$(cd "$(dirname "$0")/.." && pwd)"

copy() {
  local rel="$1"
  mkdir -p "$here/$(dirname "$rel")"
  if [ ! -f "$here/$rel" ] || ! cmp -s "$ws/$rel" "$here/$rel"; then
    cp "$ws/$rel" "$here/$rel"
    echo "  merged  $rel"
  fi
}

cd "$ws"
for f in src/content/lessons/*.mdx src/content/projects/*.mdx src/components/viz/*.astro src/scripts/*.ts src/data/glossary/*.json tests/*.spec.ts; do
  [ -f "$f" ] || continue
  case "$f" in
    # shared files: never overwritten by a merge
    src/content/lessons/vpc.mdx|src/content/lessons/terraform-state.mdx|tests/site.spec.ts|tests/screens.spec.ts|src/scripts/page.ts|src/scripts/viz.ts|src/scripts/progress.ts|src/scripts/theme.ts|src/scripts/tf-state-viz.ts|src/components/viz/VpcJourney.astro|src/components/viz/TfThreeway.astro|src/components/viz/TfRace.astro)
      if ! cmp -s "$f" "$here/$f" 2>/dev/null; then echo "  REVIEW  $f (shared file changed; not merged)"; fi ;;
    *) copy "$f" ;;
  esac
done

# anything else that differs from this project
find src scripts astro.config.mjs package.json playwright.config.ts forbidden-strings.json -type f 2>/dev/null | while IFS= read -r f; do
  case "$f" in src/content/lessons/*|src/content/projects/*|src/components/viz/*|src/data/glossary/*|src/scripts/*.ts) continue ;; esac
  if [ ! -f "$here/$f" ]; then echo "  REVIEW  $f (new file outside the allowed set)";
  elif ! cmp -s "$f" "$here/$f"; then echo "  REVIEW  $f (changed outside the allowed set)"; fi
done
