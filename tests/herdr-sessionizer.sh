#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/herdr-sessionizer-test.XXXXXX")
trap 'rm -rf "$TMP_ROOT"' EXIT

HOME_DIR="$TMP_ROOT/home"
FAKE_BIN="$TMP_ROOT/bin"
ROWS="$TMP_ROOT/rows"
HERDR_CALL="$TMP_ROOT/herdr-call"

fail() {
    printf 'FAIL: %s\n' "$*" >&2
    exit 1
}

mkdir -p \
    "$HOME_DIR/x3/team-a/project-a" \
    "$HOME_DIR/x3/team-b/project-b" \
    "$HOME_DIR/direct/project-c" \
    "$FAKE_BIN"

cat >"$FAKE_BIN/herdr" <<'EOF'
#!/bin/sh
if [ "$1 $2" = "api snapshot" ]; then
    printf '%s\n' '{"result":{"snapshot":{"panes":[]}}}'
    exit 0
fi
printf '%s\n' "$*" >"$HERDR_CALL"
EOF

cat >"$FAKE_BIN/fzf" <<'EOF'
#!/bin/sh
awk -v rows="$FZF_ROWS" '{ print > rows; if (NR == 1) first = $0 } END { if (NR) print first }'
EOF

chmod +x "$FAKE_BIN/herdr" "$FAKE_BIN/fzf"

HOME="$HOME_DIR" \
PATH="$FAKE_BIN:$PATH" \
HERDR_PROJECT_ROOTS='~/x3/*:~/direct' \
HERDR_CALL="$HERDR_CALL" \
FZF_ROWS="$ROWS" \
    "$ROOT/stow/herdr/.local/bin/herdr-sessionizer"

expected=$(printf '%s\n' \
    "$HOME_DIR/direct/project-c" \
    "$HOME_DIR/x3/team-a/project-a" \
    "$HOME_DIR/x3/team-b/project-b" | sort)
actual=$(cut -f2 "$ROWS" | sort)
[[ "$actual" == "$expected" ]] || fail "unexpected project paths:\n$actual"

grep -Fq -- "workspace create --cwd $HOME_DIR/direct/project-c --label project-c --focus" "$HERDR_CALL" \
    || fail 'the selected project was not opened'

printf 'herdr sessionizer tests: ok\n'
