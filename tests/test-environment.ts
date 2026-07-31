function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for isolated E2E execution`);
  }
  return value;
}

export const E2E_BASE_URL = requireEnvironment('UNIHER_E2E_BASE_URL');
export const E2E_ADMIN_EMAIL = requireEnvironment('UNIHER_E2E_ADMIN_EMAIL');
export const E2E_ADMIN_PASSWORD = requireEnvironment('UNIHER_E2E_ADMIN_PASSWORD');

const target = new URL(E2E_BASE_URL);
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

if (
  !loopbackHosts.has(target.hostname) &&
  process.env.UNIHER_E2E_ALLOW_REMOTE_TARGET !== 'true'
) {
  throw new Error(
    'Remote E2E targets are denied; set UNIHER_E2E_ALLOW_REMOTE_TARGET=true only for an approved isolated target',
  );
}
