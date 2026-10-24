[[ $- == *i* ]] || return

# [ble.sh] Fish-like autosuggestions and syntax highlighting; settings live in
# ~/.config/blesh/init.sh. It attaches at the first prompt rather than at the end of this
# file, because Ghostty's shell integration sources .bashrc and installs its hooks after.
if [[ -f ~/.local/share/blesh/ble.sh ]]; then
    . ~/.local/share/blesh/ble.sh --attach=prompt
fi

. "$HOME/.config/shell/env.sh"

# [History]
HISTSIZE=100000
HISTFILESIZE=100000
HISTCONTROL=ignoreboth:erasedups
shopt -s histappend
PROMPT_COMMAND="history -a${PROMPT_COMMAND:+; $PROMPT_COMMAND}"

shopt -s autocd cdspell checkwinsize globstar

# [Completion]
# Homebrew links most completions into a "compat" directory that bash-completion sources
# eagerly. Expose it to the lazy loader instead, so each one loads on first use.
if [[ -d /opt/homebrew/etc/bash_completion.d ]]; then
    if [[ ! -L ~/.cache/bash/brew-completion/completions ]]; then
        mkdir -p ~/.cache/bash/brew-completion
        ln -s /opt/homebrew/etc/bash_completion.d ~/.cache/bash/brew-completion/completions
    fi
    BASH_COMPLETION_USER_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion:$HOME/.cache/bash/brew-completion"
    BASH_COMPLETION_COMPAT_DIR=/var/empty
fi
if [[ -r /opt/homebrew/etc/profile.d/bash_completion.sh ]]; then
    . /opt/homebrew/etc/profile.d/bash_completion.sh
elif [[ -r /usr/share/bash-completion/bash_completion ]]; then
    . /usr/share/bash-completion/bash_completion
fi

set -o vi

# Without ble.sh, plain readline handles fzf and the custom keys.
if [[ ! ${BLE_VERSION-} ]]; then
    # [fzf] Ctrl+R history, Ctrl+T files, Alt+C directories. Only the key bindings:
    # fzf's completion script replaces bash-completion for many commands.
    if [[ -r /opt/homebrew/opt/fzf/shell/key-bindings.bash ]]; then
        . /opt/homebrew/opt/fzf/shell/key-bindings.bash
    elif [[ -r /usr/share/fzf/key-bindings.bash ]]; then
        . /usr/share/fzf/key-bindings.bash
    fi

    # [Vi mode] Ctrl+A attaches tmux from either mode.
    bind -m vi-insert '"\e[99~": kill-whole-line'
    bind -m vi-insert '"\C-a": "\e[99~tmux a\C-m"'
    bind -m vi-command '"\C-a": "i\C-a"'

    # A blank line before each prompt; Starship's add_newline is off for ble.sh.
    PROMPT_COMMAND+="; echo"
fi

pwdcopy() {
    printf '\e]52;c;%s\a' "$(printf '%s' "$PWD" | base64 | tr -d '\n')"
}

. "$HOME/.config/bash/aliases.bash"

# A tool's init script only changes with its binary, so cache it per Homebrew version path.
# The loadable realpath builtin avoids spawning a process per tool.
enable -f realpath realpath 2>/dev/null
__source_cached_init() {
    local tool=$1 bin header cache="$HOME/.cache/bash/$1-init.bash"
    bin=$(type -P "$tool") || return 0
    bin=$(realpath "$bin")
    { read -r header <"$cache"; } 2>/dev/null
    if [[ $header != "# $bin" ]]; then
        mkdir -p "${cache%/*}"
        { printf '# %s\n' "$bin"; "${@:2}"; } >"$cache"
    fi
    . "$cache"
}

# [Starship]
__source_cached_init starship starship init bash --print-full-init

# [Zoxide]
__source_cached_init zoxide zoxide init bash

unset -f __source_cached_init
