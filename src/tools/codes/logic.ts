// Text codes: Morse, the NATO phonetic alphabet, English braille (grade 1), Caesar and Vigenère. Encoders drop what has no code and count it.
export interface Result { out: string; unknown: number }

const pairs = (spec: string): Record<string, string> => Object.fromEntries(spec.split(' ').map((p) => [p[0], p.slice(1)]));
const invert = (t: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(t).map(([k, v]) => [v, k]));

// ---- Morse (ITU) ----
const COMMON = pairs('00----- 1.---- 2..--- 3...-- 4....- 5..... 6-.... 7--... 8---.. 9----. ..-.-.- ,--..-- ?..--.. \'.----. !-.-.-- /-..-. (-.--. )-.--.- &.-... :---... ;-.-.-. =-...- +.-.-. --....- _..--.- "' + '.-..-. $...-..- @.--.-.');
const LATIN = { ...pairs('A.- B-... C-.-. D-.. E. F..-. G--. H.... I.. J.--- K-.- L.-.. M-- N-. O--- P.--. Q--.- R.-. S... T- U..- V...- W.-- X-..- Y-.-- Z--..'), 'Ä': '.-.-', 'Ö': '---.', 'Ü': '..--', ...COMMON };
const CYRILLIC = { ...pairs('А.- Б-... В.-- Г--. Д-.. Е. Ж...- З--.. И.. Й.--- К-.- Л.-.. М-- Н-. О--- П.--. Р.-. С... Т- У..- Ф..-. Х.... Ц-.-. Ч---. Ш---- Щ--.- Ъ--.-- Ы-.-- Ь-..- Э..-.. Ю..-- Я.-.-'), ...COMMON };
const MORSE = { latin: LATIN, cyrillic: CYRILLIC };
export type MorseAlphabet = keyof typeof MORSE;

export function morseEncode(text: string, alphabet: MorseAlphabet = 'latin'): Result {
  const table = MORSE[alphabet];
  let unknown = 0;
  const words = text.toUpperCase().replace(/Ё/g, 'Е').split(/\s+/).filter(Boolean).map((w) => [...w].flatMap((ch) => table[ch] ? [table[ch]] : (unknown++, [])).join(' ')).filter(Boolean);
  return { out: words.join(' / '), unknown };
}

export function morseDecode(code: string, alphabet: MorseAlphabet = 'latin'): Result {
  const back = invert(MORSE[alphabet]);
  let unknown = 0;
  const norm = code.replace(/[·•]/g, '.').replace(/[–—−]/g, '-').replace(/\|/g, ' / ').replace(/ {3,}/g, ' / ');
  const out = norm.split(/\s+/).filter(Boolean).map((tok) => (tok === '/' ? ' ' : back[tok] ?? (unknown++, '?'))).join('');
  return { out: out.replace(/ +/g, ' ').trim(), unknown };
}

/** On/off durations in ms for playing Morse. The standard word PARIS is 50 units, so a unit lasts 1200/wpm ms: dot 1, dash 3, 1 between marks, 3 between letters, 7 between words. */
export function morseTimings(code: string, wpm: number): { on: boolean; ms: number }[] {
  const unit = 1200 / wpm;
  const out: { on: boolean; ms: number }[] = [];
  let gap = 3;
  for (const tok of code.split(/\s+/).filter(Boolean)) {
    if (tok === '/') { gap = 7; continue; }
    if (out.length) out.push({ on: false, ms: gap * unit });
    gap = 3;
    [...tok].forEach((c, i) => {
      if (i) out.push({ on: false, ms: unit });
      out.push({ on: true, ms: (c === '-' ? 3 : 1) * unit });
    });
  }
  return out;
}

// ---- NATO phonetic alphabet (ICAO spelling) ----
const NATO = 'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey Xray Yankee Zulu'.split(' ');
const NATO_DIGITS = 'Zero One Two Tree Fower Fife Six Seven Eight Niner'.split(' ');
const NATO_BACK: Record<string, string> = { alpha: 'A', juliet: 'J', 'x-ray': 'X', three: '3', four: '4', five: '5', nine: '9', ...Object.fromEntries(NATO.map((w, i) => [w.toLowerCase(), String.fromCharCode(65 + i)])), ...Object.fromEntries(NATO_DIGITS.map((w, i) => [w.toLowerCase(), String(i)])) };

