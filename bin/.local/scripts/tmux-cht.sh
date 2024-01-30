#!/usr/bin/env bash

language_list="golang solidity vlang v nodejs javascript tmux typescript zsh cpp c lua rust python bash php haskell ArnoldC css html gdb"
utils_list="find man tldr sed awk tr cp ls grep xargs rg ps mv kill lsof less head tail tar cp rm rename jq cat ssh cargo git git-worktree git-status git-commit git-rebase docker docker-compose stow chmod chown make"

languages=$(echo "$language_list" | tr " " "\n")
core_utils=$(echo "$utils_list" | tr " " "\n")
selected=$(echo -e "$languages\n$core_utils" | fzf)

if [[ "${#selected}" -eq 0 ]]; then
    echo "Input not received"
    exit 0
fi

read -p "Enter query: " query

if echo "$languages" | grep -qs $selected; then
    tmux new-window bash -c "curl cht.sh/$selected/$(echo "$query" | tr " " "+") | less"
else
    tmux new-window bash -c "curl cht.sh/$selected~$query | less"
fi
