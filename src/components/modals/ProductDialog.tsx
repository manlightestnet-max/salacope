import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { PRODUCTS } from '../../data/mockData';
import { createCheckoutOrder } from '../../lib/api';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Heart,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Download,
  Smartphone,
  ArrowRight,
  Store,
  Star,
  FileText,
  Sparkles,
  Check,
  UserPlus,
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export interface ProductDialogProps {
  product: Product;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  isScopedToMain?: boolean;
}

export const ProductDialog: React.FC<ProductDialogProps> = ({
  product,
  onClose,
  onSelectProduct,
  isScopedToMain = false,
}) => {
  const navigate = useNavigate();
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const {
    isAuthenticated,
    isFavorite,
    toggleFavorite,
    isFollowing,
    followCreator,
    unfollowCreator,
    addPurchase,
    addOrder,
  } = useAuth();

  // Interaction states
  const [isCopied, setIsCopied] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Mobile Money Checkout Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<'MTN_MOMO_COG' | 'AIRTEL_COG'>('MTN_MOMO_COG');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; status: string; message: string } | null>(null);

  // Reset states and scroll to top when product changes
  useEffect(() => {
    setIsCheckingOut(false);
    setOrderResult(null);
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [product.id]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Previous & Next navigation
  const currentIndex = PRODUCTS.findIndex((p) => p.id === product.id);
  const prevProduct = currentIndex >= 0
    ? PRODUCTS[(currentIndex - 1 + PRODUCTS.length) % PRODUCTS.length]
    : PRODUCTS[0];
  const nextProduct = currentIndex >= 0
    ? PRODUCTS[(currentIndex + 1) % PRODUCTS.length]
    : PRODUCTS[1] || PRODUCTS[0];

  // Related products
  const relatedProducts = PRODUCTS
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.origin + `/produit/${product.id}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await createCheckoutOrder({
      productId: product.id,
      buyerName,
      buyerEmail,
      buyerPhone,
      paymentChannel,
    });
    setIsSubmitting(false);
    setOrderResult(result);

    addPurchase({
      title: product.title,
      creatorName: product.author.name,
      priceXaf: product.priceXaf,
      paymentChannel,
      phone: buyerPhone,
      status: 'COMPLETED',
      type: product.category === 'service' ? 'service' : 'product',
      deliveryTime: product.deliveryTime,
      coverImage: product.coverImage,
    });

    addOrder({
      itemId: product.id,
      itemTitle: product.title,
      itemType: product.category === 'service' ? 'service' : 'product',
      buyerName,
      buyerEmail,
      buyerPhone,
      priceXaf: product.priceXaf,
      paymentChannel,
      status: 'CONFIRMED',
    });
  };

  const formattedPrice = `${product.priceXaf.toLocaleString('fr-FR')} FCFA`;

  return (
    <div
      className={
        isScopedToMain
          ? 'absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden'
          : 'fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden'
      }
    >
      {/* Deep Dark Overlay without blur (crisp transparent black matching Kubeta) */}
      <div
        className={
          isScopedToMain
            ? 'absolute inset-0 bg-black/75 transition-opacity cursor-pointer'
            : 'fixed inset-0 bg-black/75 transition-opacity cursor-pointer'
        }
        onClick={onClose}
        aria-label="Fermer le dialogue"
      />

      {/* Floating Left Arrow Navigation (<) */}
      <button
        type="button"
        onClick={() => onSelectProduct(prevProduct)}
        className={`${
          isScopedToMain
            ? 'absolute left-2 sm:left-4 z-20'
            : 'fixed left-2 sm:left-4 lg:left-6 z-[105]'
        } top-1/2 -translate-y-1/2 w-9 h-9 rounded-sm bg-white/95 hover:bg-white text-gray-700 hover:text-gray-950 shadow-md border border-gray-200 hidden md:flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer`}
        title={`Produit précédent : ${prevProduct.title}`}
        aria-label="Produit précédent"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Floating Right Arrow Navigation (>) */}
      <button
        type="button"
        onClick={() => onSelectProduct(nextProduct)}
        className={`${
          isScopedToMain
            ? 'absolute right-2 sm:right-4 z-20'
            : 'fixed right-2 sm:right-4 lg:right-6 z-[105]'
        } top-1/2 -translate-y-1/2 w-9 h-9 rounded-sm bg-white/95 hover:bg-white text-gray-700 hover:text-gray-950 shadow-md border border-gray-200 hidden md:flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer`}
        title={`Produit suivant : ${nextProduct.title}`}
        aria-label="Produit suivant"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Centered Dialog Window (Sharp, subtle edges - no rounded bubbles) */}
      <div
        className={`relative z-10 bg-white rounded-sm shadow-2xl w-full ${
          isScopedToMain ? 'max-w-[1020px] max-h-[92%]' : 'max-w-[1080px] max-h-[92vh]'
        } flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button X (Top-Right sharp subtle square) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-sm bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer border border-gray-200 shadow-2xs"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dialog Scrollable Interior */}
        <div ref={modalScrollRef} className="overflow-y-auto custom-scrollbar flex-1 bg-white">
          {/* 1. TOP HERO / OFFER SECTION (Responsive Flex: Sharp Square Cover + Breathable Details + Buy Box) */}
          <div className="p-5 sm:p-7 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Cover Image (Sharp square rounded-sm matching design system) */}
              <div className="w-40 h-40 sm:w-52 sm:h-52 lg:w-56 lg:h-56 shrink-0 aspect-square rounded-sm overflow-hidden shadow-2xs bg-gray-100 border border-gray-100 relative mx-auto lg:mx-0">
                <img
                  src={product.coverImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {product.badge && (
                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs shadow-2xs uppercase tracking-wider">
                      {product.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Details (Takes all remaining width, expansive breathing room) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <div className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {product.categoryLabel.toUpperCase()}
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-gray-950 font-heading leading-snug mb-3">
                    {product.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                    {product.shortDesc}
                  </p>
                </div>

                {/* Format Tag Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-gray-100 text-gray-700 text-xs font-semibold tracking-wide uppercase w-fit">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    {product.category === 'ebook'
                      ? 'PDF'
                      : product.category === 'formation'
                      ? 'VIDÉO'
                      : product.category === 'template'
                      ? 'FICHIERS'
                      : 'PRESTATION'}
                  </span>
                </div>
              </div>

              {/* Buy / Offer Box (Fixed 320px on desktop, full width on mobile, rounded-sm) */}
              <div className="w-full lg:w-[320px] shrink-0">
                <div className="border border-gray-200/90 rounded-sm p-5 bg-white shadow-xs space-y-3.5">
                  
                  {/* Price header */}
                  <div>
                    <div className="text-2xl sm:text-[28px] font-extrabold text-gray-950 font-heading">
                      {formattedPrice}
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-0.5">
                      Offre principale
                    </div>
                  </div>

                  {/* Order Confirmation Screen in Dialog */}
                  {orderResult ? (
                    <div className="p-4 bg-primary-50/70 border border-primary-100 rounded-sm text-center space-y-3">
                      <div className="w-10 h-10 bg-primary-600 text-white rounded-xs flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 font-heading">
                        Commande validée !
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {orderResult.message}
                      </p>
                      <div className="text-[11px] font-mono font-bold text-gray-500">
                        Réf: {orderResult.orderId}
                      </div>
                      {product.deliveryType === 'instant_download' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs rounded-sm"
                          icon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => alert(`Téléchargement initialisé pour ${buyerEmail}`)}
                        >
                          Télécharger le produit
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCheckingOut(false);
                          setOrderResult(null);
                        }}
                        className="text-xs font-semibold text-primary-700 hover:underline block mx-auto"
                      >
                        Nouvelle commande
                      </button>
                    </div>
                  ) : isCheckingOut ? (
                    /* Mobile Money Checkout Form */
                    <form onSubmit={handleCheckoutSubmit} className="space-y-3 pt-1">
                      <div className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
                        <span>Paiement Mobile Money</span>
                        <button
                          type="button"
                          onClick={() => setIsCheckingOut(false)}
                          className="text-[11px] text-gray-500 hover:text-gray-900 font-normal underline"
                        >
                          Annuler
                        </button>
                      </div>

                      <Input
                        label="Votre nom"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Jean-Paul Ngoma"
                        className="text-xs py-1.5 rounded-sm"
                      />

                      <Input
                        label="E-mail (réception de l'accès)"
                        type="email"
                        required
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="jeanpaul@gmail.com"
                        className="text-xs py-1.5 rounded-sm"
                      />

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Opérateur (Congo)
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPaymentChannel('MTN_MOMO_COG')}
                            className={`p-2 rounded-sm border text-left flex items-center gap-1.5 transition-all text-xs ${
                              paymentChannel === 'MTN_MOMO_COG'
                                ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600 font-bold'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-xs bg-yellow-400 text-gray-900 flex items-center justify-center font-black text-[8px] shrink-0">
                              M
                            </span>
                            <span>MTN MoMo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentChannel('AIRTEL_COG')}
                            className={`p-2 rounded-sm border text-left flex items-center gap-1.5 transition-all text-xs ${
                              paymentChannel === 'AIRTEL_COG'
                                ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600 font-bold'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-xs bg-red-600 text-white flex items-center justify-center font-black text-[8px] shrink-0">
                              A
                            </span>
                            <span>Airtel Money</span>
                          </button>
                        </div>
                      </div>

                      <Input
                        label="Numéro Mobile Money"
                        type="tel"
                        required
                        prefixIcon={<Smartphone className="w-3.5 h-3.5" />}
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="+242 06 000 0000"
                        helperText="Validation USSD sur votre téléphone."
                        className="text-xs py-1.5 rounded-sm"
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmitting}
                        icon={<ArrowRight className="w-4 h-4" />}
                        iconPosition="right"
                        className="w-full text-xs font-semibold py-2.5 rounded-sm shadow-xs"
                      >
                        Payer {formattedPrice}
                      </Button>
                    </form>
                  ) : (
                    /* Initial State: Buy button & Secondary Actions */
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (isScopedToMain || window.location.pathname.startsWith('/compte')) {
                            navigate(`/compte/checkout/${product.id}`);
                          } else {
                            navigate(`/checkout/${product.id}`);
                          }
                        }}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-sm flex items-center justify-center gap-2 transition-all shadow-xs text-sm cursor-pointer hover:shadow-md"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Acheter maintenant</span>
                      </button>

                      {/* Secondary Buttons: Save & Share */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(product.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border text-xs font-medium transition-colors cursor-pointer ${
                            isFavorite(product.id)
                              ? 'border-rose-200 bg-rose-50 text-rose-600'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavorite(product.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                          <span>{isFavorite(product.id) ? 'Enregistré' : 'Enregistrer'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleShare}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{isCopied ? 'Lien copié !' : 'Partager'}</span>
                        </button>
                      </div>

                      {/* Guarantee Badge */}
                      <div className="flex items-center gap-1.5 text-xs text-primary-700 font-medium pt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />
                        <span>Garantie satisfait ou remboursé 7 jours</span>
                      </div>

                      {/* WHAT'S INCLUDED / CE QUI EST INCLUS */}
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Ce qui est inclus
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Téléchargement direct après paiement</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Sparkles className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Accès à vie aux contenus & mises à jour</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Smartphone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Consultable sur mobile, tablette & PC</span>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </div>

            </div>
          </div>

          {/* 2. BREADCRUMB & TWO-COLUMN DETAILS SECTION */}
          <div className="p-6 sm:p-7 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <button
                type="button"
                onClick={onClose}
                className="hover:text-gray-700 transition-colors cursor-pointer"
              >
                {isScopedToMain || isAuthenticated ? 'Explorer' : 'Accueil'}
              </button>
              <span>&rsaquo;</span>
              <span>{product.categoryLabel}</span>
              <span>&rsaquo;</span>
              <span className="text-gray-700 font-semibold truncate max-w-xs">
                {product.title}
              </span>
            </div>

            {/* Two Columns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              
              {/* Left Column (8 cols): Book details, Description, Reviews, Related */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Product Details (Format & Category Cards) */}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 font-heading mb-2.5">
                    Détails du produit
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50/80 rounded-sm p-3 border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span>Format</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
                        {product.category === 'ebook'
                          ? 'PDF'
                          : product.category === 'formation'
                          ? 'Modules vidéo'
                          : product.category === 'template'
                          ? 'Fichiers'
                          : 'Prestation'}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 rounded-sm p-3 border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Store className="w-3 h-3 text-gray-400" />
                        <span>Catégorie</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
                        {product.categoryLabel}
                      </div>
                    </div>
                  </div>
                </div>

                {/* About this product (Long Description) */}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 font-heading mb-2.5">
                    À propos de ce produit
                  </h2>
                  <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-2.5">
                    <p>{product.description}</p>
                    {product.features && product.features.length > 0 && (
                      <div className="pt-2">
                        <ul className="space-y-1.5">
                          {product.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                              <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews / Avis Section */}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 font-heading mb-2.5">
                    Avis clients
                  </h2>
                  <div className="border border-gray-200/70 rounded-sm p-5 text-center text-xs text-gray-500 bg-white">
                    {product.reviewsCount > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-extrabold text-sm text-gray-900">
                            {product.rating.toFixed(1)} / 5
                          </span>
                        </div>
                        <span className="text-gray-300 hidden sm:inline">&middot;</span>
                        <span>{product.reviewsCount} avis clients vérifiés</span>
                      </div>
                    ) : (
                      <p>Aucun avis pour ce produit pour le moment.</p>
                    )}
                  </div>
                </div>

                {/* "You may also like" / "Vous pourriez aussi aimer" */}
                {relatedProducts.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 font-heading mb-3">
                      Vous pourriez aussi aimer
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {relatedProducts.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => onSelectProduct(rel)}
                          className="group text-left flex flex-col bg-white rounded-sm border border-gray-100 hover:border-gray-300 p-2 transition-all hover:shadow-2xs cursor-pointer"
                        >
                          <div className="aspect-[1/1.35] rounded-xs overflow-hidden bg-gray-100 mb-2 relative">
                            <img
                              src={rel.coverImage}
                              alt={rel.title}
                              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                            />
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">
                            {rel.categoryLabel}
                          </div>
                          <h3 className="text-xs font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug mt-0.5 mb-1 font-heading">
                            {rel.title}
                          </h3>
                          <div className="text-[11px] text-gray-400 truncate mb-1">
                            {rel.author.name}
                          </div>
                          <div className="mt-auto text-xs font-extrabold text-primary-700 font-heading">
                            {rel.priceXaf.toLocaleString('fr-FR')} FCFA
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column (4 cols): Security, Instant Access, About Producer */}
              <div className="lg:col-span-4 space-y-3.5">
                
                {/* Secure Payment Card */}
                <div className="bg-gray-50/80 rounded-sm p-3.5 border border-gray-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xs bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Paiement sécurisé</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      Transactions chiffrées Mobile Money (MTN MoMo & Airtel).
                    </div>
                  </div>
                </div>

                {/* Instant Access Card */}
                <div className="bg-gray-50/80 rounded-sm p-3.5 border border-gray-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xs bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Accès instantané</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      Disponible immédiatement après confirmation.
                    </div>
                  </div>
                </div>

                {/* ABOUT THE PRODUCER / À PROPOS DU CRÉATEUR */}
                <div className="border border-gray-200 rounded-sm p-4.5 bg-white space-y-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    À propos du créateur
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xs bg-primary-50 text-primary-700 font-bold flex items-center justify-center border border-primary-200 shrink-0 text-xs">
                      {product.author.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {product.author.name}
                      </div>
                      {product.author.verified && (
                        <div className="text-[11px] text-primary-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Producteur vérifié</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                    <div>{product.author.role}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{product.author.location}</div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFollowing(product.author.name)) {
                          unfollowCreator(product.author.name);
                        } else {
                          followCreator({
                            creatorId: product.author.name,
                            creatorName: product.author.name,
                            creatorRole: product.author.role,
                            creatorLocation: product.author.location,
                          });
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm border text-xs font-semibold transition-colors cursor-pointer ${
                        isFollowing(product.author.name)
                          ? 'border-primary-200 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {isFollowing(product.author.name) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-primary-600" />
                          <span>Abonné</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Suivre le créateur</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (isScopedToMain || window.location.pathname.startsWith('/compte')) {
                          navigate(`/compte/explorer?q=${encodeURIComponent(product.author.name)}`);
                        } else {
                          navigate(`/pesquisa?q=${encodeURIComponent(product.author.name)}`);
                        }
                      }}
                      className="block w-full border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 text-xs font-medium py-1.5 px-3 rounded-sm text-center transition-colors cursor-pointer"
                    >
                      Voir les autres produits du créateur
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
