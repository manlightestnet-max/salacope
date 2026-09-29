import React from 'react';
import { Link } from 'react-router-dom';
import { Callout } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import type { Merchant } from '@/shared/db';

/**
 * Why the store's offers are not online yet (identity check) or no longer (suspension).
 * Nothing is shown once the store is verified and active.
 */
export const VerificationNotice: React.FC<{ merchant: Merchant; className?: string }> = ({ merchant, className }) => {
  if (merchant.suspended) {
    return (
      <Callout tone="warning" title="Boutique suspendue" className={className}>
        {merchant.suspended.reason} Vos offres ne sont plus visibles. Pour en parler :{' '}
        <Link to={ROUTES.account.newTicket} className="underline">
          écrire au support
        </Link>
        .
      </Callout>
    );
  }
  switch (merchant.kycStatus) {
    case 'approved':
    case undefined:
      return null;
    case 'pending':
      return (
        <Callout title="Identité en cours de vérification" className={className}>
          Vous pourrez publier vos offres dès qu’elle sera validée, en général sous 48 h ouvrées.
        </Callout>
      );
    case 'rejected':
      return (
        <Callout tone="warning" title="Vérification refusée" className={className}>
          {merchant.kycNote} <Link to={ROUTES.seller.verification} className="underline">Envoyer de nouveaux documents</Link>
        </Callout>
      );
    default:
      return (
        <Callout tone="warning" title="Vérifiez votre identité pour vendre" className={className}>
          Salacope vérifie chaque vendeur avant la mise en ligne de ses offres.{' '}
          <Link to={ROUTES.seller.verification} className="underline">
            Vérifier mon identité
          </Link>
        </Callout>
      );
  }
};
