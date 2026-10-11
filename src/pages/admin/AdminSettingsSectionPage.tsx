import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdminSettings, adminApi, useAdminResource } from '@/features/admin';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';

const TITLES: Record<string, string> = { commission: 'Commission', delais: 'Délais de paiement du vendeur' };

/** Percentages are typed as such (10 for 10 %) and stored as fractions. */
const toPercent = (r: number | null) => (r === null ? '' : String(Math.round(r * 1000) / 10));
const fromPercent = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')) / 100);

const SaveBar: React.FC<{ error?: string; busy: boolean }> = ({ error, busy }) => (
  <>
    {error && (
      <p className="mt-4 text-sm text-red-600" role="alert">
        {error}
      </p>
    )}
    <div className="mt-5 flex justify-end">
      <Button type="submit" variant="primary" loading={busy}>
        Enregistrer
      </Button>
    </div>
  </>
);

const useSaveSettings = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const save = async (input: AdminSettings) => {
    setBusy(true);
    setError(undefined);
    try {
      await adminApi.saveSettings(input);
      toast.success('Paramètres enregistrés');
      navigate(ROUTES.admin.settings, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return { busy, error, save };
};

const CommissionForm: React.FC<{ s: AdminSettings }> = ({ s }) => {
  const { busy, error, save } = useSaveSettings();
  const [general, setGeneral] = useState(toPercent(s.feeRate));
  const [digital, setDigital] = useState(toPercent(s.feeRateDigital));
  const [service, setService] = useState(toPercent(s.feeRateService));
  const example = 10_000;
  const rate = (own: string) => (fromPercent(own) ?? fromPercent(general) ?? 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ ...s, feeRate: fromPercent(general) ?? NaN, feeRateDigital: fromPercent(digital), feeRateService: fromPercent(service) });
      }}
    >
      <Panel title="Commission" description="Part retenue sur chaque vente, déduite du vendeur. 0 pendant un lancement.">
        <div className="space-y-4">
          <Field label="Taux général (%)" hint="S’applique quand un type d’offre n’a pas son propre taux.">
            {(id) => <Input id={id} inputMode="decimal" value={general} onChange={(e) => setGeneral(e.target.value)} placeholder="10" />}
          </Field>
          <Field label="Produits numériques (%)" optional hint="Laisse vide pour appliquer le taux général.">
            {(id) => <Input id={id} inputMode="decimal" value={digital} onChange={(e) => setDigital(e.target.value)} placeholder={general} />}
          </Field>
          <Field label="Services (%)" optional hint="Laisse vide pour appliquer le taux général.">
            {(id) => <Input id={id} inputMode="decimal" value={service} onChange={(e) => setService(e.target.value)} placeholder={general} />}
          </Field>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Pour une vente de {formatXaf(example)} : le vendeur reçoit {formatXaf(Math.round(example * (1 - rate(digital))))} sur un produit numérique et{' '}
          {formatXaf(Math.round(example * (1 - rate(service))))} sur un service.
        </p>
        <SaveBar error={error} busy={busy} />
      </Panel>
    </form>
  );
};

const DelaysForm: React.FC<{ s: AdminSettings }> = ({ s }) => {
  const { busy, error, save } = useSaveSettings();
  const [digital, setDigital] = useState(String(s.digitalHoldDays));
  const [service, setService] = useState(String(s.serviceValidationDays));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ ...s, digitalHoldDays: Number(digital), serviceValidationDays: Number(service) });
      }}
    >
      <Panel title="Délais de paiement" description="Combien de temps l’argent reste bloqué avant d’être versé au vendeur si l’acheteur ne signale rien. C’est aussi le temps dont l’acheteur dispose pour ouvrir un litige.">
        <div className="space-y-4">
          <Field label="Produit numérique (jours)" hint="Compté depuis l’achat.">
            {(id) => <Input id={id} inputMode="numeric" value={digital} onChange={(e) => setDigital(e.target.value)} />}
          </Field>
          <Field label="Service (jours)" hint="Compté depuis la livraison.">
            {(id) => <Input id={id} inputMode="numeric" value={service} onChange={(e) => setService(e.target.value)} />}
          </Field>
        </div>
        <SaveBar error={error} busy={busy} />
      </Panel>
    </form>
  );
};

/** `/admin/parametres/:section` */
export const AdminSettingsSectionPage: React.FC = () => {
  const { section = '' } = useParams<{ section: string }>();
  const { data, error } = useAdminResource(() => adminApi.settings(), []);
  if (!(section in TITLES)) return <Navigate to={ROUTES.admin.settings} replace />;
  return (
    <Page title={TITLES[section]} width="narrow" back={{ to: ROUTES.admin.settings, label: 'Paramètres' }}>
      {error ? <EmptyState title="Paramètres indisponibles" description={error} /> : !data ? <SkeletonRows rows={3} /> : section === 'commission' ? <CommissionForm s={data} /> : <DelaysForm s={data} />}
    </Page>
  );
};
