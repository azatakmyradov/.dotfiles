# Add zsh-autosuggestions
source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh

# Path to your Oh My Zsh installation.
export ZSH=$HOME/.oh-my-zsh

ZSH_THEME="robbyrussell"

zstyle ':omz:update' mode auto      # update automatically without asking

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
COMPLETION_WAITING_DOTS="true"

plugins=(
  git
  zsh-autosuggestions
)

source $ZSH/oh-my-zsh.sh

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

# Customize to your needs...
if [ -f ~/.zsh_custom ]; then
    source ~/.zsh_custom
fi
