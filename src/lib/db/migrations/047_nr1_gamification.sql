-- 047: Gamificação da conclusão da avaliação NR-1 (COPSOQ).
-- Recompensa o ATO de concluir (participação), NUNCA o conteúdo/score/velocidade.
-- O crédito NÃO entra na liga (week_points) nem na meta diária/streak — ver awardNr1Completion.

-- XP de participação configurável por empresa (lido como config?.xp_nr1 ?? 60).
ALTER TABLE gamification_config ADD COLUMN xp_nr1 INTEGER DEFAULT 60;

-- Badge de PARTICIPAÇÃO (não de score/conteúdo). points=0 DE PROPÓSITO:
-- checkParticipationBadges não credita pontos por este badge (evita duplo-crédito,
-- pois o XP já é dado por awardNr1Completion).
INSERT OR IGNORE INTO badges (id, name, description, icon, points, rarity)
VALUES (
  'badge_nr1',
  'Voz Ativa',
  'Concluiu a avaliação de bem-estar (NR-1). Sua voz ajuda a cuidar do ambiente.',
  '🗣️',
  0,
  'rare'
);
