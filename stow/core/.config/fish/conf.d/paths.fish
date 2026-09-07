# User executables
fish_add_path $HOME/.local/bin

# bun
set --export BUN_INSTALL "$HOME/.bun"
fish_add_path $BUN_INSTALL/bin

# Go
fish_add_path --path $HOME/go/bin

# Composer
fish_add_path --path $HOME/.config/composer/vendor/bin
