export * from './schema';
export * from './store';
export { DEMO_ACCOUNTS } from './seed';

/** Business rule violation raised by services; message is safe to show to users. */
export class DomainError extends Error {}
