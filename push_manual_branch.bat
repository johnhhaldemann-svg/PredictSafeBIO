@echo off
cd /d C:\Users\johnh\OneDrive\Desktop\PredictSafeBIO
git push origin feature/manual-alignment > push_result.txt 2>&1
echo DONE_EXIT_%ERRORLEVEL% >> push_result.txt
