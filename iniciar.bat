@echo off
setlocal
cd /d %~dp0

echo ========================================
echo       UniHER - Wellness Hub
echo ========================================
echo.

echo [0/4] Verificando ambiente...
if not exist ".env.local" (
    echo [info] Criando .env.local a partir do .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env.local" >nul
        echo [OK] .env.local criado. Edite depois se precisar customizar.
    ) else (
        echo [info] Gerando .env.local padrao...
        (
            echo JWT_SECRET=uniher-dev-secret-change-in-production-min32chars
            echo JWT_REFRESH_SECRET=uniher-refresh-secret-change-in-prod-min32
            echo DATABASE_PATH=data/uniher.db
            echo RESEND_API_KEY=
            echo VAPID_PUBLIC_KEY=
            echo VAPID_PRIVATE_KEY=
        ) > ".env.local"
        echo [OK] .env.local criado com valores padrao.
    )
) else (
    echo [info] .env.local OK.
)
echo.

echo [1/4] Encerrando processos anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [info] Processos encerrados.
echo.

echo [2/4] Verificando dependencias...
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
echo [3/4] Preparando Banco de Dados...
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
echo [4/4] Iniciando Servidor de Desenvolvimento (com auto-restart)...
powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" >nul 2>&1
echo [info] Acesse: http://localhost:3000
echo [info] O servidor reinicia automaticamente se cair.
echo [info] Para gerenciamento avancado, use: uniher-control.bat
echo.
call watch-server.bat

pause
