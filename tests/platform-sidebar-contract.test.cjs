const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('Sidebar awaits the auth-owned asynchronous logout without redirecting itself', () => {
  const sidebarSource = fs.readFileSync(
    path.resolve(__dirname, '..', 'src', 'components', 'platform', 'Sidebar.tsx'),
    'utf8',
  );
  const authSource = fs.readFileSync(
    path.resolve(__dirname, '..', 'src', 'hooks', 'useAuth.ts'),
    'utf8',
  );
  const logoutHandler = sidebarSource.match(
    /const performLogout = async \(\) => \{[\s\S]*?\n  \};/,
  )?.[0] || '';

  assert.match(authSource, /logout: \(\) => Promise<void>/);
  assert.match(logoutHandler, /await logout\(\)/);
  assert.doesNotMatch(logoutHandler, /window\.location\.href/);
});
