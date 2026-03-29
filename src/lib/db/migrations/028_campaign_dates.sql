-- Adiciona colunas de data, tema e cor de tema às campanhas
ALTER TABLE campaigns ADD COLUMN start_date TEXT;
ALTER TABLE campaigns ADD COLUMN end_date TEXT;
ALTER TABLE campaigns ADD COLUMN theme TEXT;
ALTER TABLE campaigns ADD COLUMN theme_color TEXT;

-- Índice para queries de filtragem temporal
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns (start_date, end_date);
