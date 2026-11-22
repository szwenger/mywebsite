/** VRAM estimate for running a GGUF model in llama.cpp: weights + KV cache + a fixed compute overhead. Approximate by design. */

/** Average bits per weight of the common llama.cpp quantisations (file size / parameters; real files vary by a few percent). */
export const QUANTS = [
  { id: 'Q2_K', bpw: 3.0 }, { id: 'Q3_K_M', bpw: 3.9 }, { id: 'Q4_0', bpw: 4.5 }, { id: 'Q4_K_M', bpw: 4.85 },
  { id: 'Q5_K_M', bpw: 5.7 }, { id: 'Q6_K', bpw: 6.6 }, { id: 'Q8_0', bpw: 8.5 }, { id: 'F16', bpw: 16 },
];
/** Bytes per element of the KV cache types (--cache-type-k/v); q8_0 and q4_0 carry a scale per 32 values. */
export const KV_TYPES = [{ id: 'f16', bytes: 2 }, { id: 'q8_0', bytes: 34 / 32 }, { id: 'q4_0', bytes: 18 / 32 }];

const GIB = 2 ** 30;
export interface Arch { layers: number; kvHeads: number; headDim: number }
export interface Input extends Arch { paramsB: number; bpw: number; ctx: number; kvBytes: number; overheadGB: number; vramGB: number }

export const weightsGB = (paramsB: number, bpw: number): number => (paramsB * bpw) / 8;
export const kvBytesPerToken = (a: Arch, kvBytes: number): number => 2 * a.layers * a.kvHeads * a.headDim * kvBytes;

export function estimate(i: Input) {
  const perTok = kvBytesPerToken(i, i.kvBytes);
  const weights = weightsGB(i.paramsB, i.bpw);
  const kv = (perTok * i.ctx) / GIB;
  const total = weights + kv + i.overheadGB;
  const room = i.vramGB - weights - i.overheadGB;
  return { weights, kv, overhead: i.overheadGB, total, fits: total <= i.vramGB, maxCtx: room > 0 && perTok > 0 ? Math.floor((room * GIB) / perTok) : 0 };
}

/** Popular models: parameters (billions) and attention shape. From the published configs; MoE and sliding-window models are not modelled. */
export const PRESETS = [
  { id: 'Llama 3.2 3B', paramsB: 3.21, layers: 28, kvHeads: 8, headDim: 128 },
  { id: 'Llama 3.1 8B', paramsB: 8.03, layers: 32, kvHeads: 8, headDim: 128 },
  { id: 'Llama 3.1 70B', paramsB: 70.6, layers: 80, kvHeads: 8, headDim: 128 },
  { id: 'Mistral 7B', paramsB: 7.25, layers: 32, kvHeads: 8, headDim: 128 },
  { id: 'Qwen2.5 7B', paramsB: 7.62, layers: 28, kvHeads: 4, headDim: 128 },
  { id: 'Qwen2.5 32B', paramsB: 32.5, layers: 64, kvHeads: 8, headDim: 128 },
  { id: 'Qwen3 8B', paramsB: 8.2, layers: 36, kvHeads: 8, headDim: 128 },
  { id: 'Qwen3 14B', paramsB: 14.8, layers: 40, kvHeads: 8, headDim: 128 },
  { id: 'Qwen3 32B', paramsB: 32.8, layers: 64, kvHeads: 8, headDim: 128 },
  { id: 'Gemma 2 9B', paramsB: 9.24, layers: 42, kvHeads: 8, headDim: 256 },
];
