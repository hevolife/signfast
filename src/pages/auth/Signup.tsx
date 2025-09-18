import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { pwaManager } from '../../main';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormInput, Eye, EyeOff, UserPlus, ArrowRight, Gift, Crown, Sparkles, CheckCircle, Lock as LockIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export const Signup: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Détecter si on arrive depuis une PWA
  const isPWAMode = pwaManager.isPWAMode();
  const isFromPWA = new URLSearchParams(location.search).get('pwa') === 'true';
  
  // Récupérer le code d'affiliation depuis l'URL
  const affiliateCode = searchParams.get('ref');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(email, password);
      
      if (error) {
        // Gérer spécifiquement l'erreur de rate limit
        if (error.message.includes('over_email_send_rate_limit') || error.message.includes('rate_limit')) {
          toast.error('Trop de tentatives d\'inscription. Veuillez patienter quelques secondes avant de réessayer.', {
            duration: 6000,
          });
        } else if (error.message.includes('User already registered') || error.message.includes('already registered')) {
          toast.error('Un compte existe déjà avec cette adresse email. Essayez de vous connecter ou utilisez une autre adresse.', {
            duration: 6000,
          });
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.', {
            duration: 6000,
          });
        } else {
          toast.error(error.message);
        }
      } else {
        // Forcer la persistance de la session sur cet appareil
        if (data.session) {
          console.log('🔐 Session établie sur cet appareil après inscription');
          localStorage.setItem('sb-auth-token', JSON.stringify(data.session));
        }
        
        // Si inscription réussie et code d'affiliation présent, tracker le parrainage
        if (data.user && affiliateCode) {
          try {
            console.log('🔗 Tracking affiliate signup:', affiliateCode, 'for user:', data.user.id);
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-affiliate-signup`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                affiliate_code: affiliateCode,
                referred_user_id: data.user.id
              }),
            });

            const result = await response.json();
            
            if (result.success) {
              toast.success(`🎉 Inscription réussie ! Vous avez été parrainé avec ${result.commission_rate}% de commission pour votre parrain.`, { duration: 2000 });
            } else {
              console.warn('⚠️ Erreur tracking affiliation:', result.error);
              toast.success('Compte créé avec succès !', { duration: 2000 });
            }
          } catch (affiliateError) {
            console.error('❌ Erreur tracking affiliation:', affiliateError);
            toast.success('Compte créé avec succès !', { duration: 2000 });
          }
        } else {
          toast.success('Compte créé avec succès !', { duration: 2000 });
        }
        
        toast.success('🎉 Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription et accéder à SignFast.', { duration: 2000 });
        
        // Gestion de la redirection selon le contexte
        if (isPWAMode || isFromPWA) {
          console.log('📱 Inscription PWA réussie, redirection dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          // Rediriger vers la page demandée ou le dashboard
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo moderne */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FormInput className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              SignFast
            </span>
          </Link>
          {(isPWAMode || isFromPWA) && (
            <div className="mt-3 inline-flex items-center space-x-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
              <span className="text-lg">📱</span>
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                Mode Application
              </span>
            </div>
          )}
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Rejoignez des milliers d'utilisateurs
          </p>
        </div>

        {/* Bannière de parrainage */}
        {affiliateCode && (
          <Card className="mb-6 border-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-xl">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <Gift className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-green-900 dark:text-green-300 text-lg">
                  Vous avez été parrainé !
                </span>
              </div>
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Code de parrainage : 
                  <code className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded font-mono ml-2 text-green-800 dark:text-green-300">
                    {affiliateCode}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl mb-6 shadow-lg">
                <UserPlus className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t('auth.signup.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {t('auth.signup.subtitle')}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  id="email"
                  type="email"
                  label={t('auth.signup.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="bg-white border-gray-300 focus:border-purple-500 rounded-xl font-medium shadow-lg transition-all touch-manipulation"
                  style={{ 
                    WebkitAppearance: 'none',
                    fontSize: '16px',
                    minHeight: '44px'
                  }}
                />
                
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label={t('auth.signup.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white border-gray-300 focus:border-purple-500 rounded-xl font-medium shadow-lg transition-all pr-12 touch-manipulation"
                    style={{ 
                      WebkitAppearance: 'none',
                      fontSize: '16px',
                      minHeight: '44px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors touch-manipulation"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label={t('auth.signup.confirm')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white border-gray-300 focus:border-purple-500 rounded-xl font-medium shadow-lg transition-all pr-12 touch-manipulation"
                    style={{ 
                      WebkitAppearance: 'none',
                      fontSize: '16px',
                      minHeight: '44px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors touch-manipulation"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Indicateur de force du mot de passe */}
              {password && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <LockIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Force du mot de passe
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className={`flex items-center space-x-2 text-xs ${password.length >= 6 ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Au moins 6 caractères</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Une majuscule (recommandé)</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="h-3 w-3" />
                      <span>Un chiffre (recommandé)</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('common.loading')}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>{t('auth.signup.submit')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200/50 dark:border-gray-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-medium backdrop-blur-sm rounded-full">
                    Déjà un compte ?
                  </span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link
                  to="/login"
                  state={{ from: location.state?.from }}
                  className="group"
                >
                  <Button 
                    variant="ghost" 
                    className="w-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 hover:from-blue-200 hover:to-indigo-200 dark:hover:from-blue-800 dark:hover:to-indigo-800 font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>{t('auth.signup.login')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avantages de SignFast */}
        <div className="mt-8">
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2 mb-3">
                  <Crown className="h-5 w-5 text-indigo-600" />
                  <span className="font-bold text-indigo-900 dark:text-indigo-300">
                    Pourquoi choisir SignFast ?
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center space-x-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm">✅</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Gratuit pour commencer</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Aucune carte bancaire requise</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm">⚡</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Configuration en 2 minutes</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Interface intuitive et guidée</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm">🔒</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Sécurité maximale</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Conforme RGPD • Hébergé en France</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};