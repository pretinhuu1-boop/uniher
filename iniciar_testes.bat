@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
title UniHER - Ambiente de Testes

echo ========================================
echo       UniHER - Ambiente de Testes
echo ========================================
echo.

echo [1/4] Verificando dependencias...
if not exist node_modules (
    echo [info] Instalando dependencias...
    call npm install
)
if not exist "node_modules\@playwright\test" (
    echo [info] Instalando Playwright...
    call npm install -D @playwright/test
    call npx playwright install chromium
)
echo [info] OK.

echo.
echo [2/4] Preparando banco de dados...
if not exist data mkdir data
call npm run db:seed
echo [info] OK.

echo.
echo [3/4] Iniciando servidor UniHER (porta 3000, modo teste)...
powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" >nul 2>&1
start "UniHER Server" /MIN cmd /c "set PLAYWRIGHT_TEST=1 && npm run dev"
echo [info] Aguardando servidor...

:wait_server
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/api/health >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto wait_server
echo [info] Servidor online!

echo.
echo [4/4] Iniciando painel de testes (porta 4444)...
start "" http://localhost:4444
echo.
echo ========================================
echo.
echo   Painel de Testes: http://localhost:4444
echo   App UniHER:       http://localhost:3000
echo.
echo   Clique nos botoes do painel para
echo   executar os testes automatizados.
echo.
echo   Feche esta janela para encerrar tudo.
echo.
echo ========================================
echo.

node tests\server.js

taskkill /F /IM node.exe >nul 2>&1
