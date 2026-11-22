# Background commands
{"name":"Background commands","code":"G-P-BC","id":145,"pointerMark":6}

## Keep each command short and in the foreground
{"name":"Keep each command short and in the foreground","code":"G-P-BC-K","id":1136}

Start no command in the background, and keep each command shorter than 180 seconds. The harness
moves a command still running at its timeout to the background, and an agent spawned in the
background gets a timeout of at most 180 seconds, whatever its call asks for. Split a longer run
into parts that each finish within that time.

## Wait for a command moved to the background
{"name":"Wait for a command moved to the background","code":"G-P-BC-W","id":1137}

When a command of yours is moved to the background all the same, wait for it to end before your
turn ends.
