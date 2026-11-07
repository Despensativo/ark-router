cmd_wrapper(){
    # $1: the symbolic name of the command for informative output
    # $2: the name of the binary to call (potentially including the full path)
    # $3-$end: the actual arguments for $2
    local CALLERID
    local CMD_BINARY
    local LAST_ERROR
    local RET
    local ERRLOG

    CALLERID=$1 ; shift 1   # extract and remove the id string
    CMD_BINARY=$1 ; shift 1 # extract and remove the binary

    # Handle silencing of errors from callers
    ERRLOG="sqm_error"
    if [ "$SILENT" -eq "1" ]; then
        ERRLOG="sqm_debug"
        sqm_debug "cmd_wrapper: ${CALLERID}: invocation silenced by request, FAILURE either expected or acceptable."
        # The busybox shell doesn't understand the concept of an inline variable
        # only applying to a single command, so we need to reset SILENT
        # afterwards. Ugly, but it works...
        SILENT=0
    fi

    sqm_trace "cmd_wrapper: COMMAND: ${CMD_BINARY} $@"
    LAST_ERROR=$( ${CMD_BINARY} "$@" 2>&1 )
    RET=$?

    if [ "$RET" -eq "0" ] ; then
        sqm_debug "cmd_wrapper: ${CALLERID}: SUCCESS: ${CMD_BINARY} $@"
    else
        # this went south, try to capture & report more detail
        $ERRLOG "cmd_wrapper: ${CALLERID}: FAILURE (${RET}): ${CMD_BINARY} $@"
        $ERRLOG "cmd_wrapper: ${CALLERID}: LAST ERROR: ${LAST_ERROR}"
    fi

    return $RET
}
