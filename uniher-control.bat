@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
title UniHER - Painel de Controle
color 0E

:menu
cls
echo.
echo  ================================================================
echo  ^|                                                              ^|
echo  ^|           UniHER  -  Painel de Controle                      ^|
echo  ^|                                                              ^|
echo  ================================================================
echo.
echo   SERVIDOR
echo   [1] Iniciar Sistema (auto-restart)
echo   [2] Parar Sistema
echo   [3] Reiniciar Sistema
echo   [4] Status do Sistema
echo.
echo   LOGS ^& MONITORAMENTO
echo   [5] Ver Logs do Servidor
echo   [6] Ver Logs de Erros
echo   [7] Monitor ao Vivo (health check)
echo.
echo   BANCO DE DADOS
echo   [8] Backup do Banco de Dados
echo   [9] Resetar Banco (seed)
echo.
echo   SISTEMA (MASTER)
echo   [10] Uso de Disco
echo   [11] Uso de Memoria (processos Node)
echo   [12] Portas em uso
echo   [13] Limpar Cache (.next)
echo   [14] Verificar integridade do DB
echo   [15] Info completa do sistema
echo.
echo   [0] Sair
echo.
echo  ================================================================
set /p opt="  Escolha uma opcao: "

if "%opt%"=="1" goto start_server
if "%opt%"=="2" goto stop_server
if "%opt%"=="3" goto restart_server
if "%opt%"=="4" goto status
if "%opt%"=="5" goto logs_server
if "%opt%"=="6" goto logs_errors
if "%opt%"=="7" goto monitor
if "%opt%"=="8" goto backup_db
if "%opt%"=="9" goto reset_db
if "%opt%"=="10" goto disk_usage
if "%opt%"=="11" goto memory_usage
if "%opt%"=="12" goto ports
if "%opt%"=="13" goto clean_cache
if "%opt%"=="14" goto db_integrity
if "%opt%"=="15" goto sys_info
if "%opt%"=="0" goto sair

echo  Opcao invalida.
timeout /t 2 /nobreak >nul
goto menu

:: ── SERVIDOR ──

:start_server
cls
echo.
echo  [INICIAR] Preparando sistema...
echo.
if not exist data mkdir data
if not exist node_modules (
    echo  Instalando dependencias...
    call npm install
)
if not exist "data\uniher.db" (
    echo  Criando banco de dados...
    call npm run db:seed
)
echo  Limpando cache...
powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" >nul 2>&1
echo.
echo  [OK] Iniciando servidor com auto-restart...
echo  [INFO] Feche esta janela para parar o servidor.
echo  [INFO] Acesse: http://localhost:3000
echo.
echo [%date% %time%] Inicio via painel de controle >> data\server.log
call watch-server.bat
goto menu

:stop_server
cls
echo.
echo  [PARAR] Encerrando todos os processos Node...
taskkill /F /IM node.exe >nul 2>&1
echo [%date% %time%] Parada via painel de controle >> data\server.log
echo.
echo  [OK] Sistema parado.
echo.
pause
goto menu

:restart_server
cls
echo.
echo  [REINICIAR] Parando servidor...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo  [OK] Processos encerrados.
echo  [REINICIAR] Limpando cache...
powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" >nul 2>&1
echo [%date% %time%] Reinicio via painel de controle >> data\server.log
echo.
echo  [OK] Reiniciando com auto-restart...
echo  [INFO] Acesse: http://localhost:3000
echo.
call watch-server.bat
goto menu

:status
cls
echo.
echo  ── Status do Sistema ──
echo.
:: Check if node is running
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL%==0 (
    echo  Servidor: [ONLINE]
    for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST 2^>nul ^| find "PID"') do (
        echo  PID: %%a
    )
) else (
    echo  Servidor: [OFFLINE]
)
:: Check port
netstat -ano 2>nul | find ":3000" >nul
if %ERRORLEVEL%==0 (
    echo  Porta 3000: EM USO
) else (
    echo  Porta 3000: LIVRE
)
:: DB check
if exist "data\uniher.db" (
    for %%A in ("data\uniher.db") do echo  Banco: %%~zA bytes
) else (
    echo  Banco: NAO ENCONTRADO
)
echo.
:: Try health endpoint
echo  Verificando health endpoint...
curl -s http://localhost:3000/api/health 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  Health endpoint: INDISPONIVEL
)
echo.
echo.
pause
goto menu

