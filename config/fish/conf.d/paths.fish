# opencode
fish_add_path $HOME/.opencode/bin

# claude code
fish_add_path $HOME/.local/bin

# scripts
fish_add_path $HOME/.local/scripts

# bun
set --export BUN_INSTALL "$HOME/.bun"
fish_add_path $BUN_INSTALL/bin

# Local path
fish_add_path $HOME/.local/bin

# add Go bin to PATH (universal, persists)
set --export PATH $HOME/go/bin $PATH

# Composer
set --export PATH $HOME/.config/composer/vendor/bin $PATH
