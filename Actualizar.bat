@echo off
title Astro Trader Insights  -  Actualizar
cd /d "%~dp0"

echo.
echo   ===============================================
echo      ACTUALIZAR ASTRO TRADER INSIGHTS
echo   ===============================================
echo.

rem --- Must be a git clone to update this way ---
git rev-parse --is-inside-work-tree >nul 2>&1
if not %errorlevel%==0 (
    echo   [!] Esta copia no se instalo con git, asi que no puede
    echo       actualizarse automaticamente.
    echo.
    echo   Descarga la ultima version desde:
    echo   https://github.com/CDRecordable/astro-trader
    echo.
    pause
    exit /b
)

echo   Descargando los ultimos cambios desde GitHub...
echo.
call git pull --ff-only
echo.

echo   Instalando dependencias (por si algo cambio)...
echo.
call npm install --no-audit --no-fund
echo.

echo   ===============================================
echo      LISTO. Ya tienes la ultima version.
echo   ===============================================
echo   Abre "Astro Trader.bat" para arrancar el programa.
echo.
pause