:: ── LOGS ──

:logs_server
cls
echo.
echo  ── Logs do Servidor (ultimas 30 linhas) ──
echo.
if exist "data\server.log" (
    powershell -Command "Get-Content 'data\server.log' -Tail 30"
) else (
    echo  Nenhum log encontrado.
)
echo.
pause
goto menu

:logs_errors
cls
echo.
echo  ── Logs de Erros (ultimas 30 linhas) ──
echo.
if exist "data\errors.log" (
    powershell -Command "Get-Content 'data\errors.log' -Tail 30"
) else (
    echo  Nenhum erro registrado.
)
echo.
pause
goto menu

:monitor
cls
echo.
echo  ── Monitor ao Vivo (Ctrl+C para sair) ──
echo.
:monitor_loop
curl -s http://localhost:3000/api/health 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [%time%] OFFLINE - Servidor nao responde!
) else (
    echo.
)
timeout /t 10 /nobreak >nul
goto monitor_loop

:: ── BANCO DE DADOS ──

:backup_db
cls
echo.
echo  ── Backup do Banco de Dados ──
echo.
if not exist "data\uniher.db" (
    echo  [ERRO] Banco nao encontrado.
    pause
    goto menu
)
if not exist "data\backups" mkdir "data\backups"
set BACKUP_NAME=uniher-%date:~6,4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%.db
set BACKUP_NAME=%BACKUP_NAME: =0%
copy "data\uniher.db" "data\backups\%BACKUP_NAME%" >nul
echo  [OK] Backup criado: data\backups\%BACKUP_NAME%
for %%A in ("data\backups\%BACKUP_NAME%") do echo  Tamanho: %%~zA bytes
echo.
pause
goto menu

:reset_db
cls
echo.
echo  ── Resetar Banco de Dados ──
echo.
echo  ATENCAO: Isso vai apagar todos os dados!
set /p confirm="  Confirma? (S/N): "
if /I "%confirm%" NEQ "S" goto menu
if exist "data\uniher.db" (
    echo  Fazendo backup antes...
    if not exist "data\backups" mkdir "data\backups"
    set BACKUP_NAME=uniher-pre-reset-%date:~6,4%%date:~3,2%%date:~0,2%.db
    copy "data\uniher.db" "data\backups\!BACKUP_NAME!" >nul
    del "data\uniher.db"
)
echo  Recriando banco...
call npm run db:seed
echo.
echo  [OK] Banco resetado com sucesso.
echo.
pause
goto menu

:: ── SISTEMA MASTER ──

:disk_usage
cls
echo.
echo  ── Uso de Disco ──
echo.
if exist "data" (
    powershell -Command "$d = (Get-ChildItem -Path 'data' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Write-Host ('  data/         {0:N2} MB' -f ($d/1MB))"
)
if exist ".next" (
    powershell -Command "$d = (Get-ChildItem -Path '.next' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Write-Host ('  .next/        {0:N2} MB' -f ($d/1MB))"
) else (
    echo   .next/        0 MB (nao existe)
)
if exist "node_modules" (
    powershell -Command "$d = (Get-ChildItem -Path 'node_modules' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Write-Host ('  node_modules/ {0:N2} MB' -f ($d/1MB))"
)
powershell -Command "$d = (Get-ChildItem -Path '.' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Write-Host ('  TOTAL         {0:N2} MB' -f ($d/1MB))"
echo.
:: Disk free space
powershell -Command "$d = Get-PSDrive C; Write-Host ('  Disco C:\     {0:N2} GB livres de {1:N2} GB' -f ($d.Free/1GB), (($d.Used+$d.Free)/1GB))"
echo.
pause
goto menu

