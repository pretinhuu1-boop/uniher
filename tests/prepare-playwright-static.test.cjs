const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { prepareStandaloneStatic } = require('./prepare-playwright-static.cjs');

test('copies only browser assets into the standalone tree', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-playwright-static-'));

  try {
    const source = path.join(rootDir, '.next', 'static', 'chunks');
    const publicSource = path.join(rootDir, 'public');
    fs.mkdirSync(source, { recursive: true });
    fs.mkdirSync(publicSource, { recursive: true });
    fs.writeFileSync(path.join(source, 'app.js'), 'asset');
    fs.writeFileSync(path.join(publicSource, 'logo-uniher.png'), 'logo');
    fs.writeFileSync(path.join(rootDir, 'not-static.txt'), 'do not copy');

    prepareStandaloneStatic(rootDir);

    assert.equal(
      fs.readFileSync(path.join(rootDir, '.next', 'standalone', '.next', 'static', 'chunks', 'app.js'), 'utf8'),
      'asset',
    );
    assert.equal(
      fs.readFileSync(path.join(rootDir, '.next', 'standalone', 'public', 'logo-uniher.png'), 'utf8'),
      'logo',
    );
    assert.equal(fs.existsSync(path.join(rootDir, '.next', 'standalone', 'not-static.txt')), false);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('fails clearly when the build did not produce static assets', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-playwright-static-'));

  try {
    assert.throws(
      () => prepareStandaloneStatic(rootDir),
      /Missing Next\.js static assets/,
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
