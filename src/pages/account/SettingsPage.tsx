import React, { useState } from 'react';
import { Button, Card, CardBody, CardFooter, CardHeader, Field, Input, Page, useToast } from '@/shared/ui';
import { db } from '@/shared/db';
import { useServiceAction } from '@/shared/hooks';
import { MerchantForm, updateMerchant, updateProfile, useCurrentUser } from '@/features/session';

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
          run(() => updateProfile(user.id, { name, phone }), 'Profil enregistré');
        }}
      >
        <CardHeader title="Profil" />
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom">{(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Téléphone">{(id) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
          <Field label="E-mail" hint="Identifiant de connexion, non modifiable." className="sm:col-span-2">
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
  if (!user.merchant) return null;

  return (
    <Card>
      <CardHeader title="Boutique" />
      <CardBody>
        <MerchantForm
          initial={user.merchant}
          submitLabel="Enregistrer la boutique"
          error={error}
          onSubmit={(input) => {
            try {
              updateMerchant(user.id, input);
              setError(undefined);
              toast.success('Boutique enregistrée');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </CardBody>
    </Card>
  );
};

const DemoDataCard: React.FC = () => {
  const toast = useToast();
  return (
    <Card>
      <CardHeader
        title="Données de démonstration"
        description="Stockées dans ce navigateur. Réinitialiser restaure le jeu de démo et vous déconnecte."
        action={
          <Button
            variant="danger"
            onClick={() => {
              db.reset();
              toast.success('Données réinitialisées');
            }}
          >
            Réinitialiser
          </Button>
        }
      />
    </Card>
  );
};

export const SettingsPage: React.FC = () => (
  <Page title="Paramètres" width="narrow">
    <div className="space-y-6">
      <ProfileCard />
      <StoreCard />
      <DemoDataCard />
    </div>
  </Page>
);
