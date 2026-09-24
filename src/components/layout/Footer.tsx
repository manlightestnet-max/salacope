import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Mail, MapPin } from 'lucide-react';
import { Container } from './Container';
import { useAuth } from '../../context/AuthContext';

export const Footer: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <footer className="bg-white text-gray-600 text-xs border-t border-gray-200 mt-auto">
      <Container className="pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-4 space-y-4">
            <Link to={isAuthenticated ? "/compte/explorer" : "/"} className="flex items-center gap-2.5 select-none">
              <div className="w-7 h-7 rounded-sm bg-primary-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-gray-950 tracking-tight font-heading">
                Salacope<span className="text-primary-600">.online</span>
              </span>
            </Link>

            <p className="text-gray-500 text-xs leading-relaxed max-w-sm">
              Achetez, apprenez et monétisez vos compétences numériques au Congo. Paiements sécurisés via MTN Mobile Money &amp; Airtel Money.
            </p>

            <div className="space-y-2 pt-1 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href="mailto:contact@salacope.online" className="hover:text-primary-700 transition-colors">
                  contact@salacope.online
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Brazzaville &middot; Luanda</span>
              </div>
            </div>
          </div>

          {/* Products Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 font-heading">
              Produits
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/?cat=formation" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Formations &amp; Cours
                </Link>
              </li>
              <li>
                <Link to="/?cat=ebook" className="text-gray-500 hover:text-primary-700 transition-colors">
                  E-books
                </Link>
              </li>
              <li>
                <Link to="/?cat=service" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Services Freelance
                </Link>
              </li>
              <li>
                <Link to="/?cat=template" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Templates &amp; Fichiers
                </Link>
              </li>
              <li>
                <Link to="/?cat=mentorat" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Mentorats
                </Link>
              </li>
              <li>
                <span className="text-gray-400 cursor-not-allowed">
                  Espaces membres
                </span>
              </li>
            </ul>
          </div>

          {/* Create Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 font-heading">
              Créer
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/vendre" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Gagner de l'argent
                </Link>
              </li>
              <li>
                <Link to="/vendre" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Créer un compte
                </Link>
              </li>
              <li>
                <Link to="/vendre" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>

          {/* Help Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 font-heading">
              Aide
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="mailto:contact@salacope.online" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Centre d'aide
                </a>
              </li>
              <li>
                <a href="mailto:contact@salacope.online" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Contacter le support
                </a>
              </li>
              <li>
                <Link to="/pesquisa" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Recherche
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 font-heading">
              Légal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/legal" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Mentions Légales
                </Link>
              </li>
              <li>
                <Link to="/legal/termos" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/legal/privacidade" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Confidentialité &amp; Données
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Politique de cookies
                </Link>
              </li>
              <li>
                <Link to="/legal/kyb" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Fiche KYB &amp; Entité
                </Link>
              </li>
              <li>
                <Link to="/legal/reembolso" className="text-gray-500 hover:text-primary-700 transition-colors">
                  Politique de remboursement
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-3">
          <div>
            &copy; 2026 Salacope &middot; Marketplace de produits digitaux. Tous droits r&eacute;serv&eacute;s.
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-sm border border-gray-200 text-[11px] font-medium text-gray-500 bg-gray-50">
              FR
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
};
