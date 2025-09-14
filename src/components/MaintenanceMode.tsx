import React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';
import { AlertTriangle, Wrench, Clock, LogIn, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const MaintenanceMode: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error('Identifiants incorrects');
      } else {
        toast.success('Connexion réussie !');
        // La redirection sera gérée automatiquement par le contexte auth
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="text-center py-16 px-8">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Wrench className="w-12 h-12 text-orange-600 animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Site en maintenance
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            SignFast est temporairement indisponible pour maintenance. 
            Nous travaillons à améliorer votre expérience.
          </p>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-orange-900 dark:text-orange-300">
                Maintenance en cours
              </span>
            </div>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              • Mise à jour des serveurs<br/>
              • Amélioration des performances<br/>
              • Nouvelles fonctionnalités en préparation
            </p>
          </div>

          {/* Bouton de connexion admin */}
          {!showLogin ? (
            <div className="mb-8">
              <Button
                onClick={() => setShowLogin(true)}
                variant="ghost"
                className="flex items-center space-x-2 mx-auto bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <LogIn className="h-4 w-4" />
                <span>Connexion administrateur</span>
              </Button>
            </div>
          ) : (
            <div className="mb-8 max-w-sm mx-auto">
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Connexion Admin
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLogin(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                      type="email"
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@signfast.com"
                      required
                    />
                    
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        label="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Connexion...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <LogIn className="h-4 w-4" />
                          <span>Se connecter</span>
                        </div>
                      )}
                    </Button>
                  </form>
                  
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    Réservé aux administrateurs système
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Nous serons de retour très bientôt !
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <span>🔧</span>
              <span>Équipe SignFast</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};