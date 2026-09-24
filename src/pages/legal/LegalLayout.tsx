import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Card } from '../../components/ui/Card';
import { Building2, FileText, RefreshCw, Lock, ArrowLeft, ShieldCheck, Cookie } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LegalLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navItems = [
    { to: '/legal', label: 'Mentions Légales', icon: <ShieldCheck className="w-4 h-4" />, end: true },
    { to: '/legal/kyb', label: 'Fiche d’Entreprise (KYB)', icon: <Building2 className="w-4 h-4" /> },
    { to: '/legal/termos', label: 'Conditions Générales (CGU)', icon: <FileText className="w-4 h-4" /> },
    { to: '/legal/privacidade', label: 'Politique de Confidentialité', icon: <Lock className="w-4 h-4" /> },
    { to: '/legal/cookies', label: 'Politique de Cookies', icon: <Cookie className="w-4 h-4" /> },
    { to: '/legal/reembolso', label: 'Politique de Remboursement', icon: <RefreshCw className="w-4 h-4" /> },
  ];

  return (
    <div className="py-6 sm:py-8 bg-gray-50">
      <Container size="default">
        {/* Grid Layout: Left Column (Sticky) + Right Column (Scrollable) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Back Link + Page Title + Sidebar Nav (Sticky on Desktop) */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start space-y-6">
            {/* Back Link */}
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour au catalogue</span>
              </Link>
            </div>

            {/* Page Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 font-heading">
                Mentions Légales &amp; Politiques
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Informations institutionnelles et cadre réglementaire de Salacope.online.
              </p>
            </div>

            {/* Sidebar Navigation */}
            <Card className="p-3 bg-white border border-gray-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2">
                Navigation Juridique
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-800'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="shrink-0 text-gray-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Pied de sidebar en texte simple, pas de card */}
              <div className="mt-4 pt-3 border-t border-gray-100 px-3 pb-1 text-[11px] text-gray-500">
                Opéré par <span className="font-semibold text-gray-700">LÍDIA &amp; MARIANA LDA</span><br />
                NIF : <span className="font-mono text-gray-600">5001873490</span>
              </div>
            </Card>
          </div>

          {/* Right Column: Scrollable Legal Content Outlet */}
          <div className="lg:col-span-8 lg:h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
            <Card className="p-8 sm:p-10 border border-gray-200 leading-relaxed text-xs sm:text-sm text-gray-700">
              <Outlet />
            </Card>
          </div>

        </div>
      </Container>
    </div>
  );
};
