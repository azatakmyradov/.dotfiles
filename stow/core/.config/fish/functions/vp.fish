# Vite+ needs to apply `vp env use` changes in the current shell.
function vp
    set -l command_index 1
    if test (count $argv) -ge 1
        if test "$argv[1]" = "-C"
            set command_index 3
        else if string match -qr '^-C.+' -- "$argv[1]"
            set command_index 2
        end
    end
    set -l next_index (math $command_index + 1)

    if test (count $argv) -ge $next_index; and test "$argv[$command_index]" = env; and test "$argv[$next_index]" = use
        if contains -- -h $argv; or contains -- --help $argv
            command vp $argv
            return $status
        end
        set -lx VP_ENV_USE_EVAL_ENABLE 1
        set -lx VP_SHELL fish
        set -l output (command vp $argv); or return $status
        for line in $output
            eval $line; or return $status
        end
        return 0
    end

    command vp $argv
end
