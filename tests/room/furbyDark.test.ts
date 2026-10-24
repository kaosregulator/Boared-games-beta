import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { FurbyBrain, onBubble } from '../../src/room/furby/furbyBrain.ts';
import { bedBrain, setFurbyDark, tableBrain } from '../../src/room/furby/furbyStore.ts';

test('the light switch reaches the bed Furby and the new one', () => {
  setFurbyDark(true);
  assert.equal(bedBrain.dark, true);
  assert.equal(tableBrain.dark, true);
  setFurbyDark(false);
  assert.equal(bedBrain.dark, false);
  assert.equal(tableBrain.dark, false);
});

test('lights out is bedtime, and the lights coming back wake it', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const said: string[] = [];
  const stop = onBubble(b => {
    if (b?.who === 'Shelf') said.push(b.english);
  });
  try {
    const brain = new FurbyBrain('Shelf', { voiced: false });
    brain.dark = true;
    brain.update(0.05);
    assert.ok(said.some(line => /dark/i.test(line)));
    mock.timers.tick(1800);
    for (let i = 0; i < 80; i++) brain.update(0.05);
    assert.equal(brain.asleep, true);
    for (let i = 0; i < 40; i++) brain.update(0.05);
    assert.equal(brain.asleep, true);
    brain.dark = false;
    let woke = false;
    for (let i = 0; i < 800; i++) {
      brain.update(0.05);
      if (!brain.asleep) {
        woke = true;
        break;
      }
    }
    assert.equal(woke, true);
    brain.dispose();
  } finally {
    stop();
    mock.timers.reset();
  }
});
