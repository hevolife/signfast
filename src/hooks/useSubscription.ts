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
    isSubscribed: true, // Optimiste par défaut pour éviter le blocage
    subscriptionStatus: null,
    priceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasSecretCode: true, // Optimiste par défaut
    secretCodeType: null,
    secretCodeExpiresAt: null,
    loading: false, // Pas de loading initial
  });

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription({
        isSubscribed: true, // Optimiste par défaut
        subscriptionStatus: null,
        priceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasSecretCode: true, // Optimiste par défaut
        secretCodeType: 'lifetime', // Optimiste par défaut
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

      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        setSubscription({
          isSubscribed: true, // Optimiste par défaut
          subscriptionStatus: null,
          priceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasSecretCode: true, // Optimiste par défaut
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
        } catch (error) {
        }
      } else {
      }

      // Chargement en arrière-plan avec timeout plus long pour éviter les faux négatifs
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout subscription check')), 8000)
      );

      // Vérifier l'abonnement Stripe avec gestion d'erreur
      let stripeSubscription = null;
      try {
        // Récupérer le customer Stripe pour l'utilisateur cible
        const customerQuery = supabase.from('stripe_customers')
          .select('customer_id')
          .eq('user_id', targetUserId)
          .maybeSingle();

        const { data: customerData, error: customerError } = await Promise.race([
          customerQuery,
          timeoutPromise
        ]);

        if (customerError) {
        } else if (customerData) {
          // Récupérer l'abonnement avec le customer_id
          const subscriptionQuery = supabase
            .from('stripe_subscriptions')
            .select('*')
            .eq('customer_id', customerData.customer_id)
            .maybeSingle();

          const { data: stripeData, error: stripeError } = await Promise.race([
            subscriptionQuery,
            timeoutPromise
          ]);

          if (stripeError) {
          } else {
            stripeSubscription = stripeData;
          }
        } else {
        }

      } catch (stripeError) {
        // En cas de timeout ou erreur 500, considérer comme abonné pour éviter les faux négatifs
        stripeSubscription = { status: 'active' }; // Fallback optimiste
      }

      // Vérifier les codes secrets avec gestion d'erreur
      let hasActiveSecretCode = false;
      let secretCodeType = null;
      let secretCodeExpiresAt = null;
      
      try {
        // Récupérer les codes secrets actifs de l'utilisateur cible avec une requête plus simple
        const { data: userSecretCodes, error: secretCodesError } = await Promise.race([
          supabase
          .from('user_secret_codes')
          .select('expires_at, code_id')
          .eq('user_id', targetUserId)
          .order('activated_at', { ascending: false }),
          timeoutPromise
        ]);

        if (secretCodesError) {
        } else {
          if (userSecretCodes && userSecretCodes.length > 0) {
            // Récupérer les détails des codes secrets séparément
            const codeIds = userSecretCodes.map(c => c.code_id);
            
            const { data: secretCodesDetails, error: detailsError } = await Promise.race([
              supabase
              .from('secret_codes')
              .select('id, type, is_active')
              .in('id', codeIds)
              .eq('is_active', true),
              timeoutPromise
            ]);
            
            if (detailsError) {
            } else {
              // Mapper les codes avec leurs détails
              const codesWithDetails = userSecretCodes.map(userCode => {
                const codeDetails = secretCodesDetails?.find(detail => detail.id === userCode.code_id);
                return {
                  ...userCode,
                  secret_codes: codeDetails
                };
              }).filter(code => code.secret_codes?.is_active);
              
              // Vérifier chaque code actif
              for (const codeData of codesWithDetails) {
                const secretCode = codeData.secret_codes;
                
                if (!secretCode) {
                  continue;
                }
                
                const codeType = secretCode.type;
                const userExpiresAt = codeData.expires_at;
                
                if (codeType === 'lifetime') {
                  hasActiveSecretCode = true;
                  secretCodeType = codeType;
                  secretCodeExpiresAt = null;
                  break;
                } else if (codeType === 'monthly') {
                  if (!userExpiresAt || new Date(userExpiresAt) > new Date()) {
                    hasActiveSecretCode = true;
                    secretCodeType = codeType;
                    secretCodeExpiresAt = userExpiresAt;
                    break;
                  } else {
                  }
                }
              }
            }
          } else {
          }
        }
      } catch (secretCodeError) {
        // En cas de timeout, considérer comme ayant un code secret pour éviter les faux négatifs
        hasActiveSecretCode = true;
        secretCodeType = 'lifetime';
      }

        // Déterminer si l'utilisateur a un accès premium
        const hasStripeAccess = stripeSubscription && 
          (stripeSubscription.status === 'active' || 
           stripeSubscription.status === 'trialing');
        
        const isSubscribed = hasStripeAccess || hasActiveSecretCode;

        const finalState = {
          isSubscribed,
          subscriptionStatus: stripeSubscription?.status || null,
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
        // En cas d'erreur/timeout, considérer comme abonné pour éviter les blocages
        setSubscription({
          isSubscribed: true, // Optimiste pour éviter le blocage
          subscriptionStatus: null,
          priceId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasSecretCode: true, // Optimiste pour éviter le blocage
          secretCodeType: 'lifetime', // Optimiste pour éviter le blocage
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