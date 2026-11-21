@echo off
chcp 65001 >nul
echo Cerrando la aplicacion DETONADOR en el puerto 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
echo Listo.
timeout /t 2 >nul
