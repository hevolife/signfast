import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useSubscription } from './useSubscription';
import { useForms } from './useForms';
import { usePDFTemplates } from './usePDFTemplates';
import { PDFService } from '../services/pdfService';
import { stripeConfig } from '../stripe-config';

interface LimitData {
  current: number;
  max: number;
  canCreate: boolean;
  canSave?: boolean;
}

export const useLimits = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { isSubscribed, hasSecretCode, loading: subscriptionLoading } = useSubscription();
  const { forms } = useForms();
  const { templates } = usePDFTemplates();
  const [responsesCount, setResponsesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const refreshLimits = async () => {
    try {
      const count = await PDFService.countResponsesForUser(user?.id || '');
      setResponsesCount(count);
    } catch (error) {
      console.error('Erreur refresh limits:', error);
      setResponsesCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Attendre que l'abonnement soit vérifié avant de calculer les limites
    if (!subscriptionLoading) {
      setLoading(false);
      // Puis chargement en arrière-plan
      setTimeout(() => {
        refreshLimits();
      }, 100);
    }
  }, [user, subscriptionLoading, isSubscribed, hasSecretCode]);

  // Calculer les limites selon l'abonnement
  const getFormsLimits = (): LimitData => {
    const current = forms.length;
    
    // Si on est en cours de chargement de l'abonnement, être optimiste
    if (subscriptionLoading) {
      return {
        current,
        max: Infinity,
        canCreate: true,
      };
    }
    
    // Vérifier l'accès premium (abonnement Stripe OU code secret)
    const hasPremiumAccess = isSubscribed || hasSecretCode || isDemoMode || isSuperAdmin;
    const max = hasPremiumAccess ? Infinity : stripeConfig.freeLimits.maxForms;
    
    return {
      current,
      max,
      canCreate: hasPremiumAccess || current < max,
    };
  };

  const getPdfTemplatesLimits = (): LimitData => {
    const current = templates.length;
    
    // Si on est en cours de chargement de l'abonnement, être optimiste
    if (subscriptionLoading) {
      return {
        current,
        max: Infinity,
        canCreate: true,
      };
    }
    
    // Vérifier l'accès premium (abonnement Stripe OU code secret)
    const hasPremiumAccess = isSubscribed || hasSecretCode || isDemoMode || isSuperAdmin;
    const max = hasPremiumAccess ? Infinity : stripeConfig.freeLimits.maxPdfTemplates;
    
    return {
      current,
      max,
      canCreate: hasPremiumAccess || current < max,
    };
  };

  const getSavedPdfsLimits = (): LimitData => {
    const current = responsesCount;
    
    // Si on est en cours de chargement de l'abonnement, être optimiste
    if (subscriptionLoading) {
      return {
        current,
        max: Infinity,
        canCreate: true,
        canSave: true,
      };
    }
    
    // Vérifier l'accès premium (abonnement Stripe OU code secret)
    const hasPremiumAccess = isSubscribed || hasSecretCode || isDemoMode || isSuperAdmin;
    const max = hasPremiumAccess ? Infinity : stripeConfig.freeLimits.maxSavedPdfs;
    
    return {
      current,
      max,
      canCreate: hasPremiumAccess || current < max,
      canSave: hasPremiumAccess || current < max,
    };
  };

  return {
    forms: getFormsLimits(),
    pdfTemplates: getPdfTemplatesLimits(),
    savedPdfs: getSavedPdfsLimits(),
    loading,
    refreshLimits,
  };
};