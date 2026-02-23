@echo off
title Maestro Extension Installer
mode con: cols=80 lines=25
color 1F

:: --- SELF-CHECK: Ensure running from extracted folder ---
if not exist "%~dp0manifest.json" (
    cls
    color 4F
    echo.
    echo ========================================================
    echo                 STOP! READ THIS FIRST
    echo ========================================================
    echo.
    echo You are running this file from inside the ZIP archive.
    echo Windows cannot install the extension from here.
    echo.
    echo PLEASE DO THIS:
    echo 1. Close this black window.
    echo 2. Go back to the ZIP file.
    echo 3. Right-click the ZIP file and choose "Extract All".
    echo 4. Go into the extracted folder.
    echo 5. Run "setup.bat" again.
    echo.
    echo ========================================================
    echo.
    pause
    exit
)

:menu
cls
echo.
echo ========================================================
echo           MAESTRO EXTENSION INSTALLER
echo ========================================================
echo.
echo    [1] Install on Google Chrome
echo    [2] Install on Microsoft Edge
echo    [3] Install on Brave Browser
echo.
set /p browser="Enter 1, 2, or 3: "

if "%browser%"=="1" goto chrome
if "%browser%"=="2" goto edge
if "%browser%"=="3" goto brave
goto menu

:chrome
set "url=chrome://extensions"
goto install

:edge
set "url=edge://extensions"
goto install

:brave
set "url=brave://extensions"
goto install

:install
cls
echo.
echo ========================================================
echo                 INSTRUCTIONS
echo ========================================================
echo.
echo 1. A browser window will open to the Extensions page.
echo 2. This folder will open in File Explorer.
echo.
echo --------------------------------------------------------
echo    STEP A: Turn ON "Developer mode" (Top right switch)
echo    STEP B: Drag the "manifest.json" file or this whole
echo            folder into the browser window.
echo --------------------------------------------------------
echo.
echo Press any key to start...
pause >nul

:: Open Browser
start "" "%url%"

:: Open Explorer to current folder
start "" explorer.exe "%~dp0"

exit
