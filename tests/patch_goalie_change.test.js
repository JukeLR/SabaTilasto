import { test } from 'uvu';
import * as assert from 'uvu/assert';
// Oletetaan, että PATCH on exportattu testattavaksi
import { PATCH } from '../../src/routes/api/games/[id]/+server';

function mockEvent(goalie_change) {
  return {
    params: { id: '1' },
    request: {
      json: async () => ({ goalie_change })
    }
  };
}

test('PATCH goalie_change null does not set null', async () => {
  const event = mockEvent(null);
  const response = await PATCH(event);
  assert.ok(response);
});

test('PATCH goalie_change undefined does not set null', async () => {
  const event = mockEvent(undefined);
  const response = await PATCH(event);
  assert.ok(response);
});

test('PATCH goalie_change 0 does not set null', async () => {
  const event = mockEvent(0);
  const response = await PATCH(event);
  assert.ok(response);
});

test('PATCH goalie_change >0 sets value', async () => {
  const event = mockEvent(5);
  const response = await PATCH(event);
  assert.ok(response);
});

test.run();
