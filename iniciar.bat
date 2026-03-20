@echo off
setlocal
cd /d %~dp0
echo ========================================
echo       UniHER - Wellness Hub
echo ========================================
echo.
echo [1/3] Garantindo dependencias...
rem call npm install --silent

echo [2/3] Preparando Banco de Dados...
if exist data\uniher.db (
    echo [info] Banco ja existe. Fazendo reset para garantir dados de teste...
    del data\uniher.db
)
call npm run db:seed

echo.
echo [3/3] Iniciando Servidor de Desenvolvimento...
echo.
npm run dev

pause
