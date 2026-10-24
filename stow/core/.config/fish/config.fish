set -gx XFISH_PATH (command -v fish)

# [This is only CachyOS specific]
if test -f /usr/share/cachyos-fish-config/cachyos-config.fish
    if status is-interactive
        source /usr/share/cachyos-fish-config/cachyos-config.fish
    else
        # Preserve the distro environment without loading aliases and key bindings.
        set -gx MANROFFOPT -c
        set -gx MANPAGER "sh -c 'col -bx | bat -l man -p'"
        if test -f "$HOME/.fish_profile"
            source "$HOME/.fish_profile"
        end
        fish_add_path ~/.local/bin ~/.cargo/bin ~/Applications/depot_tools
    end
end

# overwrite greeting
# potentially disabling fastfetch
function fish_greeting
    # disabled
end

# A blank line before each prompt; Starship's add_newline is off for ble.sh in bash.
function __prompt_spacer --on-event fish_prompt
    echo
end

function pwdcopy --description 'Copy the current directory to the clipboard using OSC 52'
    printf '\e]52;c;%s\a' (printf '%s' "$PWD" | base64 | tr -d '\n')
end

if status is-interactive
    # A tool's init script only changes with its binary, so cache it per Homebrew version path.
    function __source_cached_init --argument-names tool
        set -l bin (path resolve (command -s $tool))
        set -l cache ~/.cache/fish/$tool-init.fish
        if not test -f $cache; or not read -l cached_bin <$cache; or test "$cached_bin" != "# $bin"
            mkdir -p (path dirname $cache)
            begin
                echo "# $bin"
                $argv[2..]
            end >$cache
        end
        source $cache
    end

    # [Starship]
    __source_cached_init starship starship init fish --print-full-init

    # [Zoxide]
    __source_cached_init zoxide zoxide init fish

    functions --erase __source_cached_init
end

# [Device specific configuration that is not git tracked]
if test -f "$HOME/device.fish"
    source "$HOME/device.fish"
end

# pnpm
if test -d /System/Library
  set -gx PNPM_HOME "$HOME/Library/pnpm"
else
  set -gx PNPM_HOME "$HOME/.local/share/pnpm"
end
if not string match -q -- "$PNPM_HOME/bin" $PATH
  set -gx PATH "$PNPM_HOME/bin" $PATH
end
# pnpm end

# Added by the cua installer
fish_add_path "/Users/azatakmyradov/.local/bin"
