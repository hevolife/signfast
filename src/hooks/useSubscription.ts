import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

export interface SubscriptionData {
  isSubscribed: boolean;
  subscriptionStatus: string | null;
  priceId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  hasSecretCode: boolean;
  secretCodeType: string | null;
  secretCodeExpiresAt: string | null;
  loading: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    isSubscribed: false,
    subscriptionStatus: null,
    priceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasSecretCode: false,
    secretCodeType: null,
    secretCodeExpiresAt: null,
    loading: true,
  });

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription({
        isSubscribed: isDemoMode, // Activer l'abonnement en mode démo
        subscriptionStatus: null,
        priceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasSecretCode: isDemoMode, // Simuler un code secret en mode démo
        secretCodeType: isDemoMode ? 'lifetime' : null,
        secretCodeExpiresAt: null,
        loading: false,
      });
    }
  }, [user, isDemoMode]);

  const fetchSubscription = async () => {
    try {
      console.log('💳 Début fetchSubscription');
      
      // En mode démo, simuler un abonnement à vie
      if (isDemoMode) {
        console.log('💳 Mode démo détecté, simulation abonnement');
        setSubscription({
          isSubscribed: true,
          subscriptionStatus: 'active',
          priceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasSecretCode: true,
          secretCodeType: 'lifetime',
          secretCodeExpiresAt: null,
          loading: false,
        });
        return;
      }

      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('💳 Supabase non configuré, abonnement par défaut');
        setSubscription({
          isSubscribed: false,
          subscriptionStatus: null,
          priceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasSecretCode: false,
          secretCodeType: null,
          secretCodeExpiresAt: null,
          loading: false,
        });
        return;
      }

      // Déterminer l'utilisateur cible (gestion impersonation)
      let targetUserId = user.id;
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💳 🎭 IMPERSONATION ACTIVE - Vérification abonnement pour:', data.target_email, 'ID:', targetUserId);
        } catch (error) {
          console.warn('💳 Erreur parsing impersonation data:', error);
        }
      } else {
        console.log('💳 Mode normal - Vérification abonnement pour:', user.email, 'ID:', targetUserId);
      }

      // Vérifier l'abonnement Stripe avec gestion d'erreur
      let stripeSubscription = null;
      try {
        console.log('💳 Récupération abonnements Stripe...');
        
        // Récupérer l'abonnement Stripe pour l'utilisateur cible
        const { data: stripeData, error: stripeError } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('customer_id', targetUserId)
          .maybeSingle();

        if (stripeError) {
          console.warn('💳 Erreur récupération abonnement Stripe:', stripeError);
        } else {
          stripeSubscription = stripeData;
          console.log('💳 Abonnement Stripe trouvé:', !!stripeSubscription, stripeSubscription?.subscription_status);
        }
      } catch (stripeError) {
        console.warn('💳 Erreur Stripe:', stripeError);
      }

      // Vérifier les codes secrets avec gestion d'erreur
      let hasActiveSecretCode = false;
      let secretCodeType = null;
      let secretCodeExpiresAt = null;
      
      try {
        console.log('💳 Vérification codes secrets pour userId:', targetUserId);
        
        // Récupérer les codes secrets de l'utilisateur cible avec jointure
        const { data: userSecretCodes, error: secretCodesError } = await supabase
          .from('user_secret_codes')
          .select(`
            expires_at,
            secret_codes!inner(
              type,
              is_active,
              expires_at
            )
          `)
          .eq('user_id', targetUserId)
          .eq('secret_codes.is_active', true);

        if (secretCodesError) {
          console.warn('💳 Erreur récupération codes secrets:', secretCodesError);
        } else {
          console.log('💳 Codes secrets récupérés:', userSecretCodes?.length || 0);
          
          if (userSecretCodes && userSecretCodes.length > 0) {
            // Vérifier chaque code
            for (const codeData of userSecretCodes) {
              const codeType = codeData.secret_codes?.type;
              const userExpiresAt = codeData.expires_at;
              
              if (codeType === 'lifetime') {
                hasActiveSecretCode = true;
                secretCodeType = codeType;
                secretCodeExpiresAt = null;
                console.log('💳 ✅ Code à vie actif trouvé');
                break;
              } else if (codeType === 'monthly') {
                if (!userExpiresAt || new Date(userExpiresAt) > new Date()) {
                  hasActiveSecretCode = true;
                  secretCodeType = codeType;
                  secretCodeExpiresAt = userExpiresAt;
                  console.log('💳 ✅ Code mensuel actif trouvé, expire le:', userExpiresAt);
                  break;
                }
              }
            }
          }
        }
      } catch (secretCodeError) {
        console.warn('💳 Erreur codes secrets:', secretCodeError);
      }

        // Déterminer si l'utilisateur a un accès premium
        const hasStripeAccess = stripeSubscription && 
          (stripeSubscription.subscription_status === 'active' || 
           stripeSubscription.subscription_status === 'trialing');
        
        console.log('💳 === RÉSUMÉ ABONNEMENT ===');
        console.log('💳 User cible:', targetUserId);
        console.log('💳 Accès Stripe:', hasStripeAccess, stripeSubscription?.subscription_status);
        console.log('💳 Code secret actif:', hasActiveSecretCode, secretCodeType);
        const isSubscribed = hasStripeAccess || hasActiveSecretCode;
        console.log('💳 ABONNÉ FINAL:', isSubscribed);

        const finalState = {
          isSubscribed,
          subscriptionStatus: stripeSubscription?.subscription_status || null,
          priceId: stripeSubscription?.price_id || null,
          currentPeriodEnd: stripeSubscription?.current_period_end || null,
          cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
          hasSecretCode: hasActiveSecretCode,
          secretCodeType,
          secretCodeExpiresAt,
          loading: false,
        };
        
        setSubscription(finalState);
        console.log('💳 === ÉTAT FINAL ABONNEMENT ===', finalState);

      } catch (error) {
        console.error('💳 Erreur générale fetchSubscription:', error);
        // En cas d'erreur réseau, définir des valeurs par défaut
        setSubscription({
          isSubscribed: false,
          subscriptionStatus: null,
          priceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasSecretCode: false,
          secretCodeType: null,
          secretCodeExpiresAt: null,
          loading: false,
        });
      }
    };

    const refreshSubscription = () => {
      if (user) {
        fetchSubscription();
      }
    };

    return {
      ...subscription,
      refreshSubscription,
    };
  };