@echo off
rem RoRadar panelini baslatir ve tarayicida acar (http://localhost:3124).
rem Masaustundeki "RoRadar Baslat" kisayolu bunu calistirir.
cd /d "%~dp0.."
title RoRadar

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3124 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
  echo Panel zaten acik, tarayici aciliyor...
  start "" http://localhost:3124
  timeout /t 2 >nul
  exit /b
)

if not exist ".next\BUILD_ID" (
  echo Ilk kurulum: proje derleniyor, 1-2 dakika surebilir...
  call npx next build || (echo Derleme basarisiz. & pause & exit /b 1)
)

echo Panel baslatiliyor...
start "RoRadar Sunucu" /min cmd /c "npx next start -p 3124"

powershell -NoProfile -Command "$t=0; while (-not (Get-NetTCPConnection -LocalPort 3124 -State Listen -ErrorAction SilentlyContinue) -and $t -lt 60) { Start-Sleep 1; $t++ }"
start "" http://localhost:3124
exit /b
