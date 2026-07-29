const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const visualSpecPath = path.join(repoRoot, 'tests', 'e2e', 'visual-ux.spec.ts');
const source = fs.readFileSync(visualSpecPath, 'utf8');

test('visual UX smoke includes the leadership role in matrix, fixtures and sidebar geometry', () => {
  assert.match(source, /type VisualSmokeRole = 'admin' \| 'rh' \| 'lideranca' \| 'colaboradora';/);
  assert.match(source, /const VISUAL_SMOKE_ROLES: readonly VisualSmokeRole\[\] = \['admin', 'rh', 'lideranca', 'colaboradora'\];/);
  assert.match(source, /const DEMO_LEADERSHIP_EMAIL = 'lideranca\.visual@eduardaeyurimarketingltda\.com\.br';/);
  assert.match(source, /if \(role === 'lideranca'\) return \{ email: DEMO_LEADERSHIP_EMAIL, password: ADMIN_PASS \};/);
  assert.match(source, /\{ role: 'lideranca', name: 'lideranca-dashboard', route: '\/dashboard' \}/);
  assert.match(source, /\{ role: 'lideranca', name: 'lideranca-campanhas', route: '\/campanhas' \}/);
  assert.match(source, /async function ensureDemoLeadershipUser\(request: APIRequestContext\): Promise<void>/);
  assert.match(source, /await ensureDemoLeadershipUser\(request\);/);
  assert.match(source, /function ensureDemoLeadershipDepartment\(\): void/);
  assert.match(source, /ensureDemoLeadershipDepartment\(\);/);
  assert.match(source, /role === 'colaboradora' \? '\/colaboradora' : '\/dashboard'/);
  assert.match(source, /const sidebarViewports = VISUAL_SMOKE_VIEWPORTS;/);
  assert.ok(source.includes('aside[role="dialog"], aside[aria-label]'));
});
