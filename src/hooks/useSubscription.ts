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
        
        // Récupérer l'abonnement Stripe pour l'utilisateur cible via la table stripe_customers
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (customerError) {
          console.warn('💳 Erreur récupération customer:', customerError);
        } else if (customerData) {
          console.log('💳 Customer trouvé:', customerData.customer_id);
          
          // Récupérer l'abonnement avec le customer_id
          const { data: stripeData, error: stripeError } = await supabase
            .from('stripe_subscriptions')
            .select('*')
            .eq('customer_id', customerData.customer_id)
            .maybeSingle();

          if (stripeError) {
            console.warn('💳 Erreur récupération abonnement Stripe:', stripeError);
          } else {
            stripeSubscription = stripeData;
            console.log('💳 Abonnement Stripe trouvé:', !!stripeSubscription, stripeSubscription?.status);
          }
        } else {
          console.log('💳 Aucun customer Stripe trouvé pour cet utilisateur');
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
        
        // Récupérer les codes secrets actifs de l'utilisateur cible avec une requête plus simple
        const { data: userSecretCodes, error: secretCodesError } = await supabase
          .from('user_secret_codes')
          .select('expires_at, code_id')
          .eq('user_id', targetUserId)
          .order('activated_at', { ascending: false });

        if (secretCodesError) {
          console.warn('💳 Erreur récupération codes secrets:', secretCodesError);
        } else {
          console.log('💳 Codes secrets récupérés:', userSecretCodes?.length || 0);
          
          if (userSecretCodes && userSecretCodes.length > 0) {
            // Récupérer les détails des codes secrets séparément
            const codeIds = userSecretCodes.map(c => c.code_id);
            
            const { data: secretCodesDetails, error: detailsError } = await supabase
              .from('secret_codes')
              .select('id, type, is_active')
              .in('id', codeIds)
              .eq('is_active', true);
            
            if (detailsError) {
              console.warn('💳 Erreur récupération détails codes:', detailsError);
            } else {
              console.log('💳 Détails codes secrets:', secretCodesDetails?.length || 0);
              
              // Mapper les codes avec leurs détails
              const codesWithDetails = userSecretCodes.map(userCode => {
                const codeDetails = secretCodesDetails?.find(detail => detail.id === userCode.code_id);
                return {
                  ...userCode,
                  secret_codes: codeDetails
                };
              }).filter(code => code.secret_codes?.is_active);
              
              console.log('💳 Codes actifs trouvés:', codesWithDetails.length);
            
              // Vérifier chaque code actif
              for (const codeData of codesWithDetails) {
                const secretCode = codeData.secret_codes;
                
                if (!secretCode) {
                  console.log('💳 Code secret manquant, skip');
                  continue;
                }
                
                const codeType = secretCode.type;
                const userExpiresAt = codeData.expires_at;
                
                console.log('💳 Vérification code:', { 
                  codeId: secretCode.id, 
                  codeType, 
                  userExpiresAt,
                  isActive: secretCode.is_active 
                });
                
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
                  } else {
                    console.log('💳 ❌ Code mensuel expiré:', userExpiresAt);
                  }
                }
              }
            }
          } else {
            console.log('💳 Aucun code secret trouvé pour cet utilisateur');
          }
        }
      } catch (secretCodeError) {
        console.warn('💳 Erreur codes secrets:', secretCodeError);
      }

        // Déterminer si l'utilisateur a un accès premium
        const hasStripeAccess = stripeSubscription && 
          (stripeSubscription.status === 'active' || 
           stripeSubscription.status === 'trialing');
        
        console.log('💳 === RÉSUMÉ ABONNEMENT ===');
        console.log('💳 User cible:', targetUserId);
        console.log('💳 Accès Stripe:', hasStripeAccess, stripeSubscription?.status);
        console.log('💳 Code secret actif:', hasActiveSecretCode, secretCodeType);
        const isSubscribed = hasStripeAccess || hasActiveSecretCode;
        console.log('💳 ABONNÉ FINAL:', isSubscribed);

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