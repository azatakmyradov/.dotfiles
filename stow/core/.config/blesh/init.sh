# ble.sh settings, loaded by ble.sh itself. Suggestions are accepted with → or Ctrl+F.

# Skip the bell and the delay before the first suggestion appears.
bleopt edit_bell=
bleopt complete_auto_delay=1

# Like fish: suggest only at the end of the line, and only exact prefix matches, not
# ble.sh's fuzzy guesses shown in brackets.
bleopt complete_auto_complete_opts=syntax-suppress-ambiguous:suppress-inside-line

# [Colors] Fish's default theme, using only the 16 terminal colors so Ghostty's light and
# dark themes both apply: 1 red, 2 green, 3 yellow, 6 cyan, 7 white, 8 grey, 9 bright red,
# 14 bright cyan.
ble-face auto_complete=fg=8 disabled=fg=8

# Commands in the normal color, errors in bright red text.
ble-face command_builtin=none command_builtin_dot=none command_alias=none \
    command_function=none command_file=none command_keyword=none command_jobs=none \
    command_directory=underline syntax_command=none syntax_function_name=none
ble-face syntax_error=fg=9 argument_error=fg=9

# Arguments cyan, quotes yellow, expansions and escapes bright cyan, separators green,
# comments red.
ble-face syntax_default=fg=6 argument_option=fg=6
ble-face syntax_quoted=fg=3 syntax_quotation=fg=3 syntax_document=fg=3 syntax_document_begin=fg=3
ble-face syntax_escape=fg=14 syntax_param_expansion=fg=14 syntax_varname=fg=14 \
    syntax_glob=fg=14 syntax_brace=fg=14 syntax_tilde=fg=14 syntax_expr=fg=14 \
    syntax_history_expansion=fg=14
ble-face varname_array=fg=14 varname_empty=fg=14 varname_export=fg=14 varname_expr=fg=14 \
    varname_hash=fg=14 varname_new=fg=14 varname_number=fg=14 varname_readonly=fg=14 \
    varname_transform=fg=14 varname_unset=fg=14
ble-face syntax_delimiter=fg=2 syntax_comment=fg=1

# Existing paths keep the argument color and are underlined.
ble-face filename_directory=underline,fg=6 filename_directory_sticky=underline,fg=6 \
    filename_executable=underline,fg=6 filename_link=underline,fg=6 \
    filename_other=underline,fg=6 filename_url=underline,fg=6 \
    filename_ls_colors=underline,fg=6 filename_block=underline,fg=6 \
    filename_character=underline,fg=6 filename_pipe=underline,fg=6 \
    filename_socket=underline,fg=6 filename_setuid=underline,fg=6 \
    filename_setgid=underline,fg=6 \
    filename_orphan=underline,fg=9 filename_warning=underline,fg=9

# Completion list like fish's pager: plain candidates, matching prefix bold and underlined,
# descriptions yellow italic, selection reversed.
bleopt complete_menu_color=
ble-face menu_complete_match=bold,underline menu_complete_selected=reverse \
    menu_desc_default=fg=3,italic menu_filter_input=bold

# Selections and search matches: white on grey, bold.
ble-face region=fg=7,bg=8,bold region_match=fg=7,bg=8,bold region_target=fg=7,bg=8,bold \
    region_insert=fg=8

# Ghostty's bash hook prints a prompt-start mark that moves the cursor to a fresh line.
# When it ran after ble.sh had drawn the prompt (bash runs it natively right after
# ble.sh attaches, and ble.sh reruns PROMPT_COMMAND when a new tab resizes), the prompt
# was drawn again one row lower. Run it from a ble.sh hook instead, with the cursor
# moved back to the start of the prompt first.
bleopt prompt_command_changes_layout=1
function blerc/ghostty-hook {
    local status=$?
    declare -F __ghostty_hook >/dev/null || return 0
    if ! declare -F blerc/ghostty-hook/original >/dev/null; then
        eval "function blerc/ghostty-hook/original $(declare -f __ghostty_hook | tail -n +2)"
        function __ghostty_hook { :; }
    fi
    (exit "$status")
    blerc/ghostty-hook/original
}
blehook PRECMD+=blerc/ghostty-hook

# A blank line before each prompt, in place of Starship's add_newline, which ble.sh would
# draw twice on the first prompt. Once per command, not on every prompt redraw.
_blerc_prompt_spaced=
function blerc/prompt-spacer {
    [[ $_blerc_prompt_spaced ]] && return 0
    _blerc_prompt_spaced=1
    printf '\n'
}
blehook PRECMD+=blerc/prompt-spacer
blehook PREEXEC+='_blerc_prompt_spaced='

# Vi mode loads lazily, so its settings wait for it.
function blerc/vim-load-hook {
    # Like fish: no "-- INSERT --" status line, the cursor shape shows the mode.
    bleopt keymap_vi_mode_show=
    ble-bind -m vi_imap --cursor 6
    ble-bind -m vi_nmap --cursor 2

    # Like fish, Ctrl+C abandons the line for a fresh prompt instead of Vim's mode switch.
    ble-bind -m vi_imap -f C-c discard-line
    # From normal mode, enter insert mode first so the fresh prompt starts in insert mode.
    ble-bind -m vi_nmap -s C-c $'i\x03'

    # Ctrl+L clears the screen and Ctrl+A attaches tmux, from either mode.
    ble-bind -m vi_imap -f C-l clear-screen
    ble-bind -m vi_nmap -f C-l clear-screen
    ble-bind -m vi_imap -c C-a 'tmux a'
    ble-bind -m vi_nmap -c C-a 'tmux a'
}
blehook/eval-after-load keymap_vi blerc/vim-load-hook

# fzf: Ctrl+R history, Ctrl+T files, Alt+C directories.
ble-import -d integration/fzf-key-bindings
# zoxide's interactive `z foo<Space><Tab>` picker, adapted to ble.sh.
ble-import -d integration/zoxide
