import assert from 'node:assert/strict';
import test from 'node:test';
import { furbyAudible, setFurbyAudible } from '../../src/room/furby/furbyAudio.ts';
import { FURBY_QUIET_LINES, furbyMuteAvailable } from '../../src/room/furby/furbyQuiet.ts';

test('furby mute only scales audibility and is offered while the tv or radio is on', () => {
  setFurbyAudible(true);
  assert.equal(furbyAudible(), true);
  setFurbyAudible(false);
  assert.equal(furbyAudible(), false);
  setFurbyAudible(true);
  assert.equal(furbyAudible(), true);

  assert.equal(furbyMuteAvailable({ tvMode: 'off', atTelevision: true, radioOn: false }), false);
  assert.equal(furbyMuteAvailable({ tvMode: 'off', atTelevision: false, radioOn: false }), false);
  assert.equal(furbyMuteAvailable({ tvMode: 'menu', atTelevision: true, radioOn: false }), true);
  assert.equal(furbyMuteAvailable({ tvMode: 'menu', atTelevision: false, radioOn: false }), false);
  assert.equal(furbyMuteAvailable({ tvMode: 'off', atTelevision: false, radioOn: true }), true);

  assert.equal(FURBY_QUIET_LINES.length, 3);
  assert.match(FURBY_QUIET_LINES[0], /mute switch/);
  assert.match(FURBY_QUIET_LINES.join(' '), /window/);
});
