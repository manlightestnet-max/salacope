import pg from 'pg';

/** Timestamps travel as ISO strings, like the app's types. */
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v) => new Date(`${v}Z`).toISOString());
pg.types.setTypeParser(20, (v) => Number(v));

let pool: pg.Pool | null = null;

const getPool = () => {
  if (!pool) {
    const url = process.env.SALACOPE_DATABASE_URL;
    if (!url) throw new Error('SALACOPE_DATABASE_URL is not set');
    pool = new pg.Pool({ connectionString: url.replace('sslmode=require', 'sslmode=verify-full'), max: 3, idleTimeoutMillis: 10_000 });
  }
  return pool;
};

export type Query = <T = any>(text: string, params?: unknown[]) => Promise<T[]>;

export const query: Query = async (text, params = []) => (await getPool().query(text, params)).rows;

/** Runs `fn` in one transaction; everything is rolled back if it throws. */
export async function tx<T>(fn: (q: Query) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(async (text, params = []) => (await client.query(text, params)).rows);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export const json = (value: unknown) => (value === undefined ? null : JSON.stringify(value));