:memory_usage
cls
echo.
echo  ── Uso de Memoria (processos Node) ──
echo.
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL%==0 (
    tasklist /FI "IMAGENAME eq node.exe" /FO TABLE
) else (
    echo  Nenhum processo Node.js encontrado.
)
echo.
echo  ── Memoria do Sistema ──
powershell -Command "$os = Get-CimInstance Win32_OperatingSystem; $total = [math]::Round($os.TotalVisibleMemorySize/1MB, 1); $free = [math]::Round($os.FreePhysicalMemory/1MB, 1); $used = $total - $free; Write-Host ('  Total: {0} GB | Usado: {1} GB | Livre: {2} GB' -f $total, $used, $free)"
echo.
pause
goto menu

:ports
cls
echo.
echo  ── Portas em uso ──
echo.
echo  Porta 3000 (UniHER):
netstat -ano 2>nul | findstr ":3000"
if %ERRORLEVEL% NEQ 0 echo   Livre
echo.
echo  Todas as portas Node:
for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST 2^>nul ^| findstr "PID"') do (
    netstat -ano 2>nul | findstr "%%p" | findstr "LISTENING"
)
echo.
pause
goto menu

:clean_cache
cls
echo.
echo  ── Limpar Cache ──
echo.
echo  [1] Limpar .next apenas
echo  [2] Limpar .next + node_modules (reinstala depois)
echo  [0] Cancelar
echo.
set /p ccopt="  Opcao: "
if "%ccopt%"=="1" (
    powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
    echo  [OK] Cache .next removido.
)
if "%ccopt%"=="2" (
    powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
    powershell -Command "Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue"
    echo  Reinstalando dependencias...
    call npm install
    echo  [OK] Cache limpo e dependencias reinstaladas.
)
echo.
pause
goto menu

:db_integrity
cls
echo.
echo  ── Verificacao de Integridade do DB ──
echo.
if not exist "data\uniher.db" (
    echo  [ERRO] Banco nao encontrado.
    pause
    goto menu
)
echo  Executando PRAGMA integrity_check...
node -e "const db = require('better-sqlite3')('data/uniher.db'); const r = db.pragma('integrity_check'); console.log('  Resultado:', r[0].integrity_check); const w = db.pragma('wal_checkpoint(TRUNCATE)'); console.log('  WAL checkpoint:', JSON.stringify(w[0])); const s = db.prepare('SELECT COUNT(*) as c FROM users').get(); console.log('  Usuarios:', s.c); const e = db.prepare('SELECT COUNT(*) as c FROM companies').get(); console.log('  Empresas:', e.c); db.close();" 2>&1
echo.
pause
goto menu

:sys_info
cls
echo.
echo  ══════════════════════════════════════
echo   Info Completa do Sistema
echo  ══════════════════════════════════════
echo.
echo  ── Software ──
node -v 2>nul && echo   Node.js instalado
npm -v 2>nul && echo   npm instalado
echo.
echo  ── Hardware ──
powershell -Command "$cpu = (Get-CimInstance Win32_Processor).Name; Write-Host ('  CPU: ' + $cpu)"
powershell -Command "$os = Get-CimInstance Win32_OperatingSystem; $total = [math]::Round($os.TotalVisibleMemorySize/1MB, 1); $free = [math]::Round($os.FreePhysicalMemory/1MB, 1); Write-Host ('  RAM: {0} GB total | {1} GB livre' -f $total, $free)"
powershell -Command "$d = Get-PSDrive C; Write-Host ('  Disco C: {0:N1} GB livres de {1:N1} GB' -f ($d.Free/1GB), (($d.Used+$d.Free)/1GB))"
echo.
echo  ── Sistema ──
powershell -Command "$os = Get-CimInstance Win32_OperatingSystem; Write-Host ('  OS: ' + $os.Caption + ' ' + $os.Version)"
powershell -Command "$uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; Write-Host ('  Uptime: {0}d {1}h {2}m' -f $uptime.Days, $uptime.Hours, $uptime.Minutes)"
echo.
echo  ── UniHER ──
if exist "data\uniher.db" (
    for %%A in ("data\uniher.db") do echo   DB: %%~zA bytes
) else (
    echo   DB: nao encontrado
)
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL%==0 (
    echo   Servidor: ONLINE
) else (
    echo   Servidor: OFFLINE
)
echo.
pause
goto menu

:sair
cls
echo.
echo  Ate logo!
echo.
exit /b 0
