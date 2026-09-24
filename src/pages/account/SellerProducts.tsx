import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus, Trash2, Power, Download, FileText, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';
import { Button } from '../../components/ui/Button';

export const SellerProducts: React.FC = () => {
  const { digitalProducts, deleteDigitalProduct, toggleDigitalProductStatus } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Mes Produits Digitaux
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gérez vos fichiers téléchargeables en vente (e-books, templates, documents et guides).
          </p>
        </div>

        <Link to="/dashboard/produits/nouveau">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs rounded-sm font-semibold self-start sm:self-auto"
          >
            Ajouter un produit
          </Button>
        </Link>
      </div>

      {/* Products List */}
      {digitalProducts.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucun produit digital publié"
          description="Vous n'avez pas encore mis en vente de produit numérique. Mettez en ligne un e-book, document ou template pour commencer à vendre."
          actionLabel="Ajouter un produit digital"
          onAction={() => navigate('/dashboard/produits/nouveau')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {digitalProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white border border-gray-200 rounded-sm overflow-hidden flex flex-col shadow-2xs hover:border-gray-300 transition-colors"
            >
              {/* Cover Image */}
              <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden flex items-center justify-center">
                <img
                  src={prod.coverImage}
                  alt={prod.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-gray-950/80 text-white">
                    {prod.fileType}
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase ${
                      prod.status === 'ACTIVE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-600 text-white'
                    }`}
                  >
                    {prod.status === 'ACTIVE' ? 'En vente' : 'Brouillon'}
                  </span>
                </div>

                <div className="absolute bottom-2 left-2 bg-gray-950/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-xs flex items-center gap-1">
                  <ArrowDownToLine className="w-2.5 h-2.5 text-primary-400" />
                  <span>{prod.downloadsCount} téléchargement(s)</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-950 font-heading line-clamp-1">
                    {prod.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                  <div className="text-[11px] text-gray-400 font-mono mt-2 truncate">
                    Fichier : {prod.fileName}
                  </div>
                </div>

                {/* Footer with actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm font-extrabold text-primary-700 font-heading">
                    {prod.priceXaf.toLocaleString('fr-FR')} FCFA
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleDigitalProductStatus(prod.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors cursor-pointer"
                      title={prod.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDigitalProduct(prod.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors cursor-pointer"
                      title="Supprimer le produit"
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