export function natoEncode(text: string): Result {
  let unknown = 0;
  const words = text.toUpperCase().split(/\s+/).filter(Boolean).map((w) => [...w].flatMap((ch) => /[A-Z]/.test(ch) ? [NATO[ch.charCodeAt(0) - 65]] : /[0-9]/.test(ch) ? [NATO_DIGITS[Number(ch)]] : (unknown++, [])).join(' ')).filter(Boolean);
  return { out: words.join(' / '), unknown };
}

export function natoDecode(text: string): Result {
  let unknown = 0;
  const out = text.toLowerCase().split(/\s+/).filter(Boolean).map((w) => (w === '/' ? ' ' : NATO_BACK[w] ?? (unknown++, '?'))).join('');
  return { out, unknown };
}

// ---- Braille, English grade 1 (letters, number sign, capital sign, basic punctuation) ----
const B_LETTERS = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵'; // a-z
const B_DIGITS = '⠚⠁⠃⠉⠙⠑⠋⠛⠓⠊'; // 0-9 are the cells of j, a-i
const B_PUNCT: Record<string, string> = { ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⠦', "'": '⠄', '-': '⠤' };
const B_NUMBER = '⠼', B_CAPITAL = '⠠', B_SPACE = '⠀';

export function brailleEncode(text: string): Result {
  let unknown = 0, inNumber = false;
  let out = '';
  for (const ch of text) {
    const lower = ch.toLowerCase();
    if (/[0-9]/.test(ch)) { out += (inNumber ? '' : B_NUMBER) + B_DIGITS[Number(ch)]; inNumber = true; continue; }
    inNumber = false;
    if (/[a-z]/.test(lower) && lower.length === 1 && ch.charCodeAt(0) < 128) out += (ch !== lower ? B_CAPITAL : '') + B_LETTERS[lower.charCodeAt(0) - 97];
    else if (ch === ' ') out += B_SPACE;
    else if (ch === '\n') out += '\n';
    else if (B_PUNCT[ch]) out += B_PUNCT[ch];
    else unknown++;
  }
  return { out, unknown };
}

export function brailleDecode(text: string): Result {
  const punct = invert(B_PUNCT);
  let unknown = 0, inNumber = false, capital = false;
  let out = '';
  for (const ch of text) {
    if (ch === B_NUMBER) { inNumber = true; continue; }
    if (ch === B_CAPITAL) { capital = true; continue; }
    if (ch === B_SPACE || ch === ' ' || ch === '\n') { out += ch === B_SPACE ? ' ' : ch; inNumber = false; continue; }
    const digit = B_DIGITS.indexOf(ch), letter = B_LETTERS.indexOf(ch);
    if (inNumber && digit >= 0) out += digit;
    else if (letter >= 0) { out += capital ? String.fromCharCode(65 + letter) : String.fromCharCode(97 + letter); inNumber = false; }
    else if (punct[ch]) { out += punct[ch]; inNumber = false; }
    else { out += '?'; unknown++; }
    capital = false;
  }
  return { out, unknown };
}

// ---- Caesar and Vigenère (ASCII letters; everything else stays as it is) ----
const rotate = (ch: string, by: number): string => {
  const base = ch >= 'a' ? 97 : 65;
  return String.fromCharCode(base + ((((ch.charCodeAt(0) - base + by) % 26) + 26) % 26));
};

export const caesar = (text: string, shift: number): string => text.replace(/[A-Za-z]/g, (c) => rotate(c, shift));

/** The 25 other shifts of a text: how a Caesar message is broken when the shift is not known. */
export const caesarAll = (text: string): { shift: number; text: string }[] => Array.from({ length: 25 }, (_, i) => ({ shift: i + 1, text: caesar(text, i + 1) }));

/** sign 1 encrypts, −1 decrypts. The key advances only on letters; a key without letters leaves the text alone. */
export function vigenere(text: string, key: string, sign: 1 | -1): string {
  const k = key.toLowerCase().replace(/[^a-z]/g, '');
  if (!k) return text;
  let i = 0;
  return text.replace(/[A-Za-z]/g, (c) => rotate(c, sign * (k.charCodeAt(i++ % k.length) - 97)));
}
