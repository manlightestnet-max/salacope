/** Generates a client-side identifier such as `ord_1712345678901_k3j9x`. */
export const createId = (prefix: string, randomLength = 5): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 2 + randomLength)}`;

export const nowIso = (): string => new Date().toISOString();
