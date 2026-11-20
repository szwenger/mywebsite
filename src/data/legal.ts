export const ADDRESS_SENTINEL = 'TODO-ADDRESS';

/** Impressum details. Replace the placeholder address (one string per line) once it is decided; CI refuses to build until then. */
export const legal = {
  name: 'Simon Zwenger',
  address: [ADDRESS_SENTINEL] as string[],
  email: 'request@galuin.com',
};

export const hasAddress = !legal.address.includes(ADDRESS_SENTINEL);

if (process.env.CI && !hasAddress) throw new Error('legal.ts: set the Impressum address before deploying');
