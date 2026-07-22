# Mapa de Telas

Documento público para navegação funcional e revisão por perfil.

## Acesso público

- `/`
- `/auth`
- `/esqueci-senha`
- `/redefinir-senha`
- `/invite/[token]`

## Fluxos de primeiro acesso

- `/primeiro-acesso`
- `/pending-approval`
- `/welcome`
- `/welcome-colaboradora`
- `/welcome-colaboradora/quiz`

## Colaboradora

- `/dashboard`
- `/colaboradora`
- `/agenda`
- `/campanhas`
- `/desafios`
- `/liga`
- `/objetivos`
- `/historico`
- `/notificacoes`
- `/semaforo`
- `/configuracoes`
- `/conquistas`
- `/comunidade` - feed editorial privado da empresa para colaboradora ou dual-role

## RH / Admin Empresa

- `/colaboradoras-gestao`
- `/departamentos`
- `/convites`
- `/desafios/gerenciar`
- `/liga/gerenciar`
- `/gamificacao-config`
- `/onboarding-rh`
- `/comunidade/gerenciar` - CRUD editorial em texto simples, restrito ao tenant autenticado
- `/company-profile` - perfil da empresa e switch do feed, sempre na empresa autenticada

## Admin Master

- `/admin`
- `/comunidade/gerenciar` - exige seleção explícita de empresa ativa antes de qualquer leitura ou escrita editorial

Abas principais atuais do painel:

- Visão Geral
- Empresas
- Usuários
- Admin Master
- Badges
- Sistema
- Alertas
- Auditoria

## Observações operacionais

- o backend continua sendo a autoridade de acesso
- se uma tela estiver escondida, isso não elimina a necessidade de proteção da API
- telas longas do admin exigem revisão constante no mobile
- `/comunidade` cobre loading, feed, filtro, erro/retry, feed desligado, vazio, paginação, apoio, salvamento privado e nomes consentidos
- `/comunidade/gerenciar` cobre lista/filtro, criação, edição, publicação e arquivamento; não existe exclusão física pela tela/API
- `/configuracoes` mantém `Mostrar meu nome ao apoiar` desligado por padrão para todo perfil autenticado; a lista privada de itens salvos aparece apenas com capacidade colaboradora. Check-ins, semáforo e respostas da NR-1 nunca entram na comunidade
- `/semaforo`, `/objetivos`, `/desafios`, `/conquistas` e `/liga` continuam placeholders pendentes conforme o plano master; o feed funcional não altera esse status
