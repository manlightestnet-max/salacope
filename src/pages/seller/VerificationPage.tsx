import React from 'react';
import { BadgeCheck, Clock } from 'lucide-react';
import { Button, EmptyState, Page, Panel } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { useCurrentUser } from '@/features/session';
import { KycForm, VerificationNotice } from '@/features/verification';

/** The seller's identity check: required before any offer goes online (AML/CFT policy). */
export const VerificationPage: React.FC = () => {
  const user = useCurrentUser();
  const merchant = user.merchant!;
  const status = merchant.kycStatus ?? 'none';

  return (
    <Page
      title="Vérification d’identité"
      help="Salacope vérifie l’identité de chaque vendeur avant la mise en ligne de ses offres, comme l’exige la lutte contre le blanchiment. Vos documents ne sont vus que par l’équipe de conformité."
      width="narrow"
    >
      <div className="space-y-6">
        {status === 'approved' ? (
          <Panel>
            <EmptyState
              icon={BadgeCheck}
              title="Identité vérifiée"
              description="Vos offres peuvent être publiées."
              action={<Button to={ROUTES.seller.listings}>Mes offres</Button>}
            />
          </Panel>
        ) : status === 'pending' ? (
          <Panel>
            <EmptyState
              icon={Clock}
              title="Documents reçus"
              description="Nous vérifions votre identité, en général sous 48 h ouvrées. Vous serez prévenu ici dès qu’elle sera validée."
            />
          </Panel>
        ) : (
          <>
            {status === 'rejected' && <VerificationNotice merchant={merchant} />}
            <Panel title="Vos informations" description="Une pièce d’identité valide, recto et verso, et un selfie en la tenant.">
              <KycForm defaultName={user.name} />
            </Panel>
          </>
        )}
      </div>
    </Page>
  );
};
