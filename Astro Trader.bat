@echo off
title Astro Trader Insights  -  Servidor
cd /d "%~dp0"

echo.
echo   ===============================================
echo      ASTRO TRADER INSIGHTS
echo   ===============================================
echo.

rem --- Is the server already listening on port 3000? ---
netstat -ano | findstr /r /c:"TCP.*:3000 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo   El servidor ya estaba en marcha. Abriendo el navegador...
    start "" http://localhost:3000
    timeout /t 2 >nul
    exit /b
)

rem --- First run: install dependencies if missing ---
if not exist "node_modules" (
    echo   Instalando dependencias por primera vez... esto puede tardar un par de minutos.
    echo.
    call npm install
    echo.
)

echo   Iniciando el servidor. El navegador se abrira solo en unos segundos.
echo.
echo   ^>^>  DEJA ESTA VENTANA ABIERTA mientras uses la app.
echo   ^>^>  Cierrala (o pulsa Ctrl+C) para APAGAR el servidor.
echo.

rem --- Open the browser as soon as the server responds (background poller) ---
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 90;$i++){try{$r=Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; if([int]$r.StatusCode -ge 200){Start-Process 'http://localhost:3000'; break}}catch{Start-Sleep -Milliseconds 700}}"

rem --- Run the dev server in THIS window (closing it stops the app) ---
call npm run dev

echo.
echo   El servidor se ha detenido. Puedes cerrar esta ventana.
pause >nul
