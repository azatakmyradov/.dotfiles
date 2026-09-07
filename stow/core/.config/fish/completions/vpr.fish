function __vpr_complete
    set -l tokens (commandline --current-process --tokenize --cut-at-cursor)
    set -l current (commandline --current-token)
    set -l args $tokens[2..]
    set -l translated vp
    if test (count $args) -eq 0; and string match -qr '^-C' -- "$current"
        # Complete the global -C option before adding the run subcommand.
    else if test (count $args) -ge 1; and test "$args[1]" = -C
        set -a translated -C
        if test (count $args) -ge 2
            set -a translated "$args[2]" run $args[3..]
        end
    else if test (count $args) -ge 1; and string match -qr '^-C.+' -- "$args[1]"
        set -a translated "$args[1]" run $args[2..]
    else
        set -a translated run $args
    end
    VP_COMPLETE=fish command vp -- $translated $current
end

complete -c vpr --keep-order --exclusive --arguments '(__vpr_complete)'
