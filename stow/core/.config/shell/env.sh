# Environment shared by every shell. Safe to source repeatedly: each run
# produces the same PATH order no matter what the parent shell exported.

# Move a directory to the front of PATH, skipping ones that do not exist.
__path_prepend() {
    [ -d "$1" ] || return 0
    __path=":$PATH:"
    while case $__path in *":$1:"*) true ;; *) false ;; esac; do
        __path="${__path%%":$1:"*}:${__path#*":$1:"}"
    done
    __path="${__path#:}"
    __path="${__path%:}"
    PATH="$1${__path:+:$__path}"
    unset __path
}

# Add a directory to the end of PATH unless it is already present.
__path_append() {
    [ -d "$1" ] || return 0
    case ":$PATH:" in
        *":$1:"*) ;;
        *) PATH="${PATH:+$PATH:}$1" ;;
    esac
}

# What `brew shellenv` prints, without starting brew on every shell.
if [ -d /opt/homebrew ]; then
    export HOMEBREW_PREFIX=/opt/homebrew
    export HOMEBREW_CELLAR=/opt/homebrew/Cellar
    export HOMEBREW_REPOSITORY=/opt/homebrew
    __path_prepend /opt/homebrew/sbin
    __path_prepend /opt/homebrew/bin
    export MANPATH=":${MANPATH#:}"
    case ":${INFOPATH-}:" in
        *:/opt/homebrew/share/info:*) ;;
        *) export INFOPATH="/opt/homebrew/share/info:${INFOPATH-}" ;;
    esac
fi

# Vite+ (https://viteplus.dev). Its env file also defines the `vp` wrapper and
# bash completions, so source it before our own entries take precedence.
if [ -f "$HOME/.vite-plus/env" ]; then
    . "$HOME/.vite-plus/env"
fi

# bun
export BUN_INSTALL="$HOME/.bun"

# pnpm
if [ -d /System/Library ]; then
    export PNPM_HOME="$HOME/Library/pnpm"
else
    export PNPM_HOME="$HOME/.local/share/pnpm"
fi

# User executables, highest priority last.
__path_prepend "$BUN_INSTALL/bin"
__path_prepend "$HOME/.opencode/bin"
__path_prepend "$HOME/.local/bin"

# Language toolchains, after system paths.
__path_append "$PNPM_HOME/bin"
__path_append "$PNPM_HOME"
__path_append "$HOME/.cargo/bin"
__path_append "$HOME/.config/composer/vendor/bin"
__path_append "$HOME/go/bin"

export PATH
unset -f __path_prepend __path_append

# [Device specific configuration that is not git tracked]
if [ -f "$HOME/device.sh" ]; then
    . "$HOME/device.sh"
fi
