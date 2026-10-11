import React from 'react';
import { Page } from '@/shared/ui';
import { LockdownControl } from '@/features/admin';

/** The emergency brake: stop payments, freeze the database, or stop everything. */
export const AdminSecurityPage: React.FC = () => (
  <Page title="Sécurité" width="narrow" help="Le verrou d’urgence pour un problème ou une attaque : suspendre les paiements, passer en lecture seule, ou tout arrêter. Chaque changement est inscrit au journal.">
    <LockdownControl />
  </Page>
);
