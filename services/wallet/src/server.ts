import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const app = createApp(pool);

const server = app.listen(config.PORT, config.HOST, () => {
  console.log(
    JSON.stringify({ level: 'info', msg: 'wallet service berjalan', host: config.HOST, port: config.PORT }),
  );
});

function shutdown(signal: string): void {
  console.log(JSON.stringify({ level: 'info', msg: 'berhenti', signal }));
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
