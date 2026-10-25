import 'dotenv/config';
import { createServer } from 'node:http';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { seedInitialData } from './config/seed.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 4000);
await initializeDatabase();
await seedInitialData();

const server = createServer(createApp());
server.listen(port, () => {
  console.info(`Approval Portal API listening on port ${port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[shutdown] received ${signal}`);
  const forcedExit = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async (error) => {
    clearTimeout(forcedExit);
    try {
      await closeDatabase();
      process.exit(error ? 1 : 0);
    } catch (closeError) {
      console.error('[shutdown-error] failed to close database connections', closeError);
      process.exit(1);
    }
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
