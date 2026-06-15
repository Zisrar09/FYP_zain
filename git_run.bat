@echo off
cd /d "C:\Users\Dell\OneDrive\Desktop\volun-hr-suite-main"
echo === INIT === > git_log.txt 2>&1
git init >> git_log.txt 2>&1
echo === STATUS === >> git_log.txt 2>&1
git status >> git_log.txt 2>&1
echo === ADD === >> git_log.txt 2>&1
git add -A >> git_log.txt 2>&1
echo === COMMIT === >> git_log.txt 2>&1
git commit -m "Initial commit: VolunteeHR Suite" >> git_log.txt 2>&1
echo === REMOTE === >> git_log.txt 2>&1
git remote remove origin >> git_log.txt 2>&1
git remote add origin https://github.com/Zisrar09/Voluntee_HR.git >> git_log.txt 2>&1
echo === PUSH === >> git_log.txt 2>&1
git push -u origin main --force >> git_log.txt 2>&1
echo === DONE === >> git_log.txt 2>&1
