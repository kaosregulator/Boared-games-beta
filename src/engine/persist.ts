/** Engine preferences only. Room pose and placed props keep their own stores. */
const PREFIX = 'engine:';

export function readEnginePref(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeEnginePref(key: string, value: string) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Private windows can refuse storage. The in-memory choice still applies.
  }
}
