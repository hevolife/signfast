import React, { useState } from 'react';
import { formatDateFR } from '../utils/dateFormatter';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { SecretCodeModal } from '../components/subscription/SecretCodeModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Crown, Check, Zap, Calendar, CreditCard, AlertCircle, Key, Gift } from 'lucide-react';
import { stripeConfig } from '../stripe-config';
import toast from 'react-hot-toast';

export const Subscription: React.FC = () => {
  const { user } = useAuth();
  const { 
    isSubscribed, 
    subscriptionStatus, 
    currentPeriodEnd, 
    cancelAtPeriodEnd,
    hasSecretCode,
    secretCodeType,
    secretCodeExpiresAt,
    loading: subscriptionLoading 
  } = useSubscription();
  const { forms, pdfTemplates, savedPdfs, loading: limitsLoading } = useLimits();
  const [loading, setLoading] = useState(false);
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour vous abonner');
      return;
    }

    setLoading(true);
    try {
      // Vérifier que l'utilisateur est connecté et récupérer le token de session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }
      
      const product = stripeConfig.products[0];
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: product.priceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/subscription?canceled=true`,
          mode: product.mode,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Erreur lors de la création de la session de paiement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return formatDateFR(new Date(timestamp * 1000));
  };

  const handleSecretCodeSuccess = () => {
    // Rafraîchir les données d'abonnement après activation d'un code
    window.location.reload();
  };

  // Vérifier les paramètres URL pour les messages de succès/échec
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('🎉 Abonnement activé avec succès ! Bienvenue dans FormBuilder Pro !');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      toast.error('❌ Paiement annulé. Vous pouvez réessayer à tout moment.');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (subscriptionLoading || limitsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const product = stripeConfig.products[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Abonnement SignFast
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Débloquez toutes les fonctionnalités pour créer sans limites
          </p>
          
          {/* Bouton Code Secret */}
          <div className="mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowSecretCodeModal(true)}
              className="flex items-center space-x-2 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
            >
              <Key className="h-4 w-4" />
              <span>J'ai un code secret</span>
            </Button>
          </div>
        </div>

        {/* Affichage du code secret actif */}
        {hasSecretCode && (
          <Card className="mb-8 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Gift className="h-5 w-5 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                    Code Secret Actif !
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    {secretCodeType === 'lifetime' 
                      ? '🎉 Accès à vie débloqué !' 
                      : `Accès premium jusqu'au ${secretCodeExpiresAt ? new Date(secretCodeExpiresAt).toLocaleDateString('fr-FR') : 'N/A'}`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Gratuit */}
          <Card className={`${!isSubscribed ? 'ring-2 ring-gray-300' : ''}`}>
            <CardHeader>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Plan Gratuit
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  0€
                  <span className="text-sm font-normal text-gray-500">/mois</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Formulaires</span>
                  <span className="text-sm font-medium">
                    {forms.current}/{stripeConfig.freeLimits.maxForms}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Templates PDF</span>
                  <span className="text-sm font-medium">
                    {pdfTemplates.current}/{stripeConfig.freeLimits.maxPdfTemplates}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">PDFs sauvegardés</span>
                  <span className="text-sm font-medium">
                    {savedPdfs.current}/{stripeConfig.freeLimits.maxSavedPdfs}
                  </span>
                </div>
              </div>
              
              {!isSubscribed && (
                <div className="text-center pt-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                    Plan actuel
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Pro */}
          <Card className={`${isSubscribed ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-300'} relative`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-600 text-white">
                <Crown className="h-4 w-4 mr-1" />
                Recommandé
              </span>
            </div>
            <CardHeader>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {product.name}
                </h3>
                <div className="text-3xl font-bold text-blue-600">
                  {product.price}€
                  <span className="text-sm font-normal text-gray-500">/mois</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {product.description}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {isSubscribed ? (
                <div className="space-y-3 pt-4">
                  <div className="text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Crown className="h-4 w-4 mr-1" />
                      {hasSecretCode ? 'Accès Premium Actif' : 'Abonnement actif'}
                    </span>
                  </div>
                  
                  {hasSecretCode && secretCodeType === 'lifetime' && (
                    <div className="text-center text-sm text-purple-600 dark:text-purple-400">
                      <Gift className="h-4 w-4 inline mr-1" />
                      Accès à vie via code secret
                    </div>
                  )}
                  
                  {hasSecretCode && secretCodeType === 'monthly' && secretCodeExpiresAt && (
                    <div className="text-center text-sm text-purple-600 dark:text-purple-400">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Code secret expire le {new Date(secretCodeExpiresAt).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  
                  {currentPeriodEnd && !hasSecretCode && (
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {cancelAtPeriodEnd ? 'Se termine le' : 'Renouvellement le'} {formatDate(currentPeriodEnd)}
                    </div>
                  )}

                  {cancelAtPeriodEnd && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-300">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Votre abonnement sera annulé à la fin de la période
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Plan actuel:</span> {hasSecretCode ? 'Premium (Code Secret)' : product.name}
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Passer Pro</span>
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card className="mt-8">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Questions fréquentes
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Comment fonctionnent les codes secrets ?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Les codes secrets permettent de débloquer l'accès premium gratuitement. Il existe des codes mensuels (1 mois d'accès) et des codes à vie (accès permanent).
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Puis-je annuler mon abonnement à tout moment ?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Oui, vous pouvez annuler votre abonnement à tout moment. Vous conserverez l'accès aux fonctionnalités Pro jusqu'à la fin de votre période de facturation.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Que se passe-t-il si j'annule mon abonnement ?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vos formulaires et templates existants resteront accessibles, mais vous serez limité aux quotas du plan gratuit pour les nouvelles créations.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Les paiements sont-ils sécurisés ?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Oui, tous les paiements sont traités de manière sécurisée par Stripe, leader mondial du paiement en ligne.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Modal Code Secret */}
        <SecretCodeModal
          isOpen={showSecretCodeModal}
          onClose={() => setShowSecretCodeModal(false)}
          onSuccess={handleSecretCodeSuccess}
        />
      </div>
    </div>
  );
};