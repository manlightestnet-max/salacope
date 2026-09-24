import React from 'react';
import { OrderItem, OrderTimelineEvent } from '../../types';
import { Check, Clock, CircleDot, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface OrderTimelineProps {
  order: OrderItem;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const isService = order.itemType === 'service';
  const timelineEvents = order.timeline || [];

  // Sort events chronologically (oldest to newest)
  const sortedEvents = [...timelineEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const formatEventDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateString;
    }
  };

  // Define logical workflow progression steps based on role/type
  const steps = isService
    ? [
        { key: 'PAID', label: 'Paiement confirmé' },
        { key: 'ACCEPTED', label: 'Prise en charge' },
        { key: 'PROCESSING', label: 'En traitement' },
        { key: 'DELIVERED', label: 'Livraison' },
        { key: 'COMPLETED', label: 'Terminée' },
      ]
    : [
        { key: 'PAID', label: 'Paiement validé' },
        { key: 'DELIVERED', label: 'Livraison numérique' },
        { key: 'COMPLETED', label: 'Terminée' },
      ];

  // Helper to determine step status
  const getStepState = (stepKey: string): 'done' | 'current' | 'future' | 'failed' => {
    if (order.status === 'CANCELLED') return 'failed';
    if (order.status === 'DISPUTED') return 'failed';

    const orderRank = {
      PENDING: 0,
      CONFIRMED: 1,
      ACCEPTED: 2,
      PROCESSING: 3,
      DELIVERED: 4,
      COMPLETED: 5,
      CANCELLED: -1,
      DISPUTED: -1,
    }[order.status] ?? 1;

    const stepRank = {
      PAID: 1,
      ACCEPTED: 2,
      PROCESSING: 3,
      DELIVERED: 4,
      COMPLETED: 5,
    }[stepKey] ?? 1;

    if (orderRank > stepRank) return 'done';
    if (orderRank === stepRank) return 'current';
    return 'future';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-5 shadow-2xs space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-heading flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary-600" />
            <span>Workflow & Traçabilité</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Historique certifié des transitions et livrables de la commande.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-xs border border-gray-100">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Journal horodaté</span>
        </div>
      </div>

      {/* Visual Step Tracker */}
      <div className="py-2">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-1 text-center">
          {steps.map((step, idx) => {
            const state = getStepState(step.key);
            return (
              <div key={step.key} className="flex flex-col items-center relative">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                    state === 'done'
                      ? 'bg-emerald-600 text-white'
                      : state === 'current'
                      ? 'bg-primary-600 text-white ring-4 ring-primary-50 animate-pulse'
                      : state === 'failed'
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {state === 'done' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : state === 'current' ? (
                    <CircleDot className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px]">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1.5 leading-tight ${
                    state === 'done'
                      ? 'text-gray-900'
                      : state === 'current'
                      ? 'text-primary-700 font-bold'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Events Timeline Log - HORIZONTAL TRACK */}
      <div className="space-y-2.5 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Événements réels enregistrés</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-600 font-mono font-bold">
              {sortedEvents.length}
            </span>
          </div>
          {sortedEvents.length > 2 && (
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              Défilement horizontal →
            </span>
          )}
        </div>

        {sortedEvents.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucun événement enregistré.</p>
        ) : (
          <div className="flex items-stretch gap-2.5 overflow-x-auto custom-scrollbar pb-2 pt-1 -mx-1 px-1">
            {sortedEvents.map((evt, idx) => {
              const isDanger = evt.type === 'CANCELLED' || evt.type === 'DISPUTED';
              const isSuccess = evt.type === 'DELIVERED' || evt.type === 'COMPLETED' || evt.type === 'PAID';

              return (
                <div
                  key={evt.id}
                  className="flex-1 min-w-[210px] sm:min-w-[240px] max-w-[290px] shrink-0 bg-gray-50/70 hover:bg-gray-50 border border-gray-200/90 rounded-xs p-3 flex flex-col justify-between transition-colors shadow-2xs"
                >
                  <div className="space-y-1.5">
                    {/* Top: Status indicator dot + Actor badge + Date */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isDanger
                              ? 'bg-rose-500 ring-2 ring-rose-100'
                              : isSuccess
                              ? 'bg-emerald-600 ring-2 ring-emerald-100'
                              : 'bg-primary-600 ring-2 ring-primary-100'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs truncate ${
                            evt.actor === 'client'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : evt.actor === 'system'
                              ? 'bg-gray-100 text-gray-700 border border-gray-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}
                        >
                          {evt.actor === 'client' ? 'Client' : evt.actor === 'system' ? 'Système' : 'Prestataire'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {formatEventDate(evt.timestamp)}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-xs font-bold text-gray-900 font-heading leading-snug">
                      {evt.title}
                    </div>

                    {/* Description */}
                    {evt.description && (
                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  {/* Footer with Step marker */}
                  <div className="pt-2 mt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>Étape #{idx + 1}</span>
                    {idx < sortedEvents.length - 1 && (
                      <span className="text-gray-300 font-normal">→ Étape suivante</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
