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
          console.log('🎭 Mode impersonation: récupération de l\'abonnement pour', data.target_email, 'userId:', targetUserId);
        } catch (error) {
          console.error('Erreur parsing impersonation data:', error);
        }
      }

      // Vérifier l'abonnement Stripe
      let stripeSubscription = null;
      try {
        console.log('💳 Recherche abonnement Stripe pour userId:', targetUserId);
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .limit(100); // Récupérer tous pour debug

        console.log('💳 Tous les abonnements Stripe:', data?.map(s => ({ 
          customer_id: s.customer_id, 
          status: s.subscription_status 
        })));
        
        // Chercher l'abonnement pour cet utilisateur
        stripeSubscription = data?.find(s => s.customer_id === targetUserId);
        console.log('💳 Abonnement trouvé pour', targetUserId, ':', stripeSubscription);
        
        if (!stripeSubscription) {
          console.log('💳 Aucun abonnement Stripe trouvé pour userId:', targetUserId);
        }
      } catch (stripeError) {
        console.warn('Erreur Stripe (ignorée):', stripeError);
      }

      // Vérifier les codes secrets avec plus de détails
      let hasActiveSecretCode = false;
      let secretCodeType = null;
      let secretCodeExpiresAt = null;
      
      try {
        console.log('🔑 Recherche codes secrets pour userId:', targetUserId);
        
        const { data: secretCodeData, error: secretCodeError } = await supabase
          .from('user_secret_codes')
          .select(`
            id,
            user_id,
            code_id,
            activated_at,
            expires_at,
            secret_codes!inner (
              id,
              type,
              code,
              is_active,
              description
            )
          `)
          .eq('user_id', targetUserId)
          .eq('secret_codes.is_active', true)
          .order('activated_at', { ascending: false });

        if (secretCodeError) {
          console.error('🔑 Erreur requête codes secrets:', secretCodeError);
        } else {
          console.log('🔑 Codes secrets trouvés:', secretCodeData?.length || 0);
          console.log('🔑 Données complètes:', secretCodeData);
        }
        
        if (secretCodeData && secretCodeData.length > 0) {
          // Vérifier chaque code pour trouver un code actif
          for (const codeData of secretCodeData) {
            const secretCodeInfo = codeData.secret_codes;
            
            if (!secretCodeInfo) {
              console.log('🔑 ❌ Pas de données secret_codes pour ce code');
              continue;
            }
            
            const codeType = secretCodeInfo.type;
            const expiresAt = codeData.expires_at;
            
            console.log('🔑 Analyse code:', {
              code: secretCodeInfo.code,
              type: codeType,
              is_active: secretCodeInfo.is_active,
              expires_at: expiresAt,
              activated_at: codeData.activated_at
            });
            
            // Vérifier si le code est valide
            const now = new Date();
            const isLifetime = codeType === 'lifetime';
            const isValidMonthly = codeType === 'monthly' && (!expiresAt || new Date(expiresAt) > now);
            const isValid = isLifetime || isValidMonthly;
            
            console.log('🔑 Validation code:', {
              isLifetime,
              isValidMonthly,
              isValid,
              now: now.toISOString(),
              expiresAt
            });
            
            if (isValid) {
              hasActiveSecretCode = true;
              secretCodeType = codeType;
              secretCodeExpiresAt = expiresAt;
              
              console.log('🔑 ✅ CODE SECRET VALIDE TROUVÉ:', {
                type: codeType,
                isLifetime,
                expiresAt: expiresAt || 'jamais'
              });
              
              // Prendre le premier code valide (codes triés par date d'activation desc)
              break;
            }
          }
        } else {
          console.log('🔑 Aucun code secret trouvé pour userId:', targetUserId);
        }
      } catch (secretCodeError) {
        console.error('🔑 Erreur codes secrets:', secretCodeError);
      }

      // Déterminer si l'utilisateur a un accès premium
      const hasStripeAccess = stripeSubscription && 
        (stripeSubscription.subscription_status === 'active' || 
         stripeSubscription.subscription_status === 'trialing');
      
      const isSubscribed = hasStripeAccess || hasActiveSecretCode;

      console.log('🔑 === ÉTAT FINAL ABONNEMENT ===');
      console.log('🔑 userId cible:', targetUserId);
      console.log('🔑 hasStripeAccess:', hasStripeAccess);
      console.log('🔑 hasActiveSecretCode:', hasActiveSecretCode);
      console.log('🔑 secretCodeType:', secretCodeType);
      console.log('🔑 isSubscribed FINAL:', isSubscribed);
      console.log('🔑 Mode impersonation:', !!impersonationData);
      
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
      
      console.log('🔑 État final à sauvegarder:', finalState);
      setSubscription(finalState);

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