/**
 * Seed de Homologação — UniHER
 * Cria apenas: 1 admin master + arquétipos + badges base
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

      // ─── Badges base (estrutura do sistema de gamificação) ───
      const existingBadges = db.prepare('SELECT COUNT(*) as c FROM badges').get() as { c: number };
      if (existingBadges.c === 0) {
        console.log('[seed] Inserindo badges base...');
        const badges = [
          { id: 'badge_1', name: 'Primeira Semana', desc: 'Complete sua primeira semana na plataforma.', icon: '🌱', pts: 50, rarity: 'common' },
          { id: 'badge_2', name: 'Sequência de 7 dias', desc: 'Mantenha 7 dias consecutivos de check-in.', icon: '🔥', pts: 150, rarity: 'rare' },
          { id: 'badge_3', name: 'Guardiã da Saúde', desc: 'Complete 5 desafios de saúde preventiva.', icon: '🏥', pts: 200, rarity: 'rare' },
          { id: 'badge_4', name: 'Mente Zen', desc: 'Complete 3 desafios de saúde mental.', icon: '🧘', pts: 100, rarity: 'common' },
          { id: 'badge_5', name: 'Hidratação Campeã', desc: 'Registre hidratação por 14 dias consecutivos.', icon: '💧', pts: 300, rarity: 'epic' },
          { id: 'badge_6', name: 'Exploradora', desc: 'Participe de 3 campanhas diferentes.', icon: '🌟', pts: 500, rarity: 'legendary' },
        ];
        const badgeStmt = db.prepare('INSERT OR IGNORE INTO badges (id, name, description, icon, points, rarity) VALUES (?, ?, ?, ?, ?, ?)');
        badges.forEach(b => badgeStmt.run(b.id, b.name, b.desc, b.icon, b.pts, b.rarity));
      } else {
        console.log('[seed] Badges já existem, pulando...');
      }

      // ─── Desafios padrão da plataforma ───
      const existingCh = db.prepare('SELECT COUNT(*) as c FROM challenges WHERE is_default = 1').get() as { c: number };
      if (existingCh.c === 0) {
        console.log('[seed] Inserindo desafios padrão...');
        const challenges = [
          { id: 'ch_1', title: 'Ritual de Meditação', cat: 'Saúde Mental', steps: 5, arche: 'arch_protetora' },
          { id: 'ch_2', title: 'Hidratação 2L', cat: 'Hábitos', steps: 5, arche: 'arch_guardia' },
          { id: 'ch_3', title: 'Sono Reparador', cat: 'Sono', steps: 7, arche: 'arch_guardia' },
          { id: 'ch_4', title: 'Pausas Ativas', cat: 'Energia', steps: 10, arche: 'arch_guerreira' },
          { id: 'ch_5', title: 'Mindfulness 10 min', cat: 'Saúde Mental', steps: 3, arche: 'arch_protetora' },
        ];
        const chStmt = db.prepare('INSERT OR IGNORE INTO challenges (id, title, description, category, points, total_steps, archetype_id, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
        challenges.forEach(c => chStmt.run(c.id, c.title, c.title, c.cat, 100, c.steps, c.arche));
      } else {
        console.log('[seed] Desafios padrão já existem, pulando...');
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
