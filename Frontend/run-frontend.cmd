@echo off
cd /d "C:\Users\sk396\OneDrive\Documents\New project"
"C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev --hostname 0.0.0.0 --port 3000 > frontend-dev.log 2> frontend-dev.err.log
