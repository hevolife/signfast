import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { useForms } from './useForms';
import { usePDFTemplates } from './usePDFTemplates';
import { PDFService } from '../services/pdfService';
import { stripeConfig } from '../stripe-config';

export interface UsageLimits {
  forms: {
    current: number;
    max: number;
    canCreate: boolean;
  };
  pdfTemplates: {
    current: number;
    max: number;
    canCreate: boolean;
  };
  savedPdfs: {
    current: number;
    max: number;
    canSave: boolean;
  };
  loading: boolean;
}

export const useLimits = () => {
  const { user } = useAuth();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { forms, loading: formsLoading } = useForms();
  const { templates, loading: templatesLoading } = usePDFTemplates();
  const [savedPdfsCount, setSavedPdfsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !subscriptionLoading && !formsLoading && !templatesLoading) {
      loadSavedPdfsCount();
    }
  }, [user, subscriptionLoading, formsLoading, templatesLoading]);

  const loadSavedPdfsCount = async () => {
    try {
      const pdfs = await PDFService.listPDFs();
      setSavedPdfsCount(pdfs.length);
    } catch (error) {
      console.error('Error loading saved PDFs count:', error);
      setSavedPdfsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const limits: UsageLimits = {
    forms: {
      current: forms.length,
      max: isSubscribed ? Infinity : stripeConfig.freeLimits.maxForms,
      canCreate: isSubscribed || forms.length < stripeConfig.freeLimits.maxForms,
    },
    pdfTemplates: {
      current: templates.length,
      max: isSubscribed ? Infinity : stripeConfig.freeLimits.maxPdfTemplates,
      canCreate: isSubscribed || templates.length < stripeConfig.freeLimits.maxPdfTemplates,
    },
    savedPdfs: {
      current: savedPdfsCount,
      max: isSubscribed ? Infinity : stripeConfig.freeLimits.maxSavedPdfs,
      canSave: isSubscribed || savedPdfsCount < stripeConfig.freeLimits.maxSavedPdfs,
    },
    loading: loading || subscriptionLoading || formsLoading || templatesLoading,
  };

  return {
    ...limits,
    isSubscribed,
    refreshLimits: loadSavedPdfsCount,
  };
};