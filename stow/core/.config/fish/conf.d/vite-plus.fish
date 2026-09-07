# Vite+ bin (https://viteplus.dev)
if test -f "$HOME/.vite-plus/env.fish"
    # Keep the environment available to scripts; autoload the wrapper and completions.
    set -gx VP_HOME "$HOME/.vite-plus"
    fish_add_path --path --move "$VP_HOME/bin"
end
