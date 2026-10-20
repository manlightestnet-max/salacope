import { DomainError } from '../../src/shared/domain/errors.js';
import { STORAGE } from '../../src/shared/config/platform.js';
import { query } from '../db.js';
import { newId } from '../ids.js';
import { decrypt, encrypt, secretsReady } from '../secrets.js';
import { presign } from './sigv4.js';

/**
 * File storage on Cloudflare R2 (S3-compatible). Several buckets can be set, one per purpose, so each kind of file goes
 * where the administrator wants it:
 *   image    pictures shown to everyone (covers, galleries, store photos, banners): public address
 *   product  the file a buyer receives after paying: private, downloaded through a short-lived link
 *   chat     attachments of conversations and deliveries: private, short-lived links
 *   kyc      identity documents: private, read only by the server for administrators
 * The keys are entered in the admin and kept encrypted in the database (see secrets.ts). While a purpose has no bucket,
 * its files stay where they were (in the database): nothing changes for the app.
 */
export const PURPOSES = ['image', 'product', 'chat', 'kyc'] as const;
export type Purpose = (typeof PURPOSES)[number];

export interface BucketConfig {
  name: string;
  /** Public address of the bucket (custom domain or r2.dev): required for `image`, which everyone must be able to load. */
  publicUrl?: string;
}

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  buckets: Partial<Record<Purpose, BucketConfig>>;
}

const SETTING = 'storage.r2';
let cached: { at: number; config: StorageConfig | null } | null = null;

/** The saved configuration (decrypted), or null when none is saved or the encryption key is missing. */
export async function loadStorageConfig(): Promise<StorageConfig | null> {
  if (cached && Date.now() - cached.at < 30_000) return cached.config;
  let config: StorageConfig | null = null;
  try {
    const [row] = await query<{ value: string }>('SELECT value FROM app_settings WHERE key = $1', [SETTING]);
    if (row && secretsReady()) config = JSON.parse(decrypt(row.value)) as StorageConfig;
  } catch {
    config = null; // table not migrated yet, or unreadable: storage is simply off
  }
  cached = { at: Date.now(), config };
  return config;
}

export async function saveStorageConfig(config: StorageConfig) {
  await query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [SETTING, encrypt(JSON.stringify(config))]
  );
  cached = null;
}

/** Where files of this purpose go, or null when the purpose has no bucket (or, for `image`, no public address). */
export async function target(purpose: Purpose) {
  const config = await loadStorageConfig();
  const bucket = config?.buckets[purpose];
  if (!config || !bucket?.name || !config.accountId || !config.accessKeyId || !config.secretAccessKey) return null;
  if (purpose === 'image' && !bucket.publicUrl) return null;
  return { config, bucket };
}

type Target = NonNullable<Awaited<ReturnType<typeof target>>>;

/** Cloudflare's address for the account; `SALACOPE_R2_ENDPOINT` points to a local S3 emulator for tests (e.g. http://127.0.0.1:9100). */
const endpoint = (config: StorageConfig) => {
  const override = process.env.SALACOPE_R2_ENDPOINT;
  if (override) {
    const url = new URL(override);
    return { host: url.host, protocol: url.protocol === 'http:' ? ('http' as const) : ('https' as const) };
  }
  return { host: `${config.accountId}.r2.cloudflarestorage.com`, protocol: 'https' as const };
};

/** A short-lived address for one object. */
export function signedUrl(t: Target, key: string, method: 'GET' | 'PUT' | 'HEAD' | 'DELETE', expires: number, extra?: Record<string, string>) {
  return presign({
    method,
    ...endpoint(t.config),
    path: `/${t.bucket.name}/${key}`,
    accessKeyId: t.config.accessKeyId,
    secretAccessKey: t.config.secretAccessKey,
    expires,
    query: extra,
  });
}

/** What a seller sees is generic; `detail` is what Cloudflare really answered, shown to the administration only (Stockage > Tester). */
export class StorageError extends DomainError {
  constructor(readonly detail: string) {
    super('Le stockage des fichiers est momentanément indisponible. Réessayez dans un instant.', 503);
  }
}

