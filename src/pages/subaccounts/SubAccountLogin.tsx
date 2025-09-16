import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubAccount } from '../../contexts/SubAccountContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormInput, Users, Eye, EyeOff, LogIn, ArrowRight, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export const SubAccountLogin: React.FC = () => {
  const [mainAccountEmail, setMainAccountEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginAsSubAccount } = useSubAccount();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mainAccountEmail.trim() || !username.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const success = await loginAsSubAccount(mainAccountEmail, username, password);
      
      if (success) {
        toast.success('Connexion réussie !');
        navigate('/sub-account/dashboard');
      } else {
        toast.error('Authentification sous-compte non disponible. Veuillez contacter l\'administrateur.');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo moderne */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FormInput className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SignFast
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Connexion sous-compte
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl mb-6 shadow-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Accès Sous-Compte
              </h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Connectez-vous avec vos identifiants de sous-compte
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  id="mainAccountEmail"
                  type="email"
                  label="Email du compte principal"
                  value={mainAccountEmail}
                  onChange={(e) => setMainAccountEmail(e.target.value)}
                  required
                  placeholder="compte.principal@email.com"
                  className="bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium shadow-lg transition-all"
                />
                
                <Input
                  id="username"
                  type="text"
                  label="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  placeholder="votre_nom_utilisateur"
                  className="bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium shadow-lg transition-all"
                />
                
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium shadow-lg transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Connexion...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <LogIn className="h-5 w-5" />
                    <span>Se connecter</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Informations d'aide */}
            <div className="mt-8">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      Accès restreint
                    </h3>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <div>📁 Accès au stockage PDF uniquement</div>
                    <div>📥 Téléchargement des documents</div>
                    <div>🔒 Aucun accès aux autres fonctionnalités</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};