# UniHER blocked clickable local fixture map

Generated: 2026-07-30T13:18:05.353Z

## Summary

- Raw blocked production occurrences: 656.
- Unique blocked controls by role/route/class/label: 484.
- unknown_button: 276.
- mutation_or_submit: 79.
- session: 76.
- disabled: 25.
- destructive: 15.
- stateful_open_or_mutation_risk: 13.

## Top Labels

| Label | Unique controls |
|---|---:|
| Ir para o início da UniHER | 76 |
| Sair da Conta | 53 |
| Convites | 24 |
| Sair da Plataforma | 23 |
| Convidar | 12 |
| Editar | 12 |
| Exportar CSV | 12 |
| ✓ Verdadeiro | 8 |
| ✗ Falso | 8 |
| 1a | 8 |
| 1m | 8 |
| 3m | 8 |
| 6m | 8 |
| Anterior | 8 |
| Bem | 8 |
| Cansada | 8 |
| ConvitesInclua novas colaboradoras na empresa.→ | 8 |
| Fazer check-in | 8 |
| Fazer check-out | 8 |
| Muito bem | 8 |
| Neutra | 8 |
| Nova licao | 8 |
| Registrar leitura | 8 |
| Sobrecarregada | 8 |
| + Nova Empresa | 7 |
| Liderança | 7 |
| Suspender | 7 |
| Ativas | 6 |
| Concluídas | 6 |
| Todas | 6 |

## Highest-Risk Route Groups

| Role | Route | Unique blocked | Classes |
|---|---|---:|---|
| colaboradora | /saude-primaria | 19 | destructive:1, disabled:1, session:1, unknown_button:16 |
| colaboradora | /semaforo | 19 | destructive:1, disabled:1, session:1, unknown_button:16 |
| colaboradora | /avaliacao-nr1 | 12 | session:1, unknown_button:11 |
| colaboradora | /canal-denuncias | 12 | session:1, unknown_button:11 |
| colaboradora | /colaboradora | 12 | session:1, unknown_button:11 |
| colaboradora | /concierge | 12 | session:1, unknown_button:11 |
| colaboradora | /desenvolvimento-humano | 12 | session:1, unknown_button:11 |
| colaboradora | /historico | 12 | session:1, unknown_button:11 |
| colaboradora | /nr1 | 12 | session:1, unknown_button:11 |
| colaboradora | /viva-sipat | 12 | session:1, unknown_button:11 |
| colaboradora | /configuracoes | 11 | disabled:1, mutation_or_submit:4, session:1, unknown_button:5 |
| lideranca | /dashboard | 10 | mutation_or_submit:2, session:1, unknown_button:7 |
| lideranca | /historico | 10 | mutation_or_submit:2, session:1, unknown_button:7 |
| lideranca | /saude-primaria | 10 | mutation_or_submit:2, session:1, unknown_button:7 |
| rh | /dashboard | 10 | mutation_or_submit:3, session:1, unknown_button:6 |
| rh | /dashboard?section=exames | 10 | mutation_or_submit:3, session:1, unknown_button:6 |
| rh | /dashboard?section=saude-primaria | 10 | mutation_or_submit:3, session:1, unknown_button:6 |
| rh | /historico | 10 | mutation_or_submit:3, session:1, unknown_button:6 |
| rh | /saude-primaria | 10 | mutation_or_submit:3, session:1, unknown_button:6 |
| colaboradora | /agenda | 9 | mutation_or_submit:1, session:1, unknown_button:7 |
| rh | /campanhas | 9 | destructive:1, mutation_or_submit:3, session:1, unknown_button:4 |
| rh | /convites | 9 | destructive:1, disabled:1, mutation_or_submit:2, session:1, unknown_button:4 |
| colaboradora | /comunidade | 7 | session:1, unknown_button:6 |
| lideranca | /campanhas | 7 | disabled:1, session:1, unknown_button:5 |
| lideranca | /desafios/gerenciar | 7 | disabled:1, session:1, unknown_button:5 |
| lideranca | /liga | 7 | disabled:1, session:1, unknown_button:5 |
| lideranca | /liga/gerenciar | 7 | disabled:1, session:1, unknown_button:5 |
| rh | /colaboradoras-gestao | 7 | destructive:1, disabled:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:2 |
| rh | /comunidade/gerenciar | 7 | disabled:1, mutation_or_submit:4, session:1, unknown_button:1 |
| admin | /admin?tab=usuarios | 6 | destructive:1, mutation_or_submit:2, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| colaboradora | /campanhas | 6 | disabled:1, session:1, unknown_button:4 |
| rh | /departamentos | 6 | destructive:1, mutation_or_submit:2, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| rh | /onboarding-rh | 6 | mutation_or_submit:1, session:1, unknown_button:4 |
| admin | /admin?tab=admin | 5 | destructive:1, mutation_or_submit:2, session:1, unknown_button:1 |
| admin | /admin?tab=empresas | 5 | destructive:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| admin | /avaliacao-nr1 | 5 | destructive:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| admin | /canal-denuncias | 5 | destructive:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| admin | /concierge | 5 | destructive:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| admin | /desenvolvimento-humano | 5 | destructive:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |
| admin | /nr1 | 5 | destructive:1, mutation_or_submit:1, session:1, stateful_open_or_mutation_risk:1, unknown_button:1 |

## Lane Policy

- Production remains read-only. These controls are not cleared for production clicking by this map.
- Local/fixture validation must cover unknown, session, mutation, destructive and stateful controls before any production guarded lane.
- Disabled controls require static disabled-state assertion, not click execution.
- Sensitive modules remain fail-closed and require contract/governance before real workflow activation.
