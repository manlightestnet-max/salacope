import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserMinus, ExternalLink, MapPin, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';
import { Button } from '../../components/ui/Button';

export const UserFollowing: React.FC = () => {
  const { following, unfollowCreator } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Créateurs Suivis
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Retrouvez les freelances et vendeurs que vous avez choisis de suivre sur la plateforme.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xs self-start sm:self-auto">
          {following.length} {following.length === 1 ? 'abonnement' : 'abonnements'}
        </div>
      </div>

      {/* Content */}
      {following.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Vous ne suivez encore aucun créateur"
          description="Suivez des vendeurs et prestataires pour retrouver facilement leurs nouvelles publications, formations et services."
          actionLabel="Découvrir les créateurs"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {following.map((creator) => (
            <div
              key={creator.creatorId}
              className="bg-white border border-gray-200 rounded-sm p-4.5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xs bg-primary-50 text-primary-700 font-bold flex items-center justify-center border border-primary-200 shrink-0 text-sm">
                  {creator.creatorName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-950 font-heading truncate">
                      {creator.creatorName}
                    </h3>
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {creator.creatorRole}
                  </div>
                  {creator.creatorLocation && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{creator.creatorLocation}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400">
                  Suivi depuis {new Date(creator.followedAt).toLocaleDateString('fr-FR')}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unfollowCreator(creator.creatorId)}
                  icon={<UserMinus className="w-3 h-3 text-red-500" />}
                  className="text-xs px-2.5 py-1 rounded-xs hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Ne plus suivre
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
