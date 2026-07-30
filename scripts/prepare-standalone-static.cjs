const fs = require('node:fs');
const path = require('node:path');

function prepareStandaloneStatic(rootDir) {
  const staticSource = path.join(rootDir, '.next', 'static');
  const staticDestination = path.join(rootDir, '.next', 'standalone', '.next', 'static');
  const publicSource = path.join(rootDir, 'public');
  const publicDestination = path.join(rootDir, '.next', 'standalone', 'public');

  if (!fs.existsSync(staticSource)) {
    throw new Error(`Missing Next.js static assets at ${staticSource}. Run npm run build first.`);
  }

  fs.rmSync(staticDestination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(staticDestination), { recursive: true });
  fs.cpSync(staticSource, staticDestination, { recursive: true });

  if (fs.existsSync(publicSource)) {
    fs.rmSync(publicDestination, { recursive: true, force: true });
    fs.cpSync(publicSource, publicDestination, { recursive: true });
  }
}

if (require.main === module) {
  prepareStandaloneStatic(process.cwd());
  console.log('Standalone static assets prepared.');
}

module.exports = { prepareStandaloneStatic };
