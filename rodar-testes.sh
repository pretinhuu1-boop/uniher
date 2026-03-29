#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "  =========================================="
echo "       UniHER - Suite de Testes"
echo "  =========================================="
echo ""
echo "  [1] Testes de API (rapido, ~10s)"
echo "  [2] Testes Playwright completos (~30s)"
echo "  [3] Testes visuais UX (~40s)"
echo "  [4] Tudo (API + Playwright + Visual)"
echo "  [0] Sair"
echo ""
read -p "  Escolha: " opt

export PLAYWRIGHT_TEST=1

case $opt in
  1)
    echo ""
    echo "  Rodando testes de API..."
    node tests/run-api-tests.js
    ;;
  2)
    echo ""
    echo "  Rodando testes Playwright..."
    cd tests && npx playwright test --reporter=line && cd ..
    ;;
  3)
    echo ""
    echo "  Rodando testes visuais UX..."
    cd tests && npx playwright test --project=visual-ux --reporter=line && cd ..
    ;;
  4)
    echo ""
    echo "  === TESTES DE API ==="
    node tests/run-api-tests.js
    echo ""
    echo "  === TESTES PLAYWRIGHT ==="
    cd tests && npx playwright test --reporter=line && cd ..
    ;;
  0)
    exit 0
    ;;
esac

echo ""
echo "  Concluido."
