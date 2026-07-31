const crypto = require('crypto');

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for isolated security test execution`);
  }
  return value;
}

const baseUrl = process.env.UNIHER_SECURITY_TEST_BASE_URL?.trim() || 'http://127.0.0.1:3000';
const target = new URL(baseUrl);
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

if (
  !loopbackHosts.has(target.hostname) &&
  process.env.UNIHER_SECURITY_TEST_ALLOW_REMOTE_TARGET !== 'true'
) {
  throw new Error(
    'Remote security-test targets are denied; set UNIHER_SECURITY_TEST_ALLOW_REMOTE_TARGET=true only for an approved isolated target',
  );
}

module.exports = {
  baseUrl,
  adminEmail: requireEnvironment('UNIHER_SECURITY_TEST_ADMIN_EMAIL'),
  adminPassword: requireEnvironment('UNIHER_SECURITY_TEST_ADMIN_PASSWORD'),
  temporaryPassword: `SecurityTest@${crypto.randomBytes(12).toString('base64url')}`,
};
