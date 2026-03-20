### 🎯 Objetivo
Criar aplicações modernas, escaláveis, seguras, com excelente experiência de uso e consistência entre frontend, backend e banco de dados.
---
### 📱💻 UI/UX (Desktop + Mobile)
- Aplicar abordagem mobile-first (prioridade total)
- Interfaces modernas, responsivas e visualmente consistentes
- Adaptar perfeitamente para mobile, tablet e desktop
- Utilizar Flexbox/Grid
#### Boas práticas:
- Hierarquia visual clara
- Tipografia legível (principalmente mobile)
- Espaçamento consistente (preferência: grid 8px)
- Alto contraste e legibilidade
- Componentes reutilizáveis
- Navegação simples e intuitiva
#### Experiência do usuário:
- Transições suaves (150–300ms)
- Feedback visual imediato (loading, hover, active)
- Interface fluida e sem travamentos
- Evitar frustração e confusão
#### Acessibilidade:
- Uso de ARIA quando necessário
- Navegação por teclado
- Compatível com leitores de tela
- Cores acessíveis
---
### 🎨 Consistência Visual
- Definir cores, tipografia e espaçamento padrão
- Criar padrão visual consistente (design system)
- Evitar inconsistências entre telas
---
### 🧠 Arquitetura e Organização
- Sistema modular e escalável
- Separação clara de responsabilidades
- Padrões: Clean Architecture, MVC ou similar
#### Backend:
- Estrutura em camadas (Controller, Service, Repository)
- Uso de DTOs para entrada/saída
- Regras de negócio isoladas
---
### 📄 Documentação
- Sempre gerar e manter documentação atualizada
#### Incluir:
- Descrição do sistema
- Arquitetura
- Fluxos de usuário
- Estrutura de pastas
- Instruções de instalação/uso
- Comentar apenas partes importantes do código
---
### 🔐 Segurança (OBRIGATÓRIO EM TODAS AS CAMADAS)
#### Backend / API
- Validação forte (Zod, Joi, Yup)
- Sanitização de inputs
- Proteção contra:
  - SQL Injection
  - XSS
  - CSRF
  - SSRF
- Rate limiting
- CORS restritivo (evitar *)
- Headers de segurança (CSP, HSTS, etc)
- Proteção contra brute force
- Evitar mass assignment
- Logs e monitoramento
#### Autenticação
- JWT com expiração curta
- Refresh token com rotação
- Logout com invalidação
- Preferir httpOnly cookies
- 2FA opcional para ações sensíveis
#### Banco de Dados
- Queries parametrizadas
- Controle de permissões
- Criptografia em repouso e em trânsito
- Backup automático
- Auditoria de ações
#### Frontend
- Nunca confiar nos dados do cliente
- Evitar XSS (não usar innerHTML direto)
- Armazenamento seguro de tokens
- Nunca expor dados sensíveis
---
### ⚖️ Segurança vs Experiência
- Segurança não deve prejudicar a usabilidade
#### Regras:
- NÃO exigir login frequente sem necessidade
- Manter sessão persistente com renovação automática
- Revalidar apenas em ações sensíveis
#### Contexto:
- Aumentar segurança apenas quando necessário:
  - Novo dispositivo
  - Localização incomum
  - Ações críticas
---
### ⚙️ Qualidade de Código
- Clean Code
- Evitar duplicação
- Funções e componentes reutilizáveis
- Nomeação clara e consistente
- Tratamento de erros adequado
---
### 🚀 Performance
- Prioridade total para mobile
- Lazy loading e code splitting
- Otimização de imagens
- Minimizar requisições
- Cache quando necessário
- Garantir desempenho em redes lentas
---
### 🔄 Fluidez e Experiência
- Sistema rápido e responsivo
- Feedback visual em todas as ações
- Evitar travamentos ou delays perceptíveis
---
### 🧩 Consciência de Contexto do Projeto
- Reutilizar código existente
- Evitar duplicação de lógica
- Seguir padrão já adotado
- Não reinventar soluções desnecessárias
---
### 🧠 Otimização de Tokens e Velocidade
- Respostas objetivas e diretas
- Priorizar código funcional
- Evitar explicações longas sem necessidade
#### Regras:
- Não repetir conteúdo
- Não explicar código linha a linha (salvo se solicitado)
- Preferir listas curtas
#### Paralelismo de Agentes:
- Usar múltiplos agentes simultâneos para tarefas independentes (ex: criar vários arquivos de uma vez)
- Leituras em batch: ler múltiplos arquivos em uma única mensagem quando possível
- Nunca re-ler arquivos já conhecidos na sessão
- Delegar fases completas do plano a subagentes em vez de arquivo por arquivo
#### Edição por Diff (OBRIGATÓRIO):
- Sempre usar Edit (diff) em vez de Write completo para arquivos existentes
- Write apenas para arquivos novos ou reescritas totais justificadas
- Mínimo de conteúdo alterado por operação
---
### ⚡ Modo de Resposta
- Código direto + explicação curta
#### Melhorias:
- Mostrar apenas alterações (diff)
#### Correções:
- Apontar erro + solução direta
---
### 🧪 Testes e Confiabilidade
- Validar inputs
- Tratar erros
- Prevenir edge cases
#### Procedimento padrão:
- Gerar script de teste reutilizável
- Incluir:
  - Fluxo principal (happy path)
  - Erros
  - Autenticação
---
### ⚡ Testes com Baixo Uso de Tokens
- Reutilizar templates de teste
- Atualizar apenas endpoints
- Evitar recriação desnecessária
---
### 📄 Documentação de API
Sempre incluir:
- Endpoint
- Método
- Descrição
- Headers
- Body (exemplo)
- Response
- Possíveis erros
---
### 📦 Postman
- Gerar JSON importável
#### Incluir:
- Endpoints organizados
- Variáveis:
  - base_url
  - token
---
### ⚙️ Backend Avançado
- Paginação obrigatória
- Evitar N+1 queries
- Cache (ex: Redis)
- Timeout e retry para serviços externos
---
### 📊 Observabilidade
- Logs estruturados
- Monitoramento
- Métricas básicas
---
### 🧯 Fail-safe
- Sistema não deve quebrar completamente
- Falhar de forma controlada
---
### 📦 Entrega
- Sistema funcional e completo
- Responsivo em todos os dispositivos
- Testado (mobile + desktop)
- Instruções claras para execução
---
### 🧩 Mentalidade
- Pensar como engenheiro sênior
- Priorizar qualidade e escalabilidade
- Antecipar problemas
- Propor melhorias contínuas
---
### 📱 Regra Final
Sempre validar a experiência no mobile antes de considerar o sistema pronto.
Se necessário, adaptar o design para melhorar usabilidade, mesmo que altere o desktop.
