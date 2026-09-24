import React, { useState } from 'react';
import { User, Mail, Phone, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { UpgradeModal } from '../../components/account/UpgradeModal';

export const AccountProfile: React.FC = () => {
  const { user, updateUser, switchRole } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [isSaved, setIsSaved] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email, phone });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
          Paramètres du profil
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Gérez vos informations personnelles et le statut professionnel de votre compte.
        </p>
      </div>

      {/* Role & Status Card */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Statut du compte
            </div>
            <div className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-2">
              <span className="capitalize">{user.role}</span>
              <span className="text-[10px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-xs">
                Actif
              </span>
            </div>
          </div>

          <div>
            {user.role === 'user' ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => setIsUpgradeModalOpen(true)}
                className="text-xs rounded-sm"
              >
                Passer en Pro
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => switchRole('user')}
                className="text-xs text-gray-500 hover:text-gray-900 underline cursor-pointer"
              >
                Basculer en vue Acheteur
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-100">
          Votre compte est hébergé en République du Congo. Il est configuré pour des transactions en Francs CFA (XAF) via MTN MoMo et Airtel Money.
        </p>
      </div>

      {/* Personal Info Form */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs">
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="text-sm font-bold text-gray-950 font-heading mb-3">
            Informations générales
          </h2>

          <Input
            label="Nom complet ou raison sociale"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            prefixIcon={<User className="w-4 h-4 text-gray-400" />}
            className="text-xs rounded-sm"
          />

          <Input
            label="Adresse e-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            prefixIcon={<Mail className="w-4 h-4 text-gray-400" />}
            className="text-xs rounded-sm"
          />

          <Input
            label="Numéro de téléphone (Mobile Money)"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            prefixIcon={<Phone className="w-4 h-4 text-gray-400" />}
            helperText="Ce numéro sera utilisé pour l'envoi de vos reçus et vos retraits."
            className="text-xs rounded-sm"
          />

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            {isSaved && (
              <span className="text-xs text-primary-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                Modifications enregistrées
              </span>
            )}
            <div className="ml-auto">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="text-xs rounded-sm font-semibold px-4 py-2"
              >
                Enregistrer les modifications
              </Button>
            </div>
          </div>
        </form>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};
