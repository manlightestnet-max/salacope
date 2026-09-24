import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderChat } from './OrderChat';
import { OrderExecutionPanel } from './OrderExecutionPanel';
import { OrderProgressBar } from './OrderProgressBar';
import { OrderTransactionModal } from './OrderTransactionModal';
import { OrderSecurityModal } from './OrderSecurityModal';
import { OrderCancellationModal } from './OrderCancellationModal';
import { OrderDisputeModal } from './OrderDisputeModal';
import { OrderDeliveryModal } from './OrderDeliveryModal';
import {
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  PlayCircle,
  XCircle,
  AlertTriangle,
  Upload,
  ShoppingBag,
  Briefcase,
  MessageSquare,
  FileSpreadsheet,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface OrderDetailViewProps {
  order: OrderItem;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order }) => {
  const navigate = useNavigate();
  const { updateOrderStatus, completeOrder } = useAuth();

  const [mobileTab, setMobileTab] = useState<'details' | 'chat'>('details');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const isService = order.itemType === 'service';

  const formatDate = (dateString: string) => {
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

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full overflow-hidden bg-gray-50 relative">
      {/* 1. PINNED TOP TOOLBAR (Always visible, never scrolls away) */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 shadow-2xs z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Back button + Order info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard/commandes')}
              className="p-1.5 text-gray-500 hover:text-gray-950 hover:bg-gray-100 rounded-xs transition-colors shrink-0 cursor-pointer"
              title="Retour à la liste des commandes"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-gray-950 font-heading">
                  Commande #{order.id.slice(0, 10)}
                </h1>
                <OrderStatusBadge status={order.status} size="sm" />
                <span
                  className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-xs ${
                    isService
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {isService ? <Briefcase className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                  <span>{isService ? 'Service Freelance' : 'Produit Numérique'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-gray-500 mt-0.5">
                <span>Client : <strong className="text-gray-900">{order.buyerName}</strong></span>
                <span>•</span>
                <span>Net : <strong className="text-gray-900">{order.priceXaf.toLocaleString('fr-FR')} FCFA</strong></span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{formatDate(order.createdAt)}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary-700 hover:text-primary-800 font-semibold cursor-pointer underline underline-offset-2"
                >
                  <Info className="w-3 h-3" />
                  <span>Détails</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Controlled Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            {/* Détails de la commande (Image 1 modal trigger) */}
            <button
              type="button"
              onClick={() => setIsDetailsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xs text-xs font-semibold text-gray-700 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 transition-colors shadow-2xs cursor-pointer"
              title="Voir tous les détails de transaction et coordonnées client"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-gray-600" />
              <span>Détails commande</span>
            </button>

            {/* Garanties et Sécurité (Toolbar mini dialog trigger) */}
            <button
              type="button"
              onClick={() => setIsSecurityModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xs text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
              title="Garanties et Sécurité Salacope (Paiement séquestre, horodatage, canal certifié)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Sécurité</span>
            </button>

            {/* Take in charge button */}
            {order.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() =>
                  updateOrderStatus(order.id, 'ACCEPTED', 'Prise en charge de la commande par le prestataire')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-2xs cursor-pointer"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Prendre en charge</span>
              </button>
            )}

            {/* Start processing */}
            {order.status === 'ACCEPTED' && isService && (
              <button
                type="button"
                onClick={() =>
                  updateOrderStatus(order.id, 'PROCESSING', 'Début de l\'exécution du service')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Démarrer</span>
              </button>
            )}

            {/* Deliver work (Freelancer) */}
            {(order.status === 'ACCEPTED' || order.status === 'PROCESSING') && isService && (
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Livrer</span>
              </button>
            )}

            {/* Complete order */}
            {order.status === 'DELIVERED' && (
              <button
                type="button"
                onClick={() => completeOrder(order.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Clôturer</span>
              </button>
            )}

            {/* Dispute button */}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.status !== 'DISPUTED' && (
              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xs text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                title="Signaler un problème"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Litige</span>
              </button>
            )}

            {/* Cancel button */}
            {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'ACCEPTED') && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xs text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Annuler</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Progress Bar row anchored directly in the toolbar (Collapsible inline) */}
        <div className="mt-2.5 pt-2 border-t border-gray-100">
          <OrderProgressBar order={order} />
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible on mobile screens only) */}
      <div className="lg:hidden shrink-0 flex border-b border-gray-200 bg-white px-3 z-10">
        <button
          type="button"
          onClick={() => setMobileTab('details')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'details'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Détails & Traitement</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'chat'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Discussion client</span>
          {(order.messages?.length || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary-100 text-primary-800 font-bold">
              {order.messages?.length}
            </span>
          )}
        </button>
      </div>

      {/* 2. WORKSPACE BODY: DOCKED CONSOLE WITH DUAL VIEWPORTS */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        {/* LEFT VIEWPORT: Fused Delivery & Workflow & Horizontal Events Panel (Smooth scroll) */}
        <div
          className={`flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 lg:p-6 ${
            mobileTab === 'details' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="max-w-[840px] mx-auto pb-6">
            <OrderExecutionPanel order={order} />
          </div>
        </div>

        {/* RIGHT VIEWPORT: DOCKED ORDER CHAT (Full height, composer pinned at bottom) */}
        <div
          className={`w-full lg:w-[420px] xl:w-[480px] shrink-0 h-full flex flex-col border-l border-gray-200 bg-white ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <OrderChat order={order} />
        </div>
      </div>

      {/* Modals */}
      <OrderTransactionModal
        order={order}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onOpenChat={() => setMobileTab('chat')}
        isScopedToMain={true}
      />

      <OrderSecurityModal
        order={order}
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <OrderCancellationModal
        order={order}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
      />

      <OrderDisputeModal
        order={order}
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
      />

      <OrderDeliveryModal
        order={order}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />
    </div>
  );
};
