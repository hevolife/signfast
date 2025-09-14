import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Cache pour les données d'abonnement
let subscriptionCache: { data: SubscriptionData; timestamp: number; userId: string } | null = null;
const SUBSCRIPTION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

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
      subscriptionCache = null;
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

      // Vérifier le cache
      if (subscriptionCache && 
          subscriptionCache.userId === targetUserId &&
          Date.now() - subscriptionCache.timestamp < SUBSCRIPTION_CACHE_DURATION) {
        setSubscription(subscriptionCache.data);
        return;
      }

      // Vérifier l'abonnement Stripe
      let stripeSubscription = null;
      try {
        // Requête optimisée avec timeout
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        );

        const queryPromise = supabase
          .from('stripe_user_subscriptions')
          .select('customer_id, subscription_status, price_id, current_period_end, cancel_at_period_end')
          .limit(50);

        const { data } = await Promise.race([queryPromise, timeoutPromise]);

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
        // Requête optimisée avec timeout
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1500)
        );

        const codesPromise = supabase
          .from('user_secret_codes')
          .select('code_id, expires_at')
          .eq('user_id', targetUserId);

        const { data: userCodes } = await Promise.race([codesPromise, timeoutPromise]);

        if (userCodes && userCodes.length > 0) {
          // Requête batch pour tous les codes
          const codeIds = userCodes.map(uc => uc.code_id);
          const { data: secretCodes } = await supabase
            .from('secret_codes')
            .select('id, type, is_active, expires_at')
            .in('id', codeIds)
            .eq('is_active', true);

          // Vérifier la validité des codes
          if (userCodes && userCodes.length > 0) {
            for (const userCode of userCodes) {
              const secretCode = secretCodes?.find(sc => sc.id === userCode.code_id);
              
              if (!secretCode || !secretCode.is_active) {
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
      
      // Mettre en cache
      subscriptionCache = {
        data: finalState,
        timestamp: Date.now(),
        userId: targetUserId
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
    // Invalider le cache lors du refresh
    subscriptionCache = null;
    if (user) {
      fetchSubscription();
    }
  };

  return {
    ...subscription,
    refreshSubscription,
  };
};