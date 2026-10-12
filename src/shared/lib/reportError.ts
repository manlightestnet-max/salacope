/**
 * Unhandled errors of the app are sent to the server (which writes them to its logs, where they are searched) so a crash seen
 * by a visitor is known without them having to tell. At most a few per minute, fire and forget, never throwing.
 */
let sent: number[] = [];

export function reportError(error: unknown, where = 'app') {
  try {
    const now = Date.now();
    sent = sent.filter((t) => now - t < 60_000);
    if (sent.length >= 5) return;
    sent.push(now);
    const e = error as { message?: string; stack?: string } | undefined;
    const body = JSON.stringify({
      where,
      message: String(e?.message ?? error ?? '').slice(0, 300),
      stack: String(e?.stack ?? '').slice(0, 1500),
      url: location.pathname + location.search.slice(0, 100),
      agent: navigator.userAgent.slice(0, 160),
    });
    if (!navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // reporting must never make things worse
  }
}

export function listenForErrors() {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}
