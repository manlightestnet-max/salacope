import React from 'react';
import { ArrowDownToLine, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';

export const SellerDownloads: React.FC = () => {
  const { digitalProducts } = useAuth();

  const totalDownloads = digitalProducts.reduce((sum, p) => sum + p.downloadsCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Téléchargements des Fichiers
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Suivez la distribution et les accès accordés à vos acheteurs sur vos produits digitaux.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xs self-start sm:self-auto">
          {totalDownloads} {totalDownloads === 1 ? 'téléchargement' : 'téléchargements'}
        </div>
      </div>

      {/* Content */}
      {totalDownloads === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title="Aucun téléchargement enregistré"
          description="Le journal des téléchargements de vos fichiers clients s'affichera ici dès que vos produits numériques seront téléchargés par des acheteurs."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Produit Numérique</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Fichier source</th>
                  <th className="py-3 px-4 text-right">Téléchargements cumulés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {digitalProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-950">
                      {prod.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-gray-100 text-gray-700">
                        {prod.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {prod.fileName}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-primary-700 font-heading">
                      {prod.downloadsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
