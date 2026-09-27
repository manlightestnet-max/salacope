import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Listing } from '@/shared/db';
import { Button, Card, CardBody, CardHeader, Field, Input, Textarea } from '@/shared/ui';
import { formatXaf } from '@/shared/lib';
import { DEFAULT_PAYMENT_CHANNEL, PAYMENT_CHANNELS, PaymentChannel } from '@/shared/config/payment';
import { PLATFORM } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';
import { signIn, useSession } from '@/features/session';
import { ListingThumb } from '@/features/catalog';
import { findCouponRate, priceOrder } from '@/features/orders';
import { confirmPayment, startPayment } from '../api';
import { PaymentChannelPicker } from './PaymentChannelPicker';
import { PaymentDialog } from './PaymentDialog';

export interface CheckoutFormProps {
  listing: Listing;
  onPaid: (orderId: string) => void;
}

/**
 * Contact → brief (services) → payment → summary. Guests get an account from their e-mail
 * so they can follow the order and reach support. The order exists only once paid.
 */
export const CheckoutForm: React.FC<CheckoutFormProps> = ({ listing, onPaid }) => {
  const { user } = useSession();
  const location = useLocation();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [channel, setChannel] = useState<PaymentChannel>(DEFAULT_PAYMENT_CHANNEL);
  const [brief, setBrief] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string>();
  const [couponError, setCouponError] = useState<string>();
  const [showInvoice, setShowInvoice] = useState(false);
  const [company, setCompany] = useState({ companyName: '', taxId: '' });
  const [error, setError] = useState<string>();
  const [attemptId, setAttemptId] = useState<string>();
  const [buyer, setBuyer] = useState<{ name: string; email: string }>();
  const phoneRef = useRef<HTMLInputElement>(null);

  const amounts = priceOrder(listing.priceXaf, appliedCoupon);
  const questions = listing.briefQuestions ?? [];

  const applyCoupon = () => {
    if (findCouponRate(coupon) === undefined) {
      setCouponError('Code invalide ou expiré.');
      setAppliedCoupon(undefined);
    } else {
      setCouponError(undefined);
      setAppliedCoupon(coupon.trim().toUpperCase());
    }
  };

  /** Sends the request to the phone; a new code is issued for every try. */
  const requestPayment = () => {
    setError(undefined);
    try {
      const account = user ?? signIn({ email, name, phone });
      setBuyer({ name: account.name, email: account.email });
      const attempt = startPayment({
        listingId: listing.id,
        buyerId: account.id,
        channel,
        phone,
        couponCode: appliedCoupon,
        brief,
      });
      setAttemptId(attempt.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const operatorConfirms = () => {
    if (!attemptId || !buyer) return;
    try {
      const order = confirmPayment(attemptId, {
        buyer: { ...buyer, phone: phone.trim() },
        couponCode: appliedCoupon,
        invoice: showInvoice ? company : undefined,
        brief,
      });
      onPaid(order.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        requestPayment();
      }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start"
    >
      <div className="space-y-4 min-w-0">
        <Card>
          <CardHeader
            title="Vos coordonnées"
            description={user ? undefined : 'Un compte est créé avec cet e-mail pour suivre votre commande.'}
          />
          <CardBody className="space-y-4">
            {user ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{user.name}</div>
                  <div className="text-gray-500 truncate">{user.email}</div>
                </div>
                <Link to={`${ROUTES.signIn}?next=${encodeURIComponent(location.pathname)}`} className="shrink-0 text-gray-500 hover:text-gray-900">
                  Changer de compte
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom complet">
                  {(id) => <Input id={id} required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
                </Field>
                <Field label="E-mail">
                  {(id) => (
                    <Input id={id} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  )}
                </Field>
              </div>
            )}

            {showInvoice ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Raison sociale">
                  {(id) => (
                    <Input id={id} required value={company.companyName} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} />
                  )}
                </Field>
                <Field label="NIU">
                  {(id) => <Input id={id} required value={company.taxId} onChange={(e) => setCompany({ ...company, taxId: e.target.value })} />}
                </Field>
              </div>
            ) : (
              <button type="button" onClick={() => setShowInvoice(true)} className="text-sm text-gray-500 hover:text-gray-900">
                + Reçu au nom d'une entreprise
              </button>
            )}
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

        <Card>
          <CardHeader title="Paiement" />
          <CardBody className="space-y-4">
            <PaymentChannelPicker value={channel} onChange={setChannel} />
            <Field label={`Numéro ${PAYMENT_CHANNELS[channel].label} à débiter`} hint="Vous validerez le paiement sur ce téléphone.">
              {(id) => (
                <Input
                  ref={phoneRef}
                  id={id}
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder={`${PLATFORM.phonePrefix} 06 000 00 00`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
            </Field>
          </CardBody>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-6">
        <CardBody className="pt-5 space-y-4">
          <div className="flex gap-3">
            <ListingThumb src={listing.coverImage} category={listing.category} size="md" />
            <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{listing.title}</p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Code promo"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              aria-label="Code promo"
              className="uppercase"
            />
            <Button onClick={applyCoupon} disabled={!coupon.trim()}>
              Appliquer
            </Button>
          </div>
          {couponError && <p className="-mt-2 text-xs text-red-600">{couponError}</p>}

          <dl className="space-y-2 text-sm border-t border-gray-100 pt-4">
            <div className="flex justify-between text-gray-600">
              <dt>Prix</dt>
              <dd className="tabular-nums">{formatXaf(amounts.subtotal)}</dd>
            </div>
            {amounts.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Remise {appliedCoupon}</dt>
                <dd className="tabular-nums">−{formatXaf(amounts.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-1">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatXaf(amounts.total)}</dd>
            </div>
          </dl>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" variant="primary" size="lg" block icon={<Lock className="w-4 h-4" />}>
            Payer {formatXaf(amounts.total)}
          </Button>
          <p className="text-xs text-gray-500">
            Le vendeur n'est payé qu'après votre validation, ou {PLATFORM.escrowDays} jours après la livraison. En payant, vous
            acceptez les{' '}
            <Link to={ROUTES.legal.terms} className="underline">
              conditions générales
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      <PaymentDialog
        attemptId={attemptId}
        onOperatorConfirm={operatorConfirms}
        onRetry={requestPayment}
        onChangeNumber={() => {
          setAttemptId(undefined);
          window.setTimeout(() => phoneRef.current?.focus(), 0);
        }}
        onClose={() => setAttemptId(undefined)}
      />
    </form>
  );
};
