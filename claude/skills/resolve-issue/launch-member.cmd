@echo off
rem Starts one member of a /resolve-issue chain: a named, Remote
rem Control-enabled background session (claude --bg, no window) in the current
rem directory (the repository's main checkout), running /resolve-issue on one
rem sub-issue with the chain's flags. It prints the member's id on its
rem "backgrounded" line; the chain session stops the member with
rem claude stop <id> once it has ended.
rem The chain session calls it (resolve-issue skill, "Chain members"):
rem   launch-member.cmd <session-name> <sub-issue> <tracking-issue> "<flags>"
rem The flags are the chain's prompt flags as one argument, empty when none is
rem in force. --remote-control comes before -n: it takes an optional name of
rem its own and would take the word after it for one.
rem The calling session's own Claude variables (its session id, pid, agent,
rem messaging socket and token) are cleared first, so the member starts with
rem the environment of a session typed in a new terminal. Each is named: a
rem prefix match would also clear the user's own variables.
setlocal
set "CLAUDECODE="
set "CLAUDE_CODE_AGENT="
set "CLAUDE_CODE_BRIDGE_SESSION_ID="
set "CLAUDE_CODE_CHILD_SESSION="
set "CLAUDE_CODE_ENTRYPOINT="
set "CLAUDE_CODE_EXECPATH="
set "CLAUDE_CODE_MESSAGING_SOCKET="
set "CLAUDE_CODE_MESSAGING_TOKEN="
set "CLAUDE_CODE_SESSION_ATTENDED="
set "CLAUDE_CODE_SESSION_ID="
set "CLAUDE_EFFORT="
set "CLAUDE_PID="
set "NAME=%~1"
set "SUB=%~2"
set "CHAIN=%~3"
set "FLAGS=%~4"
if "%NAME%"=="" exit /b 2
if "%SUB%"=="" exit /b 2
if "%CHAIN%"=="" exit /b 2
claude --bg --remote-control -n "%NAME%" "/resolve-issue %SUB% --chain %CHAIN% %FLAGS%"
exit /b %ERRORLEVEL%
