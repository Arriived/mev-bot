import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuseGenerators } from '../build/src/utils.js';

async function* values(items, delay = 0) {
  for (const item of items) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    yield item;
  }
}

test('merges finite streams without yielding their completion values', async () => {
  const result = [];
  for await (const value of fuseGenerators([values([1]), values([2, 3], 5)])) result.push(value);
  assert.deepEqual(result.sort(), [1, 2, 3]);
});

test('an empty set of streams terminates immediately', async () => {
  assert.deepEqual(await fuseGenerators([]).next(), { value: undefined, done: true });
});

test('an exhausted stream cannot starve another stream', async () => {
  const result = [];
  for await (const value of fuseGenerators([values([]), values([7], 5)])) result.push(value);
  assert.deepEqual(result, [7]);
});

test('upstream failures propagate to the consumer', async () => {
  async function* failing() {
    yield 1;
    throw new Error('upstream failed');
  }
  await assert.rejects(async () => {
    for await (const value of fuseGenerators([failing()])) assert.equal(value, 1);
  }, /upstream failed/);
});
