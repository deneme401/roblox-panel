@echo off
rem RoRadar panelini (port 3124) ve varsa eski gelistirme sunucusunu (port 3123) kapatir.
rem Masaustundeki "RoRadar Kapat" kisayolu bunu calistirir.
title RoRadar Kapat
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 3124,3123 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host 'Panel kapatildi.' } else { Write-Host 'Panel zaten kapali.' }"
timeout /t 2 >nul
