# Revisao externa Claude - UniHER Wave 3

Data: 2026-07-27
Branch: `codex/uniher-wave3-collaborator-nr1`
Range revisado: `cdf8103..HEAD`
Revisor auxiliar: Claude Opus via `claude --model opus --effort high`
Modo: somente leitura; sem edicoes, commit, push, reset, checkout, stash ou revert.

## Veredito auxiliar

Claude retornou **PASS COM RESSALVAS** para envio controlado e honesto a Dra. Paola.

Esse PASS nao significa deploy em producao, aprovacao visual humana, nem autorizacao para prometer NR-1/Yavix real, SIPAT, Concierge, Desenvolvimento Humano ou Canal de Denuncias como operacionais.

## Achados P0

Nenhum P0 concreto foi apontado pelo Claude.

## Achados P1 confirmados pela coordenacao

1. **Bootstrap COPSOQ sem consentimento psicossocial explicito**
   - Evidencia: `src/app/api/yavix/copsoq/bootstrap/route.ts` importa e chama `requireNr1RuntimeEntitlement`, mas nao chama `requireNr1PsychosocialConsent`.
   - Comparacao: `src/app/api/yavix/copsoq/answer/route.ts` e `src/app/api/yavix/copsoq/submit/route.ts` exigem entitlement e consentimento.
   - Disposicao: nao bloqueia demonstracao porque NR-1/Yavix segue fail-closed/gated fora de mock, mas deve ser corrigido antes de habilitar fluxo real.

2. **`src/proxy.ts` valida JWT com `JWT_SECRET` direto**
   - Evidencia: `src/proxy.ts` usa `new TextEncoder().encode(process.env.JWT_SECRET)`.
   - Comparacao: `src/lib/auth/jwt.ts` centraliza validacao de segredo obrigatorio e tamanho minimo.
   - Disposicao: hardening necessario antes de producao. O gate de release env continua segurando deploy sem secrets validos.

3. **Blacklist de tokens em memoria**
   - Evidencia: `src/lib/auth/token-blacklist.ts` documenta blacklist in-memory e necessidade de Redis em producao multi-instancia.
   - Disposicao: aceitavel para demonstracao/local; risco de producao porque restart ou multiplas instancias perdem revogacoes antes do fim do access token.

4. **Lideranca sem fixture visual dedicada**
   - Evidencia: `docs/superpowers/audits/2026-07-27-uniher-nine-fronts-integration-scorecard.md` registra `lideranca sem fixture visual`.
   - Disposicao: cobertura unit/contrato existe, mas visual precisa de fixture antes de declarar aceite visual completo para esse papel.

5. **Copy/navegacao de modulos gated exige cuidado comercial**
   - Evidencia: `src/components/platform/navigation.ts` contem labels/descriptions de Educacao, Objetivos/Desafios, NR-1, SIPAT, Desenvolvimento Humano, Denuncias e Concierge.
   - Disposicao: a copy ja evita ranking/liga ativa em pontos criticos, mas o envio a cliente deve continuar separando claramente implementado, gated/shell e bloqueado por contrato.

## Achados reclassificados como superados ou mitigados

1. **Falhas unit em `sidebar-capability` e `dashboard-css`**
   - Claude encontrou a anotacao antiga em `docs/superpowers/evidence/2026-07-27-smoke-deploy-package/README.md`, que registrava HOLD antes do pacote final.
   - Verificacao fresca da coordenacao:
     - Comando: `npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/dashboard-css.test.ts`
     - Resultado: PASS, 2 arquivos, 25 testes.
   - Disposicao: nao e risco atual do HEAD.

2. **Matriz visual marcada como evidencia stale no pacote de deploy**
   - Claude encontrou a nota antiga do pacote `2026-07-27-smoke-deploy-package`.
   - Verificacao fresca da coordenacao:
     - Arquivo: `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md`
     - Generated: `2026-07-27T23:59:31.675Z`
     - Resultado: 184/184 PASS, 46 rotas, 4 viewports.
   - Disposicao: evidencia tecnica ampla existe no HEAD, mas continua nao substituindo aprovacao visual humana.

## O que nao pode ser prometido

- NR-1/Yavix scoring, laudo, GRO/PGR, conformidade legal ou integracao real.
- SIPAT operacional completa.
- Concierge operacional completo.
- Desenvolvimento Humano completo.
- Canal de Denuncias operacional.
- Liga, ranking, recompensas ou competicao.
- Funcionalidades clinicas individuais.
- Deploy/producao pronto.
- Aprovacao visual final pela cliente.

## O que pode ser apresentado com linguagem honesta

- Evolucao tecnica consolidada nas ultimas 3 semanas.
- Sidebar e menu por papel, com visibilidade baseada em papel/modulo.
- Autenticacao reforcada com revogacao de sessao e testes.
- Isolamento tenant em APIs revisadas.
- Dashboard RH/Admin agregado e protegendo dados individuais.
- Check-in/check-out privado, agenda, campanhas, comunidade/editorial, configuracoes operacionais e conquistas privadas conforme escopo implementado.
- NR-1/Yavix, SIPAT e demais modulos sensiveis como bloqueados por contrato/gate, nao como prontos.

## Recomendacao final consolidada

**PASS COM RESSALVAS para envio controlado a Dra. Paola.**

**HOLD para deploy/producao** ate secrets, URL publica, banco, contas demo e smoke no host alvo estarem validados.

**HOLD para aprovacao visual humana** ate revisao final da Dra. Paola sobre screenshots/fluxo real.

