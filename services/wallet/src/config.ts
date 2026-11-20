import { z } from 'zod';

const schema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3002),
  DATABASE_URL: z.string().url(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    // Hanya nama variabel dan alasannya yang dicetak, tidak pernah nilainya.
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Konfigurasi tidak valid: ${detail}`);
  }
  return parsed.data;
}
