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
- `GET/POST/PATCH /api/rh/challenges`
- `GET/POST/PATCH /api/rh/leagues`
- `GET /api/rh/agenda`

Riscos:

- empresa acessar registros de outra empresa
- lições e campanhas fora do escopo correto

## Colaboradora e jornada

- `GET /api/dashboard`
- `GET /api/collaborator`
- `GET /api/collaborator/feed`
- `GET /api/notifications`
- `POST /api/notifications/mark-read`
- `GET /api/gamification/daily-lesson`
- `POST /api/gamification/daily-lesson`
- `GET /api/gamification/daily-missions`
- `POST /api/quiz/submit`

Riscos:

- progresso não persistir
- leitura voltar como não lida
- pontuação inconsistente
- missão “clicável” sem efeito real

## Operação

- `GET /api/health`

Uso:

- health check de deploy
- validação do processo PM2
- checagem simples do banco e fila de escrita
