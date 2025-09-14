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
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Menu,
  Bell,
  Zap,
  Database,
  Server,
  Globe
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
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
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
  const totalTemplates = users.reduce((acc, u) => acc + u.stats.templates_count, 0);
  const totalPdfs = users.reduce((acc, u) => acc + u.stats.pdfs_count, 0);
  const totalResponses = users.reduce((acc, u) => acc + u.stats.responses_count, 0);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Accès Refusé
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Vous n'avez pas les permissions pour accéder à cette page.
            </p>
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                Retour au Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'overview', 
      label: 'Vue d\'ensemble', 
      icon: Activity, 
      color: 'blue',
      description: 'Statistiques globales'
    },
    { 
      id: 'users', 
      label: 'Utilisateurs', 
      icon: Users, 
      count: totalUsers,
      color: 'green',
      description: 'Gestion des comptes'
    },
    { 
      id: 'codes', 
      label: 'Codes Secrets', 
      icon: Key, 
      count: activeSecretCodes,
      color: 'purple',
      description: 'Codes d\'accès premium'
    },
    { 
      id: 'affiliates', 
      label: 'Affiliations', 
      icon: DollarSign,
      color: 'orange',
      description: 'Programme de parrainage'
    },
    { 
      id: 'demo', 
      label: 'Démo', 
      icon: Gift,
      color: 'pink',
      description: 'Configuration démo'
    },
  ];

  const getTabColorClasses = (color: string, isActive: boolean) => {
    const colorMap = {
      blue: isActive 
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700',
      green: isActive 
        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25'
        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700',
      purple: isActive 
        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
        : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700',
      orange: isActive 
        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
        : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700',
      pink: isActive 
        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/25'
        : 'text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-700',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/10">
      {/* Header moderne avec gradient */}
      <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo et titre */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl lg:text-2xl font-bold text-white">
                  Super Admin
                </h1>
                <p className="text-sm text-white/80">
                  Gestion de la plateforme SignFast
                </p>
              </div>
            </div>

            {/* Actions header */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Indicateur maintenance */}
              <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isMaintenanceMode 
                  ? 'bg-orange-500/20 text-orange-100 border border-orange-400/30'
                  : 'bg-green-500/20 text-green-100 border border-green-400/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isMaintenanceMode ? 'bg-orange-400' : 'bg-green-400'} animate-pulse`}></div>
                <span>{isMaintenanceMode ? 'Maintenance' : 'En ligne'}</span>
              </div>

              {/* Toggle maintenance */}
              <Button
                onClick={handleToggleMaintenance}
                disabled={maintenanceLoading}
                variant={isMaintenanceMode ? "secondary" : "danger"}
                size="sm"
                className={`${
                  isMaintenanceMode 
                    ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' 
                    : 'bg-orange-500/20 hover:bg-orange-500/30 text-white border-orange-400/30'
                } backdrop-blur-sm`}
              >
                {maintenanceLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : isMaintenanceMode ? (
                  <Settings className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="hidden lg:inline ml-2">
                  {maintenanceLoading 
                    ? 'Mise à jour...' 
                    : isMaintenanceMode 
                    ? 'Désactiver'
                    : 'Maintenance'
                  }
                </span>
              </Button>

              {/* Menu mobile */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden bg-white/20 hover:bg-white/30 text-white"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Alerte maintenance */}
          {isMaintenanceMode && (
            <div className="pb-4">
              <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-orange-100">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Site en maintenance - Seuls les super admins peuvent accéder
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Navigation moderne avec onglets */}
        <div className="mb-8">
          {/* Navigation desktop */}
          <div className="hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2">
              <nav className="flex space-x-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-3 px-6 py-4 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${getTabColorClasses(tab.color, activeTab === tab.id)}`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            activeTab === tab.id 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${
                        activeTab === tab.id ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Navigation mobile */}
          <div className="lg:hidden">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Tab actuel */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center space-x-3">
                  {(() => {
                    const currentTab = tabs.find(t => t.id === activeTab);
                    return currentTab ? (
                      <>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTabColorClasses(currentTab.color, true)}`}>
                          <currentTab.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {currentTab.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {currentTab.description}
                          </div>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
                {showMobileMenu ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>

              {/* Menu déroulant mobile */}
              {showMobileMenu && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setShowMobileMenu(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-4 transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeTab === tab.id 
                          ? getTabColorClasses(tab.color, true)
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <tab.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{tab.label}</span>
                          {tab.count !== undefined && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold">
                              {tab.count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vue d'ensemble moderne */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Statistiques principales avec design moderne */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium mb-1">
                        Utilisateurs
                      </p>
                      <p className="text-3xl lg:text-4xl font-bold">
                        {totalUsers}
                      </p>
                      <p className="text-blue-200 text-xs mt-1">
                        {subscribedUsers} abonnés
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/30 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium mb-1">
                        Formulaires
                      </p>
                      <p className="text-3xl lg:text-4xl font-bold">
                        {totalForms}
                      </p>
                      <p className="text-green-200 text-xs mt-1">
                        {totalResponses} réponses
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium mb-1">
                        Templates
                      </p>
                      <p className="text-3xl lg:text-4xl font-bold">
                        {totalTemplates}
                      </p>
                      <p className="text-purple-200 text-xs mt-1">
                        {totalPdfs} PDFs
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Database className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium mb-1">
                        Codes Actifs
                      </p>
                      <p className="text-3xl lg:text-4xl font-bold">
                        {activeSecretCodes}
                      </p>
                      <p className="text-orange-200 text-xs mt-1">
                        Codes secrets
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Key className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Graphiques et métriques avancées */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Activité récente */}
              <Card className="lg:col-span-2 shadow-xl border-0 bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Utilisateurs Récents
                      </h3>
                      <p className="text-sm text-gray-500">
                        Dernières inscriptions
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {users.slice(0, 5).map((user) => {
                      const status = getSubscriptionStatus(user);
                      return (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-xl border border-gray-100 dark:border-gray-600 hover:shadow-md transition-all">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                              {getUserDisplayName(user).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {getUserDisplayName(user)}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <span>{user.email}</span>
                                <span className="text-gray-300">•</span>
                                <span>{formatDateFR(user.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              status.color === 'purple' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : status.color === 'green'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
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

              {/* Métriques système */}
              <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Server className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Système
                      </h3>
                      <p className="text-sm text-gray-500">
                        État de la plateforme
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Serveur</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">En ligne</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Base de données</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">Connectée</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isMaintenanceMode ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Site public</span>
                      </div>
                      <span className={`text-sm font-medium ${isMaintenanceMode ? 'text-orange-600' : 'text-green-600'}`}>
                        {isMaintenanceMode ? 'Maintenance' : 'Accessible'}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {Math.round((subscribedUsers / Math.max(totalUsers, 1)) * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">Taux d'abonnement</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Gestion des utilisateurs moderne */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Barre de recherche moderne */}
            <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Rechercher par email, nom ou entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-lg border-0 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Liste des utilisateurs avec design moderne */}
            <div className="space-y-4">
              {filteredUsers.map((adminUser) => {
                const subscriptionInfo = getSubscriptionStatus(adminUser);
                const displayName = getUserDisplayName(adminUser);
                const isExpanded = expandedUsers.has(adminUser.id);

                return (
                  <Card key={adminUser.id} className="shadow-xl border-0 bg-white dark:bg-gray-800 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    <CardContent className="p-0">
                      {/* En-tête utilisateur */}
                      <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                  {displayName}
                                </h3>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                  subscriptionInfo.color === 'purple' 
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                    : subscriptionInfo.color === 'green'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {subscriptionInfo.icon}
                                  <span className="ml-1">{subscriptionInfo.status}</span>
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{adminUser.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions utilisateur */}
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserExpansion(adminUser.id)}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Statistiques rapides */}
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{adminUser.stats.forms_count}</div>
                            <div className="text-xs text-gray-500">Formulaires</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{adminUser.stats.templates_count}</div>
                            <div className="text-xs text-gray-500">Templates</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{adminUser.stats.pdfs_count}</div>
                            <div className="text-xs text-gray-500">PDFs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">{adminUser.stats.responses_count}</div>
                            <div className="text-xs text-gray-500">Réponses</div>
                          </div>
                        </div>
                      </div>

                      {/* Détails étendus */}
                      {isExpanded && (
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Informations détaillées */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span>Informations</span>
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Inscription :</span>
                                  <span className="font-medium">{formatDateFR(adminUser.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Dernière connexion :</span>
                                  <span className="font-medium">
                                    {adminUser.last_sign_in_at ? formatDateFR(adminUser.last_sign_in_at) : 'Jamais'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Email confirmé :</span>
                                  <span className={`font-medium ${adminUser.email_confirmed_at ? 'text-green-600' : 'text-red-600'}`}>
                                    {adminUser.email_confirmed_at ? 'Oui' : 'Non'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions administrateur */}
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <Settings className="h-4 w-4" />
                                <span>Actions</span>
                              </h4>
                              
                              {editingSubscription === adminUser.id ? (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                                      Durée d'extension
                                    </label>
                                    <select
                                      value={newSubscriptionDuration}
                                      onChange={(e) => setNewSubscriptionDuration(e.target.value as any)}
                                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                      <option value="1month">1 mois</option>
                                      <option value="2months">2 mois</option>
                                      <option value="6months">6 mois</option>
                                      <option value="1year">1 an</option>
                                      <option value="lifetime">À vie</option>
                                    </select>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveSubscription(adminUser.id)}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Save className="h-4 w-4 mr-2" />
                                      Activer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelEditSubscription}
                                      className="flex-1 text-gray-600 hover:text-gray-800"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handleEditSubscription(adminUser.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Étendre
                                  </Button>
                                  <Button
                                    onClick={() => impersonateUser(adminUser)}
                                    size="sm"
                                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg"
                                    disabled={!session?.access_token}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Impersonate
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredUsers.length === 0 && (
              <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
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

        {/* Gestion des codes secrets moderne */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Création de code moderne */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardHeader className="border-b border-purple-100 dark:border-purple-800">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">
                      Créer un Code Secret
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      Générez des codes d'accès premium
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
                      Type de code
                    </label>
                    <select
                      value={newCodeType}
                      onChange={(e) => setNewCodeType(e.target.value as 'monthly' | 'lifetime')}
                      className="w-full px-4 py-3 border border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="monthly">📅 Mensuel</option>
                      <option value="lifetime">👑 À vie</option>
                    </select>
                  </div>
                  
                  <Input
                    label="Utilisations max"
                    type="number"
                    min="1"
                    max="1000"
                    value={newCodeMaxUses}
                    onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value) || 1)}
                    className="border-purple-200 dark:border-purple-700 rounded-xl focus:ring-purple-500"
                  />
                  
                  <Input
                    label="Description"
                    value={newCodeDescription}
                    onChange={(e) => setNewCodeDescription(e.target.value)}
                    placeholder="Description du code"
                    className="border-purple-200 dark:border-purple-700 rounded-xl focus:ring-purple-500"
                  />
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={createSecretCode} 
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Créer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des codes avec design moderne */}
            <div className="grid gap-4">
              {secretCodes.length === 0 ? (
                <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Key className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Aucun code secret
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Créez votre premier code secret pour débloquer l'accès premium
                    </p>
                  </CardContent>
                </Card>
              ) : (
                secretCodes.map((code) => (
                  <Card key={code.id} className="shadow-lg border-0 bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                            code.type === 'lifetime' 
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                              : 'bg-gradient-to-br from-blue-500 to-purple-600'
                          }`}>
                            {code.type === 'lifetime' ? (
                              <Crown className="h-6 w-6 text-white" />
                            ) : (
                              <Calendar className="h-6 w-6 text-white" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                code.type === 'lifetime' 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {code.type === 'lifetime' ? '👑 À VIE' : '📅 MENSUEL'}
                              </span>
                              
                              <div className="flex items-center space-x-2">
                                <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg text-sm font-mono">
                                  {showPasswords[code.code] ? code.code : '••••••••'}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePasswordVisibility(code.code)}
                                  className="p-2"
                                >
                                  {showPasswords[code.code] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCode(code.code)}
                                  className="p-2 text-blue-600 hover:text-blue-700"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                              {code.description}
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>Utilisations: {code.current_uses}/{code.max_uses || '∞'}</div>
                              {code.expires_at && (
                                <div>Expire le: {formatDateFR(code.expires_at)}</div>
                              )}
                              <div>Créé le: {formatDateFR(code.created_at)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSecretCode(code.id, code.code)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-3"
                            disabled={!session?.access_token}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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