HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt appendhistory

# Enable Starship
eval "$(starship init zsh)"

# Pull in zsh-autosuggestions
source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh

# [Local vendor and node_modules]
export PATH="./vendor/bin/:$PATH"
export PATH="./node_modules/.bin/:$PATH"

# [Bun]
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# [Personal scripts]
export PATH="$HOME/.local/scripts:$PATH"

# [Composer Global]
export PATH="$HOME/.config/composer/vendor/bin:$PATH"

# [Global Composer Path]
export PATH="$HOME/.composer/vendor/bin:$PATH"

# [Flutter]
export PATH="$HOME/development/flutter/bin:$PATH"

# [Golang]
export PATH="$HOME/go/bin:$PATH"

# [tmux]
bindkey -s ^f "tmux-sessionizer\n"
bindkey -s ^a "tmux a\n"
bindkey -s ^x "tmux-cht.sh\n"

# [Set terminal to xterm-256color for tmux to work properly]
export TERM=xterm-256color

setopt autocd

# Preferred editor for local and remote sessions
if [[ -n $SSH_CONNECTION ]]; then
  export EDITOR='vim'
else
  export EDITOR='nvim'
fi

if [ -f ~/.zsh_aliases ]; then
    source ~/.zsh_aliases
fi

if [ -f ~/.zsh_profile ]; then
    source ~/.zsh_profile
fi

if [[ $(uname) != "Darwin" ]]; then
    source ~/.zsh_linux
elif [[ $(uname) == "Darwin" ]]; then
    source ~/.zsh_mac
fi

if [ -f ~/.zsh_untracked ]; then
    # Local only ZSH files
    source ~/.zsh_untracked
fi
