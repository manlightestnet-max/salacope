import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { auth } from '@/shared/api';
import { Listing } from '@/shared/db';
import { Button, Card, CardBody, CardHeader, Field, Handoff, Input, Textarea } from '@/shared/ui';
import { atLeast, formatXaf, getTheme } from '@/shared/lib';
import { releaseDays } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';
import { CONTACT_BLOCKED, containsContact, priceOrder } from '@/shared/domain';
import { SignInForm, useSession } from '@/features/session';
import { ListingThumb } from '@/features/catalog';
import { startCheckout } from '../api';
import { loadLightPay, warmLightPay } from '../lightpay';

export interface CheckoutFormProps {
  listing: Listing;
}

/**
 * Brief (services) → LightPay, with or without an account (a visitor buys as a guest). The buyer pays on LightPay's page (MTN MoMo,
 * Airtel Money or LightPay wallet) and comes back here; the seller is paid only after validation.
 */
export const CheckoutForm: React.FC<CheckoutFormProps> = ({ listing }) => {
  const { user } = useSession();
  // A guest (bought here before without an account) is not shown as an account.
  const member = user && !user.guest ? user : null;
  const [showSignIn, setShowSignIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Record<string, string>>({});
  const [showInvoice, setShowInvoice] = useState(false);
  const [company, setCompany] = useState({ companyName: '', taxId: '' });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(warmLightPay, []);

  const amounts = priceOrder(listing.priceXaf);
  const questions = listing.briefQuestions ?? [];

  const pay = async () => {
    if (busy) return;
    setError(undefined);
    if (Object.values(brief).some(containsContact)) {
      setError(CONTACT_BLOCKED);
      return;
    }
    setBusy(true);
    try {
      const { checkoutUrl, attemptId } = await atLeast(startCheckout({ listingId: listing.id, brief, invoice: showInvoice ? company : undefined }), 400);
      let lightpay;
      try {
        lightpay = await loadLightPay(checkoutUrl);
      } catch {
        window.location.assign(checkoutUrl);
        return;
      }
      // LightPay's dialog over the page; the result is confirmed server-side on the return page.
      setBusy(false);
      const idToken = await auth.idToken().catch(() => null);
      const theme = getTheme();
      const result = await lightpay.pay(checkoutUrl, idToken ? { idToken, theme } : { theme });
      if (result.status === 'completed') navigate(`${ROUTES.paymentReturn}?tentative=${encodeURIComponent(attemptId)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void pay();
      }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start"
    >
      <div className="space-y-4 min-w-0">
        <Card>
          {member ? (
            <CardHeader title="Votre compte" />
          ) : (
            <CardHeader title="Sans compte" description="Payez directement par mobile money. Votre commande et le chat restent sur cet appareil." />
          )}
          <CardBody className="space-y-4">
            {member ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{member.name}</div>
                  <div className="text-gray-500 truncate">{member.email}</div>
                </div>
                <Link to={`${ROUTES.signIn}?next=${encodeURIComponent(location.pathname)}`} className="shrink-0 text-gray-500 hover:text-gray-900">
                  Changer de compte
                </Link>
              </div>
            ) : showSignIn ? (
              <SignInForm onSignedIn={() => setShowSignIn(false)} />
            ) : (
              <button type="button" onClick={() => setShowSignIn(true)} className="text-sm text-gray-500 hover:text-gray-900">
                Vous avez un compte ? <span className="font-medium text-gray-900">Se connecter</span>
              </button>
            )}
            {!showSignIn &&
              (showInvoice ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Raison sociale">
                    {(id) => <Input id={id} required value={company.companyName} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} />}
                  </Field>
                  <Field label="NIU">
                    {(id) => <Input id={id} required value={company.taxId} onChange={(e) => setCompany({ ...company, taxId: e.target.value })} />}
                  </Field>
                </div>
              ) : (
                <button type="button" onClick={() => setShowInvoice(true)} className="block text-sm text-gray-500 hover:text-gray-900">
                  + Reçu au nom d'une entreprise
                </button>
              ))}
          </CardBody>
        </Card>

        {questions.length > 0 && (
          <Card>
            <CardHeader title="Brief pour le vendeur" description="Ce dont il a besoin pour démarrer, sans aller-retour." />
            <CardBody className="space-y-4">
              {questions.map((q) => (
                <Field key={q.id} label={q.label} optional={!q.required}>
                  {(id) => (
                    <Textarea
                      id={id}
                      rows={2}
                      required={q.required}
                      value={brief[q.id] ?? ''}
                      onChange={(e) => setBrief((b) => ({ ...b, [q.id]: e.target.value }))}
                    />
                  )}
                </Field>
              ))}
            </CardBody>
          </Card>
        )}
      </div>

      <Card className="lg:sticky lg:top-6">
        <CardBody className="pt-5 space-y-4">
          <div className="flex gap-3">
            <ListingThumb src={listing.coverImage} category={listing.category} size="md" />
            <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{listing.title}</p>
          </div>

          <dl className="space-y-2 text-sm border-t border-gray-100 pt-4">
            <div className="flex justify-between text-gray-600">
              <dt>Prix</dt>
              <dd className="tabular-nums">{formatXaf(amounts.subtotal)}</dd>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-1">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatXaf(amounts.total)}</dd>
            </div>
            <p className="text-xs text-gray-500">Les frais de l’opérateur, s’il y en a, sont affichés sur la page de paiement avant validation.</p>
          </dl>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" block disabled={busy || showSignIn} icon={<Lock className="w-4 h-4" />}>
            Payer {formatXaf(amounts.total)}
          </Button>
          <div className="flex gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 shrink-0 text-gray-400" />
            <p>
              Paiement par MTN MoMo ou Airtel Money, sans compte LightPay (le wallet LightPay reste possible). Le vendeur n'est payé qu'après votre validation, ou{' '}
              {releaseDays(listing.kind)} jours après la livraison. En payant, vous acceptez les{' '}
              <Link to={ROUTES.legal.terms} className="underline">
                conditions générales
              </Link>
              .
            </p>
          </div>
        </CardBody>
      </Card>

      {busy && (
        <Handoff
          overlay
          from="salacope"
          to="lightpay"
          title="Paiement avec LightPay"
          description={`${formatXaf(amounts.total)} par MTN MoMo, Airtel Money ou wallet LightPay. Vous revenez ici juste après.`}
        />
      )}
    </form>
  );
};
