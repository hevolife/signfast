import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDateFR } from '../../utils/dateFormatter';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Edit, 
  Save, 
  X,
  Crown,
  Mail,
  Building,
  Calendar,
  Percent,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
}

interface AffiliateProgram {
  id: string;
  user_id: string;
  affiliate_code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  monthly_earnings: number;
  is_active: boolean;
  created_at: string;
  user?: AdminUser;
}

export const AffiliateAdminPanel: React.FC = () => {
  const { user, session } = useAuth();
  const [allPrograms, setAllPrograms] = useState<AffiliateProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState('');

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  React.useEffect(() => {
    if (isSuperAdmin) {
      loadAffiliatePrograms();
    }
  }, [isSuperAdmin]);

  const loadAffiliatePrograms = async () => {
    try {
      if (!session?.access_token) {
        console.warn('❌ Session non disponible pour loadAffiliatePrograms');
        setLoading(false);
        return;
      }

      console.log('🤝 Début chargement programmes affiliation...');
      
      // 1. Récupérer tous les utilisateurs via l'API admin
      const usersResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users-admin`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!usersResponse.ok) {
        console.error('❌ Erreur API users:', usersResponse.status);
        toast.error(`Erreur API utilisateurs: ${usersResponse.status}`);
        setAllPrograms([]);
        setLoading(false);
        return;
      }

      const users: AdminUser[] = await usersResponse.json();
      console.log('👥 Utilisateurs récupérés:', users.length);

      // 2. Récupérer tous les programmes d'affiliation
      const { data: programs, error: programsError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programsError) {
        console.error('❌ Erreur programmes affiliation:', programsError);
        toast.error('Erreur lors du chargement des programmes d\'affiliation');
        setAllPrograms([]);
        setLoading(false);
        return;
      }

      console.log('🤝 Programmes récupérés:', programs?.length || 0);
      
      // 3. Enrichir les programmes avec les données utilisateur
      const programsWithUserData = (programs || []).map(program => {
        const userData = users.find(u => u.id === program.user_id);
        return {
          ...program,
          user: userData
        };
      });

      setAllPrograms(programsWithUserData);
      console.log('✅ Programmes affiliation chargés:', programsWithUserData.length);
      
    } catch (error: any) {
      console.error('❌ Erreur générale loadAffiliatePrograms:', error);
      setAllPrograms([]);
      toast.error('Erreur lors du chargement des programmes d\'affiliation');
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionRate = async (userId: string, newRate: number) => {
    try {
      console.log('💰 Mise à jour commission:', userId, newRate);
      
      const { error } = await supabase
        .from('affiliate_programs')
        .update({ commission_rate: newRate })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erreur mise à jour commission:', error);
        return false;
      }

      console.log('✅ Commission mise à jour');
      // Rafraîchir les données
      await loadAffiliatePrograms();
      return true;
    } catch (error) {
      console.error('❌ Erreur générale updateCommissionRate:', error);
      return false;
    }
  };

  const handleEditCommission = (userId: string, currentRate: number) => {
    setEditingUserId(userId);
    setNewCommissionRate(currentRate);
  };

  const handleSaveCommission = async (programId: string) => {
    if (newCommissionRate < 0 || newCommissionRate > 50) {
      toast.error('Le taux de commission doit être entre 0% et 50%');
      return;
    }

    if (!session?.access_token) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    const program = filteredPrograms.find(p => p.id === programId);
    if (!program) {
      toast.error('Programme non trouvé');
      return;
    }

    const success = await updateCommissionRate(program.user_id, newCommissionRate);
    
    if (success) {
      toast.success('Taux de commission mis à jour !');
      setEditingUserId(null);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setNewCommissionRate(5);
  };

  const getUserDisplayName = (program: AffiliateProgram): string => {
    const userData = program.user;
    
    if (!userData) {
      return program.affiliate_code; // Fallback sur le code d'affiliation
    }
    
    // Priorité : nom d'entreprise
    if (userData.profile?.company_name) {
      return userData.profile.company_name;
    }
    
    // Ensuite : prénom + nom
    const firstName = userData.profile?.first_name || '';
    const lastName = userData.profile?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    // Fallback : email
    if (userData.email) {
      return userData.email;
    }
    
    return program.affiliate_code;
  };

  const filteredPrograms = allPrograms.filter(program => {
    const searchLower = searchTerm.toLowerCase();
    const displayName = getUserDisplayName(program);
    return (
      program.affiliate_code.toLowerCase().includes(searchLower) ||
      program.user_id.toLowerCase().includes(searchLower) ||
      displayName.toLowerCase().includes(searchLower)
    );
  });

  const totalEarnings = allPrograms.reduce((sum, program) => sum + program.total_earnings, 0);
  const totalReferrals = allPrograms.reduce((sum, program) => sum + program.total_referrals, 0);
  const monthlyEarnings = allPrograms.reduce((sum, program) => sum + (program.monthly_earnings || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des affiliations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Affiliés actifs
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {allPrograms.filter(p => p.is_active).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Parrainages totaux
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {totalReferrals}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Gains ce mois
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {monthlyEarnings.toFixed(2)}€
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Gains totaux
                </p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                  {totalEarnings.toFixed(2)}€
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Input
              placeholder="Rechercher par code d'affiliation ou ID utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des programmes d'affiliation */}
      <div className="space-y-4">
        {filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'Aucun programme trouvé' : 'Aucun programme d\'affiliation'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPrograms.map((program) => (
            <Card key={program.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Informations utilisateur */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {getUserDisplayName(program)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {program.affiliate_code}
                          </code>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            program.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {program.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          {program.user?.email && (
                            <div className="flex items-center space-x-1">
                              <span>📧</span>
                              <span className="truncate">{program.user.email}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 truncate">
                            ID: {program.user_id}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistiques en grille */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">{program.total_referrals}</div>
                        <div className="text-xs text-blue-600">Parrainages</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-green-600">{program.total_referrals}</div>
                        <div className="text-xs text-green-600">Confirmés</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-purple-600">{program.monthly_earnings?.toFixed(2) || '0.00'}€</div>
                        <div className="text-xs text-purple-600">Ce mois</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-orange-600">{program.total_earnings?.toFixed(2) || '0.00'}€</div>
                        <div className="text-xs text-orange-600">Total</div>
                      </div>
                    </div>
                  </div>

                  {/* Gestion de la commission */}
                  <div className="flex-shrink-0 lg:ml-6">
                    {editingUserId === program.id ? (
                      <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <Percent className="h-4 w-4 text-gray-500" />
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          value={newCommissionRate}
                          onChange={(e) => setNewCommissionRate(parseFloat(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-gray-600">%</span>
                        <Button
                          size="sm"
                          onClick={() => handleSaveCommission(program.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <Percent className="h-4 w-4 text-gray-500" />
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {program.commission_rate}%
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCommission(program.id, program.commission_rate)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3" />
                          <span className="text-xs">Modifier</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Résumé des commissions */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300">
              Résumé des commissions
            </h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 mb-1">{totalReferrals}</div>
              <div className="text-sm text-indigo-700 dark:text-indigo-400">Parrainages totaux</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">{monthlyEarnings.toFixed(2)}€</div>
              <div className="text-sm text-green-700 dark:text-green-400">Commissions ce mois</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 mb-1">{totalEarnings.toFixed(2)}€</div>
              <div className="text-sm text-purple-700 dark:text-purple-400">Commissions totales</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};