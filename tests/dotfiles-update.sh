#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/dotfiles-update-test.XXXXXX")
TMP_ROOT=$(cd -- "$TMP_ROOT" && pwd -P)
trap 'rm -rf "$TMP_ROOT"' EXIT

REMOTE="$TMP_ROOT/remote.git"
SEED="$TMP_ROOT/seed"
REPO="$TMP_ROOT/repo"
HOME_DIR="$TMP_ROOT/home"
FAKE_BIN="$TMP_ROOT/bin"
COMMAND_LOG="$TMP_ROOT/commands.log"

fail() {
    printf 'FAIL: %s\n' "$*" >&2
    exit 1
}

assert_contains() {
    local output=$1 expected=$2
    grep -Fq -- "$expected" <<<"$output" || fail "expected output to contain: $expected"
}

assert_empty() {
    local path=$1
    [[ ! -s "$path" ]] || fail "expected $path to be empty"
}

mkdir -p "$SEED/bin" \
    "$SEED/stow/core" \
    "$SEED/stow/herdr/.config/herdr" \
    "$SEED/stow/herdr/.local/bin" \
    "$SEED/stow/ghostty/.config/ghostty" \
    "$SEED/stow/linux/.config" \
    "$HOME_DIR" \
    "$FAKE_BIN"
cp "$ROOT/bin/dotfiles" "$SEED/bin/dotfiles"
printf 'fixture\n' >"$SEED/stow/core/.hushlogin"
printf 'fixture\n' >"$SEED/stow/herdr/.config/herdr/config.toml"
printf '#!/bin/sh\n' >"$SEED/stow/herdr/.local/bin/herdr-sessionizer"
chmod +x "$SEED/stow/herdr/.local/bin/herdr-sessionizer"
printf 'fixture\n' >"$SEED/stow/ghostty/.config/ghostty/config"
printf 'fixture\n' >"$SEED/stow/linux/.config/linux-fixture"

git init --bare -q "$REMOTE"
git -C "$SEED" init -q -b main
git -C "$SEED" config user.name Test
git -C "$SEED" config user.email test@example.com
git -C "$SEED" add .
git -C "$SEED" commit -qm initial
git -C "$SEED" remote add origin "$REMOTE"
git -C "$SEED" push -qu origin main
git --git-dir="$REMOTE" symbolic-ref HEAD refs/heads/main
git clone -q "$REMOTE" "$REPO"
git -C "$REPO" config user.name Test
git -C "$REPO" config user.email test@example.com

cat >"$FAKE_BIN/uname" <<'EOF'
#!/bin/sh
printf '%s\n' "${TEST_UNAME:-Darwin}"
EOF

for command in brew stow fish starship pi pacman sudo paru herdr; do
    cat >"$FAKE_BIN/$command" <<EOF
#!/bin/sh
printf '%s %s\\n' '$command' "\$*" >>"$COMMAND_LOG"
if [ '$command' = pi ] && [ "\${1:-}" = list ]; then
    printf '%s\\n' 'git:github.com/azatakmyradov/pi-setup.git'
    if [ -d "\$HOME/personal/pi-setup" ]; then
        printf '%s\\n' "\$HOME/personal/pi-setup"
    fi
fi
EOF
    chmod +x "$FAKE_BIN/$command"
done
chmod +x "$FAKE_BIN/uname"

export HOME="$HOME_DIR"
export PATH="$FAKE_BIN:/usr/bin:/bin:/usr/sbin:/sbin"
export COMMAND_LOG

# A dry run uses workstation by default and does not execute external commands.
output=$("$REPO/bin/dotfiles" update --dry-run)
assert_contains "$output" "git -C $REPO pull --ff-only"
assert_contains "$output" 'brew update'
assert_contains "$output" "$REPO/bin/dotfiles doctor workstation"
assert_empty "$COMMAND_LOG"

# Pi setup is cloned into ~/personal and registered as a local package.
output=$("$REPO/bin/dotfiles" update pi --dry-run)
assert_contains "$output" "git clone https://github.com/azatakmyradov/pi-setup.git $HOME/personal/pi-setup"
assert_contains "$output" "$FAKE_BIN/pi remove git:github.com/azatakmyradov/pi-setup.git"
assert_contains "$output" "$FAKE_BIN/pi install $HOME/personal/pi-setup"
assert_contains "$output" 'brew install node'
assert_contains "$output" "$FAKE_BIN/pi update --all"
assert_contains "$output" "$REPO/bin/dotfiles doctor pi"

# Existing Pi checkouts are updated only when clean and fast-forwardable.
mkdir -p "$HOME/personal"
git clone -q "$REMOTE" "$HOME/personal/pi-setup"
output=$("$REPO/bin/dotfiles" update pi --dry-run)
assert_contains "$output" "git -C $HOME/personal/pi-setup pull --ff-only"
printf 'dirty\n' >"$HOME/personal/pi-setup/untracked"
if output=$("$REPO/bin/dotfiles" update pi --dry-run 2>&1); then
    fail 'dirty pi-setup worktree unexpectedly succeeded'
fi
assert_contains "$output" 'pi-setup worktree has local changes'
rm "$HOME/personal/pi-setup/untracked"

# Arch updates use a full system upgrade and refresh direct/AUR applications.
output=$(TEST_UNAME=Linux "$REPO/bin/dotfiles" update workstation --dry-run)
assert_contains "$output" 'sudo pacman -Syu'
assert_contains "$output" "$FAKE_BIN/herdr update"
assert_contains "$output" 'paru -Syu --needed ghostty helium-browser-bin'

# A successful update pulls, re-executes, upgrades, restows, and runs doctor.
ln -s "$REPO/stow/core/.hushlogin" "$HOME/.hushlogin"
: >"$COMMAND_LOG"
output=$("$REPO/bin/dotfiles" update core)
assert_contains "$output" 'All checks passed.'
assert_contains "$(<"$COMMAND_LOG")" 'brew update'
assert_contains "$(<"$COMMAND_LOG")" 'brew install stow fish starship'
assert_contains "$(<"$COMMAND_LOG")" 'brew upgrade stow fish starship'
assert_contains "$(<"$COMMAND_LOG")" "stow --no-folding --restow --dir $REPO/stow --target $HOME core"

# Invalid targets are rejected before Git or package-manager activity.
: >"$COMMAND_LOG"
if output=$("$REPO/bin/dotfiles" update invalid 2>&1); then
    fail 'invalid target unexpectedly succeeded'
fi
assert_contains "$output" 'unknown target: invalid'
assert_empty "$COMMAND_LOG"

# Tracked and untracked worktree changes are rejected, including in dry-run mode.
printf 'dirty\n' >"$REPO/untracked"
if output=$("$REPO/bin/dotfiles" update core --dry-run 2>&1); then
    fail 'dirty worktree unexpectedly succeeded'
fi
assert_contains "$output" 'worktree has local changes'
rm "$REPO/untracked"

# A diverged branch fails at the fast-forward-only pull before software updates.
git -C "$REPO" commit --allow-empty -qm local
OTHER="$TMP_ROOT/other"
git clone -q "$REMOTE" "$OTHER"
git -C "$OTHER" config user.name Test
git -C "$OTHER" config user.email test@example.com
git -C "$OTHER" commit --allow-empty -qm remote
git -C "$OTHER" push -q origin main
: >"$COMMAND_LOG"
if output=$("$REPO/bin/dotfiles" update core 2>&1); then
    fail 'diverged branch unexpectedly succeeded'
fi
assert_contains "$output" 'Not possible to fast-forward'
assert_empty "$COMMAND_LOG"

printf 'dotfiles update tests: ok\n'
