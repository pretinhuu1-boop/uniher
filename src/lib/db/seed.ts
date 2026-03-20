/**
 * Seed script robusto e completo para o UniHER
 */
import { getWriteQueue, getReadDb } from './index';
import { initDb } from './init';
import { hashPassword } from '../auth/password';

async function seed() {
  console.log('[seed] Iniciando processo de populacao...');
  await initDb();

  const db = getReadDb();
  const writeQueue = getWriteQueue();

  const passwordHash = await hashPassword('uniher2026');
  const companyId = 'company_ofg';

  await writeQueue.enqueue((db) => {
    db.transaction(() => {
      console.log('[seed] Limpando dados antigos...');
      // Limpar tabelas mantendo ordem de FK
      const tables = [
        'activity_log', 'notifications', 'user_badges', 'user_challenges', 
        'user_campaigns', 'challenges', 'campaigns', 'users', 
        'departments', 'quiz_results', 'archetypes', 'badges', 'companies'
      ];
      tables.forEach(t => {
        try { db.exec(`DELETE FROM ${t}`); } catch (e) {}
      });

      console.log('[seed] Inserindo empresa e departamentos...');
      // UniHER platform company (for super_admin)
      db.prepare(`
        INSERT OR IGNORE INTO companies (id, name, trade_name, cnpj, sector, plan, contact_name, contact_email, contact_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('company_uniher', 'UniHER Plataforma', 'UniHER', '00.000.000/0001-00', 'Tecnologia', 'enterprise', 'UniHER Admin', 'admin@uniher.com.br', '');
      // Client company
      db.prepare(`
        INSERT OR IGNORE INTO companies (id, name, trade_name, cnpj, sector, plan, contact_name, contact_email, contact_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(companyId, 'OFG - ONE FUTURE GROUP', 'OFG', '33.457.504/0001-94', 'Saúde', 'trial', 'Leonardo Fachetti', 'leonardo@ofg.com.br', '(11) 99999-0000');

      const departments = [
        { id: 'dept_rh', name: 'RH', color: '#C85C7E' },
        { id: 'dept_marketing', name: 'Marketing', color: '#378ADD' },
        { id: 'dept_ti', name: 'TI', color: '#3E7D5A' },
      ];
      const deptStmt = db.prepare('INSERT INTO departments (id, company_id, name, color) VALUES (?, ?, ?, ?)');
      departments.forEach(d => deptStmt.run(d.id, companyId, d.name, d.color));

      console.log('[seed] Inserindo arquetipos completos...');
      const archetypes = [
        { 
          id: 'arch_guardia', key: 'guardia', name: 'Guardiã Resiliente', 
          desc: 'Cuida de todos...', base: [2,3,2.5,3,2.5,3], g30: [3.5,4,3.5,4.5,3.5,4.5], 
          missions: 12, campaigns: 3, habits: 8 
        },
        { 
          id: 'arch_protetora', key: 'protetora', name: 'Protetora Silenciosa', 
          desc: 'Sabe o que precisa...', base: [2,3.5,2.5,2.5,2.5,2.5], g30: [4,4.5,3.5,3.5,3.5,4],
          missions: 10, campaigns: 4, habits: 10 
        },
        { 
          id: 'arch_guerreira', key: 'guerreira', name: 'Guerreira em Evolução', 
          desc: 'Já prioriza...', base: [5.5,5,4.8,5,5.2,5.5], g30: [6.5,6,6,6.2,6.5,7],
          missions: 18, campaigns: 5, habits: 14 
        },
        { 
          id: 'arch_equilibrista', key: 'equilibrista', name: 'Equilibrista Zen', 
          desc: 'Busca equilíbrio...', base: [4,3.8,4,4.5,4.2,4.7], g30: [5,5,5.5,5.5,5.5,6],
          missions: 15, campaigns: 4, habits: 12 
        },
        { 
          id: 'arch_exploradora', key: 'exploradora', name: 'Exploradora de Hábitos', 
          desc: 'Sempre testando...', base: [3.0,4.0,3.5,4.0,3.0,4.0], g30: [4.5,5.5,4.5,5.0,4.5,5.5],
          missions: 20, campaigns: 4, habits: 15 
        },
        { 
          id: 'arch_soberana', key: 'soberana', name: 'Soberana do Autocuidado', 
          desc: 'Domina sua saúde...', base: [7.0,7.5,7.0,8.0,7.5,8.0], g30: [8.0,8.5,8.0,8.5,8.0,9.0],
          missions: 25, campaigns: 6, habits: 20 
        }
      ];
      const archStmt = db.prepare(`
        INSERT INTO archetypes (id, key, name, description, base_scores, growth_30, growth_60, growth_90, missions, campaigns, habits)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      archetypes.forEach(a => archStmt.run(
        a.id, a.key, a.name, a.desc, 
        JSON.stringify(a.base), JSON.stringify(a.g30), JSON.stringify(a.g30), JSON.stringify(a.g30),
        a.missions, a.campaigns, a.habits
      ));

      console.log('[seed] Inserindo usuarios e conteudo...');
      const users = [
        { id: 'user_admin', name: 'Admin UniHER', email: 'admin@uniher.com.br', role: 'admin', dept: null, level: 99, pts: 0, companyId: 'company_uniher' },
        { id: 'user_nelson', name: 'Nelson Neto', email: 'nelson.rh@empresa.com', role: 'rh', dept: 'dept_rh', level: 10, pts: 100, companyId: companyId },
        { id: 'user_ana', name: 'Ana Silva', email: 'ana.silva@empresa.com', role: 'colaboradora', dept: 'dept_marketing', level: 5, pts: 2370, companyId: companyId },
      ];
      const userStmt = db.prepare('INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, level, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      users.forEach(u => userStmt.run(u.id, u.companyId, u.dept, u.name, u.email, passwordHash, u.role, u.level, u.pts));

      const campaigns = [
        { id: 'camp_1', name: 'Outubro Rosa', month: 'Outubro', color: '#C85C7E', status: 'done' },
        { id: 'camp_2', name: 'Dezembro Laranja', month: 'Dezembro', color: '#EF9F27', status: 'active' },
      ];
      const campStmt = db.prepare('INSERT INTO campaigns (id, name, month, color, status, company_id) VALUES (?, ?, ?, ?, ?, ?)');
      campaigns.forEach(c => campStmt.run(c.id, c.name, c.month, c.color, c.status, companyId));

      const challenges = [
        { id: 'ch_1', title: 'Ritual de Meditação', cat: 'Saúde Mental', steps: 5, arche: 'arch_protetora' },
        { id: 'ch_2', title: 'Hidratação 2L', cat: 'Hábitos', steps: 5, arche: 'arch_guardia' },
        { id: 'ch_3', title: 'Sono Reparador', cat: 'Sono', steps: 7, arche: 'arch_protetora' },
        { id: 'ch_4', title: 'Pausas Ativas', cat: 'Energia', steps: 10, arche: 'arch_guerreira' },
        { id: 'ch_5', title: 'Mindfulness 10 min', cat: 'Saúde Mental', steps: 3, arche: 'arch_protetora' },
      ];
      const chStmt = db.prepare('INSERT INTO challenges (id, title, description, category, points, total_steps, archetype_id, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
      challenges.forEach(c => chStmt.run(c.id, c.title, c.title, c.cat, 100, c.steps, c.arche));

      console.log('[seed] Inserindo badges...');
      const badges = [
        { id: 'badge_1', name: 'Primeira Semana', desc: 'Complete sua primeira semana de atividades na plataforma.', icon: '🌱', pts: 50, rarity: 'common' },
        { id: 'badge_2', name: 'Sequência de 7 dias', desc: 'Mantenha uma sequência de 7 dias consecutivos.', icon: '🔥', pts: 150, rarity: 'rare' },
        { id: 'badge_3', name: 'Guardiã da Saúde', desc: 'Complete 5 desafios de saúde preventiva.', icon: '🏥', pts: 200, rarity: 'rare' },
        { id: 'badge_4', name: 'Mente Zen', desc: 'Complete 3 desafios de saúde mental.', icon: '🧘', pts: 100, rarity: 'common' },
        { id: 'badge_5', name: 'Hidratação Campeã', desc: 'Registre hidratação por 14 dias consecutivos.', icon: '💧', pts: 300, rarity: 'epic' },
        { id: 'badge_6', name: 'Exploradora', desc: 'Participe de 3 campanhas diferentes.', icon: '🌟', pts: 500, rarity: 'legendary' },
      ];
      const badgeStmt = db.prepare('INSERT OR IGNORE INTO badges (id, name, description, icon, points, rarity) VALUES (?, ?, ?, ?, ?, ?)');
      badges.forEach(b => badgeStmt.run(b.id, b.name, b.desc, b.icon, b.pts, b.rarity));

      console.log('[seed] Inserindo desafios adicionais e relacionamentos...');
      // Desafios adicionais
      const extraChallenges = [
        { id: 'ch_3', title: 'Sono Reparador', cat: 'Sono', arche: 'arch_guardia', steps: 7 },
        { id: 'ch_4', title: 'Pausas Ativas', cat: 'Energia', arche: null, steps: 10 },
        { id: 'ch_5', title: 'Mindfulness 10 min', cat: 'Saúde Mental', arche: 'arch_protetora', steps: 3 },
      ];
      extraChallenges.forEach(c => {
        try {
          chStmt.run(c.id, c.title, c.title, c.cat, 100, c.steps, c.arche);
        } catch (e) {}
      });

      // User challenges para Ana
      const userChallenges = [
        { ch: 'ch_1', progress: 2, status: 'active' },
        { ch: 'ch_2', progress: 3, status: 'active' },
        { ch: 'ch_3', progress: 7, status: 'completed' },
        { ch: 'ch_4', progress: 0, status: 'active' },
        { ch: 'ch_5', progress: 3, status: 'completed' },
      ];
      const ucStmt = db.prepare('INSERT OR IGNORE INTO user_challenges (user_id, challenge_id, progress, status) VALUES (?, ?, ?, ?)');
      userChallenges.forEach(uc => ucStmt.run('user_ana', uc.ch, uc.progress, uc.status));

      // User badges para Ana
      db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run('user_ana', 'badge_1');
      db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run('user_ana', 'badge_4');

      // Ana participa da campanha ativa
      db.prepare('INSERT OR IGNORE INTO user_campaigns (user_id, campaign_id, progress) VALUES (?, ?, ?)').run('user_ana', 'camp_2', 45);

      console.log('[seed] Inserindo health scores para Ana...');
      const healthScores = [
        { dim: 'Prevenção',    score: 3.2, status: 'red'    },
        { dim: 'Sono',         score: 5.8, status: 'yellow' },
        { dim: 'Energia',      score: 5.5, status: 'yellow' },
        { dim: 'Saúde Mental', score: 7.2, status: 'green'  },
        { dim: 'Hábitos',      score: 6.8, status: 'green'  },
        { dim: 'Engajamento',  score: 8.1, status: 'green'  },
      ];
      const hsStmt = db.prepare("INSERT INTO health_scores (id, user_id, dimension, score, status) VALUES (?, ?, ?, ?, ?)");
      healthScores.forEach((h, i) => hsStmt.run(`hs_${i + 1}`, 'user_ana', h.dim, h.score, h.status));

      console.log('[seed] Inserindo notificações para Ana...');
      const notifications = [
        { id: 'notif_1', type: 'badge', title: 'Badge Desbloqueado! 🌱', msg: 'Parabéns! Você conquistou o badge "Primeira Semana". Continue assim!' },
        { id: 'notif_2', type: 'campaign', title: 'Campanha Dezembro Laranja está ativa!', msg: 'Junte-se agora à campanha de prevenção ao câncer de pele e ganhe pontos extras.' },
        { id: 'notif_3', type: 'challenge', title: 'Novo desafio disponível 🎯', msg: 'Um novo desafio de Sono Reparador foi adicionado para você. Aceite o desafio!' },
      ];
      const notifStmt = db.prepare('INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, read) VALUES (?, ?, ?, ?, ?, ?)');
      notifications.forEach((n, i) => notifStmt.run(n.id, 'user_ana', n.type, n.title, n.msg, i === 0 ? 1 : 0));

      console.log('[seed] SUCESSO!');
    })();
  });
}

seed().catch(err => {
  console.error('[seed] ERRO:', err);
  process.exit(1);
});
