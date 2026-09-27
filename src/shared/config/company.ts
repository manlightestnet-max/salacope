/**
 * Legal entity operating Salacope in the Republic of Congo.
 * TODO: fill in with the registered Congolese entity before going live.
 * Fields left `null` are displayed as "À compléter" on legal pages.
 */
export const COMPANY: {
  legalName: string | null;
  legalForm: string | null;
  rccm: string | null;
  niu: string | null;
  address: string | null;
  director: string | null;
  email: string;
} = {
  legalName: null,
  legalForm: null,
  rccm: null,
  niu: null,
  address: null,
  director: null,
  email: 'contact@salacope.online',
};

export const companyField = (value: string | null) => value ?? 'À compléter';
