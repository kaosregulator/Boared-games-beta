export type RoomMood = 'warm-night' | 'moonlight' | 'afternoon';

export const MOOD_LABEL: Record<RoomMood, string> = {
  'warm-night': 'Warm night',
  moonlight: 'Moonlight',
  afternoon: 'Afternoon',
};

export interface MoodLights {
  ambient: number;
  ambColor: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  ceil: string;
  ceilI: number;
  windowC: string;
  windowI: number;
  fog: string;
}

export const MOODS: Record<RoomMood, MoodLights> = {
  'warm-night': {
    ambient: 0.34,
    ambColor: '#ffe4d0',
    hemiSky: '#c2b0dc',
    hemiGround: '#3a2418',
    hemi: 0.42,
    ceil: '#ffd7b0',
    ceilI: 2.4,
    windowC: '#9eb0ff',
    windowI: 1.3,
    fog: '#1a1218',
  },
  moonlight: {
    ambient: 0.2,
    ambColor: '#c9d6ff',
    hemiSky: '#8aa4e8',
    hemiGround: '#14101c',
    hemi: 0.5,
    ceil: '#9eb6ff',
    ceilI: 0.9,
    windowC: '#c5d4ff',
    windowI: 2.6,
    fog: '#12141c',
  },
  afternoon: {
    ambient: 0.55,
    ambColor: '#fff1dc',
    hemiSky: '#ffe6c4',
    hemiGround: '#6a5040',
    hemi: 0.72,
    ceil: '#ffe0b0',
    ceilI: 1.5,
    windowC: '#ffd09a',
    windowI: 2.8,
    fog: '#2a221c',
  },
};
