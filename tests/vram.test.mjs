import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightsGB, kvBytesPerToken, estimate, QUANTS, KV_TYPES } from '../src/tools/vram/logic.ts';

test('weights: billions of parameters times bits per weight over 8 is gigabytes', () => {
  assert.equal(weightsGB(8, 16), 16);
  assert.equal(weightsGB(7, 4.5), 3.9375);
});

test('kv cache per token: 2 (K and V) x layers x kv heads x head dim x bytes', () => {
  // Llama 3.1 8B: 32 layers, 8 kv heads, head dim 128, f16 -> 131072 bytes/token (128 KiB)
  assert.equal(kvBytesPerToken({ layers: 32, kvHeads: 8, headDim: 128 }, 2), 131072);
});

test('estimate adds weights, kv cache for the context and a fixed overhead', () => {
  const e = estimate({ paramsB: 8, bpw: 16, layers: 32, kvHeads: 8, headDim: 128, ctx: 8192, kvBytes: 2, overheadGB: 0.5, vramGB: 24 });
  assert.equal(e.weights, 16);
  assert.equal(e.kv, 1); // 8192 x 128 KiB = 1 GiB
  assert.equal(e.total, 17.5);
  assert.equal(e.fits, true);
});

test('estimate finds the longest context that still fits and reports no fit when weights alone are too big', () => {
  const e = estimate({ paramsB: 8, bpw: 16, layers: 32, kvHeads: 8, headDim: 128, ctx: 8192, kvBytes: 2, overheadGB: 0.5, vramGB: 24 });
  assert.equal(e.maxCtx, Math.floor(((24 - 16 - 0.5) * 2 ** 30) / 131072));
  const big = estimate({ paramsB: 70, bpw: 16, layers: 80, kvHeads: 8, headDim: 128, ctx: 4096, kvBytes: 2, overheadGB: 0.5, vramGB: 24 });
  assert.equal(big.fits, false);
  assert.equal(big.maxCtx, 0);
});

test('quant and kv tables hold the presets the page offers', () => {
  assert.ok(QUANTS.some((q) => q.id === 'Q4_K_M'));
  assert.ok(KV_TYPES.some((k) => k.id === 'f16' && k.bytes === 2));
});
