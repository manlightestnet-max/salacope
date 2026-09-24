import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, DollarSign, Clock, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const SERVICE_CATEGORIES = [
  'Graphisme & Identité Visuelle',
  'Montage Vidéo & Motion Design',
  'Développement Web & Mobile',
  'Rédaction & Copywriting',
  'Marketing Digital & Publicité',
  'Photographie & Audiovisuel',
  'Assistance & Consulting',
  'Autre Prestation',
];

export const CreateServiceView: React.FC = () => {
  const { createService } = useAuth();
  const navigate = useNavigate();

  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [priceXaf, setPriceXaf] = useState<number | ''>('');
  const [deliveryDays, setDeliveryDays] = useState('2 jours');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !description.trim() || !priceXaf) return;

    setIsSubmitting(true);

    const fallbackImage = imageUrl.trim() || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80';

    createService({
      serviceName: serviceName.trim(),
      description: description.trim(),
      category,
      images: [fallbackImage],
      priceXaf: Number(priceXaf),
      deliveryDays,
    });

    setIsSubmitting(false);
    navigate('/dashboard/services');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/services"
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Publier un nouveau service
          </h1>
          <p className="text-xs text-gray-500">
            Complétez la fiche de votre prestation pour la proposer aux clients.
          </p>
        </div>
      </div>

      {/* Service Form */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 sm:p-6 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom du service (titre)"
            type="text"
            required
            placeholder="Ex: Création de logo professionnel vectoriel"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="text-xs rounded-sm"
          />

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Catégorie de la prestation
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-600/30 text-gray-900"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Description détaillée
            </label>
            <textarea
              required
              rows={4}
              placeholder="Décrivez précisément ce qui est inclus dans votre offre, les livrables finaux et les conditions de révision."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-600/30 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tarif en FCFA (XAF)"
              type="number"
              required
              min={500}
              step={500}
              placeholder="Ex: 15000"
              value={priceXaf === '' ? '' : priceXaf}
              onChange={(e) => setPriceXaf(e.target.value ? Number(e.target.value) : '')}
              prefixIcon={<DollarSign className="w-3.5 h-3.5 text-gray-400" />}
              className="text-xs rounded-sm"
            />

            <Input
              label="Délai de réalisation"
              type="text"
              required
              placeholder="Ex: 48 heures ou 3 jours"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
              prefixIcon={<Clock className="w-3.5 h-3.5 text-gray-400" />}
              className="text-xs rounded-sm"
            />
          </div>

          <Input
            label="Image vitrine (URL)"
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            prefixIcon={<ImageIcon className="w-3.5 h-3.5 text-gray-400" />}
            helperText="Laissez vide pour utiliser une illustration soignée par défaut."
            className="text-xs rounded-sm"
          />

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link to="/dashboard/services">
              <Button type="button" variant="outline" size="sm" className="text-xs rounded-sm">
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="text-xs rounded-sm font-semibold px-4"
            >
              {isSubmitting ? 'Publication...' : 'Publier la prestation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
