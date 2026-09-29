import React, { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Camera, ImagePlus } from 'lucide-react';
import { Button, Field, Input, Segmented, Select } from '@/shared/ui';
import { shrinkImageFile } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';
import { KYC_DOCUMENTS, KYC_ID_TYPES, KycDocumentKind, KycIdType } from '@/shared/domain';
import { submitKyc } from '../api';

const PhotoPicker: React.FC<{
  label: string;
  hint: string;
  selfie?: boolean;
  value?: string;
  onChange: (dataUrl: string) => void;
  onError: (message: string) => void;
}> = ({ label, hint, selfie, value, onChange, onError }) => {
  const [busy, setBusy] = useState(false);
  const Icon = selfie ? Camera : ImagePlus;
  return (
    <label
      className={clsx(
        'relative flex flex-col items-center justify-center gap-1.5 aspect-[4/3] rounded-xl border border-dashed text-center cursor-pointer overflow-hidden',
        'border-gray-300 bg-gray-50 hover:bg-gray-100 focus-within:ring-2 focus-within:ring-accent'
      )}
    >
      {value ? (
        <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <>
          <Icon className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-800 px-2">{label}</span>
          <span className="text-xs text-gray-500 px-3">{busy ? 'Préparation…' : hint}</span>
        </>
      )}
      {value && <span className="absolute bottom-2 left-2 right-2 rounded-md bg-black/60 text-white text-xs py-1">{label} · changer</span>}
      <input
        type="file"
        accept="image/*"
        capture={selfie ? 'user' : 'environment'}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          try {
            onChange(await shrinkImageFile(file));
          } catch (err) {
            onError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
};

/** The seller's identity (AML/CFT policy §6.1): declared details, the document and a selfie with it. */
export const KycForm: React.FC<{ defaultName?: string; onDone?: () => void }> = ({ defaultName = '', onDone }) => {
  const [fullName, setFullName] = useState(defaultName);
  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('');
  const [idType, setIdType] = useState<KycIdType>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [idExpires, setIdExpires] = useState('');
  const [address, setAddress] = useState('');
  const [pep, setPep] = useState<'yes' | 'no' | ''>('');
  const [documents, setDocuments] = useState<Partial<Record<KycDocumentKind, string>>>({});
  const [certified, setCertified] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const missing = KYC_DOCUMENTS.find((d) => !documents[d.kind]);
    if (missing) return setError(`Ajoutez la photo : ${missing.label}.`);
    if (!certified) return setError('Cochez la case pour certifier vos informations.');
    setBusy(true);
    try {
      await submitKyc({
        fullName,
        birthDate,
        nationality,
        idType,
        idNumber,
        idExpires: idExpires || undefined,
        address,
        pep: pep === 'yes' ? true : pep === 'no' ? false : (undefined as unknown as boolean),
        documents: documents as Record<KycDocumentKind, string>,
      });
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nom complet" hint="Exactement comme sur la pièce d’identité." className="sm:col-span-2">
          {(id) => <Input id={id} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />}
        </Field>
        <Field label="Date de naissance">
          {(id) => <Input id={id} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} autoComplete="bday" />}
        </Field>
        <Field label="Nationalité">
          {(id) => <Input id={id} value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Congolaise" />}
        </Field>
        <Field label="Adresse de résidence" className="sm:col-span-2">
          {(id) => (
            <Input id={id} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rue, quartier, ville" autoComplete="street-address" />
          )}
        </Field>
        <Field label="Pièce d’identité">
          {(id) => <Select id={id} value={idType} options={KYC_ID_TYPES} onChange={setIdType} className="w-full" />}
        </Field>
        <Field label="Numéro de la pièce">
          {(id) => <Input id={id} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} autoComplete="off" />}
        </Field>
        <Field label="Date d’expiration" optional>
          {(id) => <Input id={id} type="date" value={idExpires} onChange={(e) => setIdExpires(e.target.value)} />}
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-800 mb-1.5">Photos</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {KYC_DOCUMENTS.map((d) => (
            <PhotoPicker
              key={d.kind}
              label={d.label}
              hint={d.hint}
              selfie={d.kind === 'selfie'}
              value={documents[d.kind]}
              onChange={(url) => setDocuments((prev) => ({ ...prev, [d.kind]: url }))}
              onError={setError}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-800 mb-1">Fonction publique</p>
        <p className="text-xs text-gray-500 mb-2">
          Exercez-vous (ou un membre proche de votre famille) une fonction publique importante : ministre, élu, haut
          fonctionnaire, magistrat, officier supérieur, dirigeant d’entreprise publique ?
        </p>
        <Segmented
          label="Fonction publique importante"
          value={pep}
          onChange={setPep}
          options={[
            { value: 'no', label: 'Non' },
            { value: 'yes', label: 'Oui' },
          ]}
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[rgb(var(--accent))]" />
        <span>
          Je certifie que ces informations sont exactes et j’accepte leur vérification, conformément à la{' '}
          <Link to={ROUTES.legal.aml} className="underline" target="_blank">
            politique de lutte contre le blanchiment
          </Link>{' '}
          de Salacope.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="primary" loading={busy}>
        Envoyer pour vérification
      </Button>
    </form>
  );
};
