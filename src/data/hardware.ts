import type { Lang } from '../i18n/ui';

type L = Record<Lang, string>;
export type Spot = 'pc' | 'mouse' | 'kb' | 'pad' | 'm1' | 'm2' | 'm3' | 'hp' | 'mic' | 'ai' | 'vr';
export interface HwItem { label: L; name: string; href?: string; spot: Spot; note?: L }
export interface HwGroup { id: 'pc' | 'audio' | 'vr'; title: L; items: HwItem[] }

const same = (s: string): L => ({ en: s, de: s, ru: s });

export const hardware: HwGroup[] = [
  {
    id: 'pc', title: { en: 'PC setup', de: 'PC-Setup', ru: 'ПК' },
    items: [
      { label: { en: 'Case', de: 'Gehäuse', ru: 'Корпус' }, name: 'Cooler Master MasterBox TD500 Mesh', href: 'https://amzn.eu/d/4hkrHid', spot: 'pc' },
      { label: same('CPU'), name: 'Intel® Core™ i5-13600K', href: 'https://amzn.eu/d/9HwxtbE', spot: 'pc' },
      { label: same('GPU'), name: 'AMD RX 6800XT', href: 'https://amzn.eu/d/5oOMUjF', spot: 'pc' },
      { label: { en: 'RAM', de: 'Arbeitsspeicher', ru: 'ОЗУ' }, name: 'G.Skill F4-3200C16D-32GVK (2 × 16 GB)', href: 'https://amzn.eu/d/4JcwcsO', spot: 'pc' },
      { label: { en: 'Motherboard', de: 'Mainboard', ru: 'Материнская плата' }, name: 'Gigabyte Z690 UD DDR4', href: 'https://amzn.eu/d/b3DLYPB', spot: 'pc' },
      { label: { en: 'OS', de: 'Betriebssystem', ru: 'ОС' }, name: 'Windows 11 Pro (64-bit)', href: 'https://www.microsoft.com/de-de/d/windows-11-pro/dg7gmgf0d8h4/000P', spot: 'pc' },
      { label: { en: 'Mouse', de: 'Maus', ru: 'Мышь' }, name: 'MCHOSE A7 V2 Ultra', href: 'https://www.mchose.store/products/mchose-a7-v2-series-lightweight-all-round-wireless-gaming-mouse?variant=50834270847271', spot: 'mouse',
        note: { en: 'Wireless, 59 g. PAW3950 TI sensor up to 42,000 DPI, 8K polling wired and with the 2.4 GHz receiver, USB-C, 2.4 GHz and Bluetooth.', de: 'Kabellos, 59 g. PAW3950-TI-Sensor bis 42.000 DPI, 8K-Abtastrate per Kabel und mit dem 2,4-GHz-Empfänger, USB-C, 2,4 GHz und Bluetooth.', ru: 'Беспроводная, 59 г. Сенсор PAW3950 TI до 42 000 DPI, опрос 8K по проводу и через приёмник 2,4 ГГц, USB-C, 2,4 ГГц и Bluetooth.' } },
      { label: { en: 'Keyboard', de: 'Tastatur', ru: 'Клавиатура' }, name: 'HyperX Alloy Origins 60 (HyperX Red, US layout)', href: 'https://amzn.eu/d/3x2ZswV', spot: 'kb' },
      { label: { en: 'Mousepad', de: 'Mauspad', ru: 'Коврик' }, name: 'SteelSeries QcK XXL', spot: 'pad',
        note: { en: 'Cloth pad, 900 × 400 mm, big enough for mouse and keyboard.', de: 'Stoffpad, 900 × 400 mm, groß genug für Maus und Tastatur.', ru: 'Тканевый коврик, 900 × 400 мм, хватает и для мыши, и для клавиатуры.' } },
      { label: { en: 'Monitor 1', de: 'Monitor 1', ru: 'Монитор 1' }, name: 'AOC Q27G2U — 27" QHD 144 Hz 1 ms', href: 'https://amzn.eu/d/aVYspWD', spot: 'm1' },
      { label: { en: 'Monitor 2', de: 'Monitor 2', ru: 'Монитор 2' }, name: 'BenQ GL2450 — 24" 60 Hz', href: 'https://a.co/d/9RJIAvi', spot: 'm2' },
      { label: { en: 'Monitor 3', de: 'Monitor 3', ru: 'Монитор 3' }, name: 'Lenovo ThinkVision (vertical)', spot: 'm3' },
    ],
  },
  {
    id: 'audio', title: { en: 'Audio', de: 'Audio', ru: 'Звук' },
    items: [
      { label: { en: 'Headphones', de: 'Kopfhörer', ru: 'Наушники' }, name: 'beyerdynamic DT 880 Black Special Edition', href: 'https://amzn.eu/d/6Mxrhpq', spot: 'hp' },
      { label: { en: 'Microphone', de: 'Mikrofon', ru: 'Микрофон' }, name: 'Shure PGA48 XLR', href: 'https://www.amazon.de/gp/product/B00WGAT56W/', spot: 'mic' },
      { label: { en: 'Audio interface', de: 'Audio-Interface', ru: 'Аудиоинтерфейс' }, name: 'Behringer U-PHORIA UMC22', href: 'https://www.amazon.de/gp/product/B00FFIGZF66/', spot: 'ai' },
    ],
  },
  {
    id: 'vr', title: { en: 'VR', de: 'VR', ru: 'VR' },
    items: [{ label: { en: 'Headset', de: 'Headset', ru: 'Шлем' }, name: 'Meta Quest 2', spot: 'vr' }],
  },
];

/** Parts of the desk picture that can be hovered and zoomed. The order is the index in hero-ids.png (see docs/hardware3d/masks_post.py). */
export const spots: { id: Spot; title: L }[] = [
  { id: 'pc', title: { en: 'The PC', de: 'Der PC', ru: 'Компьютер' } },
  { id: 'mouse', title: { en: 'Mouse', de: 'Maus', ru: 'Мышь' } },
  { id: 'kb', title: { en: 'Keyboard', de: 'Tastatur', ru: 'Клавиатура' } },
  { id: 'pad', title: { en: 'Mousepad', de: 'Mauspad', ru: 'Коврик' } },
  { id: 'm1', title: { en: 'Monitor 1', de: 'Monitor 1', ru: 'Монитор 1' } },
  { id: 'm2', title: { en: 'Monitor 2', de: 'Monitor 2', ru: 'Монитор 2' } },
  { id: 'm3', title: { en: 'Monitor 3', de: 'Monitor 3', ru: 'Монитор 3' } },
  { id: 'hp', title: { en: 'Headphones', de: 'Kopfhörer', ru: 'Наушники' } },
  { id: 'mic', title: { en: 'Microphone', de: 'Mikrofon', ru: 'Микрофон' } },
  { id: 'ai', title: { en: 'Audio interface', de: 'Audio-Interface', ru: 'Аудиоинтерфейс' } },
  { id: 'vr', title: { en: 'VR headset', de: 'VR-Brille', ru: 'VR-шлем' } },
];
