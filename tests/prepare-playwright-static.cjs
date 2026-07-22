const fs = require('node:fs');
const path = require('node:path');

function prepareStandaloneStatic(rootDir) {
  const source = path.join(rootDir, '.next', 'static');
  const destination = path.join(rootDir, '.next', 'standalone', '.next', 'static');

  if (!fs.existsSync(source)) {
    throw new Error(`Missing Next.js static assets at ${source}. Run npm run build first.`);
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

module.exports = { prepareStandaloneStatic };
