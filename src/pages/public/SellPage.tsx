import React from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Card, Container } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { PLATFORM } from '@/shared/config/platform';
import { useSession } from '@/features/session';

const STEPS = [
  { title: 'Ouvrez votre boutique', text: 'Nom, ville et numéro Mobile Money de versement.' },
  { title: 'Publiez vos offres', text: 'Fichiers livrés automatiquement, ou services livrés dans un délai fixé.' },
  {
    title: 'Encaissez',
    text: `Chaque vente est payée dès que le client valide, ou ${PLATFORM.escrowDays} jours après la livraison. Retrait sur MTN MoMo ou Airtel Money.`,
  },
];

/** Public pitch for sellers. Signed-in users open their store inside the back-office. */
export const SellPage: React.FC = () => {
  const { user, isMerchant } = useSession();

  if (isMerchant) return <Navigate to={ROUTES.seller.root} replace />;
  if (user) return <Navigate to={ROUTES.account.openStore} replace />;

  return (
    <Container size="lg" className="py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Vendez vos formations et services au Congo</h1>
        <p className="mt-3 text-gray-600">
          Sans abonnement.{' '}
          {PLATFORM.feeRate > 0 ? `Commission de ${PLATFORM.feeRate * 100} % par vente.` : 'Aucune commission pendant le lancement.'}
        </p>
        <ol className="mt-8 space-y-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-gray-900 text-gray-50 text-sm font-medium flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-medium text-gray-900">{step.title}</div>
                <div className="text-sm text-gray-500 mt-0.5">{step.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Card className="p-6 self-start text-center">
        <h2 className="text-base font-semibold text-gray-900">Commencez par vous connecter</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Votre boutique est rattachée à votre compte Salacope.</p>
        <Button to={`${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.account.openStore)}`} variant="primary">
          Se connecter ou créer un compte
        </Button>
      </Card>
    </Container>
  );
};
