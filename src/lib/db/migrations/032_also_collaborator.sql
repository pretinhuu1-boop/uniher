-- Flag para usuários que também participam como colaboradora
ALTER TABLE users ADD COLUMN also_collaborator INTEGER DEFAULT 0;

-- Liderança sempre é colaboradora por natureza
UPDATE users SET also_collaborator = 1 WHERE role = 'lideranca';
