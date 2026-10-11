/**
 * Applies server/migrations/*.sql in order, once each (tracked in schema_migrations).
 *   node scripts/migrate.mjs               -> SALACOPE_DATABASE_URL (sandbox in .env.local)
 *   node scripts/migrate.mjs --production  -> SALACOPE_DATABASE_URL_PRODUCTION
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const fromFile = (file) => {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(path.join(root, file), 'utf8')
        .split(/\r?\n/)
        .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim()])
    );
  } catch {
    return {};
  }
};
const env = { ...fromFile('.env.local'), ...process.env };
const production = process.argv.includes('--production');
const url = production ? env.SALACOPE_DATABASE_URL_PRODUCTION : env.SALACOPE_DATABASE_URL;
if (!url) throw new Error(production ? 'SALACOPE_DATABASE_URL_PRODUCTION missing' : 'SALACOPE_DATABASE_URL missing');

// Migrations go through Neon's direct endpoint (no "-pooler"): the pooler is made for short app queries, and a multi-statement
// migration can be cut by it ("Connection terminated unexpectedly"). A sleeping Neon database may also drop the first
// connection while it wakes up, so connecting is retried a few times.
const direct = url.replace('-pooler.', '.').replace('sslmode=require', 'sslmode=verify-full');
let client;
for (let attempt = 1; ; attempt += 1) {
  client = new pg.Client({ connectionString: direct, connectionTimeoutMillis: 20_000 });
  client.on('error', () => undefined); // reported by the query that was running
  try {
    await client.connect();
    break;
  } catch (err) {
    await client.end().catch(() => undefined);
    if (attempt >= 5) throw err;
    console.log(`connection failed (${err.message}), retry ${attempt}/4 in ${attempt * 3}s…`);
    await new Promise((r) => setTimeout(r, attempt * 3000));
  }
}
await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
const dir = path.join(root, 'server', 'migrations');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(file)) continue;
  await client.query('BEGIN');
  try {
    await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`applied ${file} (${production ? 'production' : 'sandbox'})`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`failed ${file}: ${err.message}`);
    process.exitCode = 1;
    break;
  }
}
await client.end();
