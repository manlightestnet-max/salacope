import React, { useState } from 'react';
import { OrderItem } from '../../types';
import {
  PackageCheck,
  Upload,
  CheckCircle2,
  FileText,
  Download,
  AlertCircle,
  FileImage,
  FileArchive,
  FileCode,
  FileAudio,
  FileVideo,
  ShieldCheck,
} from 'lucide-react';
import { OrderDeliveryModal } from './OrderDeliveryModal';

interface OrderExecutionPanelProps {
  order: OrderItem;
}

export const OrderExecutionPanel: React.FC<OrderExecutionPanelProps> = ({ order }) => {
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const isService = order.itemType === 'service';
  const delivery = order.delivery;
  const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED';

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  // Helper to determine file icon based on extension or mime type
  const getFileIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext) || mimeType?.startsWith('image/')) {
      return <FileImage className="w-5 h-5 text-purple-600" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip') || mimeType?.includes('compressed')) {
      return <FileArchive className="w-5 h-5 text-amber-600" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'php', 'sql'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-blue-600" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || mimeType?.startsWith('audio/')) {
      return <FileAudio className="w-5 h-5 text-emerald-600" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mimeType?.startsWith('video/')) {
      return <FileVideo className="w-5 h-5 text-rose-600" />;
    }
    return <FileText className="w-5 h-5 text-primary-600" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-sm shadow-2xs overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          ZONE CENTRALE PRINCIPALE: LIVRAISON & LIVRABLES DU SERVICE
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 lg:p-6 space-y-5">
        {/* Header de la carte de livraison avec CTA principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 font-heading flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary-600" />
              <span>
                {isService ? 'Livraison & Livrables du Service' : 'Livraison Numérique Automatisée'}
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isService
                ? 'Espace officiel de dépôt, de révision et de consultation des livrables transmis au client.'
                : 'Accès instantané délivré automatiquement dès confirmation du paiement Mobile Money.'}
            </p>
          </div>

          {/* Action button if Service (inchangé en position) */}
          {isService && order.status !== 'CANCELLED' && order.status !== 'DISPUTED' && (
            <button
              type="button"
              onClick={() => setIsDeliveryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xs text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto hover:shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>{isDelivered ? 'Soumettre une révision' : 'Livrer la commande'}</span>
            </button>
          )}

          {/* Badge if Digital Product */}
          {!isService && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xs border border-emerald-200 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Accès Délivré</span>
            </span>
          )}
        </div>

        {/* Service: Brief & Instructions (if provided) */}
        {isService && order.brief && (order.brief.instructions || order.brief.description) && (
          <div className="p-3.5 bg-gray-50/80 border border-gray-200/80 rounded-xs space-y-1.5">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Brief & Instructions du client
            </div>
            {order.brief.description && (
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                {order.brief.description}
              </p>
            )}
            {order.brief.instructions && (
              <p className="text-[11px] text-gray-600 italic whitespace-pre-wrap">
                « {order.brief.instructions} »
              </p>
            )}
          </div>
        )}

        {/* Service: Delivery Content */}
        {isService && (
          <>
            {delivery ? (
              <div className="p-4 sm:p-5 bg-emerald-50/30 border border-emerald-200/80 rounded-xs space-y-4">
                {/* Delivery metadata banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-950 font-heading">
                      Dernière livraison effectuée{' '}
                      {delivery.revisionNumber ? `(Version #${delivery.revisionNumber})` : ''}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Livrée le {formatDate(delivery.deliveredAt)}
                  </span>
                </div>

                {/* Delivery Note */}
                {delivery.note && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Message d'accompagnement du prestataire :
                    </div>
                    <div className="bg-white p-3.5 rounded-xs border border-emerald-100 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                      {delivery.note}
                    </div>
                  </div>
                )}

                {/* Delivered Files Grid (Reformatté en grille scannable) */}
                {delivery.files && delivery.files.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        Fichiers et Livrables ({delivery.files.length})
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Cliquez pour télécharger
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {delivery.files.map((file) => (
                        <div
                          key={file.id}
                          className="group p-3 bg-white hover:bg-gray-50/80 border border-gray-200/90 hover:border-primary-300 rounded-xs transition-all shadow-2xs flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xs bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:scale-105 transition-transform">
                              {getFileIcon(file.name, file.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="text-xs font-semibold text-gray-900 group-hover:text-primary-700 font-heading break-all line-clamp-2 leading-snug"
                                title={file.name}
                              >
                                {file.name}
                              </div>
                              <div className="mt-1">
                                <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded-xs">
                                  {file.size}
                                </span>
                              </div>
                            </div>
                          </div>

                          {file.dataUrl ? (
                            <a
                              href={file.dataUrl}
                              download={file.name}
                              className="w-full py-1.5 px-2 bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-700 border border-gray-200 hover:border-primary-200 rounded-xs text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title={`Télécharger ${file.name}`}
                            >
                              <Download className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary-600" />
                              <span>Télécharger</span>
                            </a>
                          ) : (
                            <div className="w-full py-1 px-2 text-[10px] text-gray-400 italic text-center">
                              Lien sécurisé
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Aucun fichier joint à cette note de livraison.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 bg-gray-50/80 border border-gray-200/90 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">
                      Aucune livraison n'a encore été effectuée pour cette prestation.
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Préparez vos livrables finaux et transmettez-les au client dès qu'ils sont prêts.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Livrer maintenant</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Digital Product: Delivery Content in Grid */}
        {!isService && (
          <div className="p-4 sm:p-5 bg-gray-50/70 border border-gray-200/90 rounded-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase tracking-wider">
              <span>Produit Numérique Livré</span>
              <span className="text-[10px] text-gray-400 font-normal">Délivrance certifiée</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white border border-gray-200 rounded-xs flex items-start gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xs bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-950 font-heading truncate">
                    {order.digitalDelivery?.fileName || `${order.itemTitle}.pdf`}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-2">
                    <span>Format : {order.digitalDelivery?.fileType || 'PDF'}</span>
                    <span>•</span>
                    <span>Taille : {order.digitalDelivery?.fileSize || '12.4 Mo'}</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                    Téléchargements effectués : {order.digitalDelivery?.downloadCount ?? 0}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-gray-200 rounded-xs flex flex-col justify-between text-xs shadow-2xs">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Date de mise à disposition
                  </div>
                  <div className="text-xs font-semibold text-gray-900 font-mono mt-0.5">
                    {formatDate(order.digitalDelivery?.deliveredAt || order.createdAt)}
                  </div>
                </div>
                <div className="text-[11px] text-emerald-800 flex items-center gap-1.5 pt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lien de téléchargement unique et sécurisé</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delivery modal */}
      <OrderDeliveryModal
        order={order}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />
    </div>
  );
};
