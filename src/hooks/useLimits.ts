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
  const { isSubscribed } = useSubscription();
  const { forms } = useForms();
  const { templates } = usePDFTemplates();
  const [savedPdfsCount, setSavedPdfsCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
    refreshLimits();
  }, [user]);

  // Calculer les limites selon l'abonnement
  const getFormsLimits = (): LimitData => {
    const current = forms.length;
    const max = (isSubscribed || isDemoMode) ? Infinity : stripeConfig.freeLimits.maxForms;
    return {
      current,
      max,
      canCreate: isSubscribed || isDemoMode || current < max,
    };
  };

  const getPdfTemplatesLimits = (): LimitData => {
    const current = templates.length;
    const max = (isSubscribed || isDemoMode) ? Infinity : stripeConfig.freeLimits.maxPdfTemplates;
    return {
      current,
      max,
      canCreate: isSubscribed || isDemoMode || current < max,
    };
  };

  const getSavedPdfsLimits = (): LimitData => {
    const current = savedPdfsCount;
    const max = (isSubscribed || isDemoMode) ? Infinity : stripeConfig.freeLimits.maxSavedPdfs;
    return {
      current,
      max,
      canCreate: isSubscribed || isDemoMode || current < max,
      canSave: isSubscribed || isDemoMode || current < max,
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