import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
try {
  const applied = await migrate(pool);
  console.log(applied.length ? `Migrasi dijalankan: ${applied.join(', ')}` : 'Tidak ada migrasi baru.');
} finally {
  await pool.end();
}
