// Where the OCR engine's files live. All of them ship with the site (see the ocrAssets plugin in astro.config.mjs);
// nothing is fetched from another origin. This module is imported only when OCR is clicked.
import workerUrl from 'tesseract.js/dist/worker.min.js?url';
import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url';
import engUrl from '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url';
import deuUrl from '@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz?url';
import rusUrl from '@tesseract.js-data/rus/4.0.0_best_int/rus.traineddata.gz?url';

/** Panel value to Tesseract language code. */
export const OCR_LANGS = { en: 'eng', de: 'deu', ru: 'rus' } as const;

/** Tesseract builds `<langPath>/<code>.traineddata.gz`, so the three data files must sit side by side with their own names. */
const dirOf = (u: string) => u.slice(0, u.lastIndexOf('/'));

export function ocrAssets(): { workerPath: string; corePath: string; langPath: string } {
  for (const u of [engUrl, deuUrl, rusUrl]) if (dirOf(u) !== dirOf(engUrl)) throw new Error('OCR language data is not in one folder');
  return { workerPath: workerUrl, corePath: coreUrl, langPath: dirOf(engUrl) };
}
