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
      // En mode démo, simuler un abonnement à vie
      if (isDemoMode) {
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

      // L'utilisateur effectif est déjà géré par le contexte Auth
      let targetUserId = user.id;
      console.log('💳 Vérification abonnement pour userId:', targetUserId);
        const impersonationData = localStorage.getItem('admin_impersonation');
        
        if (impersonationData) {
          try {
            const data = JSON.parse(impersonationData);
            targetUserId = data.target_user_id;
          } catch (error) {
            // Silent error
          }
        }

        // Vérifier l'abonnement Stripe
        let stripeSubscription = null;
        try {
          const { data, error } = await supabase
            .from('stripe_user_subscriptions')
            .select('*')
            .limit(100); // Récupérer tous pour debug

          // Chercher l'abonnement pour cet utilisateur
          stripeSubscription = data?.find(s => s.customer_id === targetUserId);
        } catch (stripeError) {
          // Silent error
        }

        // Vérifier les codes secrets avec plus de détails
        let hasActiveSecretCode = false;
        let secretCodeType = null;
        let secretCodeExpiresAt = null;
        
        try {
          // Requête simplifiée pour récupérer les codes de l'utilisateur
          const { data: userCodes, error: userCodesError } = await supabase
            .from('user_secret_codes')
            .select('code_id, expires_at')
            .eq('user_id', targetUserId);

          if (userCodesError) {
            // Silent error
          } else {
            if (userCodes && userCodes.length > 0) {
              // Pour chaque code de l'utilisateur, vérifier s'il est valide
              for (const userCode of userCodes) {
                // Récupérer les détails du code secret
                const { data: secretCode, error: secretError } = await supabase
                  .from('secret_codes')
                  .select('type, is_active, expires_at')
                  .eq('id', userCode.code_id)
                  .single();
                
                if (secretError || !secretCode) {
                  continue;
                }
                
                if (!secretCode.is_active) {
                  continue;
                }
                
                const codeType = secretCode.type;
                const userExpiresAt = userCode.expires_at;
                const now = new Date();
                
                // Vérifier la validité du code
                const isLifetime = codeType === 'lifetime';
                const isValidMonthly = codeType === 'monthly' && (!userExpiresAt || new Date(userExpiresAt) > now);
                const isValid = isLifetime || isValidMonthly;

                if (isValid) {
                  hasActiveSecretCode = true;
                  secretCodeType = codeType;
                  secretCodeExpiresAt = userExpiresAt;
                  // Prendre le premier code valide
                  break;
                }
              }
            }
          }
        } catch (secretCodeError) {
          // Silent error
        }

        // Déterminer si l'utilisateur a un accès premium
        const hasStripeAccess = stripeSubscription && 
          (stripeSubscription.subscription_status === 'active' || 
           stripeSubscription.subscription_status === 'trialing');
        
        const isSubscribed = hasStripeAccess || hasActiveSecretCode;

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

      } catch (error) {
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