// ─────────────────────────────────────────────────────────────────────────────
// Gate único da integração Yavix.
//
// OPT-IN explicito (fail-closed): o mock so roda com YAVIX_MOCK === '1'
// em dev/test. Qualquer outro valor (incl. ausente/typo/'false') e qualquer
// runtime de producao caem no caminho real bloqueado (hoje 503/Onda 3).
// Isso evita servir dado MOCKADO de saude mental por configuracao indevida.
//
// Dev/preview: definir YAVIX_MOCK=1 (já presente em .env.local).
// ─────────────────────────────────────────────────────────────────────────────
export function isYavixMock(): boolean {
  return (
    process.env.YAVIX_MOCK === '1' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
  );
}
