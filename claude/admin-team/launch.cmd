@echo off
rem Starts the "admin team" session minimized, Remote Control-enabled, as the
rem admin-team agent, on the model its brief sets, with its own settings. Run from
rem anywhere. The pipeline (admin-team skill) calls this when ListAgents shows
rem no "admin team" row.
rem Resume after a restart instead with:  claude --resume "admin team"
setlocal
rem The calling session's own Claude variables (its session id, pid, agent,
rem messaging socket and token) are cleared first, so the team starts with the
rem environment of a session typed in a new terminal. Each is named: a prefix
rem match would also clear the user's own variables.
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
set "HOME_DIR=%USERPROFILE%\.claude\admin-team"
if not exist "%HOME_DIR%\ledger.jsonl" type nul > "%HOME_DIR%\ledger.jsonl"
cd /d "%HOME_DIR%"
start "admin team" /min claude -n "admin team" --remote-control --agent admin-team --settings "%HOME_DIR%\settings.json"
endlocal
