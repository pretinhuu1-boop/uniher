import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the isolated visual audit`);
  return value;
}

const baseUrl = requireEnvironment('UNIHER_VISUAL_AUDIT_BASE_URL').replace(/\/+$/, '');
const visualPassword = requireEnvironment('UNIHER_VISUAL_AUDIT_PASSWORD');
const visualRhEmail = requireEnvironment('UNIHER_VISUAL_AUDIT_RH_EMAIL');
const visualLeaderEmail = requireEnvironment('UNIHER_VISUAL_AUDIT_LEADER_EMAIL');
const target = new URL(baseUrl);
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

if (
  !loopbackHosts.has(target.hostname)
  && process.env.UNIHER_VISUAL_AUDIT_ALLOW_REMOTE_TARGET !== 'true'
) {
  throw new Error(
    'Remote visual-audit targets are denied; set UNIHER_VISUAL_AUDIT_ALLOW_REMOTE_TARGET=true only for an approved isolated target',
  );
}

const outputDir = path.resolve(
  process.env.VISUAL_AUDIT_OUTPUT_DIR
    ?? path.join(process.cwd(), 'artifacts', 'security', 'screenshots'),
);
const reportPath = path.join(path.dirname(outputDir), 'visual-security-audit.json');

fs.mkdirSync(outputDir, { recursive: true });

async function createAuthenticatedContext(browser, email, viewport) {
  const context = await browser.newContext({ viewport });
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    data: { email, password: visualPassword },
  });
  if (response.status() !== 200) {
    throw new Error(`Visual fixture login failed for ${email}: ${response.status()}`);
  }
  return context;
}

function observeErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function auditAgenda(browser, viewport, filename) {
  const context = await createAuthenticatedContext(
    browser,
    visualRhEmail,
    viewport,
  );
  const page = await context.newPage();
  const errors = observeErrors(page);

  await page.goto(`${baseUrl}/agenda`, { waitUntil: 'networkidle' });
  await page.getByText('Indicadores protegidos').waitFor();
  const body = await page.locator('body').innerText();

  const assertions = {
    suppressionVisible: body.includes('Indicadores protegidos'),
    identityAbsent: !body.includes('Colaboradora Sigilosa')
      && !body.includes('private-colab@example.com'),
    clinicalDetailAbsent: !body.includes('Exame confidencial')
      && !body.includes('detalhe privado'),
    monthlyTotalAbsent: !body.includes('Total mensal'),
  };

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: true,
  });
  await context.close();
  return { assertions, consoleErrors: errors };
}

async function auditInvites(browser, role) {
  const isRh = role === 'rh';
  const context = await createAuthenticatedContext(
    browser,
    isRh ? visualRhEmail : visualLeaderEmail,
    { width: 1440, height: 1000 },
  );
  const page = await context.newPage();
  const errors = observeErrors(page);

  await page.goto(`${baseUrl}/convites`, { waitUntil: 'networkidle' });
  await page.getByText('convidada-visual@example.com').waitFor();

  const copyVisible = await page.getByText('Copiar link', { exact: true }).isVisible()
    .catch(() => false);
  const revokeVisible = await page.getByText('Revogar', { exact: true }).isVisible()
    .catch(() => false);
  const body = await page.locator('body').innerText();
  const assertions = isRh
    ? {
      inviteVisible: body.includes('convidada-visual@example.com'),
      copyControlVisible: copyVisible,
      revokeControlVisible: revokeVisible,
    }
    : {
      inviteVisible: body.includes('convidada-visual@example.com'),
      copyControlAbsent: !copyVisible,
      revokeControlAbsent: !revokeVisible,
      rawTokenAbsent: !body.includes('visual-security-token-20260731'),
      createControlsAbsent: !body.includes('Enviar novo convite')
        && !body.includes('Convidar em massa')
        && !body.includes('Aprovacoes pendentes'),
      readOnlyGuidanceVisible: body.includes('Acompanhe os convites enviados'),
    };

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(
      outputDir,
      isRh ? 'invites-rh-token-controls.png' : 'invites-leadership-redacted.png',
    ),
    fullPage: true,
  });
  await context.close();
  return { assertions, consoleErrors: errors };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    agendaDesktop: await auditAgenda(
      browser,
      { width: 1440, height: 1000 },
      'agenda-manager-suppressed.png',
    ),
    agendaMobile: await auditAgenda(
      browser,
      { width: 390, height: 844 },
      'agenda-manager-suppressed-mobile.png',
    ),
    invitesRh: await auditInvites(browser, 'rh'),
    invitesLeadership: await auditInvites(browser, 'lideranca'),
  };

  const assertionValues = Object.values(results)
    .filter((value) => value && typeof value === 'object' && 'assertions' in value)
    .flatMap((value) => Object.values(value.assertions));
  const consoleErrors = Object.values(results)
    .filter((value) => value && typeof value === 'object' && 'consoleErrors' in value)
    .flatMap((value) => value.consoleErrors);

  results.passed = assertionValues.every(Boolean) && consoleErrors.length === 0;
  fs.writeFileSync(reportPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
  if (!results.passed) process.exitCode = 1;
} finally {
  await browser.close();
}
