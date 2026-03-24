#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "       UniHER - Wellness Hub"
echo "========================================"
echo ""

echo "[0/3] Encerrando processos anteriores..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
sleep 1
echo "[info] Processos encerrados."
echo ""

echo "[1/3] Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "[info] Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependencias."
        exit 1
    fi
else
    echo "[info] Dependencias OK."
fi

echo ""
echo "[2/3] Preparando Banco de Dados..."
mkdir -p data
if [ -f "data/uniher.db" ]; then
    echo "[info] Banco ja existe. Mantendo dados."
else
    echo "[info] Criando banco e estrutura base..."
fi
npm run db:seed
if [ $? -ne 0 ]; then
    echo "[ERRO] Falha ao criar banco de dados."
    exit 1
fi

echo ""
echo "[3/3] Iniciando Servidor de Desenvolvimento (com auto-restart)..."
rm -rf .next 2>/dev/null
echo "[info] Acesse: http://localhost:3000"
echo "[info] O servidor reinicia automaticamente se cair."
echo "[info] Ctrl+C para parar."
echo ""

# Watchdog loop
while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando servidor UniHER..." >> data/server.log
    npm run dev -- --port 3000
    EXIT_CODE=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Servidor encerrou (codigo: $EXIT_CODE)" >> data/server.log
    echo ""
    echo "[WATCHDOG] Servidor encerrou (codigo: $EXIT_CODE). Reiniciando em 3s..."
    sleep 3
done
