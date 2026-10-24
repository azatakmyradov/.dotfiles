#!/usr/bin/env bash
set -euo pipefail

# Every way a shell can start must end up with the same PATH, without duplicates.

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
BASH_BIN=${BASH_BIN:-$(command -v bash)}
FAKE_HOME=$(mktemp -d)
trap 'rm -rf "$FAKE_HOME"' EXIT

fail() {
    printf 'FAIL: %s\n' "$*" >&2
    exit 1
}

cp -R "$ROOT/stow/core/." "$FAKE_HOME/"
mkdir -p "$FAKE_HOME/.local/bin" "$FAKE_HOME/.bun/bin" "$FAKE_HOME/.cargo/bin"

run_shell() {
    env -i HOME="$FAKE_HOME" TERM=dumb PATH=/usr/bin:/bin "$BASH_BIN" "$@" 2>/dev/null
}

print_path='printf "%s\n" "$PATH"'
login=$(run_shell -lc "$print_path")
# A non-login shell inherits PATH from its parent, which is a login shell.
interactive=$(env -i HOME="$FAKE_HOME" TERM=dumb PATH="$login" "$BASH_BIN" -ic "$print_path" 2>/dev/null)
login_interactive=$(run_shell -lic "$print_path")
nested=$(run_shell -lc "\"$BASH_BIN\" -lic '$print_path'")
resourced=$(run_shell -lc ". \"\$HOME/.config/shell/env.sh\"; . \"\$HOME/.config/shell/env.sh\"; $print_path")

for name in interactive login_interactive nested resourced; do
    [[ ${!name} == "$login" ]] || fail "$name PATH differs from login PATH:
  login: $login
  $name: ${!name}"
done

duplicates=$(tr : '\n' <<<"$login" | sort | uniq -d)
[[ -z $duplicates ]] || fail "duplicate PATH entries: $duplicates"

[[ $login == "$FAKE_HOME/.local/bin:"* ]] || fail "~/.local/bin is not first: $login"
[[ :$login: == *":$FAKE_HOME/.bun/bin:"* ]] || fail "bun missing: $login"
[[ :$login: == *":$FAKE_HOME/.cargo/bin:"* ]] || fail "cargo missing: $login"
if [[ -d /opt/homebrew ]]; then
    [[ :$login: == *":/opt/homebrew/bin:"* ]] || fail "Homebrew missing: $login"
fi

printf 'shell-env: all checks passed\n'
