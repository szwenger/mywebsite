export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

const wifiEscape = (s: string) => s.replace(/[\\;,:"]/g, '\\$&');
const vEscape = (s: string) => s.replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');

export function wifiPayload({ ssid, password, security, hidden }: { ssid: string; password: string; security: WifiSecurity; hidden: boolean }): string {
  const pw = security === 'nopass' ? '' : `P:${wifiEscape(password)};`;
  return `WIFI:T:${security};S:${wifiEscape(ssid)};${pw}${hidden ? 'H:true;' : ''};`;
}

export function vcardPayload({ name, phone, email, url, org }: { name: string; phone?: string; email?: string; url?: string; org?: string }): string {
  const words = name.trim().split(/\s+/);
  const family = words.length > 1 ? words.pop()! : '';
  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${vEscape(family)};${vEscape(words.join(' '))};;;`,
    `FN:${vEscape(name.trim())}`,
    org?.trim() && `ORG:${vEscape(org.trim())}`,
    phone?.trim() && `TEL:${vEscape(phone.trim())}`,
    email?.trim() && `EMAIL:${vEscape(email.trim())}`,
    url?.trim() && `URL:${vEscape(url.trim())}`,
    'END:VCARD',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export const urlPayload = (text: string): string => text.trim();
