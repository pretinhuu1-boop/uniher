ALTER TABLE user_exams ADD COLUMN exam_key TEXT;
ALTER TABLE user_exams ADD COLUMN unknown_due_date INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_exams ADD COLUMN not_applicable INTEGER NOT NULL DEFAULT 0;

UPDATE user_exams
SET
  exam_key = CASE exam_name
    WHEN 'Papanicolau' THEN 'papanicolau'
    WHEN 'Colposcopia' THEN 'colposcopy'
    WHEN 'Mamografia' THEN 'mammography'
    WHEN 'Ultrassonografia pelvica ou transvaginal' THEN 'pelvic_ultrasound'
    WHEN 'Exame clinico das mamas' THEN 'clinical_breast_exam'
    WHEN 'Dosagem hormonal (TSH, estradiol, FSH e prolactina)' THEN 'hormone_panel'
    WHEN 'Densitometria ossea' THEN 'bone_density'
    WHEN 'Perfil de fertilidade' THEN 'fertility_profile'
    WHEN 'Hemograma completo e ferritina' THEN 'cbc_ferritin'
    WHEN 'Perfil lipidico e glicemia' THEN 'lipid_glucose'
    WHEN 'Vitamina D' THEN 'vitamin_d'
    WHEN 'Sorologias para HIV, sifilis e hepatites B e C' THEN 'serologies'
    WHEN 'Rastreio de HPV' THEN 'hpv_screening'
    WHEN 'Colonoscopia' THEN 'colonoscopy'
    WHEN 'Avaliacao de funcao cognitiva' THEN 'cognitive_assessment'
    WHEN 'Triagem estruturada de saude mental' THEN 'mental_health_screening'
    ELSE NULL
  END,
  unknown_due_date = CASE WHEN due_date IS NULL THEN 1 ELSE 0 END
WHERE source = 'semaforo_exam_quiz' AND exam_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_exams_quiz_key
  ON user_exams(user_id, source, exam_key);

CREATE TABLE IF NOT EXISTS concierge_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('safe', 'attention', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved')),
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_concierge_cases_one_open
  ON concierge_cases(user_id, source)
  WHERE status IN ('open', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_concierge_cases_company_status
  ON concierge_cases(company_id, status, severity);
