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

function pwdcopy --description 'Copy the current directory to the clipboard using OSC 52'
    printf '\e]52;c;%s\a' (printf '%s' "$PWD" | base64 | tr -d '\n')
end

if status is-interactive
    # [Starship]
    starship init fish | source

    # [Zoxide]
    zoxide init fish | source
end

# [Device specific configuration that is not git tracked]
if test -f "$HOME/device.fish"
    source "$HOME/device.fish"
end

# pnpm
set -gx PNPM_HOME "/home/azatakmyradov/.local/share/pnpm"
if not string match -q -- "$PNPM_HOME/bin" $PATH
  set -gx PATH "$PNPM_HOME/bin" $PATH
end
# pnpm end
