import React from 'react';
import { AtSign, Facebook, FileText, Globe, Image as ImageIcon, Instagram, Linkedin, Mail, MessageCircle, Send, Twitter, Youtube } from 'lucide-react';
import { Badge, EmptyState, List, ListRow, Page, Panel, SkeletonRows, Tabs } from '@/shared/ui';
import { useRememberedParam } from '@/shared/hooks';
import { SOCIALS, SiteIdentity, SocialKey } from '@/shared/config/identity';
import { ROUTES } from '@/shared/config/routes';
import { adminApi, useAdminResource } from '@/features/admin';

type View = 'general' | 'reseaux';

const SOCIAL_ICON: Record<SocialKey, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: AtSign,
  youtube: Youtube,
  x: Twitter,
  linkedin: Linkedin,
  telegram: Send,
  whatsapp: MessageCircle,
};

const icon = (Icon: React.ElementType) => (
  <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
);

const Status: React.FC<{ done: boolean }> = ({ done }) =>
  done ? (
    <Badge tone="success" dot>
      Configuré
    </Badge>
  ) : (
    <Badge>Non renseigné</Badge>
  );

const field = (name: string) => `${ROUTES.admin.settings}/identite/${name}`;

/**
 * `/admin/parametres/identite`: what the site says about itself, as a list of items marked "Configuré": each opens its own
 * screen. The footer, the previews of shared links, the home page's structured data and llms.txt are written from these values.
 */
export const AdminIdentityPage: React.FC = () => {
  const { data: id, error } = useAdminResource(() => adminApi.identity(), []);
  const [view, setView] = useRememberedParam<View>('admin.identity', 'vue', ['general', 'reseaux'], 'general');
  const filled = id ? SOCIALS.filter((s) => id.socials[s.key]).length : 0;

  return (
    <Page
      title="Identité du site"
      width="narrow"
      back={{ to: ROUTES.admin.settings, label: 'Paramètres' }}
      help="Ce que le site dit de lui-même : le pied de page, l’aperçu des liens partagés, les données lues par Google et par les assistants IA. Rien n’est écrit en dur dans le code."
      toolbar={
        <Tabs
          bare
          value={view}
          onChange={setView}
          items={[
            { value: 'general', label: 'Général' },
            { value: 'reseaux', label: 'Réseaux sociaux', count: id ? filled : undefined },
          ]}
        />
      }
    >
      {error ? (
        <EmptyState title="Identité indisponible" description={error} />
      ) : !id ? (
        <SkeletonRows rows={4} />
      ) : view === 'general' ? (
        <Panel flush>
          <List>
            <ListRow to={field('contact')} leading={icon(Mail)} title="Contact" subtitle={[id.contactEmail, id.headquarters].filter(Boolean).join(' · ')} meta={<Status done={Boolean(id.contactEmail)} />} />
            <ListRow to={field('description')} leading={icon(FileText)} title="Description du site" subtitle={id.description} meta={<Status done={Boolean(id.description)} />} />
            <ListRow to={field('image')} leading={icon(ImageIcon)} title="Image des liens partagés" subtitle={id.shareImage || 'L’icône du site'} meta={<Status done={Boolean(id.shareImage)} />} />
          </List>
        </Panel>
      ) : (
        <Panel flush>
          <List>
            {SOCIALS.map((s) => (
              <ListRow
                key={s.key}
                to={field(s.key)}
                leading={icon(SOCIAL_ICON[s.key] ?? Globe)}
                title={s.label}
                subtitle={(id as SiteIdentity).socials[s.key] || 'Aucun lien'}
                meta={<Status done={Boolean(id.socials[s.key])} />}
              />
            ))}
          </List>
        </Panel>
      )}
    </Page>
  );
};
