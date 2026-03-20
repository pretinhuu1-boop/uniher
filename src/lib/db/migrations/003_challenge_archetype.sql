-- Adicionar archetype_id a tabela de desafios
ALTER TABLE challenges ADD COLUMN archetype_id TEXT REFERENCES archetypes(id);

CREATE INDEX IF NOT EXISTS idx_challenges_archetype ON challenges(archetype_id);
