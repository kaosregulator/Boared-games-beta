import { useEffect, useState } from 'react';
import type { TvCommand, TvMode } from './TvScreen';

/**
 * The TV's buttons are 3D meshes inside the canvas; the picture is DOM outside
 * it. This little bus carries presses one way and the set's status back.
 */

export interface TvStatus {
  mode: TvMode;
  channel: number;
  volume: number;
}

let command: TvCommand | null = null;
let status: TvStatus = { mode: 'off', channel: 2, volume: 0.8 };
const commandSubs = new Set<(c: TvCommand) => void>();
const statusSubs = new Set<(s: TvStatus) => void>();

export function pressTv(key: TvCommand['key']) {
  command = { seq: (command?.seq ?? 0) + 1, key };
  commandSubs.forEach(fn => fn(command!));
}

export function publishTvStatus(next: TvStatus) {
  status = next;
  statusSubs.forEach(fn => fn(next));
}

export function useTvCommand() {
  const [c, setC] = useState<TvCommand | null>(null);
  useEffect(() => {
    commandSubs.add(setC);
    return () => {
      commandSubs.delete(setC);
    };
  }, []);
  return c;
}

export function useTvStatus() {
  const [s, setS] = useState<TvStatus>(status);
  useEffect(() => {
    statusSubs.add(setS);
    return () => {
      statusSubs.delete(setS);
    };
  }, []);
  return s;
}
