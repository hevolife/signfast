import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { stripeConfig } from '../../stripe-config';
import { Button } from '../ui/Button';
import { FormInput, LogOut, LayoutDashboard, Moon, Sun, FileText, HardDrive, Crown, Settings, Shield } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isImpersonating, stopImpersonation } = useAuth();
  const { isSubscribed, subscriptionStatus } = useSubscription();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const product = stripeConfig.products[0];
  
  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const handleSignOut = async () => {
    try {
      await signOut();
      // La redirection est gérée dans signOut()
    } catch (error) {
      console.error('Erreur déconnexion navbar:', error);
      // Fallback: redirection manuelle
      navigate('/');
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <FormInput className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              SignFast
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <>
                {/* Bannière d'impersonation */}
                {isImpersonating && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={stopImpersonation}
                    className="text-red-600 hover:text-red-700 hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Arrêter l'impersonation
                  </Button>
                )}
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link to="/forms">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Mes Formulaires</span>
                  </Button>
                </Link>
                <Link to="/pdf/templates">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Templates PDF</span>
                  </Button>
                </Link>
                <Link to="/pdf/manager">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4" />
                    <span>PDFs sauvegardés</span>
                  </Button>
                </Link>
                {isSuperAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-red-600 hover:text-red-700">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Button>
                  </Link>
                )}
                <Link to="/settings">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Déconnexion</span>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">
                      S'inscrire
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile: Only dark mode toggle and logo */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};