import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormInput, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Connexion réussie !');
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
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
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

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              {showResetForm ? 'Réinitialiser le mot de passe' : 'Connexion'}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400">
              {showResetForm ? 'Saisissez votre email pour recevoir un lien de réinitialisation' : 'Connectez-vous à votre compte'}
            </p>
          </CardHeader>
          <CardContent>
            {showResetForm ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <Input
                  id="resetEmail"
                  type="email"
                  label="Adresse email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                />

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowResetForm(false);
                      setResetEmail('');
                    }}
                    className="flex-1"
                    disabled={resetLoading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetForm(true);
                      setResetEmail(email); // Pré-remplir avec l'email saisi
                    }}
                    className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pas encore de compte ?{' '}
                <Link
                  to="/signup"
                  state={{ from: location.state?.from }}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  S'inscrire
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};