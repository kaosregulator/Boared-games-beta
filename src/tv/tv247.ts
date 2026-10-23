/**
 * The 24/7 mode's on switch. Off unless the page was opened with `?tv247`
 * (remembered for the tab) or the build sets VITE_TV247=1, so the normal TV
 * is untouched until it is switched on for everyone.
 */
function readSwitch() {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_TV247 === '1') return true;
  try {
    if (new URLSearchParams(window.location.search).has('tv247')) {
      window.sessionStorage.setItem('tv247', '1');
      return true;
    }
    return window.sessionStorage.getItem('tv247') === '1';
  } catch {
    return false;
  }
}

export const TV247_ON = readSwitch();
