@echo off
setlocal EnableExtensions


title ClientConnect Agent Installer


echo =====================================
echo      Installing ClientConnect Agent
echo =====================================


:: -------------------------------------------------
:: Paths
:: -------------------------------------------------
set "TARGET=%ProgramFiles%\ClientConnectAgent"
set "CONFIG=%ProgramData%\ClientConnectAgent"
set "LOCALDATA=%LocalAppData%\ClientConnectAgent"

if not exist "%LOCALDATA%" mkdir "%LOCALDATA%"
set "TASKNAME=CRM-Agent"


:: -------------------------------------------------
:: Stop running agent
:: -------------------------------------------------
echo Stopping existing agent...
taskkill /IM agent-core.exe /F >nul 2>&1


:: -------------------------------------------------
:: Create folders
:: -------------------------------------------------
if not exist "%TARGET%" mkdir "%TARGET%"
if not exist "%CONFIG%" mkdir "%CONFIG%"


:: -------------------------------------------------
:: Copy application files
:: -------------------------------------------------
echo Copying application files...


copy /Y "%~dp0agent-core.exe" "%TARGET%\agent-core.exe" >nul
if errorlevel 1 (
echo ERROR: Failed to copy agent-core.exe
exit /b 1
)


copy /Y "%~dp0better_sqlite3.node" "%TARGET%\better_sqlite3.node" >nul
if errorlevel 1 (
echo ERROR: Failed to copy better_sqlite3.node
exit /b 1
)


copy /Y "%~dp0config.json" "%CONFIG%\config.json" >nul
if errorlevel 1 (
echo ERROR: Failed to copy config.json
exit /b 1
)


:: -------------------------------------------------
:: Create hidden launcher (VBScript)
:: -------------------------------------------------
echo Creating hidden launcher...


del /f /q "%TARGET%\run-agent.vbs" >nul 2>&1


echo Set WshShell = CreateObject("WScript.Shell") > "%TARGET%\run-agent.vbs"
echo WshShell.CurrentDirectory = "%TARGET%" >> "%TARGET%\run-agent.vbs"
echo WshShell.Run """%TARGET%\agent-core.exe""", 0, False >> "%TARGET%\run-agent.vbs"


if not exist "%TARGET%\run-agent.vbs" (
echo ERROR: Failed to create run-agent.vbs
exit /b 1
)


:: -------------------------------------------------
:: Remove old scheduled task
:: -------------------------------------------------
echo Removing old scheduled task...
schtasks /Delete /TN "%TASKNAME%" /F >nul 2>&1


:: -------------------------------------------------
:: Create startup task
:: -------------------------------------------------
echo Creating startup task...


schtasks /Create /F /RL HIGHEST /SC ONLOGON /TN "%TASKNAME%" /TR "\"%SystemRoot%\System32\wscript.exe\" \"%TARGET%\run-agent.vbs\""


if errorlevel 1 (
echo ERROR: Failed to create scheduled task.
exit /b 1
)


:: -------------------------------------------------
:: Start the agent immediately
:: -------------------------------------------------
echo Starting agent...
start "" wscript.exe "%TARGET%\run-agent.vbs"


timeout /t 3 >nul


tasklist | findstr /I "agent-core.exe" >nul
if errorlevel 1 (
echo WARNING: Agent did not start immediately.
) else (
echo Agent started successfully.
)


echo.
echo =====================================
echo Installation completed successfully.
echo =====================================


pause
endlocal
exit /b 0


