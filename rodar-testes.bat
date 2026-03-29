@echo off
setlocal
cd /d %~dp0
title UniHER - Testes

echo.
echo  ==========================================
echo       UniHER - Suite de Testes
echo  ==========================================
echo.
echo  [1] Testes de API (rapido, ~10s)
echo  [2] Testes Playwright completos (~30s)
echo  [3] Testes visuais UX (~40s)
echo  [4] Tudo (API + Playwright + Visual)
echo  [5] Abrir painel HTML de testes
echo  [0] Sair
echo.
set /p opt="  Escolha: "

if "%opt%"=="1" goto api
if "%opt%"=="2" goto playwright
if "%opt%"=="3" goto visual
if "%opt%"=="4" goto all
if "%opt%"=="5" goto html
if "%opt%"=="0" exit /b 0
goto :eof

:api
echo.
echo  Rodando testes de API...
set PLAYWRIGHT_TEST=1
node tests\run-api-tests.js
echo.
pause
goto :eof

:playwright
echo.
echo  Rodando testes Playwright...
set PLAYWRIGHT_TEST=1
cd tests
npx playwright test --reporter=line
cd ..
echo.
pause
goto :eof

:visual
echo.
echo  Rodando testes visuais UX...
set PLAYWRIGHT_TEST=1
cd tests
npx playwright test --project=visual-ux --reporter=line
cd ..
echo.
pause
goto :eof

:all
echo.
echo  === TESTES DE API ===
set PLAYWRIGHT_TEST=1
node tests\run-api-tests.js
echo.
echo  === TESTES PLAYWRIGHT ===
cd tests
npx playwright test --reporter=line
cd ..
echo.
pause
goto :eof

:html
start "" "http://localhost:4444"
echo  Aberto no navegador.
pause
goto :eof
