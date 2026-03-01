# opencode
fish_add_path $HOME/.opencode/bin

# scripts
fish_add_path $HOME/.local/scripts

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH

# Local path
set --export PATH $HOME/.local/bin $PATH

# add Go bin to PATH (universal, persists)
set --export PATH $HOME/go/bin $PATH