/** Cloudflare's own words for what went wrong, in French and with what to do. */
const explain = (status: number | undefined, code: string): string => {
  const known: Record<string, string> = {
    SignatureDoesNotMatch: 'la clé secrète ou l’identifiant de compte ne correspond pas : recollez-les',
    InvalidAccessKeyId: 'la clé d’accès est inconnue de ce compte Cloudflare',
    NoSuchBucket: 'ce bucket n’existe pas dans ce compte : vérifiez son nom exact',
    AccessDenied: 'la clé n’a pas le droit d’écrire dans ce bucket : créez-la avec « Object Read & Write » sur ce bucket',
    InvalidBucketName: 'nom de bucket invalide',
    EntityTooLarge: 'fichier trop gros',
  };
  if (status === undefined) return 'Cloudflare est injoignable : vérifiez l’identifiant de compte (32 caractères)';
  return `${known[code] ?? 'réponse inattendue de Cloudflare'} (HTTP ${status}${code ? ` · ${code}` : ''})`;
};

const failure = async (res: Response | null): Promise<StorageError> => {
  const body = res ? await res.text().catch(() => '') : '';
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? '';
  console.error('[storage]', res?.status, code, body.slice(0, 300));
  return new StorageError(explain(res?.status, code));
};

export async function putObject(t: Target, key: string, body: Buffer, mime: string) {
  const res = await fetch(signedUrl(t, key, 'PUT', 300), { method: 'PUT', headers: { 'Content-Type': mime }, body: new Uint8Array(body) }).catch(() => null);
  if (!res?.ok) throw await failure(res);
}

export async function getObject(t: Target, key: string): Promise<Buffer> {
  const res = await fetch(signedUrl(t, key, 'GET', 120)).catch(() => null);
  if (!res?.ok) throw await failure(res);
  return Buffer.from(await res.arrayBuffer());
}

/** Size of an object, or null when it is not there. */
export async function headObject(t: Target, key: string): Promise<number | null> {
  const res = await fetch(signedUrl(t, key, 'HEAD', 120), { method: 'HEAD' }).catch(() => null);
  if (!res?.ok) return null;
  return Number(res.headers.get('content-length') ?? 0);
}

export async function deleteObject(t: Target, key: string) {
  await fetch(signedUrl(t, key, 'DELETE', 120), { method: 'DELETE' }).catch(() => undefined);
}

export const publicUrlOf = (t: Target, key: string) => `${(t.bucket.publicUrl ?? '').replace(/\/$/, '')}/${key}`;

// --- quota ----------------------------------------------------------------------------------------------------------

/** What a person has stored (files being uploaded count for an hour, so nobody can reserve more than the quota). */
export async function usedBytes(ownerId: string): Promise<number> {
  const [row] = await query<{ n: number }>(
    `SELECT COALESCE(SUM(size), 0)::bigint AS n FROM stored_files
     WHERE owner_id = $1 AND (status = 'ready' OR created_at > NOW() - interval '1 hour')`,
    [ownerId]
  );
  return Number(row?.n ?? 0);
}

/** Refuses a file that is too big or does not fit what is left of the person's quota. */
export async function assertRoom(ownerId: string, size: number, purpose: Purpose) {
  if (size <= 0) throw new DomainError('Fichier vide.');
  if (size > STORAGE.maxFileBytes) throw new DomainError(`Fichier trop lourd : ${Math.round(STORAGE.maxFileBytes / 1024 / 1024)} Mo au maximum.`);
  // Identity documents are the administration's, not the seller's: they do not use the seller's space.
  if (purpose === 'kyc') return;
  const used = await usedBytes(ownerId);
  if (used + size > STORAGE.quotaBytes) {
    const left = Math.max(0, STORAGE.quotaBytes - used);
    throw new DomainError(`Espace de stockage insuffisant : il vous reste ${(left / 1024 / 1024).toFixed(1)} Mo sur ${Math.round(STORAGE.quotaBytes / 1024 / 1024)} Mo.`, 413);
  }
}

const SAFE = /[^A-Za-z0-9._-]+/g;
const extensionOf = (name: string) => (name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? '').toLowerCase();

export interface StoredFile {
  id: string;
  key: string;
  /** Public address, for `image` files. */
  url?: string;
}

/**
 * Stores bytes (already checked by the caller: type, content) under the person's quota and records the file.
 * → null when the purpose has no bucket: the caller then keeps its previous way of storing.
 */
