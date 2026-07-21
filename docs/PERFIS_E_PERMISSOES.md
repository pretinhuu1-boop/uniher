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
- em `/comunidade/gerenciar`, deve selecionar explicitamente uma empresa ativa; `role = admin` sem `isMasterAdmin === true` não recebe escopo global

Arquivos centrais:

- [src/lib/auth/middleware.ts](../src/lib/auth/middleware.ts)
- [src/lib/auth/jwt.ts](../src/lib/auth/jwt.ts)
- [src/app/api/admin/users/route.ts](../src/app/api/admin/users/route.ts)
- [src/app/api/admin/users/[id]/route.ts](../src/app/api/admin/users/%5Bid%5D/route.ts)
- [src/lib/db/migrations/046_add_is_master_admin_to_users.sql](../src/lib/db/migrations/046_add_is_master_admin_to_users.sql)

### Admin Empresa / RH

Escopo:

- gestão da própria empresa
- gestão de departamentos
- colaboradoras
- campanhas
- ligas
- desafios
- lições e gamificação da empresa
- gestão editorial em `/comunidade/gerenciar`
- switch do feed da própria empresa em `/company-profile`

Não deve:

- acessar rotas globais de admin master
- atuar sobre outras empresas
- enviar alertas globais para todos os admins

Arquivos centrais:

- [src/app/api/admin/alerts/send/route.ts](../src/app/api/admin/alerts/send/route.ts)
- [src/app/api/departments/route.ts](../src/app/api/departments/route.ts)

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

Pode acessar `/comunidade` e executar apenas as relações próprias de apoio e salvamento. Uma pessoa com outro papel e `also_collaborator = 1` recebe a mesma capacidade colaboradora sem ganhar permissão editorial adicional.

## Matriz da comunidade

| Superfície | Colaboradora | Dual-role (`also_collaborator = 1`) | RH/Admin empresa | Admin Master |
| --- | --- | --- | --- | --- |
| `/comunidade` e feed da empresa | Sim | Sim | Somente se também tiver capacidade colaboradora | Somente se também tiver capacidade colaboradora |
| Apoiar e salvar | Próprio usuário | Próprio usuário | Não por papel de gestão | Não por papel master |
| `/configuracoes` - consentimento de nome | Próprio usuário | Próprio usuário | Próprio usuário | Próprio usuário |
| `/configuracoes` - itens salvos | Próprio usuário | Próprio usuário | Somente se também tiver capacidade colaboradora | Somente se também tiver capacidade colaboradora |
| `/comunidade/gerenciar` | Não | Conforme papel RH/admin | Empresa persistida do ator | Empresa ativa selecionada explicitamente |
| `/company-profile` - switch do feed | Não | Conforme papel RH/admin | Somente empresa autenticada | Somente empresa autenticada nesta rota |

Regras de tenant:

- o cliente não envia `companyId` para feed, salvos, apoio ou apoiadoras;
- o consentimento `Mostrar meu nome ao apoiar` pertence ao próprio usuário e aparece para todo perfil autenticado; somente a seção de itens salvos é capability-gated;
- RH/admin de empresa não pode listar, ler ou alterar posts de outra empresa;
- apenas master persistido pode usar `companyId` na gestão editorial, sem inferência de alvo;
- empresa ausente, inativa, excluída ou divergente faz a operação falhar fechada;
- a permissão do token não basta para escrita: ator, papel e empresa são revalidados na mesma transação.

## Regras de segurança

- permissão de frontend nunca substitui backend
- esconder link no menu ajuda UX, mas a proteção real fica na API e middleware
- rotas administrativas devem validar papel e escopo
- `Admin Master` é explícito, não apenas `role = admin`
- salvos e consentimento de nome são recursos privados do próprio usuário; apoio permanece agregado mesmo após revogação do nome

## Fluxo recomendado para novas features

1. definir qual perfil pode ver a tela
2. definir qual perfil pode executar a ação
3. proteger backend
4. esconder navegação indevida
5. validar resposta da API com usuário fora do escopo
