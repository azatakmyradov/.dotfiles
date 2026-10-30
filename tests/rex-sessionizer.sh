#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/rex-sessionizer-test.XXXXXX")
trap 'rm -rf "$TMP_ROOT"' EXIT

HOME_DIR="$TMP_ROOT/home"
FAKE_BIN="$TMP_ROOT/bin"
ROWS="$TMP_ROOT/rows"
REX_CALLS="$TMP_ROOT/rex-calls"

fail() {
    printf 'FAIL: %s\n' "$*" >&2
    exit 1
}

mkdir -p \
    "$HOME_DIR/x3/team-a/project-a" \
    "$HOME_DIR/x3/team-b/project-b" \
    "$HOME_DIR/x3/team-b/shared" \
    "$HOME_DIR/direct/project-c" \
    "$HOME_DIR/direct/shared" \
    "$FAKE_BIN"
HOME_DIR=$(cd "$HOME_DIR" && pwd -P)

cat >"$FAKE_BIN/rex" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" >>"$REX_CALLS"
case "$*" in
    'hosts --json') printf '%s\n' "$REX_HOSTS" ;;
    'ls --json') printf '%s\n' "$REX_SESSIONS" ;;
    'new '*) printf '%s\n' '{"session_id":"session:new"}' ;;
    'client ls --json') printf '%s\n' '{"clients":[{"client_id":"client:test","info":{"kind":"app","label":"Mac"}}]}' ;;
    '-S Desktop --timeout 5s do sessionizer_projects') printf '%s\n' '{"projects":["/srv/desk/project-d"]}' ;;
    '-S Desktop --timeout 5s ls --json') printf '%s\n' '{"sessions":[]}' ;;
    '-S Desktop --timeout 5s new '*) printf '%s\n' '{"session_id":"session:desk"}' ;;
    '-S Desktop --timeout 5s client ls --json') printf '%s\n' '{"clients":[{"client_id":"client:cli","info":{"kind":"cli"}},{"client_id":"client:desk","info":{"kind":"app","label":"Mac"}}]}' ;;
esac
EOF

# Picks the row whose path ends with $FZF_PICK.
cat >"$FAKE_BIN/fzf" <<'EOF'
#!/bin/sh
awk -F '\t' -v rows="$FZF_ROWS" -v pick="$FZF_PICK" '
    { print > rows }
    substr($3, length($3) - length(pick) + 1) == pick { chosen = $0 }
    END { if (chosen != "") print chosen }'
EOF

chmod +x "$FAKE_BIN/rex" "$FAKE_BIN/fzf"

NO_HOSTS='{"hosts":[]}'

run_sessionizer() {
    : >"$REX_CALLS"
    HOME="$HOME_DIR" \
    PATH="$FAKE_BIN:$PATH" \
    REX_PROJECT_ROOTS='~/x3/*:~/direct' \
    REX_CALLS="$REX_CALLS" \
    REX_CLIENT=client:test \
    REX_SESSIONS="$1" \
    REX_HOSTS="${REX_HOSTS:-$NO_HOSTS}" \
    FZF_ROWS="$ROWS" \
    FZF_PICK="$2" \
        "$ROOT/stow/rex/.local/bin/rex-sessionizer"
}

# A new project gets a session labeled with its folder name.
run_sessionizer '{"sessions":[]}' /direct/project-c

expected=$(printf '%s\n' \
    "$HOME_DIR/direct/project-c" \
    "$HOME_DIR/direct/shared" \
    "$HOME_DIR/x3/team-a/project-a" \
    "$HOME_DIR/x3/team-b/project-b" \
    "$HOME_DIR/x3/team-b/shared" | sort)
actual=$(cut -f3 "$ROWS" | sort)
[[ "$actual" == "$expected" ]] || fail "unexpected project paths:\n$actual"

grep -Fxq -- "new project-c -c $HOME_DIR/direct/project-c --json" "$REX_CALLS" \
    || fail 'the selected project was not created'
grep -Fxq -- '-C client:test do session.select session_id=session:new' "$REX_CALLS" \
    || fail 'the new session was not selected'

# Projects sharing a folder name are labeled parent/name.
run_sessionizer '{"sessions":[]}' /team-b/shared
grep -Fxq -- "new team-b/shared -c $HOME_DIR/x3/team-b/shared --json" "$REX_CALLS" \
    || fail 'a duplicate folder name was not disambiguated'

# An open project is marked and selected without creating a session.
run_sessionizer '{"sessions":[{"session_id":"session:a","label":"project-a"}]}' /team-a/project-a
grep -Fq "● project-a — team-a" "$ROWS" || fail 'the open project was not marked'
grep -q '^new' "$REX_CALLS" && fail 'an open project created a new session'
grep -Fxq -- '-C client:test do session.select session_id=session:a' "$REX_CALLS" \
    || fail 'the open session was not selected'

# --list prints this machine's projects for other hosts' pickers.
listed=$(HOME="$HOME_DIR" REX_PROJECT_ROOTS='~/direct' "$ROOT/stow/rex/.local/bin/rex-sessionizer" --list)
[[ "$listed" == "$(printf '%s\n' "$HOME_DIR/direct/project-c" "$HOME_DIR/direct/shared")" ]] \
    || fail "unexpected --list output:\n$listed"

# A project on another host opens there, through the app's client on that host.
REX_HOSTS='{"hosts":[{"host":{"label":"Desktop"}}]}' run_sessionizer '{"sessions":[]}' /desk/project-d
grep -Fq "project-d — desk  [Desktop]" "$ROWS" || fail 'the remote project was not listed with its host'
grep -Fq "project-c — direct  [local]" "$ROWS" || fail 'the local project was not tagged local'
grep -Fxq -- '-S Desktop --timeout 5s new project-d -c /srv/desk/project-d --json' "$REX_CALLS" \
    || fail 'the remote session was not created on its host'
grep -Fxq -- '-S Desktop --timeout 5s -C client:desk do session.select session_id=session:desk' "$REX_CALLS" \
    || fail 'the remote session was not selected through the app on that host'

printf 'rex sessionizer tests: ok\n'
