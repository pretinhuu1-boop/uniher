# UniHER operational release plan

Data: 2026-07-28

## Objetivo

Tirar o release padrao do modo demo e manter a plataforma pronta para operacao em `www.uniher.com.br` sem depender de fixtures visuais embutidas no deploy.

## Decisao tecnica desta wave

- Deploy de producao passa a rodar apenas migracoes de banco por padrao.
- Seed de homologacao/demo fica bloqueado por padrao e so roda com `UNIHER_RUN_DEMO_SEED=true`.
- Preflight de release deixa de procurar contas demo hardcoded.
- Preflight de release exige `UNIHER_RELEASE_SMOKE_ACCOUNTS` em runtime de producao/HTTPS.

Formato:

```text
UNIHER_RELEASE_SMOKE_ACCOUNTS=email@empresa.com:role,outro@empresa.com:role
```

Roles esperados: `admin`, `rh`, `lideranca`, `colaboradora`.

## Gate operacional antes de apagar ou migrar dados demo existentes

Ainda exige aprovacao humana:

- Lista oficial de contas de smoke por papel.
- Tenant/empresa oficial que deve substituir o tenant visual de homologacao, se aplicavel.
- Decisao sobre dados visuais existentes: manter como historico, desativar usuarios, renomear tenant ou remover apos backup.
- Rotacao de qualquer senha compartilhada de seed/homologacao.

## Status de liberacao

- Liberavel tecnicamente: sim, apos testes e deploy com `UNIHER_RELEASE_SMOKE_ACCOUNTS` configurado.
- Operacional completo: pendente ate aprovacao da lista real de contas/tenant e politica de limpeza dos dados demo existentes.
