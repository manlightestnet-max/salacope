import React from 'react';
import { BellRing, CalendarClock, Compass, Files, Globe, Percent, Tag } from 'lucide-react';
import { adminApi, useAdminResource } from '@/features/admin';
import { EmptyState, List, ListRow, Page, Panel, SkeletonRows } from '@/shared/ui';
import { percent } from '@/shared/config/platform';
import { formatXaf } from '@/shared/lib';
import { ROUTES } from '@/shared/config/routes';

const icon = (Icon: React.ElementType) => (
  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
);

/** The smallest price in a sentence: one amount, or one per kind of offer. */
const priceText = (s: { minPriceXaf: number; minPriceDigitalXaf: number | null; minPriceServiceXaf: number | null }) => {
  const digital = s.minPriceDigitalXaf ?? s.minPriceXaf;
  const service = s.minPriceServiceXaf ?? s.minPriceXaf;
  return digital === service ? `Prix minimum ${formatXaf(digital)}` : `Minimum ${formatXaf(digital)} produits numériques, ${formatXaf(service)} services`;
};

/** The rules the administration controls: each opens in its own screen. */
export const AdminSettingsPage: React.FC = () => {
  const { data: s, error } = useAdminResource(() => adminApi.settings(), []);
  const digital = s ? (s.feeRateDigital ?? s.feeRate) : 0;
  const service = s ? (s.feeRateService ?? s.feeRate) : 0;

  return (
    <Page title="Paramètres" width="narrow" help="Les règles de la plateforme. Un changement s’applique aux commandes passées ensuite : une commande déjà payée garde ses montants.">
      {error ? (
        <EmptyState title="Paramètres indisponibles" description={error} />
      ) : !s ? (
        <SkeletonRows rows={3} />
      ) : (
        <Panel flush>
          <List>
            <ListRow
              to={ROUTES.admin.settingsSection('commission')}
              leading={icon(Percent)}
              title="Commission"
              subtitle={digital === service ? `${percent(digital)} sur chaque vente` : `${percent(digital)} produits numériques · ${percent(service)} services`}
            />
            <ListRow
              to={ROUTES.admin.settingsSection('delais')}
              leading={icon(CalendarClock)}
              title="Délais de paiement du vendeur"
              subtitle={`${s.digitalHoldDays} jours produits numériques · ${s.serviceValidationDays} jours services`}
            />
            <ListRow
              to={ROUTES.admin.settingsSection('prix')}
              leading={icon(Tag)}
              title="Prix minimum et promotions"
              subtitle={`${priceText(s)} · promotions de ${s.promoMaxDays} jours au plus${s.freeOffers ? ' · offres gratuites autorisées' : ''}`}
            />
            <ListRow
              to={ROUTES.admin.settingsSection('fichiers')}
              leading={icon(Files)}
              title="Fichiers d’un produit"
              subtitle={`${s.maxProductFiles} fichier${s.maxProductFiles > 1 ? 's' : ''} au plus par produit numérique`}
            />
            <ListRow
              to={ROUTES.admin.settingsSection('explorer')}
              leading={icon(Compass)}
              title="Explorer"
              subtitle="Algorithme de classement et offres à la une"
            />
            <ListRow
              to={ROUTES.admin.settingsSection('messages')}
              leading={icon(BellRing)}
              title="Messages"
              subtitle="Notifications de l’app et push sur le téléphone"
            />
            <ListRow
              to={ROUTES.admin.settingsSection('identite')}
              leading={icon(Globe)}
              title="Identité du site"
              subtitle="Contact, description, image de partage et réseaux sociaux"
            />
          </List>
        </Panel>
      )}
    </Page>
  );
};
