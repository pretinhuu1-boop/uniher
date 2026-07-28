# Mensagem para contato com a Yavix

Assunto sugerido: Alinhamento tecnico UniHER x Yavix - COPSOQ41 / NR-1

Mensagem:

```text
Ola, equipe Yavix.

Estamos preparando a proxima etapa da integracao UniHER x Yavix para o fluxo COPSOQ41 / NR-1 e queremos alinhar o contrato tecnico antes de iniciar qualquer chamada real ou importacao de dados.

Nosso objetivo e validar um piloto seguro, sem expor token Yavix no navegador e sem depender de armazenamento de senhas individuais de colaboradoras. Tambem precisamos entender como receber resultados, scoring ou laudo apos a finalizacao do formulario, pois o material que temos cobre o preenchimento, mas nao a leitura dos resultados.

Anexamos uma lista objetiva de perguntas por prioridade. Os pontos mais importantes para destravar a proxima etapa sao:

1. Existe autenticacao B2B, service account, API key, client credentials ou SSO/OIDC?
2. Existe endpoint, exportacao ou outro canal oficial para resultados/scoring/laudo apos status DONE?
3. Voces podem enviar OpenAPI/Postman/documentacao atualizada, incluindo ambiente de homologacao?
4. Existe API de provisionamento de empresas/filiais/funcionarios ou o MVP deve seguir por planilha?
5. Podemos receber tenant e credenciais de sandbox sem PII real?
6. Quais sao as regras de LGPD, consentimento, retencao e remocao de colaboradores?

Com essas respostas, conseguimos definir se o MVP segue por planilha controlada, redirect/SSO ou proxy server-side integrado.

Obrigado.
```

Arquivo recomendado para envio: `docs/PERGUNTAS_YAVIX_INTEGRACAO.md`.
