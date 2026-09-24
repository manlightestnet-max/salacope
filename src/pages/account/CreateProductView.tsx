import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Layers, DollarSign, FileUp, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const FILE_TYPES: Array<'PDF' | 'DOC' | 'DOCX' | 'ZIP' | 'TEMPLATE' | 'AUTRE'> = [
  'PDF',
  'DOC',
  'DOCX',
  'ZIP',
  'TEMPLATE',
  'AUTRE',
];

const PRODUCT_CATEGORIES = [
  'E-books & Guides Pratiques',
  'Documents Juridiques & Contrats',
  'Templates Notion & Tableurs Excel',
  'Formations & Cours en Ligne',
  'Kits Graphiques & Typographies',
  'Code Source & Scripts',
  'Autre Fichier Numérique',
];

export const CreateProductView: React.FC = () => {
  const { createDigitalProduct } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState<'PDF' | 'DOC' | 'DOCX' | 'ZIP' | 'TEMPLATE' | 'AUTRE'>('PDF');
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priceXaf, setPriceXaf] = useState<number | ''>('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !priceXaf) return;

    setIsSubmitting(true);

    const fallbackCover =
      coverImageUrl.trim() ||
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';

    const fallbackFileName = fileName.trim() || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${fileType.toLowerCase()}`;

    createDigitalProduct({
      title: title.trim(),
      fileType,
      fileName: fallbackFileName,
      coverImage: fallbackCover,
      description: description.trim(),
      priceXaf: Number(priceXaf),
      category,
    });

    setIsSubmitting(false);
    navigate('/dashboard/produits');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/produits"
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-950 font-heading">
            Mettre en vente un produit digital
          </h1>
          <p className="text-xs text-gray-500">
            Configurez votre fichier téléchargeable pour distribution immédiate après paiement.
          </p>
        </div>
      </div>

      {/* Product Form */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 sm:p-6 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Titre du produit numérique"
            type="text"
            required
            placeholder="Ex: Guide pratique de la comptabilité pour PME au Congo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xs rounded-sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Type de fichier (Format)
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full text-xs py-2 px-3 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-600/30 text-gray-900"
              >
                {FILE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    Format {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-600/30 text-gray-900"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Nom du fichier source livré au client"
            type="text"
            placeholder="Ex: guide_comptabilite_2026.pdf"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            prefixIcon={<FileUp className="w-3.5 h-3.5 text-gray-400" />}
            helperText="Le client télécharge ce fichier directement après confirmation de paiement."
            className="text-xs rounded-sm"
          />

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Description & sommaire
            </label>
            <textarea
              required
              rows={4}
              placeholder="Présentez le contenu du document, les chapitres, les prérequis et les bénéfices pour l'acheteur."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 bg-white border border-gray-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-600/30 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Prix de vente en FCFA (XAF)"
              type="number"
              required
              min={500}
              step={500}
              placeholder="Ex: 5000"
              value={priceXaf === '' ? '' : priceXaf}
              onChange={(e) => setPriceXaf(e.target.value ? Number(e.target.value) : '')}
              prefixIcon={<DollarSign className="w-3.5 h-3.5 text-gray-400" />}
              className="text-xs rounded-sm"
            />

            <Input
              label="Image de couverture (URL)"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              prefixIcon={<ImageIcon className="w-3.5 h-3.5 text-gray-400" />}
              helperText="Couverture ou aperçu du fichier."
              className="text-xs rounded-sm"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link to="/dashboard/produits">
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
              {isSubmitting ? 'Publication...' : 'Mettre en vente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
