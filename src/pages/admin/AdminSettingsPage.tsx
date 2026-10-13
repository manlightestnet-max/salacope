import React from 'react';
import { BellRing, CalendarClock, Compass, Globe, Percent } from 'lucide-react';
import { adminApi, useAdminResource } from '@/features/admin';
import { EmptyState, List, ListRow, Page, Panel, SkeletonRows } from '@/shared/ui';
import { percent } from '@/shared/config/platform';
import { ROUTES } from '@/shared/config/routes';

const icon = (Icon: React.ElementType) => (
  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
);

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
