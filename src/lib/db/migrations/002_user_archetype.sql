-- Migração 002: Adiciona archetype_id em users e carga inicial de arquetipos

ALTER TABLE users ADD COLUMN archetype_id TEXT REFERENCES archetypes(id);

-- Carga inicial de Arquetipos
INSERT OR IGNORE INTO archetypes (id, key, name, description, base_scores, growth_30, growth_60, growth_90)
VALUES 
('arc_guardia', 'guardia', 'Guardiã', 'Pilar da estabilidade e tradição.', '[7, 8, 9, 7, 8, 9]', '[0, 5, 2, 4, 1, 3]', '[2, 7, 5, 8, 4, 6]', '[5, 10, 8, 12, 7, 10]'),
('arc_protetora', 'protetora', 'Protetora', 'Bem-estar coletivo e segurança emocional.', '[8, 9, 7, 8, 9, 7]', '[3, 2, 4, 1, 5, 2]', '[6, 5, 8, 4, 9, 5]', '[10, 8, 12, 7, 15, 8]'),
('arc_guerreira', 'guerreira', 'Guerreira', 'Resultados e superação constante.', '[6, 5, 9, 9, 6, 8]', '[5, 4, 3, 5, 4, 5]', '[10, 8, 7, 12, 9, 10]', '[15, 12, 12, 18, 14, 15]'),
('arc_equilibrista', 'equilibrista', 'Equilibrista', 'Harmonia entre vida pessoal e saúde.', '[8, 8, 8, 8, 8, 8]', '[2, 2, 2, 2, 2, 2]', '[5, 5, 5, 5, 5, 5]', '[8, 8, 8, 8, 8, 8]');
