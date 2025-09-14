import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDateFR } from '../../utils/dateFormatter';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
  Shield, 
  Users, 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Search,
  Crown,
  Calendar,
  Mail,
  Building,
  FileText,
  HardDrive,
  DollarSign,
  Gift,
  UserCheck,
  Settings,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Activity,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMaintenanceMode } from '../../hooks/useMaintenanceMode';
import { AffiliateAdminPanel } from '../../components/admin/AffiliateAdminPanel';
import { DemoManagementPanel } from '../../components/admin/DemoManagementPanel';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  profile?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  subscription?: {
    subscription_status: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };
  secretCode?: {
    type: string;
    expires_at: string | null;
  };
  stats: {
    forms_count: number;
    templates_count: number;
    pdfs_count: number;
    responses_count: number;
  };
}

interface SecretCode {
  id: string;
  code: string;
  type: string;
  description: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const SuperAdminDashboard: React.FC = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { isMaintenanceMode, toggleMaintenanceMode } = useMaintenanceMode();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [secretCodes, setSecretCodes] = useState<SecretCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'codes' | 'affiliates' | 'demo'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [newCodeType, setNewCodeType] = useState<'monthly' | 'lifetime'>('monthly');
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number>(1);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<string | null>(null);
  const [newSubscriptionDuration, setNewSubscriptionDuration] = useState<'1month' | '2months' | '6months' | '1year' | 'lifetime'>('1month');

  const handleEditSubscription = (userId: string) => {
    setEditingSubscription(userId);
    setNewSubscriptionDuration('1month');
  };

  const handleCancelEditSubscription = () => {
    setEditingSubscription(null);
    setNewSubscriptionDuration('1month');
  };

