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
      setTablesExist(true);
      setProgram(null);
      setReferrals([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    if (!user) return;

    try {
      // Tester d'abord si les tables existent
      const { error: testError } = await supabase
        .from('affiliate_programs')
        .select('id')
        .limit(1);

      if (testError && testError.code === 'PGRST205') {
        console.log('📊 Tables d\'affiliation non créées');
        setTablesExist(false);
        setProgram(null);
        setReferrals([]);
        return;
      }

      setTablesExist(true);

      // Récupérer le programme d'affiliation de l'utilisateur
      const { data: programData, error: programError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (programError && programError.code !== 'PGRST116') {
        console.error('Erreur récupération programme:', programError);
        setProgram(null);
      } else {
        setProgram(programData);
      }

      // Récupérer les parrainages
      const { data: referralsData, error: referralsError } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_user_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('Erreur récupération parrainages:', referralsError);
        setReferrals([]);
      } else {
        setReferrals(referralsData || []);
      }
    } catch (error) {
      console.error('Erreur générale affiliation:', error);
      setTablesExist(true);
      setProgram(null);
      setReferrals([]);
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
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchAllPrograms = async () => {
    try {
      // Tester d'abord si les tables existent
      const { error: testError } = await supabase
        .from('affiliate_programs')
        .select('id')
        .limit(1);

      if (testError && testError.code === 'PGRST205') {
        console.log('📊 Tables d\'affiliation non créées pour admin');
        setAllPrograms([]);
        return;
      }

      const { data, error } = await supabase
        .from('affiliate_stats')
        .select('*')
        .order('total_earnings', { ascending: false });

      if (error) {
        console.error('Error fetching affiliate stats:', error);
        setAllPrograms([]);
      } else {
        setAllPrograms(data || []);
      }
    } catch (error) {
      console.error('Error fetching affiliate programs:', error);
      setAllPrograms([]);
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