import React, { useState } from 'react';
import { OrderItem, OrderStatus, OrderTimelineEvent } from '../../types';
import {
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

export interface OrderWorkflowStep {
  key: string;
  label: string;
}

interface OrderProgressBarProps {
  order: OrderItem;
  steps?: OrderWorkflowStep[];
  defaultExpanded?: boolean;
  className?: string;
}

export const OrderProgressBar: React.FC<OrderProgressBarProps> = ({
  order,
  steps: customSteps,
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isService = order.itemType === 'service';

  // Default workflow progression steps if not provided
  const steps = customSteps || (isService
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
      ]);

  // Order rank logic
  const orderRank: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    ACCEPTED: 2,
    PROCESSING: 3,
    DELIVERED: 4,
    COMPLETED: 5,
    CANCELLED: -1,
    DISPUTED: -1,
  };

  const stepRank: Record<string, number> = {
    PAID: 1,
    ACCEPTED: 2,
    PROCESSING: 3,
    DELIVERED: 4,
    COMPLETED: 5,
  };

  const currentRank = orderRank[order.status] ?? 1;

  const getStepState = (stepKey: string): 'done' | 'current' | 'future' | 'failed' => {
    if (order.status === 'CANCELLED' || order.status === 'DISPUTED') {
      return 'failed';
    }
    const targetRank = stepRank[stepKey] ?? 1;
    if (currentRank > targetRank) return 'done';
    if (currentRank === targetRank) return 'current';
    return 'future';
  };

  // Determine current step index and display label
  const getCurrentStepInfo = () => {
    if (order.status === 'CANCELLED') return { label: 'Annulée', countText: 'Annulée' };
    if (order.status === 'DISPUTED') return { label: 'En litige', countText: 'En litige' };

    let activeIndex = steps.findIndex((s) => stepRank[s.key] === currentRank);
    if (activeIndex === -1) {
      activeIndex = currentRank >= 5 ? steps.length - 1 : 0;
    }

    const currentStep = steps[activeIndex] || steps[0];
    return {
      label: currentStep.label,
      countText: `${currentStep.label} · ${activeIndex + 1}/${steps.length}`,
    };
  };

  const { countText } = getCurrentStepInfo();

  // Real events sorted chronologically
  const timelineEvents = order.timeline || [];
  const sortedEvents = [...timelineEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const formatEventDate = (dateString?: string) => {
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

  return (
    <div className={`transition-all duration-200 ${className}`}>
      {/* ─────────────────────────────────────────────────────────────
          1. COMPACT PROGRESS BAR (Always visible in toolbar)
         ───────────────────────────────────────────────────────────── */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-3 cursor-pointer group py-1 select-none"
        title={isExpanded ? 'Masquer le détail du workflow' : 'Afficher le détail du workflow'}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        {/* Left: Horizontal Segmented Bar + Status Label */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[200px] sm:max-w-xs md:max-w-sm h-1.5 sm:h-2">
            {steps.map((step) => {
              const state = getStepState(step.key);
              const isFilled = state === 'done' || state === 'current';
              return (
                <div
                  key={step.key}
                  className={`flex-1 h-full rounded-full transition-colors duration-200 ${
                    state === 'failed'
                      ? 'bg-rose-500'
                      : isFilled
                      ? 'bg-primary-600'
                      : 'bg-gray-200'
                  }`}
                  title={`${step.label} (${
                    state === 'done'
                      ? 'Validée'
                      : state === 'current'
                      ? 'En cours'
                      : state === 'failed'
                      ? 'Interrompue'
                      : 'À venir'
                  })`}
                />
              );
            })}
          </div>

          {/* Compact text badge */}
          <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap truncate font-heading group-hover:text-primary-700 transition-colors">
            {countText}
          </span>
        </div>

        {/* Right: Secondary "Journal horodaté" badge + Chevron toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 group-hover:bg-gray-100 px-2 py-0.5 rounded-xs border border-gray-200 transition-colors">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Journal horodaté</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 group-hover:text-gray-700 transition-colors">
            <span className="hidden sm:inline text-[10px]">
              {isExpanded ? 'Masquer' : 'Détail'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180 text-primary-600' : ''
              }`}
            />
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXPANDED INLINE PANEL (Collapsible by default)
         ───────────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="mt-2.5 pt-3 border-t border-gray-100 space-y-2.5 animate-in fade-in duration-200">
          <div className="text-sm text-gray-500 font-medium">Historique</div>

          {sortedEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucun événement enregistré.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedEvents.map((evt) => {
                const actorLabel =
                  evt.actor === 'client'
                    ? 'Client'
                    : evt.actor === 'system'
                    ? 'Système'
                    : 'Prestataire';

                return (
                  <div key={evt.id} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs font-semibold text-gray-900 font-heading">
                        <span className="text-gray-500 font-normal">{actorLabel} · </span>
                        {evt.title}
                      </div>
                      <span className="text-xs text-gray-400 font-mono shrink-0">
                        {formatEventDate(evt.timestamp)}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
