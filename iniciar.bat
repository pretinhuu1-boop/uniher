@echo off
setlocal
cd /d %~dp0

echo ========================================
echo       UniHER - Wellness Hub
echo ========================================
echo.

echo [0/3] Encerrando processos anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [info] Processos encerrados.
echo.

echo [1/3] Verificando dependencias...
if not exist node_modules (
    echo [info] Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
) else (
    echo [info] Dependencias OK.
)

echo.
echo [2/3] Preparando Banco de Dados...
if not exist data mkdir data
if exist "data\uniher.db" (
    echo [info] Banco ja existe. Mantendo dados.
) else (
    echo [info] Criando banco e estrutura base...
)
call npm run db:seed
if errorlevel 1 (
    echo [ERRO] Falha ao criar banco de dados.
    pause
    exit /b 1
)

echo.
echo [3/3] Iniciando Servidor de Desenvolvimento (com auto-restart)...
powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" >nul 2>&1
echo [info] Acesse: http://localhost:3000
echo [info] O servidor reinicia automaticamente se cair.
echo [info] Para gerenciamento avancado, use: uniher-control.bat
echo.
call watch-server.bat

pause
