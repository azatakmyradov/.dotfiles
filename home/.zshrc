HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt appendhistory
setopt share_history
setopt hist_ignore_all_dups
setopt hist_reduce_blanks
setopt hist_verify

# Completions (only rebuild cache once per day)
autoload -Uz compinit
if [[ -n ~/.zcompdump(#qN.mh+24) ]]; then
    compinit
else
    compinit -C
fi

# Enable Starship
eval "$(starship init zsh)"

# Pull in zsh-autosuggestions
[[ -f ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh ]] && source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh

# opencode
export PATH="$HOME/.opencode/bin:$PATH"

# [Local vendor and node_modules]
# NOTE: Relative paths - executables resolve from current directory
export PATH="./vendor/bin/:$PATH"
export PATH="./node_modules/.bin/:$PATH"

# [Bun]
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
bindkey -s ^w 'tmux-sessionizer $(pwd)\n'
bindkey -s ^a "tmux a\n"
bindkey -s ^x "tmux-cht.sh\n"

setopt autocd

# Preferred editor for local and remote sessions
if [[ -n $SSH_CONNECTION ]]; then
  export EDITOR='vim'
else
  export EDITOR='nvim'
fi

[[ -f ~/.zsh_aliases ]] && source ~/.zsh_aliases
[[ -f ~/.zsh_profile ]] && source ~/.zsh_profile

OS_TYPE=$(uname)
if [[ $OS_TYPE != "Darwin" ]]; then
    source ~/.zsh_linux
else
    source ~/.zsh_mac
fi

# Local only ZSH files
[[ -f ~/.zsh_untracked ]] && source ~/.zsh_untracked
