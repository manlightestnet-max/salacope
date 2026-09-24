import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Trash2, Power, Clock, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';
import { Button } from '../../components/ui/Button';

export const FreelancerServices: React.FC = () => {
  const { services, deleteService, toggleServiceStatus } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Mes Services & Prestations
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gérez votre catalogue de prestations de services proposées aux clients de la plateforme.
          </p>
        </div>

        <Link to="/dashboard/services/nouveau">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs rounded-sm font-semibold self-start sm:self-auto"
          >
            Publier un service
          </Button>
        </Link>
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aucun service publié"
          description="Vous n'avez pas encore publié de prestation. Proposez vos compétences en graphisme, vidéo, rédaction ou développement pour commencer à recevoir des commandes."
          actionLabel="Publier mon premier service"
          onAction={() => navigate('/dashboard/services/nouveau')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white border border-gray-200 rounded-sm overflow-hidden flex flex-col shadow-2xs hover:border-gray-300 transition-colors"
            >
              {/* Vitrine Image */}
              <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden flex items-center justify-center">
                {service.images && service.images.length > 0 ? (
                  <img
                    src={service.images[0]}
                    alt={service.serviceName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}

                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-gray-950/80 text-white">
                    {service.category}
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase ${
                      service.status === 'ACTIVE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {service.status === 'ACTIVE' ? 'Actif' : 'En pause'}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-950 font-heading line-clamp-1">
                    {service.serviceName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Délai de livraison : <strong>{service.deliveryDays}</strong></span>
                  </div>
                </div>

                {/* Footer with actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm font-extrabold text-primary-700 font-heading">
                    {service.priceXaf.toLocaleString('fr-FR')} FCFA
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleServiceStatus(service.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors cursor-pointer"
                      title={service.status === 'ACTIVE' ? 'Mettre en pause' : 'Réactiver'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteService(service.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors cursor-pointer"
                      title="Supprimer la prestation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
