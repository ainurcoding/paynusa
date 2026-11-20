import pg from 'pg';
import type { Pool } from 'pg';

export function createPool(connectionString: string): Pool {
  return new pg.Pool({ connectionString, max: 10 });
}
