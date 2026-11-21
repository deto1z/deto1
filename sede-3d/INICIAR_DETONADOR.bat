@echo off
chcp 65001 >nul
title DETONADOR AI EMPIRE - Sede virtual 3D
cd /d "%~dp0"
echo.
echo  ===============================================
echo    DETONADOR AI EMPIRE  -  Sede virtual 3D
echo  ===============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  [!] No se encontro Node.js. Es necesario para ejecutar la aplicacion.
  echo      Se abrira la pagina de descarga: instala la version "LTS" y vuelve a abrir este archivo.
  start https://nodejs.org/es/download
  pause
  exit /b 1
)
if not exist node_modules (
  echo  Primera vez: instalando componentes ^(unos minutos, requiere internet^)...
  call npm install
  if errorlevel 1 ( echo  [!] Fallo la instalacion. Revisa tu conexion a internet. & pause & exit /b 1 )
)
echo.
echo  Iniciando... se abrira tu navegador en http://localhost:5173
echo  Para cerrar la aplicacion, cierra esta ventana o pulsa Ctrl+C.
echo.
call npm run dev -- --open --port 5173
pause
