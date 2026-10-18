@echo off
setlocal

title Parallax Launcher - SEE BEYOND THE SCORE

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:: Locate Python in virtual environment or system PATH
set "PYTHON_EXE="

if exist "%PROJECT_ROOT%backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%backend\.venv\Scripts\python.exe"
    goto :RunLauncher
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "delims=" %%i in ('where python') do if not defined PYTHON_EXE set "PYTHON_EXE=%%i"
    goto :RunLauncher
)

echo.
echo ===============================================================================
echo [ERROR] Python environment was not found!
echo ===============================================================================
echo Parallax requires Python 3.10+ and backend\.venv.
echo Run the setup commands:
echo   cd backend
echo   python -m venv .venv
echo   .venv\Scripts\pip install -r requirements.txt
echo ===============================================================================
echo.
pause
exit /b 1

:RunLauncher
"%PYTHON_EXE%" "%PROJECT_ROOT%scripts\start_parallax.py" %*
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] Parallax launcher exited with error code %EXIT_CODE%.
    pause
    exit /b %EXIT_CODE%
)

exit /b 0
