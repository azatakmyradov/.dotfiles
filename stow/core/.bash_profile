# Login shells: interactive ones get everything from .bashrc, which loads the
# environment itself; other login shells only need the environment.
if [[ $- == *i* ]]; then
    . "$HOME/.bashrc"
else
    . "$HOME/.config/shell/env.sh"
fi
