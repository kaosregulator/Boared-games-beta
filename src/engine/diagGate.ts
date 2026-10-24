export function diagnosticsEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('diag') === '1') return true;
    if (window.localStorage.getItem('engine:diag') === '1') return true;
  } catch {
    // Storage can throw. The query flag above still works.
  }
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
}
