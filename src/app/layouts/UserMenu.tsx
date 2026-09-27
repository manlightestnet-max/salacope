import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Compass, LayoutDashboard, LifeBuoy, LogOut, Settings } from 'lucide-react';
import { Avatar, Menu, MenuItem } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { signOut, useSession } from '@/features/session';

/** Avatar dropdown. `inApp`: already inside the back-office, so no shortcut to it. */
export const UserMenu: React.FC<{ compact?: boolean; inApp?: boolean }> = ({ compact = false, inApp = false }) => {
  const { user, isMerchant } = useSession();
  const navigate = useNavigate();
  if (!user) return null;

  const shortcuts: MenuItem[] = inApp
    ? []
    : [
        { label: 'Mon espace', to: ROUTES.account.explorer, icon: <Compass className="w-4 h-4" /> },
        ...(isMerchant ? [{ label: 'Ma boutique', to: ROUTES.seller.root, icon: <LayoutDashboard className="w-4 h-4" /> }] : []),
      ];

  return (
    <Menu
      header={
        <>
          <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
          <div className="text-xs text-gray-500 truncate">{user.email}</div>
        </>
      }
      items={[
        ...shortcuts,
        { label: 'Support', to: ROUTES.account.support, icon: <LifeBuoy className="w-4 h-4" /> },
        { label: 'Paramètres', to: ROUTES.account.settings, icon: <Settings className="w-4 h-4" /> },
        'divider',
        {
          label: 'Se déconnecter',
          icon: <LogOut className="w-4 h-4" />,
          onSelect: () => {
            signOut();
            navigate(ROUTES.home);
          },
        },
      ]}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 rounded-md p-1 pr-1.5 hover:bg-gray-100 min-w-0"
          aria-label="Menu du compte"
        >
          <Avatar name={user.name} size="sm" />
          {!compact && <span className="text-sm text-gray-700 truncate">{user.name}</span>}
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>
      )}
    />
  );
};
