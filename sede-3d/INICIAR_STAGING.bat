@echo off
chcp 65001 >nul
title DETONADOR AI EMPIRE - Staging (con servidor)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( echo  [!] Falta Node.js 22.5 o superior: https://nodejs.org/es/download & start https://nodejs.org/es/download & pause & exit /b 1 )
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 22 ( echo  [!] Se requiere Node.js 22.5 o superior. Instala la version LTS actual. & pause & exit /b 1 )
if not exist node_modules ( call npm install || ( echo  [!] Fallo la instalacion. & pause & exit /b 1 ) )
if not exist server\data\detonador.db (
  echo  Primera vez: crea tu cuenta privada de propietario.
  call npm run setup-owner || ( pause & exit /b 1 )
)
if not exist .env ( copy .env.example .env >nul & echo  Se creo .env SIN claves: ningun servicio de pago esta activo. )
echo  Construyendo e iniciando en http://127.0.0.1:8787  (solo este equipo)
start "" http://127.0.0.1:8787
call npm run start:staging
pause
