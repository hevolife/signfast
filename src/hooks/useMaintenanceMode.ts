import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const checkMaintenanceMode = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (error) {
        console.warn('Erreur vérification maintenance mode:', error);
        setIsMaintenanceMode(false);
      } else {
        setIsMaintenanceMode(data.value === 'true');
      }
    } catch (error) {
      console.warn('Erreur maintenance mode:', error);
      setIsMaintenanceMode(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!isSuperAdmin) {
      throw new Error('Seuls les super admins peuvent modifier le mode maintenance');
    }

    try {
      const newValue = !isMaintenanceMode;
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: newValue.toString(),
          updated_by: user?.id 
        })
        .eq('key', 'maintenance_mode');

      if (error) {
        throw new Error('Erreur lors de la mise à jour du mode maintenance');
      }

      setIsMaintenanceMode(newValue);
      return true;
    } catch (error) {
      console.error('Erreur toggle maintenance:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkMaintenanceMode();
    
    // Vérifier périodiquement le mode maintenance
    const interval = setInterval(checkMaintenanceMode, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, []);

  return {
    isMaintenanceMode,
    loading,
    isSuperAdmin,
    toggleMaintenanceMode,
    refresh: checkMaintenanceMode,
  };
};