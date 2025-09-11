import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
      // Vérifier l'abonnement Stripe
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      let stripeSubscription = null;
      if (data && data.length > 0) {
        stripeSubscription = data[0];
      }

      // Vérifier les codes secrets
      const { data: secretCodeData, error: secretCodeError } = await supabase
        .from('user_secret_codes')
        .select(`
          expires_at,
          secret_codes (
            type,
            description
          )
        `)
        .eq('user_id', user.id)
        .or('expires_at.is.null,expires_at.gt.now()')
        .limit(1);

      let hasActiveSecretCode = false;
      let secretCodeType = null;
      let secretCodeExpiresAt = null;

      if (!secretCodeError && secretCodeData && secretCodeData.length > 0) {
        const activeCode = secretCodeData[0];
        hasActiveSecretCode = true;
        secretCodeType = activeCode.secret_codes?.type || null;
        secretCodeExpiresAt = activeCode.expires_at;
      }

      // Déterminer si l'utilisateur a un accès premium
      const hasStripeAccess = stripeSubscription && 
        (stripeSubscription.subscription_status === 'active' || 
         stripeSubscription.subscription_status === 'trialing');
      
      const isSubscribed = hasStripeAccess || hasActiveSecretCode;

      setSubscription({
        isSubscribed,
        subscriptionStatus: stripeSubscription?.subscription_status || null,
        priceId: stripeSubscription?.price_id || null,
        currentPeriodEnd: stripeSubscription?.current_period_end || null,
        cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
        hasSecretCode: hasActiveSecretCode,
        secretCodeType,
        secretCodeExpiresAt,
        loading: false,
      });

    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(prev => ({ ...prev, loading: false }));
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