import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormInput } from 'lucide-react';
import toast from 'react-hot-toast';

export const Signup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
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
              toast.success(`🎉 Inscription réussie ! Vous avez été parrainé avec ${result.commission_rate}% de commission pour votre parrain.`);
            } else {
              console.warn('⚠️ Erreur tracking affiliation:', result.error);
              toast.success('Compte créé avec succès !');
            }
          } catch (affiliateError) {
            console.error('❌ Erreur tracking affiliation:', affiliateError);
            toast.success('Compte créé avec succès !');
          }
        } else {
          toast.success('Compte créé avec succès !');
        }
        
        toast.success('🎉 Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription et accéder à SignFast.');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <FormInput className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              SignFast
            </span>
          </Link>
        </div>

        {/* Bannière de parrainage */}
        {affiliateCode && (
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-2xl">🎉</span>
                <span className="font-semibold text-green-900 dark:text-green-300">
                  Vous avez été parrainé !
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                Code de parrainage : <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono">{affiliateCode}</code>
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Créer un compte
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Commencez à créer vos formulaires
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
              />
              
              <Input
                id="password"
                type="password"
                label="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Création...' : 'Créer mon compte'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Déjà un compte ?{' '}
                <Link
                  to="/login"
                  state={{ from: location.state?.from }}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};