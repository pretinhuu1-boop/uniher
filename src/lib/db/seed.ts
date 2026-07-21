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
      if (!existingDemo) {
        console.log('[seed] Criando empresa demo + RH para testes visuais...');
        const demoCompanyId = 'company_demo_visual';
        db.prepare(`
          INSERT INTO companies (id, name, cnpj, sector, plan)
          VALUES (?, 'Eduardo e Yurimara Marketing LTDA', '00.000.000/0001-00', 'Marketing', 'pro')
        `).run(demoCompanyId);
        db.prepare(`
          INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, level, points, is_approved)
          VALUES (?, ?, NULL, 'Contabilidade RH', 'contabilidade@eduardaeyurimarketingltda.com.br', ?, 'rh', 1, 0, 1)
        `).run('user_demo_rh', demoCompanyId, adminPassword);
      } else {
        console.log('[seed] Empresa demo já existe, pulando...');
      }

      console.log('[seed] ✅ Seed base concluído!');
      console.log('[seed] Admin: admin@uniher.com.br / Admin@2026');
      console.log('[seed] Demo RH: contabilidade@eduardaeyurimarketingltda.com.br / Admin@2026');
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
