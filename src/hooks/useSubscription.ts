import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { userCache, cachedRequest } from '../utils/cache';

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
  }, [user]);

  const fetchSubscription = async () => {
    try {
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('Supabase non configuré, pas d\'abonnement disponible');
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      let targetUserId = user.id;
      
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
        } catch (error) {
          // Silent error
        }
      }

      const cacheKey = `subscription_${targetUserId}`;
      
      // Récupérer les données d'abonnement avec cache
      const subscriptionData = await cachedRequest(
        cacheKey,
        async () => {
          // Vérifier l'abonnement Stripe
          let stripeSubscription = null;
          try {
            const { data, error } = await supabase
              .from('stripe_user_subscriptions')
              .select('*')
              .limit(100);

            stripeSubscription = data?.find(s => s.customer_id === targetUserId);
          } catch (stripeError) {
            console.error('Error fetching stripe subscription:', stripeError);
          }

          // Vérifier les codes secrets
          let hasActiveSecretCode = false;
          let secretCodeType = null;
          let secretCodeExpiresAt = null;
          
          try {
            const { data: userCodes, error: userCodesError } = await supabase
              .from('user_secret_codes')
              .select('code_id, expires_at')
              .eq('user_id', targetUserId);

            if (!userCodesError && userCodes && userCodes.length > 0) {
              for (const userCode of userCodes) {
                const { data: secretCode, error: secretError } = await supabase
                  .from('secret_codes')
                  .select('type, is_active, expires_at')
                  .eq('id', userCode.code_id)
                  .single();
                
                if (secretError || !secretCode || !secretCode.is_active) {
                  continue;
                }
                
                const codeType = secretCode.type;
                const userExpiresAt = userCode.expires_at;
                const now = new Date();
                
                const isLifetime = codeType === 'lifetime';
                const isValidMonthly = codeType === 'monthly' && (!userExpiresAt || new Date(userExpiresAt) > now);
                
                if (isLifetime || isValidMonthly) {
                  hasActiveSecretCode = true;
                  secretCodeType = codeType;
                  secretCodeExpiresAt = userExpiresAt;
                  break;
                }
              }
            }
          } catch (secretCodeError) {
            console.error('Error fetching secret codes:', secretCodeError);
          }

          // Déterminer si l'utilisateur a un accès premium
          const hasStripeAccess = stripeSubscription && 
            (stripeSubscription.subscription_status === 'active' || 
             stripeSubscription.subscription_status === 'trialing');
          
          return {
            isSubscribed: hasStripeAccess || hasActiveSecretCode,
            subscriptionStatus: stripeSubscription?.subscription_status || null,
            priceId: stripeSubscription?.price_id || null,
            currentPeriodEnd: stripeSubscription?.current_period_end || null,
            cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
            hasSecretCode: hasActiveSecretCode,
            secretCodeType,
            secretCodeExpiresAt,
          };
        },
        2 * 60 * 1000, // 2 minutes de cache pour les données d'abonnement
        userCache
      );

      setSubscription({
        ...subscriptionData,
        loading: false,
      });

    } catch (error) {
      console.error('Error fetching subscription:', error);
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
      // Invalider le cache avant de rafraîchir
      const impersonationData = localStorage.getItem('admin_impersonation');
      let targetUserId = user.id;
      
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
        } catch (error) {
          // Silent error
        }
      }
      
      userCache.invalidate(`subscription_${targetUserId}`);
      fetchSubscription();
    }
  };

  return {
    ...subscription,
    refreshSubscription,
  };
};