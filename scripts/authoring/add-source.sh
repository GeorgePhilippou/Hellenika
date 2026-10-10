#!/bin/sh
# Add a bibliography entry: scripts/authoring/add-source.sh id "Author" year "Title"
set -e
f="content/sources/$1.md"
[ -f "$f" ] && { echo "exists: $1"; exit 0; }
n=$(grep -h '^_order' content/sources/*.md | awk '{print $2}' | sort -n | tail -1)
printf -- '---\nid: %s\nauthor: %s\nyear: %s\ntitle: "%s"\nkind: modern\n_order: %s\n---\n' "$1" "$2" "$3" "$4" "$((n+1))" > "$f"
echo "added $f"
