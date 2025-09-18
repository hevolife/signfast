import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { CheckCircle, Crown, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSubscription, isSubscribed } = useSubscription();
  const product = stripeConfig.products[0];

  useEffect(() => {
    // Rafraîchir les données d'abonnement
    refreshSubscription();
    
    // Afficher un message de succès
    toast.success('🎉 Abonnement activé avec succès !', {
      duration: 5000,
      icon: '🚀',
    });

    // Rediriger vers le dashboard après 5 secondes
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [refreshSubscription, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 flex items-center justify-center py-12 px-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenue dans SignFast Pro ! 🎉
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Votre abonnement <strong>{product.name}</strong> est maintenant actif
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Fonctionnalités débloquées
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-bold text-sm">💡</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Prêt à commencer ?
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Vous pouvez maintenant créer des formulaires illimités et générer autant de PDFs que vous le souhaitez !
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/dashboard" className="flex-1">
              <Button className="w-full flex items-center justify-center space-x-2">
                <span>Aller au Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            
            <Link to="/forms/new" className="flex-1">
              <Button variant="secondary" className="w-full">
                Créer mon premier formulaire
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirection automatique vers le dashboard dans quelques secondes...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};