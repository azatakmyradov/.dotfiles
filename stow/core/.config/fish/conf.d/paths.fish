# User executables
fish_add_path $HOME/.local/bin

# bun
set --export BUN_INSTALL "$HOME/.bun"
fish_add_path $BUN_INSTALL/bin

# add Go bin to PATH (universal, persists)
set --export PATH $HOME/go/bin $PATH

# Composer
set --export PATH $HOME/.config/composer/vendor/bin $PATH
