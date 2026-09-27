import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Accounts are Firebase accounts of the LightPay project: one sign-in for Salacope and LightPay.
 * The ID token is verified here (Google keys, issuer, audience, expiry); Salacope never sees passwords.
 */
const projectId = () => process.env.FIREBASE_PROJECT_ID || 'lightpay-a5f01';

const keys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface Identity {
  uid: string;
  email: string;
  name?: string;
}

export async function verifyIdToken(token: string): Promise<Identity | null> {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${projectId()}`,
      audience: projectId(),
      algorithms: ['RS256'],
    });
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return { uid: payload.sub, email: payload.email.toLowerCase(), name: typeof payload.name === 'string' ? payload.name : undefined };
  } catch {
    return null;
  }
}
