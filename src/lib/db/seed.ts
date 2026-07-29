/**
 * Seed de Homologação — UniHER
 * Cria apenas: 1 admin master + arquétipos + fixtures operacionais aprovadas
 * Sem empresas, usuários ou dados fake.
 */
import { getWriteQueue, getReadDb } from './index';
import { initDb } from './init';
import { hashPassword } from '../auth/password';

async function seed() {
  console.log('[seed] Iniciando seed de homologação...');
  await initDb();

  const db = getReadDb();
  const writeQueue = getWriteQueue();

  const adminPassword = await hashPassword('Admin@2026');

  await writeQueue.enqueue((db) => {
    // Temporarily disable FK for seed (inserts in dependency order but same transaction)
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      // ─── Admin Master (único usuário criado no seed) ───
      const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
      if (!existingAdmin) {
        console.log('[seed] Criando admin master...');
        db.prepare(`
          INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, is_master_admin, level, points)
          VALUES ('user_admin', NULL, NULL, 'Admin UniHER', 'admin@uniher.com.br', ?, 'admin', 1, 99, 0)
        `).run(adminPassword);
      } else {
        console.log('[seed] Admin master já existe, pulando...');
        db.prepare(`UPDATE users SET is_master_admin = 1 WHERE email = 'admin@uniher.com.br'`).run();
      }

      // ─── Arquétipos (estrutura base do sistema) ───
      const existingArch = db.prepare('SELECT COUNT(*) as c FROM archetypes').get() as { c: number };
      if (existingArch.c === 0) {
        console.log('[seed] Inserindo arquétipos...');
        const archetypes = [
          { id: 'arch_guardia', key: 'guardia', name: 'Guardiã Resiliente', desc: 'Cuida de todos ao redor mas às vezes esquece de si.', base: [2,3,2.5,3,2.5,3], g30: [3.5,4,3.5,4.5,3.5,4.5], missions: 12, campaigns: 3, habits: 8 },
          { id: 'arch_protetora', key: 'protetora', name: 'Protetora Silenciosa', desc: 'Sabe o que precisa mas adia por falta de tempo.', base: [2,3.5,2.5,2.5,2.5,2.5], g30: [4,4.5,3.5,3.5,3.5,4], missions: 10, campaigns: 4, habits: 10 },
          { id: 'arch_guerreira', key: 'guerreira', name: 'Guerreira em Evolução', desc: 'Já prioriza a saúde e quer avançar.', base: [5.5,5,4.8,5,5.2,5.5], g30: [6.5,6,6,6.2,6.5,7], missions: 18, campaigns: 5, habits: 14 },
          { id: 'arch_equilibrista', key: 'equilibrista', name: 'Equilibrista Zen', desc: 'Busca equilíbrio em tudo que faz.', base: [4,3.8,4,4.5,4.2,4.7], g30: [5,5,5.5,5.5,5.5,6], missions: 15, campaigns: 4, habits: 12 },
          { id: 'arch_exploradora', key: 'exploradora', name: 'Exploradora de Hábitos', desc: 'Sempre testando novas formas de cuidar da saúde.', base: [3,4,3.5,4,3,4], g30: [4.5,5.5,4.5,5,4.5,5.5], missions: 20, campaigns: 4, habits: 15 },
          { id: 'arch_soberana', key: 'soberana', name: 'Soberana do Autocuidado', desc: 'Domina sua saúde e inspira outras.', base: [7,7.5,7,8,7.5,8], g30: [8,8.5,8,8.5,8,9], missions: 25, campaigns: 6, habits: 20 },
        ];
        const archStmt = db.prepare('INSERT INTO archetypes (id, key, name, description, base_scores, growth_30, growth_60, growth_90, missions, campaigns, habits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        archetypes.forEach(a => archStmt.run(a.id, a.key, a.name, a.desc, JSON.stringify(a.base), JSON.stringify(a.g30), JSON.stringify(a.g30), JSON.stringify(a.g30), a.missions, a.campaigns, a.habits));
      } else {
        console.log('[seed] Arquétipos já existem, pulando...');
      }

      // ─── Demo Company + RH (usados pelos testes visuais E2E) ──────────────
      const existingDemo = db.prepare("SELECT id FROM companies WHERE cnpj = '00.000.000/0001-00'").get();
      const demoCompanyId = 'company_demo_visual';
      const demoRhId = 'user_demo_rh';
      const demoRhEmail = 'rh.visual@eduardaeyurimarketingltda.com.br';
      const demoLeadershipId = 'user_demo_leadership';
      const demoLeadershipEmail = 'lideranca.visual@eduardaeyurimarketingltda.com.br';
      const demoNr1Id = 'user_demo_nr1_collaborator';
      const demoNr1Email = 'nr1.visual@eduardaeyurimarketingltda.com.br';
      if (!existingDemo) {
        console.log('[seed] Criando empresa demo + RH para testes visuais...');
        db.prepare(`
          INSERT INTO companies (id, name, trade_name, cnpj, sector, plan, primary_color)
          VALUES (?, 'Eduardo e Yurimara Marketing LTDA', 'Eduardo e Yurimara Marketing', '00.000.000/0001-00', 'Marketing', 'pro', '#3E7D5A')
        `).run(demoCompanyId);
      } else {
        console.log('[seed] Empresa demo já existe, pulando...');
        db.prepare(`
          UPDATE companies
          SET trade_name = COALESCE(NULLIF(trade_name, ''), 'Eduardo e Yurimara Marketing'),
              primary_color = COALESCE(NULLIF(primary_color, ''), '#3E7D5A'),
              updated_at = datetime('now')
          WHERE cnpj = '00.000.000/0001-00'
        `).run();
      }

      const resolvedDemoCompany = db.prepare("SELECT id FROM companies WHERE cnpj = '00.000.000/0001-00'").get() as { id: string } | undefined;
      const resolvedDemoCompanyId = resolvedDemoCompany?.id ?? demoCompanyId;
      const existingDemoRh = db.prepare(`
        SELECT id FROM users
        WHERE email = ? OR id = ?
        ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END
        LIMIT 1
      `).get(demoRhEmail, demoRhId, demoRhEmail) as { id: string } | undefined;
      const resolvedDemoRhId = existingDemoRh?.id ?? demoRhId;

      if (existingDemoRh) {
        db.prepare(`
          UPDATE users
          SET company_id = ?,
              department_id = NULL,
              name = 'Contabilidade RH',
              email = ?,
              password_hash = ?,
              role = 'rh',
              approved = 1,
              must_change_password = 0,
              also_collaborator = 1,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(resolvedDemoCompanyId, demoRhEmail, adminPassword, resolvedDemoRhId);
      } else {
        db.prepare(`
          INSERT INTO users (
            id, company_id, department_id, name, email, password_hash, role,
            approved, level, points, must_change_password, also_collaborator
          )
          VALUES (?, ?, NULL, 'Contabilidade RH', ?, ?, 'rh', 1, 1, 0, 0, 1)
        `).run(resolvedDemoRhId, resolvedDemoCompanyId, demoRhEmail, adminPassword);
      }

      db.prepare(`
        INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
        VALUES (?, 'first_access_tour_completed', '1', datetime('now'))
        ON CONFLICT(user_id, pref_key) DO UPDATE SET
          pref_value = excluded.pref_value,
          updated_at = excluded.updated_at
      `).run(resolvedDemoRhId);

      db.prepare(`
        INSERT INTO departments (id, company_id, name, color)
        VALUES ('dept_demo_visual_ops', ?, 'Operacoes', '#3E7D5A')
        ON CONFLICT(id) DO UPDATE SET
          company_id = excluded.company_id,
          name = excluded.name,
          color = excluded.color
      `).run(resolvedDemoCompanyId);

      const existingDemoLeadership = db.prepare(`
        SELECT id FROM users
        WHERE email = ? OR id = ?
        ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END
        LIMIT 1
      `).get(demoLeadershipEmail, demoLeadershipId, demoLeadershipEmail) as { id: string } | undefined;
      const resolvedDemoLeadershipId = existingDemoLeadership?.id ?? demoLeadershipId;

      if (existingDemoLeadership) {
        db.prepare(`
          UPDATE users
          SET company_id = ?,
              department_id = 'dept_demo_visual_ops',
              name = 'Lideranca Visual',
              email = ?,
              password_hash = ?,
              role = 'lideranca',
              approved = 1,
              must_change_password = 0,
              also_collaborator = 1,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(resolvedDemoCompanyId, demoLeadershipEmail, adminPassword, resolvedDemoLeadershipId);
      } else {
        db.prepare(`
          INSERT INTO users (
            id, company_id, department_id, name, email, password_hash, role,
            approved, level, points, must_change_password, also_collaborator
          )
          VALUES (?, ?, 'dept_demo_visual_ops', 'Lideranca Visual', ?, ?, 'lideranca', 1, 1, 0, 0, 1)
        `).run(resolvedDemoLeadershipId, resolvedDemoCompanyId, demoLeadershipEmail, adminPassword);
      }

      db.prepare(`
        INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
        VALUES (?, 'first_access_tour_completed', '1', datetime('now'))
        ON CONFLICT(user_id, pref_key) DO UPDATE SET
          pref_value = excluded.pref_value,
          updated_at = excluded.updated_at
      `).run(resolvedDemoLeadershipId);

      const existingDemoNr1 = db.prepare(`
        SELECT id FROM users
        WHERE email = ? OR id = ?
        ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END
        LIMIT 1
      `).get(demoNr1Email, demoNr1Id, demoNr1Email) as { id: string } | undefined;
      const resolvedDemoNr1Id = existingDemoNr1?.id ?? demoNr1Id;

      if (existingDemoNr1) {
        db.prepare(`
          UPDATE users
          SET company_id = ?,
              department_id = 'dept_demo_visual_ops',
              name = 'NR-1 Colaboradora',
              email = ?,
              password_hash = ?,
              role = 'colaboradora',
              approved = 1,
              must_change_password = 0,
              also_collaborator = 0,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(resolvedDemoCompanyId, demoNr1Email, adminPassword, resolvedDemoNr1Id);
      } else {
        db.prepare(`
          INSERT INTO users (
            id, company_id, department_id, name, email, password_hash, role,
            approved, level, points, must_change_password, also_collaborator
          )
          VALUES (?, ?, 'dept_demo_visual_ops', 'NR-1 Colaboradora', ?, ?, 'colaboradora', 1, 1, 0, 0, 0)
        `).run(resolvedDemoNr1Id, resolvedDemoCompanyId, demoNr1Email, adminPassword);
      }

      db.prepare(`
        INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
        VALUES (?, 'first_access_tour_completed', '1', datetime('now'))
        ON CONFLICT(user_id, pref_key) DO UPDATE SET
          pref_value = excluded.pref_value,
          updated_at = excluded.updated_at
      `).run(resolvedDemoNr1Id);

      db.prepare(`
        INSERT INTO invites (
          id, company_id, email, role, department_id, token, status, invited_by, expires_at
        )
        VALUES (
          'invite_demo_visual_collab',
          ?,
          'fixture-colaboradora@eduardaeyurimarketingltda.com.br',
          'colaboradora',
          'dept_demo_visual_ops',
          'fixture-demo-visual-collab-token',
          'pending',
          ?,
          datetime('now', '+30 days')
        )
        ON CONFLICT(id) DO UPDATE SET
          company_id = excluded.company_id,
          email = excluded.email,
          role = excluded.role,
          department_id = excluded.department_id,
          token = excluded.token,
          status = excluded.status,
          invited_by = excluded.invited_by,
          expires_at = excluded.expires_at
      `).run(resolvedDemoCompanyId, resolvedDemoRhId);

      console.log('[seed] ✅ Seed base concluído; credenciais não são exibidas em logs.');
    })();
    db.pragma('foreign_keys = ON');
  });

  // Seed gamification lessons (30 lições de saúde, 6 semanas)
  try {
    const { seedGamificationLessons } = require('./seeds/gamification-seed');
    await writeQueue.enqueue((db) => {
      db.pragma('foreign_keys = OFF');
      try {
        seedGamificationLessons(db);
      } finally {
        db.pragma('foreign_keys = ON');
      }
    });
    console.log('[seed] ✅ Lições de gamificação inseridas!');
  } catch (err: any) {
    console.warn('[seed] ⚠️ Gamification seed:', err.message);
  }

  console.log('[seed] ✅ Seed de homologação completo!');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[seed] ERRO:', err);
    process.exit(1);
  });
