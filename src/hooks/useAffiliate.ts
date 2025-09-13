import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AffiliateProgram, AffiliateReferral, AffiliateStats } from '../types/affiliate';

export const useAffiliate = () => {
  const { user } = useAuth();
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    } else {
      setProgram(null);
      setReferrals([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    if (!user) return;

    try {
      // Récupérer le programme d'affiliation
      const { data: programData, error: programError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (programError) {
        if (programError.code === 'PGRST205') {
          // Table doesn't exist
          setTablesExist(false);
          setLoading(false);
          return;
        } else if (programError.code !== 'PGRST116') {
          console.error('Error fetching affiliate program:', programError);
        }
      } else {
        setProgram(programData);
      }

      // Only fetch referrals if tables exist
      if (tablesExist) {
        // Récupérer les parrainages
        const { data: referralsData, error: referralsError } = await supabase
          .from('affiliate_referrals')
          .select(`
            *,
            referred_user:users!referred_user_id(email),
            referred_profile:user_profiles!referred_user_id(first_name, last_name, company_name)
          `)
          .eq('affiliate_user_id', user.id)
          .order('created_at', { ascending: false });

        if (referralsError) {
          if (referralsError.code === 'PGRST205') {
            setTablesExist(false);
          } else {
            console.error('Error fetching referrals:', referralsError);
          }
        } else {
          setReferrals(referralsData || []);
        }
      }
    } catch (error) {
        console.error('Error fetching affiliate program:', programError);
    } finally {
      setLoading(false);
    }
  };

  const generateAffiliateLink = () => {
    if (!program) return '';
    return `${window.location.origin}/signup?ref=${program.affiliate_code}`;
  };

  return {
    program,
    referrals,
    loading,
    tablesExist,
    generateAffiliateLink,
    refetch: fetchAffiliateData,
  };
};

export const useAffiliateAdmin = () => {
  const { user } = useAuth();
  const [allPrograms, setAllPrograms] = useState<AffiliateStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllPrograms();
    }
  }, [isSuperAdmin]);

  const fetchAllPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_stats')
        .select('*')
        .order('total_earnings', { ascending: false });

      if (error) {
        console.error('Error fetching affiliate stats:', error);
      } else {
        setAllPrograms(data || []);
      }
    } catch (error) {
      console.error('Error fetching affiliate programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionRate = async (userId: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from('affiliate_programs')
        .update({ 
          commission_rate: newRate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating commission rate:', error);
        return false;
      }

      await fetchAllPrograms();
      return true;
    } catch (error) {
      console.error('Error updating commission rate:', error);
      return false;
    }
  };

  return {
    allPrograms,
    loading,
    updateCommissionRate,
    refetch: fetchAllPrograms,
    isSuperAdmin,
  };
};