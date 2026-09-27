import React from 'react';

/** "Données à jour à 16:51" (or with the date when it is not today). */
export const UpdatedAt: React.FC<{ at?: string | null; prefix?: string }> = ({ at, prefix = 'Données à jour' }) => {
  if (!at) return null;
  const date = new Date(at);
  const today = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return (
    <span>
      {prefix} {today ? `à ${time}` : `au ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}, ${time}`}
    </span>
  );
};
