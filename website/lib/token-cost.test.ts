import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTokenCost } from './token-cost.ts';
void test('non-finite input cannot produce Infinity or NaN totals', () => {
  for (const n of [Infinity, -Infinity, NaN])
    assert.equal(
      calculateTokenCost({
        inputTokens: n,
        outputTokens: n,
        runs: n,
        price: { inputPerMillion: 1, outputPerMillion: 5 },
      }).totalCost,
      0,
    );
});

void test('calculates input and output token cost for repeated runs', () => {
  const result = calculateTokenCost({
    inputTokens: 100_000,
    outputTokens: 20_000,
    runs: 10,
    price: { inputPerMillion: 0.1, outputPerMillion: 0.5 },
  });

  assert.equal(result.inputCost, 0.1);
  assert.equal(result.outputCost, 0.1);
  assert.equal(result.totalCost, 0.2);
});

void test('clamps negative values to zero', () => {
  const result = calculateTokenCost({
    inputTokens: -1,
    outputTokens: -1,
    runs: -1,
    price: { inputPerMillion: 1, outputPerMillion: 5 },
  });

  assert.deepEqual(result, {
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  });
});
