# APIs Críticas

Documento público com foco nas rotas mais sensíveis para operação, segurança e regressão.

## Autenticação

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/change-password`
- `POST /api/auth/confirm-first-access`

Riscos:

- perda de sessão
- cookies incorretos em HTTP/HTTPS
- redirect indevido
- bloqueio de fluxo de primeiro acesso

## Administração global

- `GET/POST /api/admin/users`
- `PATCH/DELETE /api/admin/users/[id]`
- `GET/POST /api/admin/companies`
- `PATCH /api/admin/companies/[id]`
- `GET /api/admin/system`
- `POST /api/admin/system/backup`
- `POST /api/admin/alerts/send`
- `GET /api/admin/audit`

Riscos:

- acesso indevido de perfil não master
- escopo incorreto entre empresas
- alertas globais disparados por perfil errado

## RH / Empresa

- `GET /api/rh/users`
- `GET /api/rh/departments`
- `GET/POST/PATCH /api/rh/lessons`
- `GET /api/rh/agenda`

Riscos:

- empresa acessar registros de outra empresa
- lições e campanhas fora do escopo correto

## Colaboradora e jornada

- `GET /api/dashboard`
- `GET /api/collaborator`
- `GET /api/notifications`
- `POST /api/notifications/mark-read`
- `GET /api/gamification/daily-lesson`
- `POST /api/gamification/daily-lesson`
- `GET /api/gamification/daily-missions`
- `POST /api/quiz/submit`

Riscos:

- progresso não persistir
- leitura voltar como não lida
- missão “clicável” sem efeito real

## Superfícies em revisão de privacidade

As rotas legadas de objetivos, desafios, badges/conquistas e ligas não são
operacionais. Todos os métodos exportados respondem `410` com
`{ status: "unavailable", reason: "privacy_review", message }`,
`Cache-Control: private, no-store` e `Vary: Cookie`.

Isso inclui `/api/objectives/**`, `/api/rh/objectives/**`,
`/api/collaborator/challenges/**`, `/api/rh/challenges/**`,
`/api/admin/badges/**`, `/api/collaborator/badges`,
`/api/collaborator/leagues`, `/api/gamification/league` e `/api/rh/leagues/**`.
Essas URLs não devem ser usadas como base para as novas Waves 5-10.

## Operação

- `GET /api/health`

Uso:

- health check de deploy
- validação do processo PM2
- checagem simples do banco e fila de escrita

## Comunidade da empresa

Todas as respostas autenticadas usam `Cache-Control: private, no-store` e `Vary: Cookie`. A autenticação aceita o cookie `uniher-access-token` ou `Authorization: Bearer`; são alternativas, não requisitos simultâneos. O frontend nunca escolhe o tenant da experiência colaboradora: `userId` e `companyId` vêm da sessão e a associação ativa, a empresa e a capacidade de colaboradora são revalidadas no banco. A capacidade existe para `role = colaboradora` ou `also_collaborator = 1`.

### Feed e itens privados da colaboradora

| Rota | Contrato runtime |
| --- | --- |
| `GET /api/collaborator/company` | Identidade mínima da empresa autenticada para a UI colaboradora. Retorna somente `{ company: { id, name, trade_name, logo_url } }`; não expõe CNPJ, plano, contatos, cores, estatísticas ou settings. |
| `GET /api/collaborator/feed` | Feed publicado da empresa autenticada. Aceita `scope=company`, `topic`, `limit` de 1 a 30 e cursor opaco. Retorna `{ items, nextCursor, scope: "company", settings: { companyFeedEnabled } }`. |
| `GET /api/collaborator/saved` | Somente itens salvos pelo próprio usuário no tenant atual. Aceita `limit` de 1 a 30 e cursor opaco. Tem a mesma forma do feed. |
| `POST/DELETE /api/collaborator/feed/[id]/support` | Apoia/remove apoio do próprio usuário e retorna `{ supportCount, supportedByMe }`. Repetições são idempotentes. |
| `POST/DELETE /api/collaborator/feed/[id]/save` | Salva/remove o item somente para o próprio usuário e retorna `{ savedByMe }`. Repetições são idempotentes. |
| `GET /api/collaborator/feed/[id]/supporters` | Retorna `{ names, nextCursor }`, com `limit` de 1 a 20. Só inclui nomes de membros ativos com consentimento atual. |

O feed aceita apenas os tópicos `pausas`, `sono`, `movimento`, `cuidado` e `geral`. Cursores são opacos e não devem ser construídos pelo cliente. Chaves repetidas de filtros/cursor/limit e parâmetros extras falham fechados; qualquer `scope` diferente de `company` é rejeitado. Quando `feed_company_enabled` está ausente ou diferente de `1`, feed e salvos retornam lista vazia com `companyFeedEnabled: false`; apoio, salvamento e consulta de apoiadoras são bloqueados.

`GET /api/collaborator/company` não aceita `companyId`: o tenant vem da sessão e deve coincidir com `users.company_id`. A leitura revalida em uma transação o usuário ativo, aprovado e não bloqueado, a igualdade do papel persistido com o papel autenticado, a capacidade atual (`role = colaboradora` ou `also_collaborator = 1`) e a empresa ativa/não excluída. A allowlist exata da projeção é `id`, `name`, `trade_name` e `logo_url`. O middleware retorna `401` para sessão ausente, revogada, inválida ou expirada; ator, papel, capability ou tenant incoerente retorna `403 COLLABORATOR_CAPABILITY_REQUIRED`; empresa ausente, inativa ou excluída retorna `404 COMPANY_NOT_FOUND`. A rota ativa não emite `410` no contrato atual.

Erros de domínio estáveis:

- `400 COMPANY_REQUIRED`: a sessão não possui empresa;
- `403 COLLABORATOR_CAPABILITY_REQUIRED`: ator sem capacidade persistida de colaboradora;
- `403 MEMBERSHIP_DENIED`: usuário, empresa ou associação não estão ativos/coerentes;
- `403 FEED_DISABLED`: escrita ou nomes solicitados com o feed desligado;
- `404 POST_NOT_FOUND`: o post não é publicado, ativo e pertencente ao tenant atual;
- `422 COMMUNITY_SCOPE_UNSUPPORTED`, `COMMUNITY_QUERY_INVALID` ou `COMMUNITY_CURSOR_INVALID`;
- `429 RATE_LIMIT` nas mutações de apoio e salvamento, por usuário autenticado.

### Consentimento e privacidade

- `GET /api/users/me/preferences` retorna apenas preferências do próprio ator e injeta `privacy_community_supporter_name: "0"` quando a chave não existe.
- `PATCH /api/users/me/preferences` aceita `"0"` ou `"1"` para essa chave. Mudança real usa `transaction.immediate()` e grava receipt `user_preference_update`; repetição idempotente não grava outro receipt. O receipt contém ator, chave, IP e timestamp, sem valor da preferência nem conteúdo sensível.
- O consentimento aparece para qualquer perfil autenticado. Somente a lista privada de itens salvos exige capacidade de colaboradora.
- Se o PATCH contiver `privacy_ranking`, a rota retorna `410` com `{ status: "unavailable", reason: "privacy_review", message }` antes de persistir qualquer preferência do corpo.
- Revogar de `"1"` para `"0"` remove o nome da próxima consulta de apoiadoras sem apagar o apoio e sem reduzir `supportCount`.
- Salvos são privados por usuário e empresa. Cache SWR é particionado por identidade/capacidade; troca de sessão e perda de autorização limpam as variantes privadas antes de nova leitura.

### Gestão editorial RH/Admin

| Rota | Contrato runtime |
| --- | --- |
| `GET /api/rh/community/posts` | Lista editorial por `status=draft|published|archived`. Retorna `{ companyId, status, items, settings: { companyFeedEnabled } }`. |
| `POST /api/rh/community/posts` | Cria post `draft` ou `published`; master informa `companyId` no corpo. Publicação exige feed ligado. |
| `GET /api/rh/community/posts/[id]` | Lê um DTO editorial seguro no tenant resolvido. |
| `PATCH /api/rh/community/posts/[id]` | Edita conteúdo ou avança o lifecycle; master informa `companyId` na query. Não existe hard delete editorial. |

As rotas usam `withRole('rh', 'admin')`. RH e admin de empresa usam obrigatoriamente a empresa persistida do próprio ator. Somente `isMasterAdmin === true`, também confirmado no banco, pode informar outro `companyId`; para master a seleção é obrigatória e deve apontar para empresa ativa e não excluída. `role = admin` sozinho não cria fallback master.

Os campos editoriais são texto simples: `title`, `summary`, `bodyText`, `topic`, `readTimeMinutes`, `imagePath`, `status` e `expiresAt`. `publishedAt`, `createdAt` e `updatedAt` são UTC canônico do servidor. O lifecycle permitido é `draft -> published -> archived`; edições no mesmo status são aceitas, mas `archived` é terminal e rejeita qualquer `PATCH` com `409 COMMUNITY_TRANSITION_INVALID`. Publicar com switch desligado retorna `409 FEED_DISABLED`.

Todas as escritas editoriais passam por fila, rate limit autenticado e `transaction.immediate()`, revalidando ator, papel, empresa e post. Receipts `community_post_create|update|publish|archive` registram ator, empresa, post e ação, sem título, resumo ou corpo. Validação usa `422 COMMUNITY_POST_INVALID`; query inválida usa `422 COMMUNITY_QUERY_INVALID`; alvo ausente usa `404 COMMUNITY_POST_NOT_FOUND`; excesso usa `429 RATE_LIMIT`.

### Switch da empresa

- `GET /api/company` deriva a empresa do usuário persistido e retorna `company.feed_company_enabled`; setting ausente equivale a `false`.
- `PATCH /api/company` permite `feedCompanyEnabled` apenas para RH/admin ativos da empresa autenticada. Colaboradora recebe `403 FORBIDDEN`; não há `companyId` para troca de tenant.
- Mudança real é serializada com o update de perfil em `transaction.immediate()` e gera `company_community_feed_setting_update` (`entity_type = company_setting`, `entity_id = company`) com ator, IP, timestamp e `previous/new`. Repetição com o mesmo valor não duplica receipt.
- Corpo inválido retorna `422 COMPANY_UPDATE_INVALID`; empresa inválida/inativa retorna `404 COMPANY_NOT_FOUND`; rate limit retorna `429 RATE_LIMIT`.
