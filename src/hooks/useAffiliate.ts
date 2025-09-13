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
      // Temporairement désactivé - les tables d'affiliation n'existent pas encore
      setTablesExist(false);
      setProgram(null);
      setReferrals([]);
      setLoading(false);
    } else {
      setTablesExist(false);
      setProgram(null);
      setReferrals([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    // Fonction désactivée temporairement - les tables n'existent pas encore
    console.log('📊 Tables d\'affiliation non créées - fonctionnalité désactivée');
    setTablesExist(false);
    setProgram(null);
    setReferrals([]);
    setLoading(false);
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
      // Temporairement désactivé - les tables d'affiliation n'existent pas encore
      setAllPrograms([]);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchAllPrograms = async () => {
    // Fonction désactivée temporairement - les tables n'existent pas encore
    console.log('📊 Admin: Tables d\'affiliation non créées - fonctionnalité désactivée');
    setAllPrograms([]);
    setLoading(false);
  };

  const updateCommissionRate = async (userId: string, newRate: number) => {
    // Fonction désactivée temporairement - les tables n'existent pas encore
    console.log('📊 Mise à jour commission désactivée - tables non créées');
    return false;
  };

  return {
    allPrograms,
    loading,
    updateCommissionRate,
    refetch: fetchAllPrograms,
    isSuperAdmin,
  };
};