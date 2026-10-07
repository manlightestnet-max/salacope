import React, { useState } from 'react';
import { Button, Card, CardBody, CardFooter, CardHeader, Field, Input, Page, useToast } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { GuestPrompt, LightPayConnect, MerchantForm, StoreHandleField, StoreLogoField, updateMerchant, updateProfile, useCurrentUser, useSession } from '@/features/session';

const ProfileCard: React.FC = () => {
  const user = useCurrentUser();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const run = useServiceAction();

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => updateProfile({ name, phone }), 'Profil enregistré');
        }}
      >
        <CardHeader title="Profil" />
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom">{(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Téléphone" hint="Jamais montré aux vendeurs.">
            {(id) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          <Field label="E-mail" hint="Identifiant de connexion (Salacope et LightPay), non modifiable." className="sm:col-span-2">
            {(id) => <Input id={id} value={user.email} disabled />}
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

const StoreCard: React.FC = () => {
  const user = useCurrentUser();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (!user.merchant) return null;

  return (
    <>
      <Card>
        <CardHeader title="Boutique" />
        <CardBody className="space-y-5">
          <StoreLogoField />
          <StoreHandleField />
          <MerchantForm
            initial={user.merchant}
            submitLabel="Enregistrer la boutique"
            error={error}
            busy={busy}
            onSubmit={async (input) => {
              setBusy(true);
              try {
                await updateMerchant(input);
                setError(undefined);
                toast.success('Boutique enregistrée');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Versements" />
        <CardBody>
          <LightPayConnect />
        </CardBody>
      </Card>
    </>
  );
};

export const SettingsPage: React.FC = () => {
  const { isGuest } = useSession();
  return (
    <Page title="Paramètres" width="narrow">
      {isGuest ? (
        <GuestPrompt title="Achats sans compte" />
      ) : (
        <div className="space-y-6">
          <ProfileCard />
          <StoreCard />
        </div>
      )}
    </Page>
  );
};
