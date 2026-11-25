// Unit conversion. Every category has a base unit; a unit is either a plain factor to the base or a pair of functions (temperature, fuel economy).
export interface Unit {
  id: string; // symbol shown in the lists, also the key
  name: string; // English name, used when Intl has no localised one
  intl?: string; // sanctioned ECMA-402 unit id, so the browser can name it in the page language
  f?: number | ((c: Ctx) => number); // factor to the base unit, or a function of the screen settings
  to?: (x: number) => number; // to base
  from?: (b: number) => number; // from base
}
/** Screen settings the pixel and rem units depend on. */
export interface Ctx { rem?: number; ppi?: number }
export const CTX_DEFAULT = { rem: 16, ppi: 96 };
export interface Category { id: string; units: Unit[]; ctx?: boolean; base?: boolean } // ctx: needs the screen settings; base: number bases, handled by convertBase

const u = (id: string, name: string, f: number, intl?: string): Unit => ({ id, name, f, intl });

export const CATEGORIES: Category[] = [
  { id: 'length', units: [u('m', 'metre', 1, 'meter'), u('km', 'kilometre', 1000, 'kilometer'), u('cm', 'centimetre', 0.01, 'centimeter'), u('mm', 'millimetre', 0.001, 'millimeter'), u('µm', 'micrometre', 1e-6), u('mi', 'mile', 1609.344, 'mile'), u('yd', 'yard', 0.9144, 'yard'), u('ft', 'foot', 0.3048, 'foot'), u('in', 'inch', 0.0254, 'inch'), u('nmi', 'nautical mile', 1852)] },
  { id: 'mass', units: [u('kg', 'kilogram', 1, 'kilogram'), u('g', 'gram', 0.001, 'gram'), u('mg', 'milligram', 1e-6), u('t', 'metric ton', 1000), u('lb', 'pound', 0.45359237, 'pound'), u('oz', 'ounce', 0.028349523125, 'ounce'), u('st', 'stone', 6.35029318, 'stone')] },
  { id: 'volume', units: [u('L', 'litre', 1, 'liter'), u('mL', 'millilitre', 0.001, 'milliliter'), u('m³', 'cubic metre', 1000), u('gal', 'US gallon', 3.785411784, 'gallon'), u('qt', 'US quart', 0.946352946), u('pt', 'US pint', 0.473176473), u('cup', 'US cup', 0.2365882365), u('fl oz', 'US fluid ounce', 0.0295735295625, 'fluid-ounce'), u('tbsp', 'US tablespoon', 0.01478676478125), u('tsp', 'US teaspoon', 0.00492892159375), u('imp gal', 'imperial gallon', 4.54609)] },
  { id: 'temperature', units: [
    { id: '°C', name: 'degree Celsius', intl: 'celsius', to: (x) => x, from: (b) => b },
    { id: '°F', name: 'degree Fahrenheit', intl: 'fahrenheit', to: (x) => (x - 32) * 5 / 9, from: (b) => b * 9 / 5 + 32 },
    { id: 'K', name: 'kelvin', to: (x) => x - 273.15, from: (b) => b + 273.15 },
  ] },
  { id: 'speed', units: [u('m/s', 'metre per second', 1, 'meter-per-second'), u('km/h', 'kilometre per hour', 1 / 3.6, 'kilometer-per-hour'), u('mph', 'mile per hour', 0.44704, 'mile-per-hour'), u('kn', 'knot', 1852 / 3600), u('ft/s', 'foot per second', 0.3048)] },
  { id: 'area', units: [u('m²', 'square metre', 1), u('km²', 'square kilometre', 1e6), u('cm²', 'square centimetre', 1e-4), u('ha', 'hectare', 1e4, 'hectare'), u('acre', 'acre', 4046.8564224, 'acre'), u('ft²', 'square foot', 0.09290304), u('in²', 'square inch', 6.4516e-4), u('yd²', 'square yard', 0.83612736), u('mi²', 'square mile', 2589988.110336)] },
  { id: 'time', units: [u('ms', 'millisecond', 0.001, 'millisecond'), u('s', 'second', 1, 'second'), u('min', 'minute', 60, 'minute'), u('h', 'hour', 3600, 'hour'), u('d', 'day', 86400, 'day'), u('wk', 'week', 604800, 'week'), u('mo', 'month (average)', 2629746, 'month'), u('yr', 'year (average)', 31556952, 'year')] },
  { id: 'data', units: [u('bit', 'bit', 1 / 8, 'bit'), u('B', 'byte', 1, 'byte'), u('kB', 'kilobyte (1000)', 1e3, 'kilobyte'), u('MB', 'megabyte (1000²)', 1e6, 'megabyte'), u('GB', 'gigabyte (1000³)', 1e9, 'gigabyte'), u('TB', 'terabyte (1000⁴)', 1e12, 'terabyte'), u('PB', 'petabyte (1000⁵)', 1e15, 'petabyte'), u('KiB', 'kibibyte (1024)', 1024), u('MiB', 'mebibyte (1024²)', 1024 ** 2), u('GiB', 'gibibyte (1024³)', 1024 ** 3), u('TiB', 'tebibyte (1024⁴)', 1024 ** 4)] },
  { id: 'pressure', units: [u('Pa', 'pascal', 1), u('kPa', 'kilopascal', 1e3), u('bar', 'bar', 1e5), u('psi', 'pound per square inch', 6894.757293168), u('atm', 'standard atmosphere', 101325), u('mmHg', 'millimetre of mercury', 133.322387415)] },
  { id: 'energy', units: [u('J', 'joule', 1), u('kJ', 'kilojoule', 1e3), u('cal', 'calorie', 4.184), u('kcal', 'kilocalorie', 4184), u('Wh', 'watt hour', 3600), u('kWh', 'kilowatt hour', 3.6e6), u('BTU', 'British thermal unit', 1055.05585262)] },
  { id: 'power', units: [u('W', 'watt', 1), u('kW', 'kilowatt', 1e3), u('hp', 'horsepower (mechanical)', 745.69987158), u('PS', 'metric horsepower', 735.49875)] },
  // Base is the inch. A pixel is 1/ppi inch (96 is the CSS reference pixel), a rem is the root font size in pixels.
  { id: 'screen', ctx: true, units: [
    { id: 'px', name: 'pixel', f: (c) => 1 / c.ppi! },
    { id: 'rem', name: 'rem (root font size)', f: (c) => c.rem! / c.ppi! },
    u('pt', 'point', 1 / 72), u('pc', 'pica', 1 / 6), u('in', 'inch', 1, 'inch'), u('cm', 'centimetre', 1 / 2.54, 'centimeter'), u('mm', 'millimetre', 1 / 25.4, 'millimeter'),
  ] },
  { id: 'bases', base: true, units: [u('2', 'binary', 2), u('8', 'octal', 8), u('10', 'decimal', 10), u('16', 'hexadecimal', 16), u('32', 'base 32', 32), u('36', 'base 36', 36)] }, // f is the radix here
  { id: 'angle', units: [u('°', 'degree', 1, 'degree'), u('rad', 'radian', 180 / Math.PI), u('grad', 'gradian', 0.9), u('turn', 'full turn', 360)] },
  // Base is litres per 100 km. Consumption and distance-per-volume are reciprocal, so these are functions, and 0 has no answer.
  { id: 'fuel', units: [
    { id: 'L/100km', name: 'litres per 100 km', to: (x) => x, from: (b) => b },
    { id: 'mpg', name: 'miles per US gallon', to: (x) => 235.214583333 / x, from: (b) => 235.214583333 / b },
    { id: 'mpg UK', name: 'miles per imperial gallon', to: (x) => 282.480936 / x, from: (b) => 282.480936 / b },
    { id: 'km/L', name: 'kilometres per litre', to: (x) => 100 / x, from: (b) => 100 / b },
  ] },
  // Everyday yardsticks, rough on purpose (a banana is "about 18 cm"). The ids are emoji so they read the same in every language; the names come from the page strings.
  { id: 'sillylength', units: [u('m', 'metre', 1, 'meter'), u('🍌', 'Banana', 0.18), u('🦒', 'Giraffe', 5.5), u('🚌', 'Double-decker bus', 11.2), u('🐋', 'Blue whale', 25), u('⚽', 'Football pitch (length)', 105), u('🗼', 'Eiffel Tower', 330)] },
  { id: 'sillyarea', units: [u('m²', 'square metre', 1), u('🎾', 'Tennis court', 260.9), u('🏊', 'Olympic pool', 1250), u('⚽', 'Football pitch', 7140), u('⛪', 'Vatican City', 490000), u('🏙', 'Manhattan', 59.13e6), u('🐉', 'Wales', 20779e6), u('🍟', 'Belgium', 30689e6)] },
  { id: 'sillymass', units: [u('kg', 'kilogram', 1), u('🍌', 'Banana', 0.12), u('🐈', 'House cat', 4.5), u('🧍', 'Adult person', 70), u('🐘', 'Elephant', 5000), u('🐋', 'Blue whale', 150000)] },
];

