import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDateFR } from '../../utils/dateFormatter';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
  Shield, 
  Users, 
  BarChart3, 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw,
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
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMaintenanceMode } from '../../hooks/useMaintenanceMode';
import { AffiliateAdminPanel } from '../../components/admin/AffiliateAdminPanel';

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
  const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'affiliates' | 'stats'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [newCodeType, setNewCodeType] = useState<'monthly' | 'lifetime'>('monthly');
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number>(1);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
      loadSecretCodes();
    }
  }, [isSuperAdmin]);

  const loadUsers = async () => {
    try {
      if (!session?.access_token) {
        console.error('❌ Session non disponible');
        toast.error('Session expirée, veuillez vous reconnecter');
        navigate('/login');
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
          const errorBody = await response.text();
          console.error('❌ Erreur 403:', errorBody);
          
          if (errorBody.includes('not_admin') || errorBody.includes('Not a super admin') || errorBody.includes('User not allowed')) {
            toast.error('Accès refusé : Vous devez être connecté avec le compte super admin (admin@signfast.com)');
            navigate('/dashboard');
            return;
          }
        } else if (response.status === 401) {
          console.error('❌ Session expirée');
          toast.error('Session expirée, veuillez vous reconnecter');
          navigate('/login');
          return;
        }
        throw new Error('Erreur lors de la récupération des utilisateurs');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des utilisateurs. Vérifiez que vous êtes connecté avec le compte super admin.');
    } finally {
      setLoading(false);
    }
  };

  const loadSecretCodes = async () => {
    try {
      console.log('🔑 Chargement des codes secrets...');
      
      // Utiliser l'Edge Function pour récupérer les codes
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-secret-codes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des codes');
      }

      const data = await response.json();
      
      console.log('🔑 Codes chargés:', data?.length || 0);
      console.log('🔑 Détails codes:', data?.map(c => ({
        id: c.id,
        code: c.code,
        type: c.type,
        is_active: c.is_active,
        current_uses: c.current_uses,
        max_uses: c.max_uses
      })));
      
      setSecretCodes(data);
    } catch (error) {
      console.error('Erreur chargement codes secrets:', error);
      toast.error('Erreur lors du chargement des codes secrets');
      setSecretCodes([]);
    }
  };

  const createSecretCode = async () => {
    if (!newCodeDescription.trim()) {
      toast.error('Veuillez saisir une description');
      return;
    }

    try {
      console.log('🔑 Création code secret:', {
        type: newCodeType,
        description: newCodeDescription,
        maxUses: newCodeMaxUses
      });
      
      // Utiliser l'Edge Function pour créer le code
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-secret-codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newCodeType,
          description: newCodeDescription,
          maxUses: newCodeMaxUses,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du code');
      }

      const data = await response.json();

      console.log('🔑 Code inséré avec succès:', data);
      toast.success(`Code secret créé: ${data.code}`);
      setNewCodeDescription('');
      setNewCodeMaxUses(1);
      await loadSecretCodes();
    } catch (error) {
      console.error('Erreur création code:', error);
      toast.error('Erreur lors de la création du code');
    }
  };

  const deleteSecretCode = async (id: string, code: string) => {
    if (window.confirm(`Supprimer le code "${code}" ?`)) {
      try {
        // Utiliser l'Edge Function pour supprimer le code
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-secret-codes?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la suppression du code');
        }

        toast.success('Code supprimé');
        await loadSecretCodes();
      } catch (error) {
        console.error('Erreur suppression:', error);
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
      window.location.href = '/dashboard';
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard Super Admin
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion des utilisateurs et codes secrets SignFast
          </p>
          
          {/* Bouton Mode Maintenance */}
          <div className="mt-6">
            <Button
              onClick={handleToggleMaintenance}
              disabled={maintenanceLoading}
              className={`flex items-center space-x-2 mx-auto ${
                isMaintenanceMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
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
                  ? 'Désactiver la maintenance' 
                  : 'Activer la maintenance'
                }
              </span>
            </Button>
            
            {isMaintenanceMode && (
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 max-w-md mx-auto">
                <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    🔧 Site en maintenance - Seuls les super admins peuvent accéder
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 justify-center">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Utilisateurs ({users.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('codes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'codes'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Codes Secrets ({secretCodes.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('affiliates')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'affiliates'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Affiliations</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Statistiques</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

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

            {/* Liste des utilisateurs - Format carte responsive */}
            <div className="space-y-4">
              {filteredUsers.map((adminUser) => {
                const subscriptionInfo = getSubscriptionStatus(adminUser);
                const displayName = (() => {
                  // Priorité : nom d'entreprise
                  if (adminUser.profile?.company_name) {
                    return adminUser.profile.company_name;
                  }
                  
                  // Ensuite : prénom + nom
                  const firstName = adminUser.profile?.first_name || '';
                  const lastName = adminUser.profile?.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim();
                  
                  if (fullName) {
                    return fullName;
                  }
                  
                  // Fallback : email
                  if (adminUser.email) {
                    return adminUser.email;
                  }
                  
                  return 'Utilisateur sans nom';
                })();

                return (
                  <Card key={adminUser.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        {/* Informations utilisateur */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {displayName}
                              </h3>
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {adminUser.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Statut d'abonnement */}
                          <div className="flex items-center space-x-2 mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              subscriptionInfo.color === 'purple' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                : subscriptionInfo.color === 'green'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {subscriptionInfo.icon}
                              <span className="ml-1">{subscriptionInfo.status}</span>
                            </span>
                            <span className="text-xs text-gray-500">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Inscrit le {formatDateFR(adminUser.created_at)}
                            </span>
                          </div>

                          {/* Statistiques en grille compacte */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                              <div className="text-lg font-bold text-blue-600">{adminUser.stats.forms_count}</div>
                              <div className="text-xs text-blue-600">Formulaires</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                              <div className="text-lg font-bold text-purple-600">{adminUser.stats.templates_count}</div>
                              <div className="text-xs text-purple-600">Templates</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                              <div className="text-lg font-bold text-green-600">{adminUser.stats.pdfs_count}</div>
                              <div className="text-xs text-green-600">PDFs</div>
                            </div>
                          </div>
                        </div>

                        {/* Bouton d'action */}
                        <div className="flex-shrink-0 self-start">
                          <Button
                            onClick={() => impersonateUser(adminUser)}
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Se connecter en tant que</span>
                            <span className="sm:hidden">Impersonner</span>
                          </Button>
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

        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Création de code */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Créer un nouveau code secret
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newCodeType}
                      onChange={(e) => setNewCodeType(e.target.value as 'monthly' | 'lifetime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="monthly">Mensuel (30 jours)</option>
                      <option value="lifetime">À vie</option>
                    </select>
                  </div>
                  
                  <Input
                    label="Utilisations max"
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
                    placeholder="Ex: Code promo janvier"
                  />
                </div>
                
                <Button onClick={createSecretCode} className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le code
                </Button>
              </CardContent>
            </Card>

            {/* Liste des codes */}
            <div className="space-y-4">
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
                <Card key={code.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg">🔑</span>
                          </div>
                          <div>
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
                          </div>
                        </div>
                        
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">
                          {code.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded dark:bg-yellow-900/30 dark:text-yellow-300">
                            Utilisations: {code.current_uses}/{code.max_uses || '∞'}
                          </span>
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">
                            Créé le {formatDateFR(code.created_at)}
                          </span>
                          {code.expires_at && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                              Expire le {formatDateFR(code.expires_at)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            code.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {code.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSecretCode(code.id, code.code)}
                        className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-all"
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

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Utilisateurs totaux
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {users.length}
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
                      {users.filter(u => u.subscription?.subscription_status === 'active' || u.secretCode).length}
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
                      Codes secrets actifs
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {secretCodes.filter(c => c.is_active).length}
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
                      Formulaires totaux
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {users.reduce((acc, u) => acc + u.stats.forms_count, 0)}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};