export async function storeBytes(purpose: Purpose, ownerId: string, body: Buffer, info: { name: string; mime: string; ref?: string }): Promise<StoredFile | null> {
  const t = await target(purpose);
  if (!t) return null;
  await assertRoom(ownerId, body.length, purpose);
  const id = newId('fil');
  const key = `${purpose}/${ownerId}/${id.slice(4)}${extensionOf(info.name)}`;
  await putObject(t, key, body, info.mime);
  await query(
    `INSERT INTO stored_files (id, owner_id, purpose, bucket, object_key, name, mime, size, status, ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready', $9)`,
    [id, ownerId, purpose, t.bucket.name, key, info.name.replace(SAFE, '_').slice(0, 120) || 'fichier', info.mime, body.length, info.ref ?? null]
  );
  return { id, key, url: purpose === 'image' ? publicUrlOf(t, key) : undefined };
}

/** A pending upload from the browser: the file is sent straight to storage with the returned address. */
export async function reserveUpload(purpose: Purpose, ownerId: string, info: { name: string; mime: string; size: number; ref?: string }) {
  const t = await target(purpose);
  if (!t) throw new DomainError('Le stockage des fichiers n’est pas encore activé.', 503);
  await assertRoom(ownerId, info.size, purpose);
  const id = newId('fil');
  const key = `${purpose}/${ownerId}/${id.slice(4)}${extensionOf(info.name)}`;
  await query(
    `INSERT INTO stored_files (id, owner_id, purpose, bucket, object_key, name, mime, size, status, ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
    [id, ownerId, purpose, t.bucket.name, key, info.name.replace(SAFE, '_').slice(0, 120) || 'fichier', info.mime, info.size, info.ref ?? null]
  );
  return { id, uploadUrl: signedUrl(t, key, 'PUT', 900), url: purpose === 'image' ? publicUrlOf(t, key) : undefined };
}

/** The browser says it is done: the object must really be there, with the size announced (or less than the file limit). */
export async function confirmUpload(fileId: string, ownerId: string) {
  const [file] = await query<{ id: string; purpose: Purpose; object_key: string; bucket: string; size: number; status: string }>(
    'SELECT id, purpose, object_key, bucket, size, status FROM stored_files WHERE id = $1 AND owner_id = $2',
    [fileId, ownerId]
  );
  if (!file) throw new DomainError('Fichier introuvable.', 404);
  if (file.status === 'ready') return file;
  const t = await target(file.purpose);
  if (!t) throw new DomainError('Le stockage des fichiers n’est pas activé.', 503);
  const size = await headObject(t, file.object_key);
  if (size === null) throw new DomainError('Le fichier n’est pas arrivé : recommencez l’envoi.', 409);
  if (size > STORAGE.maxFileBytes || size > file.size * 1.02 + 1024) {
    await deleteObject(t, file.object_key);
    await query('DELETE FROM stored_files WHERE id = $1', [file.id]);
    throw new DomainError('Le fichier envoyé ne correspond pas à celui annoncé.', 400);
  }
  await query("UPDATE stored_files SET status = 'ready', size = $2 WHERE id = $1", [file.id, size]);
  return { ...file, size, status: 'ready' };
}

/** A short-lived download address for a stored file (the caller has checked the person may have it). */
export async function downloadUrl(fileId: string, seconds = 300): Promise<{ url: string; name: string } | null> {
  const [file] = await query<{ purpose: Purpose; object_key: string; name: string; status: string }>(
    "SELECT purpose, object_key, name, status FROM stored_files WHERE id = $1 AND status = 'ready'",
    [fileId]
  );
  if (!file) return null;
  const t = await target(file.purpose);
  if (!t) return null;
  return {
    name: file.name,
    url: signedUrl(t, file.object_key, 'GET', seconds, { 'response-content-disposition': `attachment; filename="${file.name.replace(/"/g, '')}"` }),
  };
}

/** A short-lived address to show a private file inline (chat pictures). */
export async function viewUrl(fileId: string, seconds = 6 * 3600): Promise<string | null> {
  const [file] = await query<{ purpose: Purpose; object_key: string; status: string }>(
    "SELECT purpose, object_key, status FROM stored_files WHERE id = $1 AND status = 'ready'",
    [fileId]
  );
  if (!file) return null;
  const t = await target(file.purpose);
  return t ? signedUrl(t, file.object_key, 'GET', seconds) : null;
}

/** The bytes of a stored file, read by the server itself (never handed to the browser as an address). */
export async function readStoredFile(fileId: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const [file] = await query<{ purpose: Purpose; object_key: string; mime: string }>("SELECT purpose, object_key, mime FROM stored_files WHERE id = $1 AND status = 'ready'", [fileId]);
  if (!file) return null;
  const t = await target(file.purpose);
  return t ? { bytes: await getObject(t, file.object_key), mime: file.mime } : null;
}
