/**
 * YouTube on the TV, only through YouTube's own embed player (the IFrame
 * Player API): no downloading, no scraping. Works with any link a person
 * pastes, and needs no API key.
 */

export interface YouTubeRef {
  id: string | null;
  list: string | null;
}

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts watch, youtu.be, embed, shorts and live links, a bare id, or a playlist link. */
export function parseYouTube(input: string): YouTubeRef | null {
  const text = input.trim();
  if (ID.test(text)) return { id: text, list: null };
  let url: URL;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  const list = url.searchParams.get('list');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1, 12);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) id = m[1];
    }
  } else return null;
  if (id && !ID.test(id)) id = null;
  if (!id && !list) return null;
  return { id, list };
}

/* ------------------------------ the player API ------------------------------ */

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(v: number): void;
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  getVideoData?(): { title?: string; video_id?: string };
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void;
  loadPlaylist(opts: { list: string; listType: 'playlist'; index?: number; startSeconds?: number }): void;
  destroy(): void;
}

export interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
}

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

let apiPromise: Promise<YTNamespace> | null = null;

/** Load YouTube's IFrame Player API once. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (w.YT) resolve(w.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => {
        apiPromise = null;
        reject(new Error('YouTube player did not load'));
      };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

/** Where a looping video is "live" right now on the shared clock. */
export function liveOffset(durationSeconds: number, nowSeconds: number) {
  if (!(durationSeconds > 30)) return 0;
  const at = nowSeconds % durationSeconds;
  // never drop in during the last few seconds: start that loop over instead
  return at > durationSeconds - 8 ? 0 : Math.floor(at);
}
