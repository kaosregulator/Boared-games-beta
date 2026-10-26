/**
 * Close-up devices. The room copies of the CRT, NES, and boombox stay where
 * they are; leaning in swaps the camera onto a clone (see DeviceFocus).
 * The family computer's Windows 98 lives in src/pc/ (see devices/PcScreen).
 *
 * The TV lineup lives in src/tv/channels.ts and the FM dial in
 * src/radio/stations.ts.
 */

export type DeviceId = 'crt' | 'nes' | 'boombox' | 'pc';

export const DEVICE_FROM_PROP: Record<string, DeviceId> = {
  'crt-tv': 'crt',
  nes: 'nes',
  boombox: 'boombox',
};
