status --is-interactive; or return

# # [Vi mode]
# fish_vi_key_bindings
# set -g fish_escape_delay_ms 10
#
# # [Tmux]
# bind \ca 'commandline -r "tmux a"; commandline -f execute'

# [Vi mode]
fish_vi_key_bindings
set -g fish_escape_delay_ms 10

# [Tmux]
bind -M insert \ca 'commandline -r "tmux a"; commandline -f execute'
bind -M default \ca 'commandline -r "tmux a"; commandline -f execute'
