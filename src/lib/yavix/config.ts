// ─────────────────────────────────────────────────────────────────────────────
// Gate único da integração Yavix.
//
// OPT-IN explícito (fail-closed): o mock só roda com YAVIX_MOCK === '1'.
// Qualquer outro valor (incl. ausente/typo/'false') cai no caminho real
// (hoje 503/Onda 3). Isso evita servir dado MOCKADO de saúde mental por
// esquecimento de configurar a env em produção.
//
// Dev/preview: definir YAVIX_MOCK=1 (já presente em .env.local).
// ─────────────────────────────────────────────────────────────────────────────
export function isYavixMock(): boolean {
  return process.env.YAVIX_MOCK === '1';
}
