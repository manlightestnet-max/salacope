import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import { fetchProductById, createCheckoutOrder } from '../lib/api';
import {
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Lock,
  Download,
  CheckCircle2,
  Tag,
  Building2,
  ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const Checkout: React.FC = () => {
  const { user, isAuthenticated, addPurchase, addOrder } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isInsideAccount = location.pathname.startsWith('/compte');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [buyerName, setBuyerName] = useState(() => (isAuthenticated && user?.name ? user.name : ''));
  const [buyerEmail, setBuyerEmail] = useState(() => (isAuthenticated && user?.email ? user.email : ''));
  const [buyerPhone, setBuyerPhone] = useState(() => {
    if (isAuthenticated && user?.phone) {
      return user.phone.replace('+242', '').trim();
    }
    return '';
  });
  const [countryCode, setCountryCode] = useState('+242');

  // Sync when user becomes available
  useEffect(() => {
    if (isAuthenticated && user) {
      setBuyerName((prev) => prev || user.name || '');
      setBuyerEmail((prev) => prev || user.email || '');
      setBuyerPhone((prev) => prev || (user.phone ? user.phone.replace('+242', '').trim() : ''));
    }
  }, [isAuthenticated, user]);

  // Company invoice toggle
  const [showCompanyFields, setShowCompanyFields] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyNif, setCompanyNif] = useState('');

  // Coupon toggle
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Payment method
  const [paymentChannel, setPaymentChannel] = useState<'MTN_MOMO_COG' | 'AIRTEL_COG'>('MTN_MOMO_COG');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; status: string; message: string } | null>(null);

  useEffect(() => {
    if (id) {
      const found = PRODUCTS.find((p) => p.id === id);
      if (found) {
        setProduct(found);
        setLoading(false);
      } else {
        fetchProductById(id).then((p) => {
          setProduct(p || null);
          setLoading(false);
        });
      }
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-sm p-6 max-w-md w-full text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-sm bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-950 font-heading">Produit introuvable</h2>
          <p className="text-xs text-gray-500">Le produit sélectionné pour cette commande n'existe pas ou n'est plus disponible.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/')} className="w-full text-xs rounded-sm">
            Retourner au catalogue
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = product.priceXaf;
  const discountAmount = Math.round(subtotal * couponDiscount);
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === 'SALA10' || cleanCode === 'CONGO10') {
      setCouponDiscount(0.10);
      setCouponMessage({ text: 'Code promo appliqué (-10%)', isError: false });
    } else if (cleanCode === 'BIENVENUE') {
      setCouponDiscount(0.15);
      setCouponMessage({ text: 'Code de bienvenue appliqué (-15%)', isError: false });
    } else {
      setCouponDiscount(0);
      setCouponMessage({ text: 'Code promo invalide ou expiré', isError: true });
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      alert('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    setIsSubmitting(true);
    const fullPhone = `${countryCode} ${buyerPhone.trim()}`;
    const result = await createCheckoutOrder({
      productId: product.id,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      buyerPhone: fullPhone,
      paymentChannel,
    });
    setIsSubmitting(false);
    setOrderResult(result);

    addPurchase({
      title: product.title,
      creatorName: product.author.name,
      priceXaf: total,
      paymentChannel,
      phone: fullPhone,
      status: 'COMPLETED',
      type: product.category === 'service' ? 'service' : 'product',
      deliveryTime: product.deliveryTime,
      coverImage: product.coverImage,
    });

    addOrder({
      itemId: product.id,
      itemTitle: product.title,
      itemType: product.category === 'service' ? 'service' : 'product',
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      buyerPhone: fullPhone,
      priceXaf: total,
      paymentChannel,
      status: 'CONFIRMED',
    });
  };

  const handleBack = () => {
    if (isInsideAccount) {
      if (product) {
        navigate(`/compte/explorer?produit=${product.id}`);
      } else {
        navigate('/compte/explorer');
      }
    } else if (window.history.length > 1) {
      navigate(-1);
    } else if (product) {
      navigate(`/produit/${product.id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`${isInsideAccount ? 'w-full py-4' : 'min-h-screen bg-gray-50/70 pb-16'} text-gray-900 selection:bg-primary-600 selection:text-white`}>
      {/* Minimal Top Brand Bar (Only when standalone visitor checkout) */}
      {!isInsideAccount && (
        <header className="py-3.5">
          <div className="max-w-[620px] mx-auto px-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 select-none">
              <div className="w-6 h-6 rounded-xs bg-primary-600 flex items-center justify-center text-white">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold tracking-tight text-gray-950 font-heading">
                Salacope<span className="text-primary-600">.online</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au catalogue</span>
            </button>
          </div>
        </header>
      )}

      <main className="max-w-[620px] mx-auto px-4 pt-2 space-y-4">
        {/* Back button when inside AccountShell */}
        {isInsideAccount && (
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au catalogue</span>
            </button>
            <span className="text-xs text-gray-400 font-mono">Paiement sécurisé</span>
          </div>
        )}

        {/* Order Confirmation View */}
        {orderResult ? (
          <div className="bg-white border border-gray-200 rounded-sm p-6 sm:p-8 shadow-2xs text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 border border-primary-200 rounded-xs flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-gray-950 font-heading">
                Commande initiée avec succès !
              </h1>
              <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto leading-relaxed">
                {orderResult.message}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200/80 rounded-sm p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-400">Référence :</span>
                <span className="font-mono font-bold text-gray-900">{orderResult.orderId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-400">Produit :</span>
                <span className="font-medium text-gray-900">{product.title}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-400">Montant :</span>
                <span className="font-bold text-primary-700">{total.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">E-mail de livraison :</span>
                <span className="font-medium text-gray-900">{buyerEmail}</span>
              </div>
            </div>

            {product.deliveryType === 'instant_download' && (
              <Button
                variant="primary"
                size="md"
                className="w-full text-xs rounded-sm py-3"
                icon={<Download className="w-4 h-4" />}
                onClick={() => alert(`Téléchargement de ${product.title} initialisé vers ${buyerEmail}`)}
              >
                Télécharger le fichier maintenant
              </Button>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 text-xs rounded-sm py-2.5 font-semibold"
                onClick={() => navigate('/compte/achats')}
              >
                Consulter dans mon compte
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs rounded-sm py-2.5"
                onClick={() => navigate(isInsideAccount ? '/compte/explorer' : '/')}
              >
                {isInsideAccount ? 'Retourner à Explorer' : "Retourner à l'accueil"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
            {/* 1. PRODUCT SUMMARY HEADER CARD (Pinned on scroll, 100% opaque solid white) */}
            <div className="sticky top-2 sm:top-3 z-30 bg-white border border-gray-200 rounded-sm p-3.5 sm:p-4 flex items-center justify-between shadow-md gap-4">
              <div
                onClick={handleBack}
                className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
                title="Cliquer pour revenir aux détails du produit"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xs overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  <img
                    src={product.coverImage}
                    alt={product.title}
                    className="w-full h-full object-cover block group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-950 font-heading leading-tight truncate uppercase group-hover:text-primary-700 transition-colors">
                    {product.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Auteur : {product.author.name}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-base sm:text-lg font-bold text-gray-950 font-heading">
                  {product.priceXaf.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            {/* 2. STEP 1: YOUR DETAILS (Vos coordonnées) */}
            <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-xs bg-primary-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-950 font-heading">
                    Vos coordonnées
                  </h3>
                  <p className="text-xs text-gray-500">
                    L'accès et la facture vous seront envoyés par e-mail
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nom complet <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ex: Jean-Paul Ngoma"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-sm text-gray-900 focus:outline-none focus:border-primary-600 transition-colors"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Adresse e-mail <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="jeanpaul@exemple.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-sm text-gray-900 focus:outline-none focus:border-primary-600 transition-colors"
                  />
                </div>

                {/* Phone with Country Prefix */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Numéro de téléphone <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-full px-2.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-sm text-gray-700 focus:outline-none focus:border-primary-600 font-medium"
                      >
                        <option value="+242">CG (+242)</option>
                        <option value="+243">CD (+243)</option>
                        <option value="+237">CM (+237)</option>
                        <option value="+241">GA (+241)</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="06 000 0000"
                      className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-sm text-gray-900 focus:outline-none focus:border-primary-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Company Invoice Link Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCompanyFields(!showCompanyFields)}
                    className="text-xs text-primary-700 hover:text-primary-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Acheter en tant qu'entreprise (facture avec NIF)</span>
                  </button>

                  {showCompanyFields && (
                    <div className="mt-2.5 p-3 bg-gray-50 border border-gray-200/80 rounded-sm space-y-2.5 animate-in fade-in duration-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Raison sociale / Nom entreprise
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: SARL Congo Services"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Numéro d'Identification Fiscale (NIF)
                        </label>
                        <input
                          type="text"
                          value={companyNif}
                          onChange={(e) => setCompanyNif(e.target.value)}
                          placeholder="Ex: 012345678"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Coupon Code Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(!showCouponInput)}
                    className="text-xs text-gray-500 hover:text-gray-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>J'ai un code promo</span>
                  </button>

                  {showCouponInput && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Ex: SALA10"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-sm uppercase tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-sm transition-colors cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </div>
                  )}

                  {couponMessage && (
                    <p className={`text-[11px] mt-1.5 ${couponMessage.isError ? 'text-rose-600' : 'text-emerald-700 font-medium'}`}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ORDER SUMMARY (Récapitulatif) */}
            <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Récapitulatif de commande
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>Remise code promo</span>
                  <span>-{discountAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-400">
                <span>TVA (0% - produits numériques)</span>
                <span>0 FCFA</span>
              </div>

              <div className="border-t border-gray-100 pt-2.5 mt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-gray-950 font-heading">
                  {total.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* 4. STEP 2: PAYMENT METHOD (Mode de paiement) */}
            <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-xs bg-primary-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-950 font-heading">
                    Mode de paiement
                  </h3>
                  <p className="text-xs text-gray-500">
                    Sélectionnez votre opérateur Mobile Money au Congo
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* MTN MoMo Option */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel('MTN_MOMO_COG')}
                  className={`p-3.5 border rounded-sm text-left flex items-start justify-between transition-all cursor-pointer ${
                    paymentChannel === 'MTN_MOMO_COG'
                      ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600'
                      : 'border-gray-200 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-xs bg-yellow-400 text-gray-950 font-black text-[9px] flex items-center justify-center shrink-0">
                        M
                      </span>
                      <span className="text-xs font-bold text-gray-950">MTN MoMo</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Notification USSD instantanée
                    </p>
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    paymentChannel === 'MTN_MOMO_COG'
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300'
                  }`}>
                    {paymentChannel === 'MTN_MOMO_COG' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                </button>

                {/* Airtel Money Option */}
                <button
                  type="button"
                  onClick={() => setPaymentChannel('AIRTEL_COG')}
                  className={`p-3.5 border rounded-sm text-left flex items-start justify-between transition-all cursor-pointer ${
                    paymentChannel === 'AIRTEL_COG'
                      ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600'
                      : 'border-gray-200 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-xs bg-red-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        A
                      </span>
                      <span className="text-xs font-bold text-gray-950">Airtel Money</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Code secret sur votre mobile
                    </p>
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    paymentChannel === 'AIRTEL_COG'
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300'
                  }`}>
                    {paymentChannel === 'AIRTEL_COG' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                </button>
              </div>

              {/* Big CTA Pay Button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                icon={<Lock className="w-4 h-4" />}
                className="w-full py-3.5 text-sm font-bold rounded-sm shadow-xs mt-2"
              >
                Payer — {total.toLocaleString('fr-FR')} FCFA
              </Button>
            </div>

            {/* 5. TRUST BADGES */}
            <div className="bg-white/80 border border-gray-200/70 rounded-sm p-3.5 flex flex-col sm:flex-row items-center justify-around gap-2 text-xs text-gray-600 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0" />
                <span className="text-[11px]">Paiement 100% sécurisé (MTN & Airtel)</span>
              </div>
              <span className="hidden sm:inline text-gray-300">·</span>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px]">Accès instantané après confirmation</span>
              </div>
            </div>
          </form>
        )}

        {/* Minimal Footer Disclaimer */}
        <footer className="pt-6 text-center space-y-2 text-gray-400">
          <div className="text-xs font-bold text-gray-600 font-heading">
            Salacope<span className="text-primary-600">.online</span>
          </div>
          <p className="text-[11px] leading-relaxed max-w-md mx-auto text-gray-400">
            En validant votre commande, vous acceptez nos{' '}
            <Link to="/legal/termos" className="underline hover:text-gray-700">Conditions Générales de Vente</Link>
            {' '}et notre{' '}
            <Link to="/legal/privacidade" className="underline hover:text-gray-700">Politique de Confidentialité</Link>.
            Toutes les transactions sont chiffrées de bout en bout.
          </p>
        </footer>
      </main>
    </div>
  );
};
