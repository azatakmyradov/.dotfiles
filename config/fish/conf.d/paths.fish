# opencode
fish_add_path $HOME/.opencode/bin

# scripts
fish_add_path $HOME/.local/scripts

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH
