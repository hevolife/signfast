import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormInput, Mail, Eye, EyeOff, Lock as LockIcon, ArrowRight, Sparkles, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSubAccountMode, setIsSubAccountMode] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.');
        } else {
          toast.error(error.message);
        }
      } else {
        // Forcer la persistance de la session sur cet appareil
        if (data.session) {
          console.log('🔐 Session établie sur cet appareil');
          localStorage.setItem('sb-auth-token', JSON.stringify(data.session));
        }
        
        toast.success('Connexion réussie !', { duration: 2000 });
        // Rediriger vers la page demandée ou le dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    setResetLoading(true);

    try {
      // Déterminer l'URL de redirection selon l'environnement
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173' 
        : 'https://signfastpro.com';
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${baseUrl}/dashboard`,
        data: {
          site_url: baseUrl,
          site_name: 'SignFast'
        }
      });

      if (error) {
        if (error.message.includes('over_email_send_rate_limit')) {
          toast.error('Trop de tentatives. Veuillez patienter quelques secondes avant de réessayer.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
        setShowResetForm(false);
        setResetEmail('');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'email de réinitialisation');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo moderne */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FormInput className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SignFast
            </span>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Signature électronique simplifiée
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl mb-6 shadow-lg">
                {isSubAccountMode ? (
                  <Users className="h-8 w-8 text-purple-600" />
                ) : (
                  <LockIcon className="h-8 w-8 text-blue-600" />
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {showResetForm ? 'Réinitialiser' : isSubAccountMode ? 'Connexion Sous-Compte' : 'Connexion'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {showResetForm 
                  ? 'Saisissez votre email pour recevoir un lien de réinitialisation' 
                  : isSubAccountMode
                  ? 'Accès restreint au stockage PDF uniquement'
                  : 'Connectez-vous à votre espace SignFast'
                }
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {/* Toggle entre connexion normale et sous-compte */}
            {!showResetForm && (
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-semibold transition-colors ${!isSubAccountMode ? 'text-blue-600' : 'text-gray-500'}`}>
                      Compte principal
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSubAccountMode(!isSubAccountMode)}
                      className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      style={{
                        backgroundColor: isSubAccountMode ? '#8b5cf6' : '#3b82f6'
                      }}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                          isSubAccountMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-semibold transition-colors ${isSubAccountMode ? 'text-purple-600' : 'text-gray-500'}`}>
                      Sous-compte
                    </span>
                  </div>
                </div>
                
                {isSubAccountMode && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                        Connexion sous-compte
                      </span>
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-400 space-y-1">
                      <div>📁 Accès au stockage PDF uniquement</div>
                      <div>📥 Téléchargement des documents</div>
                      <div>🔒 Aucun accès aux autres fonctionnalités</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showResetForm ? (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    id="resetEmail"
                    type="email"
                    label="Adresse email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="bg-white border-gray-300 focus:border-blue-500 rounded-xl font-medium shadow-lg transition-all touch-manipulation"
                    style={{ 
                      WebkitAppearance: 'none',
                      fontSize: '16px',
                      minHeight: '44px'
                    }}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowResetForm(false);
                      setResetEmail('');
                    }}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={resetLoading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Envoi...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Envoyer</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              isSubAccountMode ? (
                // Redirection vers la page de connexion sous-compte
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">
                          Connexion Sous-Compte
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-400">
                          Accès restreint au stockage PDF
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                      Les sous-comptes ont un accès limité au stockage PDF du compte principal.
                      Vous aurez besoin de vos identifiants spécifiques de sous-compte.
                    </p>
                    <Link to="/sub-account/login">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl">
                        <Users className="h-5 w-5 mr-2" />
                        Accéder à la connexion sous-compte
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    id="email"
                    type="email"
                    label="Adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
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
                      <span>Se connecter</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetForm(true);
                      setResetEmail(email); // Pré-remplir avec l'email saisi
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
              )
            )}

            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200/50 dark:border-gray-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-medium backdrop-blur-sm rounded-full">
                    Nouveau sur SignFast ?
                  </span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link
                  to="/signup"
                  state={{ from: location.state?.from }}
                  className="group"
                >
                  <Button 
                    variant="ghost" 
                    className="w-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-800 dark:hover:to-pink-800 font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl border border-purple-200 dark:border-purple-800"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Créer un compte gratuit</span>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités en bas */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                <span className="text-lg">🔒</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Sécurisé</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                <span className="text-lg">⚡</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Rapide</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                <span className="text-lg">🇫🇷</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Français</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};