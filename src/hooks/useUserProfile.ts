import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/user';
import { useAuth } from '../contexts/AuthContext';

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return false;

    // L'utilisateur effectif est déjà géré par le contexte Auth
    const targetUserId = user.id;
    console.log('👤 Mise à jour profil pour userId:', targetUserId);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: targetUserId,
          ...updates,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      console.log('✅ Profil mis à jour avec succès');
      setProfile(data);
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      // Convertir le fichier en base64 pour stockage
      const logoUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.readAsDataURL(file);
      });
      
      // Mettre à jour immédiatement le profil avec la nouvelle URL du logo
      if (logoUrl) {
        setProfile(prev => prev ? { ...prev, logo_url: logoUrl } : null);
      }
      
      return logoUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    updateProfile,
    uploadLogo,
    refetch: fetchProfile,
  };
};