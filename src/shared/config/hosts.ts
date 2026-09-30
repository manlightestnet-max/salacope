/**
 * The administration has its own address (like LightPay's admin): admin.salacope.online opens
 * it directly, and /admin on the public site sends there. Other hosts (local, previews) keep
 * everything on one address.
 */
export const ADMIN_HOST = 'admin.salacope.online';
const PUBLIC_HOSTS = ['salacope.online', 'www.salacope.online'];

const hostname = () => (typeof window === 'undefined' ? '' : window.location.hostname);

export const isAdminHost = () => hostname() === ADMIN_HOST;
export const isPublicHost = () => PUBLIC_HOSTS.includes(hostname());
