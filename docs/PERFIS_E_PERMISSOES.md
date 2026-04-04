# Perfis e Permissões

Documento público para orientar desenvolvimento, revisão e operação sem expor credenciais.

## Perfis principais

### Admin Master

Escopo:

- visão global da plataforma
- empresas
- admins globais
- auditoria
- sistema
- configurações globais
- alertas globais

Pontos centrais:

- acesso às rotas globais de `/api/admin/*`
- pode enviar alertas amplos
- pode gerenciar admins master

Arquivos centrais:

- [src/lib/auth/middleware.ts](C:/Users/User/projetoss/uniher/src/lib/auth/middleware.ts)
- [src/lib/auth/jwt.ts](C:/Users/User/projetoss/uniher/src/lib/auth/jwt.ts)
- [src/app/api/admin/users/route.ts](C:/Users/User/projetoss/uniher/src/app/api/admin/users/route.ts)
- [src/app/api/admin/users/[id]/route.ts](C:/Users/User/projetoss/uniher/src/app/api/admin/users/[id]/route.ts)
- [src/lib/db/migrations/046_add_is_master_admin_to_users.sql](C:/Users/User/projetoss/uniher/src/lib/db/migrations/046_add_is_master_admin_to_users.sql)

### Admin Empresa / RH

Escopo:

- gestão da própria empresa
- gestão de departamentos
- colaboradoras
- campanhas
- ligas
- desafios
- lições e gamificação da empresa

Não deve:

- acessar rotas globais de admin master
- atuar sobre outras empresas
- enviar alertas globais para todos os admins

Arquivos centrais:

- [src/app/api/admin/alerts/send/route.ts](C:/Users/User/projetoss/uniher/src/app/api/admin/alerts/send/route.ts)
- [src/app/api/departments/route.ts](C:/Users/User/projetoss/uniher/src/app/api/departments/route.ts)

### Liderança

Escopo:

- visão do time/departamento
- acompanhamento de indicadores e algumas jornadas operacionais

Observação:

- a liderança pode ter visão mista dependendo da flag de colaboração

### Colaboradora

Escopo:

- jornada individual
- gamificação
- feed
- notificações
- trilha
- agenda
- semáforo

Não deve:

- ver telas administrativas
- executar mutações administrativas

## Regras de segurança

- permissão de frontend nunca substitui backend
- esconder link no menu ajuda UX, mas a proteção real fica na API e middleware
- rotas administrativas devem validar papel e escopo
- `Admin Master` é explícito, não apenas `role = admin`

## Fluxo recomendado para novas features

1. definir qual perfil pode ver a tela
2. definir qual perfil pode executar a ação
3. proteger backend
4. esconder navegação indevida
5. validar resposta da API com usuário fora do escopo
