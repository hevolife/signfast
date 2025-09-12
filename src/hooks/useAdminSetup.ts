import { useState, useEffect } from 'react';

export const useAdminSetup = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const createAdminAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setSetupComplete(true);
        return {
          success: true,
          credentials: {
            email: result.admin_email,
            password: result.admin_password,
          },
          secretCodes: result.secret_codes,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('Erreur setup admin:', error);
      return {
        success: false,
        error: 'Erreur de connexion',
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    setupComplete,
    loading,
    createAdminAccount,
  };
};