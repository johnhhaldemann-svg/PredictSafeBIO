@echo off
echo === PredictSafeBIO Deploy to Production ===
echo.

echo Removing git lock if present...
if exist ".git\index.lock" (
    del /f ".git\index.lock"
    echo Lock removed.
) else (
    echo No lock found.
)

echo.
echo Staging all changes...
git add -A
echo.

echo Committing...
git commit -m "Fix Risk Register: add /assessments/new page, fix New Assessment button, fix Risk Command Center Link + severityClass bugs"
echo.

echo Pushing to visual-polish...
git push origin visual-polish
echo.

echo === Done! Check Vercel dashboard for deploy status. ===
pause
