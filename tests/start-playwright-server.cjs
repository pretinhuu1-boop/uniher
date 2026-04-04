const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envFiles = ['.env.local', '.env.production', '.env'];

for (const fileName of envFiles) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) continue;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

process.env.NODE_ENV = 'production';
process.env.PLAYWRIGHT_TEST = process.env.PLAYWRIGHT_TEST || '1';
process.env.PORT = process.env.PLAYWRIGHT_PORT || process.env.PORT || '3100';
process.chdir(rootDir);

require(path.join(rootDir, '.next', 'standalone', 'server.js'));
