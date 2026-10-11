import { createHash, createHmac } from 'node:crypto';

/**
 * AWS Signature V4, query-string form ("presigned URL"), which Cloudflare R2 accepts on its S3 endpoint. Written with
 * Node's own crypto so the serverless function stays small. Used for uploads from the browser, downloads and the
 * server's own calls (the payload is not signed: `UNSIGNED-PAYLOAD`).
 */
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();
const sha256 = (data: string) => createHash('sha256').update(data).digest('hex');

/** RFC 3986 encoding, as S3 wants it. */
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export interface PresignInput {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
  host: string;
  /** Path as stored, starting with `/` (each segment is encoded here). */
  path: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Seconds the URL stays valid. */
  expires: number;
  region?: string;
  service?: string;
  /** `http` only for a local emulator (tests); R2 is always https. */
  protocol?: 'http' | 'https';
  /** Extra query parameters that are part of the signature (e.g. `response-content-disposition`). */
  query?: Record<string, string>;
  now?: Date;
}

export function presign(input: PresignInput): string {
  const { method, host, path, accessKeyId, secretAccessKey, expires, region = 'auto', service = 's3', query = {}, now = new Date(), protocol = 'https' } = input;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${region}/${service}/aws4_request`;

  const params: Record<string, string> = {
    ...query,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join('&');
  const canonicalPath = path
    .split('/')
    .map((segment) => enc(segment))
    .join('/');
  const canonicalRequest = [method, canonicalPath, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), region), service), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `${protocol}://${host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
