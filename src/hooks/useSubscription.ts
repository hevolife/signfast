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
        const { data: secretCodeData, error: secretCodeError } = await supabase
          .from('user_secret_codes')
          .select(`
            expires_at,
            activated_at,
            code_id,
            secret_codes (
              type,
              code,
              is_active
            )
          `)
          .eq('user_id', targetUserId)
          .order('activated_at', { ascending: false });

        console.log('🔑 Codes secrets pour userId', targetUserId, ':', secretCodeData?.length || 0);
        console.log('🔑 Erreur requête:', secretCodeError);
        console.log('🔑 Données brutes:', secretCodeData);
        
        if (secretCodeData && secretCodeData.length > 0) {
          console.log('🔑 Détails des codes trouvés:');
          secretCodeData.forEach((code, index) => {
            const secretCodeInfo = Array.isArray(code.secret_codes) ? code.secret_codes[0] : code.secret_codes;
            console.log(`🔑 Code ${index + 1}:`, {
              type: secretCodeInfo?.type,
              code: secretCodeInfo?.code,
              is_active: secretCodeInfo?.is_active,
              expires_at: code.expires_at,
              activated_at: code.activated_at,
              isLifetime: secretCodeInfo?.type === 'lifetime' && !code.expires_at,
              isValidMonthly: secretCodeInfo?.type === 'monthly' && code.expires_at && new Date(code.expires_at) > new Date()
            });
          });
          
          // Vérifier chaque code pour trouver un code actif
          for (const codeData of secretCodeData) {
            const secretCodeInfo = Array.isArray(codeData.secret_codes) ? codeData.secret_codes[0] : codeData.secret_codes;
            const codeType = secretCodeInfo?.type;
            const expiresAt = codeData.expires_at;
            
            console.log('🔑 Vérification code:', { 
              type: codeType, 
              expires_at: expiresAt,
              code: secretCodeInfo?.code,
              is_active: secretCodeInfo?.is_active
            });
            
            // Vérifier que le code est actif (normalement déjà filtré par la requête)
            if (!secretCodeInfo?.is_active) {
             console.log('🔑 ❌ Code inactif dans secret_codes');
             continue;
           }
           
            // Un code est actif si :
            // - C'est un code à vie (expires_at est null)
            // - OU c'est un code mensuel non expiré
            const isLifetime = codeType === 'lifetime' && !expiresAt;
            const isValidMonthly = codeType === 'monthly' && expiresAt && new Date(expiresAt) > new Date();
            
            console.log('🔑 État du code:', { 
              isLifetime, 
              isValidMonthly,
              now: new Date().toISOString(),
              expiresAt 
            });
            
            if (isLifetime || isValidMonthly) {
              hasActiveSecretCode = true;
              secretCodeType = codeType;
              secretCodeExpiresAt = expiresAt;
              console.log('🔑 ✅ CODE SECRET ACTIF DÉTECTÉ:', {
                type: codeType,
                isLifetime,
                expiresAt: expiresAt || 'jamais',
                code: secretCodeInfo?.code
              });
              break; // Prendre le premier code actif trouvé
            } else {
              console.log('🔑 ❌ Code inactif ou expiré');
            }
          }
          
          // Si aucun code actif trouvé mais qu'il y a des codes, c'est qu'ils sont expirés
          if (!hasActiveSecretCode && secretCodeData.length > 0) {
            console.log('🔑 ⚠️ Codes trouvés mais tous expirés ou inactifs');
          }
        } else {
          console.log('🔑 Aucun code secret trouvé pour userId:', targetUserId);
          if (secretCodeError) {
            console.error('🔑 Erreur requête codes secrets:', secretCodeError);
          }
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