@echo off
setlocal

echo.
echo ============================================================
echo Easy Notes Plus - Old Format Converter
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the directory to convert (default to current directory)
set "TARGET_DIR=%~1"
if "%TARGET_DIR%"=="" set "TARGET_DIR=%CD%"

echo Target directory: %TARGET_DIR%
echo.
echo This will convert all .ezn files from old format to new format.
echo Original files will be backed up with .backup extension.
echo.
echo.
set /p "SUBJECT=Enter the subject/materia name (default: Imported): "
if "%SUBJECT%"=="" set "SUBJECT=Imported"
echo.
echo Subject will be set to: %SUBJECT%
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

REM Run the conversion script
node "%~dp0convert-old-notes.js" "%TARGET_DIR%" "%SUBJECT%"

echo.
echo.
echo Press any key to exit...
pause >nul
