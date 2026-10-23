/**
 * While a Throwback cue plays, the bedroom tape, the radio, and the TV
 * all step aside. Each one remembers whether it was actually going, and
 * only that one comes back.
 */
import { radio } from '../radio/radioEngine';
import { holdTvPicture, releaseTvPicture } from '../tv/tvBus';
import { sound } from '../utils/audio';

let holds = 0;

function hushStrays() {
  document.querySelectorAll('video, audio').forEach(el => {
    if (!(el instanceof HTMLMediaElement) || el.paused) return;
    if (el.hasAttribute('data-throwback-cue')) return;
    if (el.hasAttribute('data-bedroom-music')) return;
    if (el.hasAttribute('data-room-radio')) return;
    if (el.closest('[data-ui="tv"]')) return;
    el.pause();
    el.setAttribute('data-held-by-trivia', '1');
    try {
      el.querySelectorAll?.('video, audio');
    } catch {
      // same-origin only; cross-origin frames stay as they are
    }
  });
  document.querySelectorAll('iframe').forEach(frame => {
    try {
      frame.contentDocument?.querySelectorAll('video, audio').forEach(node => {
        if (!(node instanceof HTMLMediaElement) || node.paused) return;
        node.pause();
        node.setAttribute('data-held-by-trivia', '1');
      });
    } catch {
      // a framed player we cannot reach
    }
  });
}

function restoreStrays() {
  const nodes: Element[] = [];
  document.querySelectorAll('[data-held-by-trivia]').forEach(el => nodes.push(el));
  document.querySelectorAll('iframe').forEach(frame => {
    try {
      frame.contentDocument?.querySelectorAll('[data-held-by-trivia]').forEach(el => nodes.push(el));
    } catch {
      // cross-origin
    }
  });
  nodes.forEach(el => {
    el.removeAttribute('data-held-by-trivia');
    if (el instanceof HTMLMediaElement) void el.play().catch(() => {});
  });
}

/** The room goes quiet. Nested calls (replay inside a question) stack. */
export function holdRoomForCue() {
  holds += 1;
  if (holds !== 1) return;
  sound.holdBedroom();
  radio.holdForCue();
  holdTvPicture();
  hushStrays();
}

/** Give the room its noise back once every cue has finished. */
export function releaseRoomCue() {
  holds = Math.max(0, holds - 1);
  if (holds !== 0) return;
  restoreStrays();
  releaseTvPicture();
  radio.releaseCue();
  sound.releaseBedroom();
}
