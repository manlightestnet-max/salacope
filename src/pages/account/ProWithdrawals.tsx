import React, { useState } from 'react';
import { FileCheck2, Smartphone, ShieldCheck, Check, AlertCircle, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/account/EmptyState';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const ProWithdrawals: React.FC = () => {
  const { availableBalance, user, withdrawals, requestWithdrawal } = useAuth();

  const [amount, setAmount] = useState<number | ''>('');
  const [channel, setChannel] = useState<'MTN_MOMO_COG' | 'AIRTEL_COG'>('MTN_MOMO_COG');
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 1000) {
      setErrorMsg('Le montant minimum de retrait est de 1 000 FCFA.');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMsg(`Solde insuffisant. Vous disposez actuellement de ${availableBalance.toLocaleString('fr-FR')} FCFA.`);
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMsg('Veuillez renseigner votre numéro Mobile Money.');
      return;
    }

    requestWithdrawal(numAmount, channel, phoneNumber.trim());
    setSuccessMsg(`Demande de retrait de ${numAmount.toLocaleString('fr-FR')} FCFA transmise avec succès.`);
    setAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Retraits Mobile Money
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Transférez vos gains directement vers votre compte MTN MoMo ou Airtel Money en République du Congo.
          </p>
        </div>
        <div className="text-right self-start sm:self-auto">
          <div className="text-[10px] uppercase font-bold text-gray-400">Solde disponible</div>
          <div className="text-base font-extrabold text-primary-700 font-heading">
            {availableBalance.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      {/* Two Column: Form + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-sm p-5 sm:p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-950 font-heading">
            Formuler une demande de virement
          </h2>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xs text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xs text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Opérateur Mobile Money (Congo)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('MTN_MOMO_COG')}
                  className={`p-3 rounded-sm border text-left flex items-center gap-2 transition-all text-xs cursor-pointer ${
                    channel === 'MTN_MOMO_COG'
                      ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="w-5 h-5 rounded-xs bg-yellow-400 text-gray-900 flex items-center justify-center font-black text-[10px] shrink-0">
                    M
                  </span>
                  <div>
                    <div className="font-bold">MTN MoMo</div>
                    <div className="text-[10px] text-gray-400 font-normal">Congo-Brazzaville</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('AIRTEL_COG')}
                  className={`p-3 rounded-sm border text-left flex items-center gap-2 transition-all text-xs cursor-pointer ${
                    channel === 'AIRTEL_COG'
                      ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="w-5 h-5 rounded-xs bg-red-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                    A
                  </span>
                  <div>
                    <div className="font-bold">Airtel Money</div>
                    <div className="text-[10px] text-gray-400 font-normal">Congo-Brazzaville</div>
                  </div>
                </button>
              </div>
            </div>

            <Input
              label="Numéro de téléphone récepteur"
              type="tel"
              required
              placeholder="+242 06 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              prefixIcon={<Smartphone className="w-4 h-4 text-gray-400" />}
              className="text-xs rounded-sm"
            />

            <Input
              label="Montant à retirer en FCFA (XAF)"
              type="number"
              required
              min={1000}
              step={500}
              placeholder="Ex: 25000"
              value={amount === '' ? '' : amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              helperText={`Minimum : 1 000 FCFA. Solde disponible : ${availableBalance.toLocaleString('fr-FR')} FCFA.`}
              className="text-xs rounded-sm"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={availableBalance < 1000}
                className="text-xs rounded-sm font-semibold px-4 py-2"
              >
                Valider la demande de retrait
              </Button>
            </div>
          </form>
        </div>

        {/* Right Info */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-sm p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-950 font-heading">
              <ShieldCheck className="w-4 h-4 text-primary-600" />
              <span>Modalités de paiement</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Les retraits sont exécutés par notre équipe financière sous un délai de 2h à 24h ouvrées directement sur votre numéro Mobile Money.
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawals History Table */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-gray-950 font-heading">
          Historique des demandes de retrait
        </h2>

        {withdrawals.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="Aucun retrait demandé"
            description="Vous n'avez formulé aucune demande de retrait pour le moment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Numéro</th>
                  <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.map((wth) => (
                  <tr key={wth.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-500">
                      {wth.id.slice(0, 12)}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(wth.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      {wth.channel === 'MTN_MOMO_COG' ? 'MTN MoMo' : 'Airtel Money'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {wth.phoneNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-gray-950 font-heading">
                      {wth.amountXaf.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                        {wth.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
