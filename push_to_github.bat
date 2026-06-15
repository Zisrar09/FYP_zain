@echo off
cd /d "C:\Users\Dell\OneDrive\Desktop\volun-hr-suite-main"

echo Checking git...
where git
if errorlevel 1 (
    echo GIT NOT FOUND - Please install Git from https://git-scm.com
    pause
    exit /b 1
)

echo.
echo Initializing git repo...
git init

echo.
echo Removing old remote if exists...
git remote remove origin 2>nul

echo.
echo Adding remote...
git remote add origin https://github.com/Zisrar09/Voluntee_HR.git

echo.
echo Staging all files...
git add .

echo.
echo Committing...
git commit -m "Initial commit: VolunteeHR Suite with AI hiring pipeline"

echo.
echo Setting branch to main...
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main --force

echo.
echo === DONE ===
pause
