import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdminSettings, adminApi, useAdminResource } from '@/features/admin';
import { Button, EmptyState, Field, Input, Page, Panel, SkeletonRows, useToast } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { percent } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';

const TITLES: Record<string, string> = { commission: 'Commission', delais: 'Délais de paiement du vendeur', prix: 'Prix minimum et promotions' };

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
  const [amount, setAmount] = useState('10000');
  // Both kinds have their own rate: the general rate would never be used, so it is switched off.
  const generalOff = digital.trim() !== '' && service.trim() !== '';
  const rate = (own: string) => fromPercent(own) ?? fromPercent(general) ?? 0;
  const base = Math.max(0, Number(amount.replace(/\s/g, '')) || 0);
  const lines = [
    { label: 'Produit numérique', own: digital },
    { label: 'Service', own: service },
  ].map((l) => {
    const r = rate(l.own);
    const fee = Math.round(base * r);
    return { ...l, r, fee, net: base - fee };
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ ...s, feeRate: fromPercent(general) ?? fromPercent(digital) ?? NaN, feeRateDigital: fromPercent(digital), feeRateService: fromPercent(service) });
      }}
    >
      <Panel title="Commission" description="Part retenue sur chaque vente, déduite du vendeur. 0 pendant un lancement.">
        <div className="space-y-4">
          <Field label="Taux général (%)" hint={generalOff ? 'Inactif : les produits numériques et les services ont chacun leur taux, il n’est plus compté.' : 'S’applique quand un type d’offre n’a pas son propre taux.'}>
            {(id) => <Input id={id} inputMode="decimal" value={general} disabled={generalOff} onChange={(e) => setGeneral(e.target.value)} placeholder="10" className={generalOff ? 'opacity-50' : undefined} />}
          </Field>
          <Field label="Produits numériques (%)" optional hint="Laisse vide pour appliquer le taux général.">
            {(id) => <Input id={id} inputMode="decimal" value={digital} onChange={(e) => setDigital(e.target.value)} placeholder={general} />}
          </Field>
          <Field label="Services (%)" optional hint="Laisse vide pour appliquer le taux général.">
            {(id) => <Input id={id} inputMode="decimal" value={service} onChange={(e) => setService(e.target.value)} placeholder={general} />}
          </Field>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-900">Simulation</p>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              Prix de vente
              <Input aria-label="Prix de vente simulé" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 h-8 text-right" />
              FCFA
            </label>
          </div>
          <dl className="mt-3 divide-y divide-gray-200 text-sm">
            {lines.map((l) => (
              <div key={l.label} className="py-2 flex flex-wrap items-baseline justify-between gap-x-4">
                <dt className="text-gray-700">
                  {l.label} <span className="text-gray-500">· {percent(l.r)}</span>
                </dt>
                <dd className="text-gray-900 tabular-nums">
                  Commission {formatXaf(l.fee)} · vendeur reçoit <span className="font-medium">{formatXaf(l.net)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
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
          <Field label="Produit numérique (jours)" hint="Compté depuis l’achat. L’acheteur ne confirme jamais : l’argent est versé à la fin de ce délai, sauf litige (il reste alors bloqué jusqu’à votre décision).">
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

/** Whole FCFA typed as such; an empty field means "the general one". */
const fromAmount = (v: string) => (v.trim() === '' ? null : Number(v.replace(/\s/g, '')));

const PricesForm: React.FC<{ s: AdminSettings }> = ({ s }) => {
  const { busy, error, save } = useSaveSettings();
  const [general, setGeneral] = useState(String(s.minPriceXaf));
  const [digital, setDigital] = useState(s.minPriceDigitalXaf === null ? '' : String(s.minPriceDigitalXaf));
  const [service, setService] = useState(s.minPriceServiceXaf === null ? '' : String(s.minPriceServiceXaf));
  const [promoDays, setPromoDays] = useState(String(s.promoMaxDays));
  const [freeOffers, setFreeOffers] = useState(s.freeOffers);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ ...s, minPriceXaf: fromAmount(general) ?? NaN, minPriceDigitalXaf: fromAmount(digital), minPriceServiceXaf: fromAmount(service), promoMaxDays: Number(promoDays), freeOffers });
      }}
      className="space-y-4"
    >
      <Panel
        title="Prix minimum d’une vente"
        description="Le plus petit prix qu’un vendeur peut fixer. Il s’applique aux offres créées ou modifiées ensuite : une offre déjà en ligne garde son prix. Ne descendez pas sous le dépôt minimum réglé dans l’administration de LightPay : en dessous, le paiement serait refusé."
      >
        <div className="space-y-4">
          <Field label="Prix minimum général (FCFA)" hint="S’applique quand un type d’offre n’a pas le sien.">
            {(id) => <Input id={id} inputMode="numeric" value={general} onChange={(e) => setGeneral(e.target.value)} />}
          </Field>
          <Field label="Produit numérique (FCFA)" optional hint="Vide : le prix minimum général.">
            {(id) => <Input id={id} inputMode="numeric" value={digital} onChange={(e) => setDigital(e.target.value)} />}
          </Field>
          <Field label="Service (FCFA)" optional hint="Vide : le prix minimum général.">
            {(id) => <Input id={id} inputMode="numeric" value={service} onChange={(e) => setService(e.target.value)} />}
          </Field>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={freeOffers} onChange={(e) => setFreeOffers(e.target.checked)} className="mt-1 w-4 h-4 accent-[rgb(var(--accent))]" />
            <span>
              <span className="block text-sm font-medium text-gray-900">Autoriser les offres gratuites</span>
              <span className="block text-xs text-gray-500">Le vendeur peut mettre un prix de 0, ou une promotion gratuite avec compte à rebours. Les offres gratuites déjà en ligne restent ; aucun argent ne circule, donc aucune commission.</span>
            </span>
          </label>
        </div>
      </Panel>
      <Panel title="Promotions avec compte à rebours" description="Le vendeur choisit une date de fin : une horloge s’affiche en haut de l’offre, et à la fin le prix repasse à l’ancien prix.">
        <Field label="Durée maximale (jours)" hint="Aucune promotion ne peut durer plus longtemps.">
          {(id) => <Input id={id} inputMode="numeric" value={promoDays} onChange={(e) => setPromoDays(e.target.value)} />}
        </Field>
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
      {error ? <EmptyState title="Paramètres indisponibles" description={error} /> : !data ? <SkeletonRows rows={3} /> : section === 'commission' ? <CommissionForm s={data} /> : section === 'prix' ? <PricesForm s={data} /> : <DelaysForm s={data} />}
    </Page>
  );
};
