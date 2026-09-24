import React, { useState } from 'react';
import { Container } from '../components/layout/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { submitCreatorApplication } from '../lib/api';
import { CheckCircle2, TrendingUp, Smartphone, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const BecomeCreator: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Brazzaville');
  const [category, setCategory] = useState('ebook');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await submitCreatorApplication({
      name,
      email,
      phone,
      city,
      category,
      portfolioOrDescription: description,
    });
    setIsSubmitting(false);
    if (result.success) {
      setSuccessMessage(result.message);
    }
  };

  return (
    <div className="py-12 bg-gray-50">
      <Container size="default">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au catalogue</span>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary-700 font-heading mb-2">
              Programme Créateurs & Freelances
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 font-heading tracking-tight">
              Monétisez votre savoir-faire au Congo
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl mx-auto">
              Rejoignez Salacope.online et commencez à encaisser vos ventes directement par MTN MoMo et Airtel Money sans barrière technique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Value Props */}
            <div className="md:col-span-5 space-y-4">
              <Card className="p-6 bg-white border-gray-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-heading mb-4">
                  Pourquoi vendre sur Salacope ?
                </h3>

                <div className="space-y-4 text-xs text-gray-700">
                  <div className="flex gap-3">
                    <Smartphone className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-900">Encaissement Mobile Money Natif</div>
                      <div className="text-gray-500 mt-0.5">Vos clients payent en FCFA avec MTN MoMo ou Airtel Money en 1 clic.</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <TrendingUp className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-900">Zéro Frais Mensuels</div>
                      <div className="text-gray-500 mt-0.5">Aucun abonnement fixe. Une simple commission de service est prélevée uniquement lorsque vous vendez.</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-gray-900">Garantie & Sécurité</div>
                      <div className="text-gray-500 mt-0.5">Protection des droits d'auteur et intermédiation sécurisée des paiements.</div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="p-4 bg-primary-50 border border-primary-200/80 rounded-lg text-xs text-primary-950">
                <strong>Critères de validation :</strong> Nous vérifions l'identité des formateurs et des prestataires freelances (KYC) avant l'autorisation des retraits pour garantir un écosystème de haute confiance.
              </div>
            </div>

            {/* Application Form */}
            <div className="md:col-span-7">
              <Card className="p-6 sm:p-8 bg-white border-gray-200">
                {successMessage ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold font-heading text-gray-950 mb-2">
                      Candidature transmise avec succès !
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mb-6">
                      {successMessage}
                    </p>
                    <Button to="/" variant="outline" size="sm">
                      Retourner au catalogue
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-base font-bold text-gray-900 font-heading border-b border-gray-100 pb-3">
                      Formulaire d'adhésion créateur
                    </h3>

                    <Input
                      label="Nom complet ou raison sociale"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Cynthia Ngoma ou Studio Maya"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Adresse e-mail professionnelle"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@exemple.cg"
                      />

                      <Input
                        label="Numéro WhatsApp / Téléphone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+242 06 000 0000"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Votre Ville de Résidence
                        </label>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-primary-600 text-gray-900"
                        >
                          <option value="Brazzaville">Brazzaville</option>
                          <option value="Pointe-Noire">Pointe-Noire</option>
                          <option value="Dolisie">Dolisie</option>
                          <option value="Autre">Autre localité en R. Congo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Nature de vos créations
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-primary-600 text-gray-900"
                        >
                          <option value="ebook">E-books & Guides PDF</option>
                          <option value="formation">Formations & Cours en ligne</option>
                          <option value="service">Services Freelance (Design, Code, Traduction)</option>
                          <option value="template">Templates Canva / Excel / Code</option>
                          <option value="mentorat">Coaching & Mentorat 1:1</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Description de votre offre ou lien portfolio
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Présentez brièvement ce que vous souhaitez publier ou vendre sur Salacope..."
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-primary-600 text-gray-900"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isSubmitting}
                        icon={<ArrowRight className="w-4 h-4" />}
                        iconPosition="right"
                        className="w-full shadow-xs"
                      >
                        Soumettre ma candidature de créateur
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>

          </div>
        </div>
      </Container>
    </div>
  );
};
