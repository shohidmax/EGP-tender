@echo off
echo ==========================================
echo CLOSING STUCK SERVERS (Fixing 404 Error)
echo ==========================================
taskkill /F /IM node.exe
timeout /t 2 >nul

echo.
echo ==========================================
echo STARTING NEW SERVER (Port 3000)
echo ==========================================
start "e-Procure Server" cmd /k "cd server && npm start"
timeout /t 5 >nul

echo.
echo ==========================================
echo STARTING CLIENT DASHBOARD (Port 3001)
echo ==========================================
start "e-Procure Client" cmd /k "cd client && npm run dev"

echo.
echo ==========================================
echo DONE! You can close this window.
echo ==========================================
pause
