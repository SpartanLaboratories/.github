@echo off
rem Starts the "admin team" session minimized, Remote Control-enabled, as the
rem admin-team agent, with its own settings. Run from anywhere. The pipeline
rem (admin-team skill) calls this when ListAgents shows no "admin team" row.
rem Resume after a restart instead with:  claude --resume "admin team"
setlocal
set "HOME_DIR=%USERPROFILE%\.claude\admin-team"
if not exist "%HOME_DIR%\ledger.jsonl" type nul > "%HOME_DIR%\ledger.jsonl"
cd /d "%HOME_DIR%"
start "admin team" /min claude -n "admin team" --remote-control --agent admin-team --settings "%HOME_DIR%\settings.json"
endlocal
