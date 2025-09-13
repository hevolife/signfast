import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AffiliateProgram, AffiliateReferral, AffiliateStats } from '../types/affiliate';

export const useAffiliate = () => {
  const { user } = useAuth();
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    } else {
      setTablesExist(false);
      setProgram(null);
      setReferrals([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Chargement données affiliation pour:', user.id);
      
      // Tester d'abord si les tables existent
      const { error: testError } = await supabase
        .from('affiliate_programs')
        .select('id')
        .limit(1);
      
      if (testError && testError.code === 'PGRST205') {
        console.log('📊 Tables d\'affiliation non créées');
        setTablesExist(false);
        setLoading(false);
        return;
      }
      
      setTablesExist(true);
      
      // Récupérer le programme d'affiliation de l'utilisateur
      const { data: programData, error: programError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (programError && programError.code !== 'PGRST116') {
        console.error('Erreur récupération programme:', programError);
        throw programError;
      }
      
      setProgram(programData);
      
      // Si un programme existe, récupérer les parrainages
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
          console.error('Erreur récupération parrainages:', referralsError);
        } else {
          setReferrals(referralsData || []);
        }
      }
      
    } catch (error: any) {
      console.error('Erreur chargement affiliation:', error);
      if (error.code === 'PGRST205') {
        setTablesExist(false);
      }
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
      console.log('📊 Admin: Chargement tous les programmes...');
      
      // Récupérer tous les programmes avec statistiques calculées
      const { data: programs, error: programsError } = await supabase
        .from('affiliate_programs')
        .select(`
          *,
          user_profiles!inner(first_name, last_name, company_name, created_at)
        `)
        .order('created_at', { ascending: false });

      if (programsError) {
        console.error('Erreur récupération programmes admin:', programsError);
        throw programsError;
      }

      // Pour chaque programme, calculer les statistiques détaillées
      const programsWithStats = await Promise.all(
        (programs || []).map(async (program) => {
          try {
            // Compter les parrainages confirmés
            const { count: confirmedCount } = await supabase
              .from('affiliate_referrals')
              .select('id', { count: 'exact', head: true })
              .eq('affiliate_user_id', program.user_id)
              .eq('status', 'confirmed');

            // Calculer les gains du mois
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: monthlyCommissions } = await supabase
              .from('affiliate_referrals')
              .select('commission_amount')
              .eq('affiliate_user_id', program.user_id)
              .eq('status', 'confirmed')
              .gte('created_at', startOfMonth.toISOString());

            const monthlyEarnings = (monthlyCommissions || [])
              .reduce((sum, ref) => sum + ref.commission_amount, 0);

            return {
              ...program,
              confirmed_referrals: confirmedCount || 0,
              monthly_earnings: monthlyEarnings,
            };
          } catch (error) {
            console.error('Erreur calcul stats pour programme:', program.user_id, error);
            return {
              ...program,
              confirmed_referrals: 0,
              monthly_earnings: 0,
            };
          }
        })
      );

      setAllPrograms(programsWithStats);
      console.log('📊 Admin: Programmes chargés:', programsWithStats.length);
      
    } catch (error: any) {
      console.error('Erreur chargement programmes admin:', error);
      setAllPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionRate = async (userId: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from('affiliate_programs')
        .update({ commission_rate: newRate })
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur mise à jour commission:', error);
        return false;
      }

      // Rafraîchir les données
      await fetchAllPrograms();
      return true;
    } catch (error) {
      console.error('Erreur mise à jour commission:', error);
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