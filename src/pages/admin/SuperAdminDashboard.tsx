import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateFR } from '../../utils/dateFormatter';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useLimits } from '../../hooks/useLimits';
import { useForms } from '../../hooks/useForms';
import { usePDFTemplates } from '../../hooks/usePDFTemplates';
import { supabase, createClient } from '../../lib/supabase';
import { stripeConfig } from '../../stripe-config';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  Users, 
  Crown, 
  Shield, 
  BarChart3, 
  UserCheck, 
  UserX, 
  Search,
  Filter,
  Download,
  Eye,
  Settings,
  Calendar,
  TrendingUp,
  DollarSign,
  Gift,
  UserCheck
  HardDrive,
  Key,
  Gift,
  LogIn,
  RefreshCw,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  email_confirmed_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  subscription?: {
    status: string;
    price_id?: string;
    current_period_end?: number;
  };
  secretCode?: {
    type: string;
    expires_at?: string;
  };
  stats: {
    forms_count: number;
    templates_count: number;
    pdfs_count: number;
    responses_count: number;
  };
}

export const SuperAdminDashboard: React.FC = () => {
  const { user, isImpersonating } = useAuth();
  const { isSubscribed, subscriptionStatus, hasSecretCode, secretCodeType } = useSubscription();
  const { forms: formsLimits, pdfTemplates: templatesLimits, savedPdfs: savedPdfsLimits } = useLimits();
  const { forms } = useForms();
  const { templates } = usePDFTemplates();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'subscribed' | 'free' | 'secret_code'>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [createdCode, setCreatedCode] = useState<{ code: string; type: string } | null>(null);
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    subscribedUsers: 0,
    secretCodeUsers: 0,
    totalForms: 0,
    totalResponses: 0,
    totalRevenue: 0,
    newUsersThisMonth: 0,
  });

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  // Récupérer les informations d'impersonation
  const getImpersonationInfo = () => {
    if (!isImpersonating) return null;
    
    try {
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        return JSON.parse(impersonationData);
      }
    } catch (error) {
      console.error('Erreur parsing impersonation data:', error);
    }
    return null;
  };

  const impersonationInfo = getImpersonationInfo();
  const product = stripeConfig.products[0];

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      toast.error('Accès non autorisé');
      return;
    }
    
    loadUsers();
  }, [isSuperAdmin, navigate]);

  // Charger les stats globales après avoir chargé les utilisateurs
  useEffect(() => {
    if (users.length > 0) {
      loadGlobalStats();
    }
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('🔧 Chargement des vrais utilisateurs...');
      
      // Récupérer la session actuelle pour avoir un token valide
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('⚠️ Pas de session valide, chargement des utilisateurs depuis la base');
        // Essayer de charger directement depuis la base de données
        await loadUsersFromDatabase();
        return;
      }

      // Appeler la fonction edge pour récupérer les vrais utilisateurs
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users-admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`⚠️ Erreur API (${response.status}), fallback vers base de données`);
        await loadUsersFromDatabase();
        return;
      }

      const realUsers = await response.json();
      
      if (Array.isArray(realUsers)) {
        setUsers(realUsers);
        console.log('✅ Vrais utilisateurs chargés:', realUsers.length, 'utilisateurs');
      } else {
        console.warn('⚠️ Format de réponse invalide, fallback vers base de données');
        await loadUsersFromDatabase();
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      await loadUsersFromDatabase();
    } finally {
      setLoading(false);
    }
  };

  const loadUsersFromDatabase = async () => {
    try {
      console.log('🔄 Chargement depuis la base de données...');
      
      // Charger les utilisateurs depuis les tables publiques
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*');

      if (profilesError) {
        console.error('❌ Erreur chargement profils:', profilesError);
        setUsers([]);
        toast.error('Impossible de charger les utilisateurs');
        return;
      }

      // Charger les statistiques pour chaque utilisateur
      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            // Compter les formulaires
            const { count: formsCount } = await supabase
              .from('forms')
              .select('id', { count: 'exact' })
              .eq('user_id', profile.user_id);

            // Compter les templates
            const { count: templatesCount } = await supabase
              .from('pdf_templates')
              .select('id', { count: 'exact' })
              .eq('user_id', profile.user_id);

            // Compter les PDFs (approximation)
            const { count: pdfsCount } = await supabase
              .from('pdf_storage')
              .select('id', { count: 'exact' });

            // Compter les réponses
            const { data: userForms } = await supabase
              .from('forms')
              .select('id')
              .eq('user_id', profile.user_id);

            let responsesCount = 0;
            if (userForms && userForms.length > 0) {
              const formIds = userForms.map(f => f.id);
              const { count } = await supabase
                .from('responses')
                .select('id', { count: 'exact' })
                .in('form_id', formIds);
              responsesCount = count || 0;
            }

            return {
              id: profile.user_id,
              email: `${profile.first_name?.toLowerCase() || 'user'}.${profile.last_name?.toLowerCase() || 'unknown'}@example.com`,
              created_at: profile.created_at,
              last_sign_in_at: profile.updated_at,
              email_confirmed_at: profile.created_at,
              profile: {
                first_name: profile.first_name,
                last_name: profile.last_name,
                company_name: profile.company_name,
              },
              stats: {
                forms_count: formsCount || 0,
                templates_count: templatesCount || 0,
                pdfs_count: Math.floor((pdfsCount || 0) / Math.max(profiles.length, 1)),
                responses_count: responsesCount,
              }
            };
          } catch (error) {
            console.error('Erreur chargement stats utilisateur:', error);
            return {
              id: profile.user_id,
              email: `${profile.first_name?.toLowerCase() || 'user'}@example.com`,
              created_at: profile.created_at,
              last_sign_in_at: profile.updated_at,
              email_confirmed_at: profile.created_at,
              profile: {
                first_name: profile.first_name,
                last_name: profile.last_name,
                company_name: profile.company_name,
              },
              stats: {
                forms_count: 0,
                templates_count: 0,
                pdfs_count: 0,
                responses_count: 0,
              }
            };
          }
        })
      );

      setUsers(usersWithStats);
      console.log('✅ Utilisateurs chargés depuis la base:', usersWithStats.length);
      
      if (usersWithStats.length === 0) {
        toast.info('Aucun utilisateur trouvé dans la base de données');
      }
    } catch (error) {
      console.error('❌ Erreur chargement depuis base:', error);
      setUsers([]);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };
  const loadGlobalStats = async () => {
    try {
      // Calculer les stats depuis les données utilisateurs déjà chargées
      const totalUsers = users.length;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const newUsersThisMonth = users.filter(u => 
        new Date(u.created_at) >= thisMonth
      ).length;
      
      const totalForms = users.reduce((sum, u) => sum + u.stats.forms_count, 0);
      const totalResponses = users.reduce((sum, u) => sum + u.stats.responses_count, 0);
      const subscribedUsers = users.filter(u => u.subscription?.status === 'active').length;
      const secretCodeUsers = users.filter(u => u.secretCode).length;

      setGlobalStats({
        totalUsers,
        subscribedUsers,
        secretCodeUsers,
        totalForms,
        totalResponses,
        totalRevenue: subscribedUsers * 59.99, // Estimation
        newUsersThisMonth,
      });
    } catch (error) {
      console.error('Erreur chargement stats globales:', error);
    }
  };

  const impersonateUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir vous connecter en tant que ${userEmail} ?`)) {
      return;
    }

    try {
      toast.loading('Connexion en cours...', { id: 'impersonation' });
      
      // Sauvegarder l'ID admin actuel pour l'impersonation
      localStorage.setItem('admin_impersonation', JSON.stringify({
        admin_id: user?.id,
        target_user_id: userId,
        target_email: userEmail,
        timestamp: Date.now()
      }));
      
      toast.success(`Mode impersonation activé pour ${userEmail}`, { id: 'impersonation' });
      
      // Rediriger vers le dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('Erreur impersonation:', error);
      toast.error('Erreur lors de la connexion utilisateur', { id: 'impersonation' });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      toast(`Fonctionnalité de modification du statut utilisateur temporairement désactivée`);
    } catch (error) {
      console.error('Erreur toggle status:', error);
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const createSecretCode = async (type: 'monthly' | 'lifetime', description: string) => {
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('secret_codes')
        .insert([{
          code,
          type,
          description,
          max_uses: 1,
          expires_at: type === 'monthly' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
        }]);

      if (error) {
        toast.error('Erreur lors de la création du code');
        return;
      }

      setCreatedCode({ code, type });
      setShowCodeModal(true);
    } catch (error) {
      console.error('Erreur création code:', error);
      toast.error('Erreur lors de la création du code');
    }
  };

  const exportUsers = () => {
    const csvData = users.map(user => ({
      Email: user.email,
      'Nom complet': `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim(),
      Entreprise: user.profile?.company_name || '',
      'Date création': new Date(user.created_at).toLocaleDateString('fr-FR'),
      'Dernière connexion': user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR') : 'Jamais',
      Statut: user.subscription?.status === 'active' ? 'Abonné' : user.secretCode ? 'Code Secret' : 'Gratuit',
      Formulaires: user.stats.forms_count,
      'Templates PDF': user.stats.templates_count,
      'PDFs sauvegardés': user.stats.pdfs_count,
      Réponses: user.stats.responses_count,
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signfast-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'subscribed' && user.subscription?.status === 'active') ||
                         (filterStatus === 'secret_code' && user.secretCode) ||
                         (filterStatus === 'free' && !user.subscription && !user.secretCode);

    return matchesSearch && matchesFilter;
  });

  if (!isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête Admin */}
        <div className="text-center mb-8">
          {/* Bannière d'impersonation */}
          {isImpersonating && impersonationInfo && (
            <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                      Mode Impersonation Actif
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      Connecté en tant que: <strong>{impersonationInfo.target_email}</strong>
                    </p>
                    <div className="mt-2 flex items-center justify-center space-x-4 text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        isSubscribed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {isSubscribed 
                          ? hasSecretCode 
                            ? `Premium (${secretCodeType === 'lifetime' ? 'À vie' : 'Mensuel'})`
                            : product.name
                          : 'Plan Gratuit'
                        }
                      </span>
                      <span className="text-purple-600 dark:text-purple-400">
                        📝 {forms.length} formulaires • 📄 {templates.length} templates
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium mb-4">
            <Shield className="h-4 w-4 mr-2" />
            {isImpersonating ? `Super Admin → ${impersonationInfo?.target_email}` : 'Dashboard Super Admin'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isImpersonating ? `Vue Utilisateur: ${impersonationInfo?.target_email}` : 'Administration SignFast'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isImpersonating 
              ? 'Données en temps réel de l\'utilisateur impersonné'
              : 'Gestion des utilisateurs et statistiques globales'
            }
          </p>
        </div>

        {/* Statistiques - globales ou utilisateur impersonné */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isImpersonating ? (
            // Statistiques de l'utilisateur impersonné
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Formulaires
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {forms.length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formsLimits.max === Infinity ? 'Illimité' : `${formsLimits.current}/${formsLimits.max}`}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Templates PDF
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {templates.length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {templatesLimits.max === Infinity ? 'Illimité' : `${templatesLimits.current}/${templatesLimits.max}`}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        PDFs Sauvegardés
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {savedPdfsLimits.current}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {savedPdfsLimits.max === Infinity ? 'Illimité' : `${savedPdfsLimits.current}/${savedPdfsLimits.max}`}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <HardDrive className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Statut Abonnement
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {isSubscribed 
                          ? hasSecretCode 
                            ? 'Premium'
                            : 'Pro'
                          : 'Gratuit'
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isSubscribed 
                          ? hasSecretCode 
                            ? `Code ${secretCodeType}`
                            : product.name
                          : 'Plan gratuit'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Crown className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Statistiques globales normales
            <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Utilisateurs totaux
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {globalStats.totalUsers}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    +{globalStats.newUsersThisMonth} ce mois
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Abonnés Pro
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {globalStats.subscribedUsers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {users.length > 0 ? Math.round((globalStats.subscribedUsers / users.length) * 100) : 0}% conversion
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Crown className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Formulaires créés
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {globalStats.totalForms}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {users.length > 0 ? Math.round(globalStats.totalForms / users.length) : 0} par utilisateur
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Réponses totales
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {globalStats.totalResponses}
                  </p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Actif
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </div>

        {/* Actions rapides - masquées en mode impersonation */}
        {!isImpersonating && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Key className="h-5 w-5 text-purple-600" />
                <span>Codes Secrets</span>
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => createSecretCode('monthly', 'Code mensuel admin')}
                className="w-full flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
              >
                <Calendar className="h-4 w-4" />
                <span>Créer code mensuel</span>
              </Button>
              <Button
                onClick={() => createSecretCode('lifetime', 'Code à vie admin')}
                className="w-full flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700"
              >
                <Gift className="h-4 w-4" />
                <span>Créer code à vie</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Exports</span>
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={exportUsers}
                className="w-full flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>Exporter utilisateurs CSV</span>
              </Button>
              <Button
                onClick={() => loadUsers()}
                variant="secondary"
                className="w-full flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Actualiser données</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Activité</span>
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Codes secrets actifs:</span>
                  <span className="font-medium">{users.filter(u => u.secretCode).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Utilisateurs actifs:</span>
                  <span className="font-medium">{users.filter(u => u.last_sign_in_at).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Taux d'activation:</span>
                  <span className="font-medium text-green-600">
                    {Math.round((users.filter(u => u.email_confirmed_at).length / users.length) * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Filtres et recherche - masqués en mode impersonation */}
        {!isImpersonating && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par email, nom ou entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les utilisateurs</option>
                  <option value="subscribed">Abonnés Pro</option>
                  <option value="secret_code">Codes secrets</option>
                  <option value="free">Gratuits</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Liste des utilisateurs - masquée en mode impersonation */}
        {!isImpersonating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Utilisateurs ({filteredUsers.length})
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {filteredUsers.length} sur {users.length} utilisateurs
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Utilisateur</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Statut</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Activité</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Données</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {userData.profile?.first_name || userData.profile?.last_name 
                              ? `${userData.profile.first_name || ''} ${userData.profile.last_name || ''}`.trim()
                              : 'Nom non renseigné'
                            }
                          </div>
                          <div className="text-xs text-gray-500">{userData.email}</div>
                          {userData.profile?.company_name && (
                            <div className="text-xs text-blue-600">{userData.profile.company_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="space-y-1">
                          {userData.subscription?.status === 'active' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <Crown className="h-3 w-3 mr-1" />
                              Pro
                            </span>
                          ) : userData.secretCode ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              <Gift className="h-3 w-3 mr-1" />
                              {userData.secretCode.type === 'lifetime' ? 'À vie' : 'Mensuel'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              Gratuit
                            </span>
                          )}
                          {!userData.email_confirmed_at && (
                            <div className="text-xs text-orange-600">Email non confirmé</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-xs space-y-1">
                          <div>Créé: {formatDateFR(userData.created_at)}</div>
                          <div>
                            Dernière connexion: {userData.last_sign_in_at 
                              ? formatDateFR(userData.last_sign_in_at)
                              : 'Jamais'
                            }
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-xs space-y-1">
                          <div>📝 {userData.stats.forms_count} formulaires</div>
                          <div>📄 {userData.stats.templates_count} templates</div>
                          <div>💾 {userData.stats.pdfs_count} PDFs</div>
                          <div>📊 {userData.stats.responses_count} réponses</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => impersonateUser(userData.id, userData.email)}
                            className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                            title="Se connecter en tant que cet utilisateur"
                          >
                            <LogIn className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(userData);
                              setShowUserModal(true);
                            }}
                            className="flex items-center space-x-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="Voir les détails"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleUserStatus(userData.id, !!userData.email_confirmed_at)}
                            className={`flex items-center space-x-1 ${
                              userData.email_confirmed_at 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={userData.email_confirmed_at ? 'Désactiver utilisateur' : 'Activer utilisateur'}
                          >
                            {userData.email_confirmed_at ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Panneau utilisateur impersonné */}
        {isImpersonating && impersonationInfo && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  <span>Utilisateur Impersonné</span>
                </h3>
                <Button
                  onClick={() => {
                    localStorage.removeItem('admin_impersonation');
                    window.location.href = '/admin';
                  }}
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                >
                  Arrêter l'impersonation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations utilisateur */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">
                      Informations Utilisateur
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Email:</span>
                        <span className="font-medium">{impersonationInfo.target_email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ID Utilisateur:</span>
                        <span className="font-mono text-xs">{impersonationInfo.target_user_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Session depuis:</span>
                        <span className="font-medium">
                          {new Date(impersonationInfo.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">
                      Statut Abonnement
                    </h4>
                    <div className="space-y-3">
                      {isSubscribed ? (
                        <div className="flex items-center space-x-2">
                          <Crown className="h-5 w-5 text-green-600" />
                          <span className="text-green-600 font-medium">
                            {hasSecretCode 
                              ? `Premium (${secretCodeType === 'lifetime' ? 'À vie' : 'Mensuel'})`
                              : product.name
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span className="text-gray-600">Plan gratuit</span>
                        </div>
                      )}
                      
                      <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div className="text-center">
                            <div className="font-bold text-blue-600">{forms.length}</div>
                            <div className="text-gray-500">Formulaires</div>
                            <div className="text-gray-400">
                              {formsLimits.max === Infinity ? '∞' : `/${formsLimits.max}`}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-purple-600">{templates.length}</div>
                            <div className="text-gray-500">Templates</div>
                            <div className="text-gray-400">
                              {templatesLimits.max === Infinity ? '∞' : `/${templatesLimits.max}`}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600">{savedPdfsLimits.current}</div>
                            <div className="text-gray-500">PDFs</div>
                            <div className="text-gray-400">
                              {savedPdfsLimits.max === Infinity ? '∞' : `/${savedPdfsLimits.max}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions rapides pour l'utilisateur impersonné */}
              <div className="grid md:grid-cols-4 gap-4">
                <a href="/dashboard" className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full mb-3">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        Dashboard
                      </h4>
                    </CardContent>
                  </Card>
                </a>
                
                <a href="/forms" className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-600 rounded-full mb-3">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        Formulaires
                      </h4>
                    </CardContent>
                  </Card>
                </a>
                
                <a href="/pdf/templates" className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 text-purple-600 rounded-full mb-3">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        Templates
                      </h4>
                    </CardContent>
                  </Card>
                </a>
                
                <a href="/pdf/manager" className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-600 rounded-full mb-3">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        Stockage
                      </h4>
                    </CardContent>
                  </Card>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal détails utilisateur */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Détails utilisateur
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowUserModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations de base */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Informations personnelles</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <div className="font-medium">{selectedUser.email}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Nom complet:</span>
                      <div className="font-medium">
                        {selectedUser.profile?.first_name || selectedUser.profile?.last_name 
                          ? `${selectedUser.profile.first_name || ''} ${selectedUser.profile.last_name || ''}`.trim()
                          : 'Non renseigné'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Entreprise:</span>
                      <div className="font-medium">{selectedUser.profile?.company_name || 'Non renseigné'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Inscription:</span>
                      <div className="font-medium">{formatDateFR(selectedUser.created_at)}</div>
                    </div>
                  </div>
                </div>

                {/* Abonnement */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Abonnement</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    {selectedUser.subscription?.status === 'active' ? (
                      <div className="flex items-center space-x-2">
                        <Crown className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-medium">Abonnement Pro actif</span>
                      </div>
                    ) : selectedUser.secretCode ? (
                      <div className="flex items-center space-x-2">
                        <Gift className="h-5 w-5 text-purple-600" />
                        <span className="text-purple-600 font-medium">
                          Code secret {selectedUser.secretCode.type === 'lifetime' ? 'à vie' : 'mensuel'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-gray-600">Plan gratuit</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistiques d'utilisation */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Utilisation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedUser.stats.forms_count}</div>
                      <div className="text-sm text-blue-700">Formulaires créés</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{selectedUser.stats.templates_count}</div>
                      <div className="text-sm text-purple-700">Templates PDF</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedUser.stats.pdfs_count}</div>
                      <div className="text-sm text-green-700">PDFs sauvegardés</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{selectedUser.stats.responses_count}</div>
                      <div className="text-sm text-orange-700">Réponses reçues</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button
                    onClick={() => impersonateUser(selectedUser.id, selectedUser.email)}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Se connecter en tant que</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1"
                  >
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Code Secret Créé */}
        {showCodeModal && createdCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Code Secret Créé !
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {createdCode.type === 'lifetime' ? 'Code à vie' : 'Code mensuel'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowCodeModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <p className="text-sm text-purple-800 dark:text-purple-300 mb-3">
                      Votre code secret :
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-purple-300 dark:border-purple-600">
                      <code className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-wider">
                        {createdCode.code}
                      </code>
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-400 mt-2">
                      {createdCode.type === 'lifetime' 
                        ? '🎉 Accès à vie - Aucune expiration'
                        : '📅 Valide pendant 30 jours'
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Instructions :</strong>
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1">
                    <li>• Copiez ce code et partagez-le avec l'utilisateur</li>
                    <li>• L'utilisateur peut l'activer dans Paramètres → Abonnement</li>
                    <li>• Le code ne peut être utilisé qu'une seule fois</li>
                  </ul>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCode.code);
                      toast.success('Code copié dans le presse-papiers !');
                    }}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <Key className="h-4 w-4" />
                    <span>Copier le code</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowCodeModal(false)}
                    className="flex-1"
                  >
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};