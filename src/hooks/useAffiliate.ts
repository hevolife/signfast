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
      console.log('📊 Récupération données affiliation pour:', user.email);
      
      // Récupérer le programme d'affiliation de l'utilisateur
      const { data: programData, error: programError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (programError) {
        if (programError.code === 'PGRST116') {
          // Aucun programme trouvé - normal pour un nouvel utilisateur
          console.log('📊 Aucun programme d\'affiliation trouvé, sera créé automatiquement');
          setProgram(null);
        } else if (programError.code === 'PGRST205') {
          // Table n'existe pas
          console.log('📊 Tables d\'affiliation non créées');
          setTablesExist(false);
          setProgram(null);
          setReferrals([]);
          return;
        } else {
          console.error('📊 Erreur récupération programme:', programError);
          setProgram(null);
        }
      } else {
        console.log('📊 Programme d\'affiliation trouvé:', programData?.affiliate_code);
        setProgram(programData);
      }

      // Récupérer les parrainages seulement si on a un programme
      if (programData) {
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
          console.error('📊 Erreur récupération parrainages:', referralsError);
          setReferrals([]);
        } else {
          console.log('📊 Parrainages trouvés:', referralsData?.length || 0);
          setReferrals(referralsData || []);
        }
      } else {
        setReferrals([]);
      }

      setTablesExist(true);
    } catch (error) {
      console.error('Erreur générale affiliation:', error);
      setTablesExist(false);
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