export const ADDRESS_SENTINEL = 'TODO-ADDRESS';

/** Impressum details. Replace the placeholder address (one string per line) once it is decided; until then the Impressum says it is pending and is noindex. */
export const legal = {
  name: 'Simon Zwenger',
  address: ['c/o Block Services', 'Stuttgarter Str. 106', '70736 Fellbach'] as string[],
  email: 'request@galuin.com',
};

export const hasAddress = !legal.address.includes(ADDRESS_SENTINEL);

if (!hasAddress) console.warn('legal.ts: the Impressum address is still the placeholder');
