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
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { forms } = useForms();
  const { templates } = usePDFTemplates();
  const [savedPdfsCount, setSavedPdfsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const refreshLimits = async () => {
    try {
      const count = await PDFService.countPDFs();
      setSavedPdfsCount(count);
    } catch (error) {
      console.error('Erreur refresh limits:', error);
      setSavedPdfsCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chargement immédiat sans attendre l'abonnement
    setLoading(false);
    // Puis chargement en arrière-plan
    setTimeout(() => {
      refreshLimits();
    }, 100);
  }, [user]);

  // Calculer les limites selon l'abonnement
  const getFormsLimits = (): LimitData => {
    const current = forms.length;
    // Optimiste par défaut pour éviter le blocage
    const max = (!subscriptionLoading && !isSubscribed && !isDemoMode && !isSuperAdmin) ? stripeConfig.freeLimits.maxForms : Infinity;
    return {
      current,
      max,
      canCreate: subscriptionLoading || isSubscribed || isDemoMode || isSuperAdmin || current < max,
    };
  };

  const getPdfTemplatesLimits = (): LimitData => {
    const current = templates.length;
    // Optimiste par défaut pour éviter le blocage
    const max = (!subscriptionLoading && !isSubscribed && !isDemoMode && !isSuperAdmin) ? stripeConfig.freeLimits.maxPdfTemplates : Infinity;
    return {
      current,
      max,
      canCreate: subscriptionLoading || isSubscribed || isDemoMode || isSuperAdmin || current < max,
    };
  };

  const getSavedPdfsLimits = (): LimitData => {
    const current = savedPdfsCount;
    // Optimiste par défaut pour éviter le blocage
    const max = (!subscriptionLoading && !isSubscribed && !isDemoMode && !isSuperAdmin) ? stripeConfig.freeLimits.maxSavedPdfs : Infinity;
    return {
      current,
      max,
      canCreate: subscriptionLoading || isSubscribed || isDemoMode || isSuperAdmin || current < max,
      canSave: subscriptionLoading || isSubscribed || isDemoMode || isSuperAdmin || current < max,
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