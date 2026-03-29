const BASE = 'http://localhost:3000';
const results = { passed: 0, failed: 0, details: [] };

function log(ok, label, status, extra) {
  if (ok) results.passed++; else results.failed++;
  results.details.push({ ok, label, status, extra: extra || '' });
}

async function getToken(email) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Admin@2026' }),
  });
  // Try multiple methods to extract token from set-cookie header
  const cookies = res.headers.getSetCookie?.() || [];
  let token = cookies.find(c => c.startsWith('uniher-access-token='))?.split('=')[1]?.split(';')[0];
  if (!token) {
    const raw = res.headers.get('set-cookie') || '';
    const match = raw.match(/uniher-access-token=([^;]+)/);
    token = match ? match[1] : null;
  }
  return token;
}

async function api(token, method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Cookie': 'uniher-access-token=' + token } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function noAuthFetch(path) {
  return (await fetch(BASE + path)).status;
}

(async () => {
  // ═══ LOGIN ═══
  console.log('\n═══ LOGIN & AUTH ═══');
  const adminToken = await getToken('admin@uniher.com.br');
  log(!!adminToken, 'Login Master Admin', adminToken ? 200 : 'FAIL');
  const rhToken = await getToken('rh@teste.com');
  log(!!rhToken, 'Login Admin Empresa', rhToken ? 200 : 'FAIL');

  // Create collaborator via invite if not exists
  const ts = Date.now().toString().slice(-6);
  const colabEmail = `api-test-colab-${ts}@teste.com`;
  const colabPass = 'Admin@2026';
  const invite = await api(rhToken, 'POST', '/api/invites', { email: colabEmail, role: 'colaboradora', name: 'Teste API' });
  let colabToken = null;
  if (invite.data?.token) {
    // Register via invite
    const reg = await fetch(BASE + '/api/invites/' + invite.data.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Teste API', password: colabPass }),
    });
    const regCookies = reg.headers.getSetCookie?.() || [];
    colabToken = regCookies.find(c => c.startsWith('uniher-access-token='))?.split('=')[1]?.split(';')[0];
  }
  if (!colabToken) colabToken = await getToken(colabEmail);
  log(!!colabToken, 'Login Colaboradora', colabToken ? 200 : 'FAIL');

  const wrongPw = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@uniher.com.br', password: 'Wrong@123' }) });
  log(wrongPw.status === 401, 'Senha errada rejeita', wrongPw.status);

  const me = await api(adminToken, 'GET', '/api/auth/me');
  log(me.status === 200 && me.data?.user?.role === 'admin', 'GET /me retorna dados corretos', me.status);

  const meColab = await api(colabToken, 'GET', '/api/auth/me');
  log(meColab.data?.user?.role === 'colaboradora', 'Colaboradora /me role correto', meColab.status);

  // ═══ MASTER ADMIN ═══
  console.log('\n═══ MASTER ADMIN ═══');
  for (const [m, p, l] of [
    ['GET', '/api/health', 'Health check'],
    ['GET', '/api/admin/companies', 'Listar empresas'],
    ['GET', '/api/admin/users', 'Listar admin masters'],
    ['GET', '/api/admin/system', 'System info'],
    ['GET', '/api/admin/audit', 'Audit logs'],
    ['POST', '/api/admin/system/backup', 'Backup DB'],
    ['POST', '/api/admin/system/integrity', 'Integrity check'],
  ]) {
    const r = await api(adminToken, m, p);
    log(r.status >= 200 && r.status < 300, l, r.status);
  }

  // ═══ ADMIN EMPRESA ═══
  console.log('\n═══ ADMIN EMPRESA ═══');
  for (const [m, p, l] of [
    ['GET', '/api/company', 'Dados da empresa'],
    ['GET', '/api/dashboard', 'Dashboard'],
    ['GET', '/api/rh/users?limit=10', 'Listar colaboradoras'],
    ['GET', '/api/departments', 'Listar departamentos'],
    ['GET', '/api/campaigns', 'Listar campanhas'],
    ['GET', '/api/invites', 'Listar convites'],
    ['GET', '/api/rh/agenda', 'Agenda do time'],
    ['GET', '/api/rh/alert-preferences', 'Preferencias de alerta'],
    ['GET', '/api/notifications/count', 'Contagem notificacoes'],
  ]) {
    const r = await api(rhToken, m, p);
    log(r.status >= 200 && r.status < 300, l, r.status);
  }

  // ═══ COLABORADORA ═══
  console.log('\n═══ COLABORADORA ═══');
  for (const [m, p, l] of [
    ['GET', '/api/collaborator/semaforo', 'Semaforo'],
    ['GET', '/api/collaborator/badges', 'Badges'],
    ['GET', '/api/collaborator/challenges', 'Desafios'],
    ['GET', '/api/collaborator/campaigns', 'Campanhas'],
    ['GET', '/api/collaborator/agenda', 'Minha agenda'],
    ['GET', '/api/collaborator/exams', 'Meus exames'],
    ['GET', '/api/notifications/count', 'Notificacoes'],
    ['POST', '/api/gamification/check-in', 'Check-in diario'],
    ['POST', '/api/collaborator/semaforo/recalculate', 'Recalcular semaforo'],
  ]) {
    const r = await api(colabToken, m, p);
    log(r.status >= 200 && r.status < 300, l, r.status);
  }

  // Verify semaforo has 6+ dimensions (may have history entries)
  const sem = await api(colabToken, 'GET', '/api/collaborator/semaforo');
  const semData = sem.data?.semaforo || sem.data || [];
  const uniqueDims = [...new Set(semData.map(s => s.dimension))];
  log(Array.isArray(semData) && uniqueDims.length === 6, 'Semaforo tem 6 dimensoes', `${uniqueDims.length} unicas de ${semData.length} registros`);

  // ═══ ESCRITA ═══
  console.log('\n═══ FLUXOS DE ESCRITA ═══');
  const dept = await api(rhToken, 'POST', '/api/departments', { name: 'Audit' + Date.now() });
  log(dept.status <= 201, 'RH cria departamento', dept.status);

  const evento = await api(colabToken, 'POST', '/api/collaborator/agenda', { title: 'Exame sangue', type: 'exame', date: '2026-07-01' });
  log(evento.status <= 201, 'Colaboradora agenda exame', evento.status);

  const exame = await api(colabToken, 'POST', '/api/collaborator/exams', { exam_name: 'Glicemia', completed_date: '2026-03-26' });
  log(exame.status <= 201, 'Colaboradora registra exame', exame.status);

  const alertPref = await api(rhToken, 'PATCH', '/api/rh/alert-preferences', { alert_type: 'exame', days_before: 5 });
  log(alertPref.status === 200, 'RH configura alerta', alertPref.status);

  if (evento.data?.id) {
    const mark = await api(colabToken, 'PATCH', '/api/collaborator/agenda/' + evento.data.id, { status: 'completed' });
    log(mark.status === 200, 'Marcar evento realizado', mark.status);
  }
  // Test cancel on a separate event
  const evento2 = await api(colabToken, 'POST', '/api/collaborator/agenda', { title: 'Cancelar teste', type: 'lembrete', date: '2026-08-01' });
  if (evento2.data?.id) {
    const del = await api(colabToken, 'DELETE', '/api/collaborator/agenda/' + evento2.data.id);
    log(del.status === 200, 'Cancelar evento', del.status);
  }

  // ═══ GAMIFICACAO ═══
  console.log('\n═══ GAMIFICACAO ═══');
  const dailyLesson = await api(colabToken, 'GET', '/api/gamification/daily-lesson');
  log(dailyLesson.status === 200, 'Daily lesson', dailyLesson.status);
  const hearts = await api(colabToken, 'GET', '/api/gamification/hearts');
  log(hearts.status === 200 && hearts.data?.hearts >= 0, 'Hearts', hearts.status);
  const journey = await api(colabToken, 'GET', '/api/gamification/journey');
  log(journey.status === 200, 'Journey map', journey.status);
  const streakCheck = await api(colabToken, 'POST', '/api/gamification/streak/check');
  log(streakCheck.status === 200 || streakCheck.status === 429, 'Streak check', streakCheck.status);
  const gamConfig = await api(rhToken, 'GET', '/api/gamification/config');
  log(gamConfig.status === 200, 'Gamification config GET', gamConfig.status);
  const gamConfigPatch = await api(rhToken, 'PATCH', '/api/gamification/config', { xp_lesson: 15 });
  log(gamConfigPatch.status === 200, 'Gamification config PATCH', gamConfigPatch.status);
  const createReward = await api(rhToken, 'POST', '/api/gamification/rewards', { title: 'TestReward' + Date.now(), points_cost: 50, type: 'voucher' });
  log(createReward.status <= 201, 'RH cria reward', createReward.status);
  const rewardsList = await api(colabToken, 'GET', '/api/gamification/rewards');
  log(rewardsList.status === 200, 'Colab lista rewards', rewardsList.status);
  log((await api(colabToken, 'POST', '/api/gamification/rewards', { title: 'hack', points_cost: 1 })).status >= 400, 'Colab NAO cria reward', '');
  log((await api(colabToken, 'PATCH', '/api/gamification/config', { xp_per_lesson: 999 })).status >= 400, 'Colab NAO muda config', '');

  // ═══ CROSS-ROLE SECURITY ═══
  console.log('\n═══ SEGURANCA CROSS-ROLE ═══');
  log((await api(colabToken, 'GET', '/api/admin/companies')).status >= 400, 'Colab NAO acessa admin', '');
  log((await api(colabToken, 'GET', '/api/rh/users')).status >= 400, 'Colab NAO acessa RH', '');
  log((await api(rhToken, 'GET', '/api/admin/system')).status >= 400, 'RH NAO acessa admin system', '');
  log((await api(rhToken, 'POST', '/api/admin/system/backup')).status >= 400, 'RH NAO faz backup admin', '');
  log((await api(colabToken, 'POST', '/api/campaigns', { name: 'hack' })).status >= 400, 'Colab NAO cria campanha', '');

  // ═══ SEM AUTH ═══
  console.log('\n═══ SEM AUTENTICACAO ═══');
  log(await noAuthFetch('/api/health') === 200, 'Health publico OK', 200);
  log(await noAuthFetch('/api/admin/companies') >= 400, 'Admin sem auth BLOQ', '');
  log(await noAuthFetch('/api/rh/users') >= 400, 'RH sem auth BLOQ', '');
  log(await noAuthFetch('/api/collaborator/semaforo') >= 400, 'Colab sem auth BLOQ', '');

  // ═══ ATAQUES ═══
  console.log('\n═══ ATAQUES ═══');
  const sqli = await api(adminToken, 'GET', "/api/rh/users?search=' OR 1=1--");
  log(sqli.status < 500, 'SQL injection no search', sqli.status);
  const xss = await api(rhToken, 'POST', '/api/departments', { name: '<img onerror=alert(1) src=x>' });
  log(xss.status >= 400 || !xss.data?.name?.includes('onerror'), 'XSS bloqueado', xss.status);

  // ═══ REPORT ═══
  const total = results.passed + results.failed;
  console.log('\n' + '='.repeat(55));
  console.log('  RESULTADO FINAL: ' + results.passed + '/' + total + ' passaram (' + Math.round(results.passed/total*100) + '%)');
  console.log('='.repeat(55));
  results.details.forEach(d => console.log((d.ok ? '  OK ' : '  FAIL') + ' ' + d.label));
  if (results.failed > 0) {
    console.log('\nFALHAS:');
    results.details.filter(d => !d.ok).forEach(d => console.log('  X ' + d.label + ' -> ' + d.status));
  }
})().catch(e => console.error('FATAL:', e));
