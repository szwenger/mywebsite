import type { IconName } from './icons';
import type { Lang } from '../i18n/ui';

export interface Spot { id: string; icon: IconName; name: string; handle: string; url: string; blurb: Record<Lang, string> }

export const spots: Spot[] = [
  { id: 'twitch', icon: 'twitch', name: 'Twitch', handle: 'twitch.tv/galuin', url: 'https://www.twitch.tv/galuin',
    blurb: { en: 'Live streams', de: 'Live-Streams', ru: 'Прямые эфиры' } },
  { id: 'youtube', icon: 'youtube', name: 'YouTube', handle: '@Galuin', url: 'https://www.youtube.com/@Galuin',
    blurb: { en: 'Videos and Shorts', de: 'Videos und Shorts', ru: 'Видео и Shorts' } },
  { id: 'x', icon: 'x', name: 'X', handle: '@GaluinGaming', url: 'https://x.com/GaluinGaming',
    blurb: { en: 'Short posts', de: 'Kurze Beiträge', ru: 'Короткие записи' } },
  { id: 'discord', icon: 'discord', name: 'Discord', handle: 'discord.gg/Nm9b9pe', url: 'https://discord.gg/Nm9b9pe',
    blurb: { en: 'Chat and community', de: 'Chat und Community', ru: 'Чат и сообщество' } },
];
