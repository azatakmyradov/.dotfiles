set -gx XFISH_PATH (command -v fish)

# [This is only CachyOS specific]
if test -f /usr/share/cachyos-fish-config/cachyos-config.fish
    source /usr/share/cachyos-fish-config/cachyos-config.fish
end

# overwrite greeting
# potentially disabling fastfetch
function fish_greeting
    # disabled
end

# [Starship]
starship init fish | source

# [Device specific configuration that is not git tracked]
if test -f "$HOME/device.fish"
    source "$HOME/device.fish"
end
