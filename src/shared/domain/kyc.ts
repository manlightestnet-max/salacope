import { DomainError } from './errors.js';

/** Seller identity check (AML/CFT policy §6): what is asked, and the rules both sides apply. */

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type KycIdType = 'national_id' | 'passport';
export type KycDocumentKind = 'front' | 'back' | 'selfie';
export type RiskLevel = 'low' | 'medium' | 'high';

export const KYC_ID_TYPES: readonly { value: KycIdType; label: string }[] = [
  { value: 'national_id', label: 'Carte nationale d’identité' },
  { value: 'passport', label: 'Passeport' },
];

export const KYC_DOCUMENTS: readonly { kind: KycDocumentKind; label: string; hint: string }[] = [
  { kind: 'front', label: 'Pièce d’identité (recto)', hint: 'Toute la pièce, lisible, sans reflet.' },
  { kind: 'back', label: 'Pièce d’identité (verso)', hint: 'Pour un passeport : la page avec votre photo.' },
  { kind: 'selfie', label: 'Selfie avec la pièce', hint: 'Votre visage et la pièce tenue à côté, bien visibles.' },
];

export const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  none: 'À vérifier',
  pending: 'En cours d’examen',
  approved: 'Vérifié',
  rejected: 'Refusé',
};

export const RISK_LABEL: Record<RiskLevel, string> = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };

/** Largest document accepted, once decoded (the app compresses photos well below this). */
export const KYC_MAX_BYTES = 1_000_000;
export const KYC_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface KycInput {
  fullName: string;
  birthDate: string;
  nationality: string;
  idType: KycIdType;
  idNumber: string;
  idExpires?: string;
  address: string;
  pep: boolean;
  /** Each document as a data URL (`data:image/jpeg;base64,…`). */
  documents: Record<KycDocumentKind, string>;
}

const clean = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Checks and normalises a submission; `today` as YYYY-MM-DD. */
export function validateKyc(raw: any, today: string): Omit<KycInput, 'documents'> {
  const fullName = clean(raw?.fullName, 120);
  if (fullName.split(' ').length < 2) throw new DomainError('Indiquez votre nom complet, comme sur la pièce d’identité.');
  const birthDate = clean(raw?.birthDate, 10);
  if (!isDay(birthDate)) throw new DomainError('Date de naissance invalide.');
  const [y, m, d] = today.split('-').map(Number);
  const adult = `${y - 18}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (birthDate > adult) throw new DomainError('Il faut avoir 18 ans pour vendre sur Salacope.');
  const nationality = clean(raw?.nationality, 60);
  if (!nationality) throw new DomainError('Indiquez votre nationalité.');
  const idType: KycIdType = raw?.idType === 'passport' ? 'passport' : 'national_id';
  const idNumber = clean(raw?.idNumber, 40);
  if (idNumber.length < 4) throw new DomainError('Numéro de la pièce d’identité invalide.');
  const idExpires = clean(raw?.idExpires, 10) || undefined;
  if (idExpires && (!isDay(idExpires) || idExpires <= today)) throw new DomainError('Cette pièce d’identité est expirée.');
  const address = clean(raw?.address, 200);
  if (address.length < 6) throw new DomainError('Indiquez votre adresse.');
  if (typeof raw?.pep !== 'boolean') throw new DomainError('Répondez à la question sur les fonctions publiques.');
  return { fullName, birthDate, nationality, idType, idNumber, idExpires, address, pep: raw.pep };
}