export const category = (id: string): Category => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
const unit = (cat: Category, id: string): Unit => cat.units.find((x) => x.id === id) ?? cat.units[0];

/** Converts `value` between two units of one category. NaN when the value has no answer (e.g. 0 mpg). */
export function convert(catId: string, from: string, to: string, value: number, ctx: Ctx = {}): number {
  const cat = category(catId);
  const c = { ...CTX_DEFAULT, ...ctx };
  const a = unit(cat, from), b = unit(cat, to);
  const fa = typeof a.f === 'function' ? a.f(c) : a.f!, fb = typeof b.f === 'function' ? b.f(c) : b.f!;
  const base = a.to ? a.to(value) : value * fa;
  return b.from ? b.from(base) : base / fb;
}

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const PREFIX: Record<number, string> = { 2: '0b', 8: '0o', 16: '0x' };

/** Converts an integer written in one base to another, exactly (BigInt). Spaces and underscores are ignored, a 0b/0o/0x prefix of the same base is allowed. '' when the text is not a whole number in that base. */
export function convertBase(text: string, from: number, to: number): string {
  let t = text.toLowerCase().replace(/[\s_']/g, '');
  const neg = t.startsWith('-');
  if (neg || t.startsWith('+')) t = t.slice(1);
  if (PREFIX[from] && t.startsWith(PREFIX[from])) t = t.slice(2);
  if (!t) return '';
  let n = 0n;
  for (const ch of t) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= from) return '';
    n = n * BigInt(from) + BigInt(d);
  }
  return (neg && n ? '-' : '') + n.toString(to).toUpperCase();
}

/** Ten significant digits, no trailing zeros, exponent form for very large or small numbers. */
export function format(n: number, locale = 'en'): string {
  if (!Number.isFinite(n)) return '–';
  if (n === 0) return '0';
  const r = Number(n.toPrecision(10));
  const a = Math.abs(r);
  if (a >= 1e15 || a < 1e-6) return r.toExponential();
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 10, useGrouping: a >= 10000 }).format(r);
}

/** Parses "1,5", "1.5", " 1 500,25" and "-3e2" into a number; NaN when it is not one. */
export function parseNumber(text: string): number {
  let t = text.trim().replace(/[\s ']/g, '');
  if (!t) return NaN;
  const comma = t.lastIndexOf(','), dot = t.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) t = comma > dot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (comma >= 0) t = t.replace(',', '.');
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN;
}