  const handleSaveSubscription = async (userId: string) => {
    try {
      if (!session?.access_token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      const codeType = newSubscriptionDuration === 'lifetime' ? 'lifetime' : 'monthly';
      const description = `Extension admin ${newSubscriptionDuration} pour utilisateur ${userId}`;
      
      let expiresAt = null;
      if (codeType === 'monthly') {
        const durationMap = {
          '1month': 30,
          '2months': 60,
          '6months': 180,
          '1year': 365,
        };
        const days = durationMap[newSubscriptionDuration] || 30;
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const code = `ADMIN${Date.now().toString().slice(-8).toUpperCase()}`;

      const { data: secretCode, error: createError } = await supabase
        .from('secret_codes')
        .insert([{
          code,
          type: codeType,
          description,
          max_uses: 1,
          current_uses: 0,
          expires_at: expiresAt,
          is_active: true,
        }])
        .select()
        .single();

      if (createError) {
        console.error('Erreur création code:', createError);
        toast.error('Erreur lors de la création du code secret');
        return;
      }
      
      const { error: activateError } = await supabase.rpc('activate_secret_code', {
        code_input: code,
        user_id_input: userId
      });

      if (activateError) {
        console.error('Erreur activation code:', activateError);
        toast.error(`Erreur d'activation: ${activateError.message}`);
        return;
      }

      toast.success(`✅ Abonnement ${newSubscriptionDuration} activé pour l'utilisateur !`);
      setEditingSubscription(null);
      await loadUsers();
      
    } catch (error) {
      console.error('Erreur modification abonnement:', error);
      toast.error('Erreur lors de la modification de l\'abonnement');
    }
  };

  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  useEffect(() => {
    if (isSuperAdmin && session?.access_token) {
      loadUsers();
      loadSecretCodes();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, session?.access_token]);

  const loadUsers = async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase non configuré, impossible de charger les utilisateurs');
        toast.error('Configuration Supabase manquante. Veuillez configurer Supabase pour accéder aux fonctionnalités admin.');
        setUsers([]);
        setLoading(false);
        return;
      }

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users-admin`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Accès refusé : Vous devez être connecté avec le compte super admin');
        } else if (response.status === 401) {
          toast.error('Session expirée, veuillez vous reconnecter');
        } else {
          toast.error(`Erreur API: ${response.status}`);
        }
        setUsers([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs. Vérifiez votre connexion.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSecretCodes = async () => {
    try {
      if (!session?.access_token) {
        setSecretCodes([]);
        return;
      }

      const { data, error } = await supabase
        .from('secret_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setSecretCodes([]);
      } else {
        setSecretCodes(data || []);
      }
    } catch (error) {
      setSecretCodes([]);
    }
  };

  const createSecretCode = async () => {
    if (!newCodeDescription.trim()) {
      toast.error('Veuillez saisir une description');
      return;
    }

    if (!session?.access_token) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    try {
      const code = `${newCodeType.toUpperCase()}${Date.now().toString().slice(-6)}`;
      const expiresAt = newCodeType === 'monthly' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('secret_codes')
        .insert([{
          code,
          type: newCodeType,
          description: newCodeDescription,
          max_uses: newCodeMaxUses,
          expires_at: expiresAt,
          is_active: true,
          current_uses: 0,
        }])
        .select()
        .single();

      if (error) {
        toast.error('Erreur lors de la création du code');
        return;
      }

      toast.success(`Code secret créé: ${code}`);
      setNewCodeDescription('');
      setNewCodeMaxUses(1);
      await loadSecretCodes();
    } catch (error) {
      toast.error('Erreur lors de la création du code');
    }
  };

  const deleteSecretCode = async (id: string, code: string) => {
    if (window.confirm(`Supprimer le code "${code}" ?`)) {
      if (!session?.access_token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      try {
        const { error } = await supabase
          .from('secret_codes')
          .delete()
          .eq('id', id);

        if (error) {
          toast.error('Erreur lors de la suppression');
          return;
        }

        toast.success('Code supprimé');
        await loadSecretCodes();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié !');
  };

  const impersonateUser = (targetUser: AdminUser) => {
    if (window.confirm(`Vous connecter en tant que ${targetUser.email} ?`)) {
      const impersonationData = {
        admin_user_id: user?.id,
        admin_email: user?.email,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        timestamp: Date.now(),
      };

      localStorage.setItem('admin_impersonation', JSON.stringify(impersonationData));
      toast.success(`Impersonation activée: ${targetUser.email}`);
      window.location.reload();
    }
  };

  const togglePasswordVisibility = (code: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const handleToggleMaintenance = async () => {
    setMaintenanceLoading(true);
    try {
      await toggleMaintenanceMode();
      toast.success(
        isMaintenanceMode 
          ? '✅ Mode maintenance désactivé - Site accessible' 
          : '🔧 Mode maintenance activé - Site fermé au public'
      );
    } catch (error) {
      toast.error('Erreur lors du changement de mode maintenance');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubscriptionStatus = (user: AdminUser) => {
    if (user.secretCode) {
      return {
        status: user.secretCode.type === 'lifetime' ? 'Code à vie' : 'Code mensuel',
        color: 'purple',
        icon: <Gift className="h-4 w-4" />
      };
    }
    
    if (user.subscription?.subscription_status === 'active') {
      return {
        status: 'Abonné Pro',
        color: 'green',
        icon: <Crown className="h-4 w-4" />
      };
    }
    
    return {
      status: 'Gratuit',
      color: 'gray',
      icon: <UserCheck className="h-4 w-4" />
    };
  };

  const getUserDisplayName = (user: AdminUser) => {
    if (user.profile?.company_name) {
      return user.profile.company_name;
    }
    
    const firstName = user.profile?.first_name || '';
    const lastName = user.profile?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    return user.email;
  };

  // Calculer les statistiques globales
  const totalUsers = users.length;
  const subscribedUsers = users.filter(u => u.subscription?.subscription_status === 'active' || u.secretCode).length;
  const activeSecretCodes = secretCodes.filter(c => c.is_active).length;
  const totalForms = users.reduce((acc, u) => acc + u.stats.forms_count, 0);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Accès refusé
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Vous n'avez pas les permissions pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
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
        {/* En-tête simplifié */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Administration
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gestion de la plateforme SignFast
              </p>
            </div>
            
            {/* Mode Maintenance */}
            <Button
              onClick={handleToggleMaintenance}
              disabled={maintenanceLoading}
              variant={isMaintenanceMode ? "primary" : "danger"}
              className="flex items-center space-x-2"
            >
              {maintenanceLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : isMaintenanceMode ? (
                <Settings className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>
                {maintenanceLoading 
                  ? 'Mise à jour...' 
                  : isMaintenanceMode 
                  ? 'Désactiver maintenance' 
                  : 'Activer maintenance'
                }
              </span>
            </Button>
          </div>
          
          {isMaintenanceMode && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Site en maintenance - Seuls les super admins peuvent accéder
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation simplifiée */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
              { id: 'users', label: 'Utilisateurs', icon: Users, count: totalUsers },
              { id: 'codes', label: 'Codes', icon: Key, count: activeSecretCodes },
              { id: 'affiliates', label: 'Affiliations', icon: DollarSign },
              { id: 'demo', label: 'Démo', icon: Gift },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Vue d'ensemble */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Utilisateurs
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totalUsers}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
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
                        {subscribedUsers}
                      </p>
                    </div>
                    <Crown className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Codes actifs
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {activeSecretCodes}
                      </p>
                    </div>
                    <Key className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Formulaires
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totalForms}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activité récente */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Utilisateurs récents
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.slice(0, 5).map((user) => {
                    const status = getSubscriptionStatus(user);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {getUserDisplayName(user)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            status.color === 'purple' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              : status.color === 'green'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {status.icon}
                            <span className="ml-1">{status.status}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gestion des utilisateurs */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Recherche */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par email, nom ou entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Liste des utilisateurs */}
            <div className="space-y-4">
              {filteredUsers.map((adminUser) => {
                const subscriptionInfo = getSubscriptionStatus(adminUser);
                const displayName = getUserDisplayName(adminUser);

                return (
                  <Card key={adminUser.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        {/* Informations utilisateur */}
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            {adminUser.profile?.company_name ? (
                              <Building className="h-6 w-6 text-blue-600" />
                            ) : (
                              <Users className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {displayName}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                subscriptionInfo.color === 'purple' 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                  : subscriptionInfo.color === 'green'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                {subscriptionInfo.icon}
                                <span className="ml-1">{subscriptionInfo.status}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{adminUser.email}</span>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                              <span>📝 {adminUser.stats.forms_count}</span>
                              <span>📄 {adminUser.stats.templates_count}</span>
                              <span>💾 {adminUser.stats.pdfs_count}</span>
                              <span>📊 {adminUser.stats.responses_count}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {editingSubscription === adminUser.id ? (
                            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                              <select
                                value={newSubscriptionDuration}
                                onChange={(e) => setNewSubscriptionDuration(e.target.value as any)}
                                className="text-xs border border-blue-300 rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                <option value="1month">1 mois</option>
                                <option value="2months">2 mois</option>
                                <option value="6months">6 mois</option>
                                <option value="1year">1 an</option>
                                <option value="lifetime">À vie</option>
                              </select>
                              <Button
                                size="sm"
                                onClick={() => handleSaveSubscription(adminUser.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEditSubscription}
                                className="text-gray-600 hover:text-gray-800 px-2 py-1"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleEditSubscription(adminUser.id)}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => impersonateUser(adminUser)}
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={!session?.access_token}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredUsers.length === 0 && (
              <Card>
                <CardContent className="text-center py-16">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Aucun utilisateur trouvé
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm ? 'Essayez de modifier votre recherche' : 'Aucun utilisateur inscrit'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Gestion des codes secrets */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Création de code */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Créer un code secret
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newCodeType}
                      onChange={(e) => setNewCodeType(e.target.value as 'monthly' | 'lifetime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="monthly">Mensuel</option>
                      <option value="lifetime">À vie</option>
                    </select>
                  </div>
                  
                  <Input
                    label="Utilisations"
                    type="number"
                    min="1"
                    max="1000"
                    value={newCodeMaxUses}
                    onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value) || 1)}
                  />
                  
                  <Input
                    label="Description"
                    value={newCodeDescription}
                    onChange={(e) => setNewCodeDescription(e.target.value)}
                    placeholder="Description du code"
                  />
                  
                  <div className="flex items-end">
                    <Button onClick={createSecretCode} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des codes */}
            <div className="space-y-3">
              {secretCodes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Aucun code secret créé
                    </p>
                  </CardContent>
                </Card>
              ) : (
                secretCodes.map((code) => (
                  <Card key={code.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            code.type === 'lifetime' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {code.type === 'lifetime' ? <Crown className="h-3 w-3 mr-1" /> : <Calendar className="h-3 w-3 mr-1" />}
                            {code.type === 'lifetime' ? 'À vie' : 'Mensuel'}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                              {showPasswords[code.code] ? code.code : '••••••••'}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePasswordVisibility(code.code)}
                              className="p-1"
                            >
                              {showPasswords[code.code] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyCode(code.code)}
                              className="p-1"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {code.description}
                            </div>
                            <div className="text-xs text-gray-500">
                              {code.current_uses}/{code.max_uses || '∞'} utilisations
                              {code.expires_at && (
                                <span className="ml-2">• Expire le {formatDateFR(code.expires_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSecretCode(code.id, code.code)}
                          className="text-red-600 hover:text-red-700"
                          disabled={!session?.access_token}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'affiliates' && (
          <AffiliateAdminPanel />
        )}

        {activeTab === 'demo' && (
          <DemoManagementPanel />
        )}
      </div>
    </div>
  );
};