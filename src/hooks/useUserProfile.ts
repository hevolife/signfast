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

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
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
      // Convertir le fichier en base64 pour stockage temporaire
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.readAsDataURL(file);
      });
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