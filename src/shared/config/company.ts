/**
 * Legal entity operating Salacope (registered in Angola, trading in the Republic of the Congo).
 * Fields left `null` are displayed as "À compléter" on legal pages.
 */
export const COMPANY: {
  legalName: string;
  legalForm: string;
  taxId: string;
  license: string;
  address: string;
  director: string | null;
  email: string;
  host: string;
} = {
  legalName: 'Lídia & Mariana – Comércio Geral e Prestação de Serviços, Lda',
  legalForm: 'Société à responsabilité limitée de droit angolais (Lda)',
  taxId: 'NIF 5001873490 (Angola)',
  license: 'Alvará comercial n° 202505195001873490195328',
  address: 'Rua 12, Bairro Rocha Pinto (près de la BIC), s/n, Luanda, Angola',
  director: null,
  email: 'contact@salacope.online',
  host: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
};

export const companyField = (value: string | null) => value ?? 'À compléter';
