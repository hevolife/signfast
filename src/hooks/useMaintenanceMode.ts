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
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('Supabase non configuré, mode maintenance désactivé par défaut');
        setIsMaintenanceMode(false);
        setLoading(false);
        return;
      }

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

    if (!user?.id) {
      throw new Error('Utilisateur non identifié');
    }

    try {
      console.log('🔧 Toggle maintenance mode:', !isMaintenanceMode);
      
      const newValue = !isMaintenanceMode;
      
      // Vérifier d'abord si l'enregistrement existe
      const { data: existing, error: checkError } = await supabase
        .from('system_settings')
        .select('key')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erreur vérification setting:', checkError);
        throw new Error('Erreur lors de la vérification du paramètre');
      }

      let error;
      
      if (existing) {
        // Mettre à jour l'enregistrement existant
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({ 
            value: newValue.toString(),
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'maintenance_mode');
        error = updateError;
      } else {
        // Créer un nouvel enregistrement
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert([{
            key: 'maintenance_mode',
            value: newValue.toString(),
            updated_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        error = insertError;
      }

      if (error) {
        console.error('❌ Erreur maintenance mode:', error);
        throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
      }

      console.log('✅ Maintenance mode mis à jour:', newValue);
      setIsMaintenanceMode(newValue);
      return true;
    } catch (error) {
      console.error('❌ Erreur toggle maintenance:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkMaintenanceMode();
    
    // Vérifier périodiquement le mode maintenance seulement si pas super admin
    if (!isSuperAdmin) {
      const interval = setInterval(checkMaintenanceMode, 30000); // Toutes les 30 secondes
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  return {
    isMaintenanceMode,
    loading,
    isSuperAdmin,
    toggleMaintenanceMode,
    refresh: checkMaintenanceMode,
  };
};

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