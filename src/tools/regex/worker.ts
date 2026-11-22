import { runRegex } from './logic';

onmessage = (e: MessageEvent<{ p: string; f: string; t: string; r?: string }>) => {
  postMessage(runRegex(e.data.p, e.data.f, e.data.t, e.data.r));
};
