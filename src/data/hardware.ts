import type { Lang } from '../i18n/ui';

type L = Record<Lang, string>;
export interface HwItem { label: L; name: string; href?: string }
export interface HwGroup { id: 'pc' | 'audio' | 'vr'; title: L; items: HwItem[] }

const same = (s: string): L => ({ en: s, de: s, ru: s });

export const hardware: HwGroup[] = [
  {
    id: 'pc', title: { en: 'PC setup', de: 'PC-Setup', ru: 'ПК' },
    items: [
      { label: { en: 'Case', de: 'Gehäuse', ru: 'Корпус' }, name: 'Cooler Master MasterBox TD500 Mesh', href: 'https://amzn.eu/d/4hkrHid' },
      { label: same('CPU'), name: 'Intel® Core™ i5-13600K', href: 'https://amzn.eu/d/9HwxtbE' },
      { label: same('GPU'), name: 'AMD RX 6800XT', href: 'https://amzn.eu/d/5oOMUjF' },
      { label: { en: 'RAM', de: 'Arbeitsspeicher', ru: 'ОЗУ' }, name: 'G.Skill F4-3200C16D-32GVK (2 × 16 GB)', href: 'https://amzn.eu/d/4JcwcsO' },
      { label: { en: 'Motherboard', de: 'Mainboard', ru: 'Материнская плата' }, name: 'Gigabyte Z690 UD DDR4', href: 'https://amzn.eu/d/b3DLYPB' },
      { label: { en: 'OS', de: 'Betriebssystem', ru: 'ОС' }, name: 'Windows 11 Pro (64-bit)', href: 'https://www.microsoft.com/de-de/d/windows-11-pro/dg7gmgf0d8h4/000P' },
      { label: { en: 'Mouse', de: 'Maus', ru: 'Мышь' }, name: 'Logitech G305', href: 'https://amzn.eu/d/deVYJgk' },
      { label: { en: 'Keyboard', de: 'Tastatur', ru: 'Клавиатура' }, name: 'HyperX Alloy Origins 60 (HyperX Red, US layout)', href: 'https://amzn.eu/d/3x2ZswV' },
      { label: { en: 'Mousepad', de: 'Mauspad', ru: 'Коврик' }, name: 'SteelSeries QcK+', href: 'https://www.amazon.com/SteelSeries-QcK-Gaming-Mouse-Black/dp/B000UVRU6G/' },
      { label: { en: 'Monitor 1', de: 'Monitor 1', ru: 'Монитор 1' }, name: 'AOC Q27G2U — 27" QHD 144 Hz 1 ms', href: 'https://amzn.eu/d/aVYspWD' },
      { label: { en: 'Monitor 2', de: 'Monitor 2', ru: 'Монитор 2' }, name: 'BenQ GL2450 — 24" 60 Hz', href: 'https://a.co/d/9RJIAvi' },
      { label: { en: 'Monitor 3', de: 'Monitor 3', ru: 'Монитор 3' }, name: 'Lenovo ThinkVision (vertical)' },
    ],
  },
  {
    id: 'audio', title: { en: 'Audio', de: 'Audio', ru: 'Звук' },
    items: [
      { label: { en: 'Headphones', de: 'Kopfhörer', ru: 'Наушники' }, name: 'beyerdynamic DT 880 Black Special Edition', href: 'https://amzn.eu/d/6Mxrhpq' },
      { label: { en: 'Microphone', de: 'Mikrofon', ru: 'Микрофон' }, name: 'Shure PGA48 XLR', href: 'https://www.amazon.de/gp/product/B00WGAT56W/' },
      { label: { en: 'Audio interface', de: 'Audio-Interface', ru: 'Аудиоинтерфейс' }, name: 'Behringer U-PHORIA UMC22', href: 'https://www.amazon.de/gp/product/B00FFIGZF66/' },
    ],
  },
  {
    id: 'vr', title: { en: 'VR', de: 'VR', ru: 'VR' },
    items: [{ label: { en: 'Headset', de: 'Headset', ru: 'Шлем' }, name: 'Meta Quest 2' }],
  },
];
