/**
 * Close-up devices. The room copies of the CRT, NES, and boombox stay where
 * they are. Leaning in swaps the camera onto a smaller clone.
 *
 * TV and radio content lives in `public/room/devices.json` so a tape, a
 * video URL, or a YouTube id can be added without touching the room.
 */

export type DeviceId = 'crt' | 'nes' | 'boombox';

export const DEVICE_FROM_PROP: Record<string, DeviceId> = {
  'crt-tv': 'crt',
  nes: 'nes',
  boombox: 'boombox',
};

export interface TvChannel {
  id: string;
  name: string;
  kind: 'static' | 'bars' | 'video' | 'youtube';
  /** Video file URL, or a YouTube id / watch URL when kind is youtube. */
  url?: string;
}

export interface RadioStation {
  id: string;
  name: string;
  freq: string;
  url: string;
}

export interface DeviceManifest {
  credit: string;
  tv: TvChannel[];
  radio: RadioStation[];
}

export const FALLBACK_DEVICES: DeviceManifest = {
  credit: 'Radio is SomaFM (somafm.com).',
  tv: [
    { id: 'static', name: 'STATIC', kind: 'static' },
    { id: 'bars', name: 'BARS', kind: 'bars' },
  ],
  radio: [
    {
      id: 'u80s',
      name: 'UNDERGROUND 80s',
      freq: '88.9',
      url: 'https://ice6.somafm.com/u80s-128-mp3',
    },
  ],
};

/** Shared NES pad so the overlay buttons and the canvas game agree. */
export const nesPad = { up: false, down: false };

function isChannel(value: unknown): value is TvChannel {
  if (!value || typeof value !== 'object') return false;
  const row = value as TvChannel;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    (row.kind === 'static' || row.kind === 'bars' || row.kind === 'video' || row.kind === 'youtube')
  );
}

function isStation(value: unknown): value is RadioStation {
  if (!value || typeof value !== 'object') return false;
  const row = value as RadioStation;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.freq === 'string' &&
    typeof row.url === 'string' &&
    row.url.startsWith('https://')
  );
}

export async function loadDeviceManifest(): Promise<DeviceManifest> {
  try {
    const res = await fetch('/room/devices.json');
    if (!res.ok) return FALLBACK_DEVICES;
    const data = (await res.json()) as Partial<DeviceManifest>;
    const tv = Array.isArray(data.tv) ? data.tv.filter(isChannel) : [];
    const radio = Array.isArray(data.radio) ? data.radio.filter(isStation) : [];
    if (tv.length === 0 || radio.length === 0) return FALLBACK_DEVICES;
    return {
      credit: typeof data.credit === 'string' ? data.credit : FALLBACK_DEVICES.credit,
      tv,
      radio,
    };
  } catch {
    return FALLBACK_DEVICES;
  }
}

export function youtubeId(url: string): string | null {
  if (/^[\w-]{11}$/.test(url)) return url;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match?.[1] ?? null;
}
