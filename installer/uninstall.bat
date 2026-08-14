@echo off
setlocal EnableExtensions

title ClientConnect Agent Uninstaller

echo =====================================
echo        Uninstalling ClientConnect Agent
echo =====================================

:: -------------------------------------------------
:: Paths
:: -------------------------------------------------
set "TARGET=%ProgramFiles%\ClientConnectAgent"
set "CONFIG=%ProgramData%\ClientConnectAgent"
set "LOCALDATA=%LocalAppData%\ClientConnectAgent"
set "TASKNAME=CRM-Agent"

:: -------------------------------------------------
:: Stop running agent
:: -------------------------------------------------
echo Stopping running agent...
taskkill /IM agent-core.exe /F >nul 2>&1
taskkill /IM wscript.exe /F >nul 2>&1

:: -------------------------------------------------
:: Remove scheduled task
:: -------------------------------------------------
echo Removing scheduled task...
schtasks /Delete /TN "%TASKNAME%" /F >nul 2>&1

:: -------------------------------------------------
:: Delete installed files
:: -------------------------------------------------
echo Removing installed files...
if exist "%TARGET%" (
    rmdir /S /Q "%TARGET%"
)

:: -------------------------------------------------
:: Delete ProgramData configuration
:: -------------------------------------------------
echo Removing configuration...
if exist "%CONFIG%" (
    rmdir /S /Q "%CONFIG%"
)

:: -------------------------------------------------
:: Delete LocalAppData database
:: -------------------------------------------------
echo Removing local database...
if exist "%LOCALDATA%" (
    rmdir /S /Q "%LOCALDATA%"
)

echo.
echo =====================================
echo Uninstallation completed successfully.
echo =====================================

pause
endlocal
exit /b 0