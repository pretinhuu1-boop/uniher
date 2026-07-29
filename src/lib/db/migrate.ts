import { initDb } from './init';

initDb()
  .then(() => {
    console.log('[db] Migracoes aplicadas.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[db] Falha ao aplicar migracoes:', error);
    process.exit(1);
  });
