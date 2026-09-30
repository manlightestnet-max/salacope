/**
 * The company that owns Salacope Online (registered in Angola; the platform serves the Republic of the Congo).
 * Fields left `null` are displayed as "À compléter" on legal pages.
 */
export const COMPANY: {
  legalName: string;
  legalForm: string;
  taxId: string;
  registry: string;
  license: string;
  address: string;
  director: string | null;
  email: string;
  host: string;
} = {
  legalName: 'Lídia & Mariana – Comércio Geral e Prestação de Serviços, Lda',
  legalForm: 'Société à responsabilité limitée de droit angolais (Lda)',
  taxId: 'NIF 5001873490 (Angola)',
  registry: 'Matrícula 12988-24/240321, Guiché Único da Empresa, Luanda',
  license: 'Alvará comercial n° 202505195001873490195328, à durée indéterminée',
  address: 'Rua nº 12, casa s/nº, Bairro Rocha Triângulo, Distrito Urbano da Samba, Luanda, Angola (près de la BIC)',
  director: 'Lídia Clemência Luemba Chivango, gérante',
  email: 'contact@salacope.online',
  host: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
};

export const companyField = (value: string | null) => value ?? 'À compléter';
