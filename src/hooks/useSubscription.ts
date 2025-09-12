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
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('⚠️ Supabase non configuré - mode local uniquement');
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
          console.log('🎭 Mode impersonation: récupération de l\'abonnement pour', data.target_email);
        } catch (error) {
          console.error('Erreur parsing impersonation data:', error);
        }
      }

      // Vérifier l'abonnement Stripe
      let stripeSubscription = null;
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('customer_id', targetUserId)
          .limit(1);

        if (error && error.code !== 'PGRST116') {
          console.warn('Erreur récupération abonnement Stripe (ignorée):', error.message);
        }

        if (data && data.length > 0) {
          stripeSubscription = data[0];
        }
      } catch (stripeError) {
        console.warn('Erreur Stripe (ignorée):', stripeError);
      }

      // Vérifier les codes secrets
      let hasActiveSecretCode = false;
      let secretCodeType = null;
      let secretCodeExpiresAt = null;

      try {
        console.log('🔑 Vérification codes secrets pour userId:', targetUserId);
        
        const { data: secretCodeData, error: secretCodeError } = await supabase
          .from('user_secret_codes')
          .select(`
            expires_at,
            secret_codes (
              type,
              description
            )
          `)
          .eq('user_id', targetUserId)
          .order('activated_at', { ascending: false });

        console.log('🔑 Codes secrets trouvés:', secretCodeData?.length || 0);
        if (secretCodeData) {
          console.log('🔑 Détails codes:', secretCodeData.map(c => ({
            type: c.secret_codes?.type,
            expires_at: c.expires_at
          })));
        }
        if (!secretCodeError && secretCodeData && secretCodeData.length > 0) {
          // Vérifier chaque code pour trouver un code actif
          for (const codeData of secretCodeData) {
            const codeType = codeData.secret_codes?.type;
            const expiresAt = codeData.expires_at;
            
            console.log('🔑 Vérification code:', { type: codeType, expires_at: expiresAt });
            
            // Un code est actif si :
            // - C'est un code à vie (expires_at est null)
            // - OU c'est un code mensuel non expiré
            const isLifetime = codeType === 'lifetime' && !expiresAt;
            const isValidMonthly = codeType === 'monthly' && expiresAt && new Date(expiresAt) > new Date();
            
            console.log('🔑 État du code:', { isLifetime, isValidMonthly });
            
            if (isLifetime || isValidMonthly) {
              hasActiveSecretCode = true;
              secretCodeType = codeType;
              secretCodeExpiresAt = expiresAt;
              console.log('🔑 Code secret actif détecté:', {
                type: codeType,
                isLifetime,
                expiresAt: expiresAt || 'jamais'
              });
              break; // Prendre le premier code actif trouvé
            }
          }
        }
        
        console.log('🔑 Résultat final codes secrets:', {
          hasActiveSecretCode,
          secretCodeType,
          secretCodeExpiresAt
        });
      } catch (secretCodeError) {
        console.warn('Erreur codes secrets (ignorée):', secretCodeError);
      }

      // Déterminer si l'utilisateur a un accès premium
      const hasStripeAccess = stripeSubscription && 
        (stripeSubscription.subscription_status === 'active' || 
         stripeSubscription.subscription_status === 'trialing');
      
      const isSubscribed = hasStripeAccess || hasActiveSecretCode;

      console.log('🔑 État final abonnement:', {
        hasStripeAccess,
        hasActiveSecretCode,
        isSubscribed,
        targetUserId,
        isImpersonating: !!impersonationData
      });
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
      console.warn('Erreur récupération abonnement (mode local):', error);
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