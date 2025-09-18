import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useSubAccounts } from '../hooks/useSubAccounts';
import { useAffiliate } from '../hooks/useAffiliate';
import { useDarkMode } from '../hooks/useDarkMode';
import { pwaManager } from '../main';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { SubAccountManager } from '../components/subaccounts/SubAccountManager';
import { AffiliatePanel } from '../components/affiliate/AffiliatePanel';
import { TutorialButton } from '../components/tutorial/TutorialButton';
import { 
  User, 
  Building, 
  Upload, 
  Save, 
  Moon, 
  Sun, 
  Users, 
  Gift,
  Smartphone,
  HardDrive,
  Trash2,
  RefreshCw,
  BookOpen,
  Sparkles,
  Settings as SettingsIcon,
  Shield,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile, uploadLogo } = useUserProfile();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { program: affiliateProgram, tablesExist: affiliateTablesExist } = useAffiliate();
  const { subAccounts, tablesExist: subAccountTablesExist } = useSubAccounts();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [loadingCache, setLoadingCache] = useState(false);

  // États du formulaire profil
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [siret, setSiret] = useState(profile?.siret || '');

  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setCompanyName(profile.company_name || '');
      setAddress(profile.address || '');
      setSiret(profile.siret || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const success = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        address: address,
        siret: siret,
      });

      if (success) {
        toast.success('Profil mis à jour avec succès !');
      } else {
        toast.error('Erreur lors de la mise à jour du profil');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setLogoUploading(true);
    try {
      const logoUrl = await uploadLogo(file);
      if (logoUrl) {
        await updateProfile({ logo_url: logoUrl });
        toast.success('Logo mis à jour avec succès !');
      } else {
        toast.error('Erreur lors de l\'upload du logo');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upload du logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const loadCacheInfo = async () => {
    setLoadingCache(true);
    try {
      const info = await pwaManager.getCacheInfo();
      setCacheInfo(info);
    } catch (error) {
      console.error('Erreur chargement info cache:', error);
      setCacheInfo({ error: 'Impossible de charger les informations de cache' });
    } finally {
      setLoadingCache(false);
    }
  };

  const clearCache = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider le cache ? Cela peut ralentir temporairement l\'application.')) {
      try {
        await pwaManager.clearAppCache();
        toast.success('Cache vidé avec succès !');
        setCacheInfo(null);
      } catch (error) {
        toast.error('Erreur lors du vidage du cache');
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTabColorClasses = (tab: string, isActive: boolean) => {
    const colorMap = {
      profile: isActive 
        ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border-blue-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-md',
      subaccounts: isActive 
        ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 border-purple-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 hover:shadow-md',
      affiliate: isActive 
        ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 border-green-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-100 hover:text-green-600 hover:shadow-md',
      pwa: isActive 
        ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-indigo-100 hover:text-indigo-600 hover:shadow-md',
    };
    return colorMap[tab] || colorMap.profile;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <SettingsIcon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Paramètres
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Personnalisez votre expérience SignFast
              </p>
              
              {pwaManager.isPWAMode() && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  <span>Mode Application PWA</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation des onglets */}
        <div className="mb-8 sticky top-0 z-10 py-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 shadow-xl">
            <nav className="flex space-x-2 lg:space-x-3 overflow-x-auto scrollbar-hide justify-start lg:justify-center">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-3 lg:py-3 lg:px-4 rounded-xl font-bold text-xs lg:text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('profile', activeTab === 'profile')}`}
              >
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                    <User className="h-3 w-3 lg:h-4 lg:w-4" />
                  </div>
                  <span className="hidden sm:inline lg:inline">Profil</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('subaccounts')}
                className={`py-2 px-3 lg:py-3 lg:px-4 rounded-xl font-bold text-xs lg:text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('subaccounts', activeTab === 'subaccounts')}`}
              >
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                    <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                  </div>
                  <span className="hidden sm:inline lg:inline">Sous-comptes</span>
                  {subAccountTablesExist && subAccounts.length > 0 && (
                    <span className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center">
                      {subAccounts.length}
                    </span>
                  )}
                </div>
              </button>
              
              {affiliateTablesExist && (
                <button
                  onClick={() => setActiveTab('affiliate')}
                  className={`py-2 px-3 lg:py-3 lg:px-4 rounded-xl font-bold text-xs lg:text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('affiliate', activeTab === 'affiliate')}`}
                >
                  <div className="flex items-center space-x-1 lg:space-x-2">
                    <div className="p-1 bg-white/70 rounded-lg shadow-md">
                      <Gift className="h-3 w-3 lg:h-4 lg:w-4" />
                    </div>
                    <span className="hidden sm:inline lg:inline">Affiliation</span>
                    {affiliateProgram && (
                      <span className="bg-green-500 text-white text-xs rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center">
                        {affiliateProgram.total_referrals}
                      </span>
                    )}
                  </div>
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('pwa')}
                className={`py-2 px-3 lg:py-3 lg:px-4 rounded-xl font-bold text-xs lg:text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('pwa', activeTab === 'pwa')}`}
              >
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                    <Smartphone className="h-3 w-3 lg:h-4 lg:w-4" />
                  </div>
                  <span className="hidden sm:inline lg:inline">Application</span>
                  {pwaManager.isPWAMode() && (
                    <span className="bg-indigo-500 text-white text-xs rounded-full w-2 h-2 lg:w-2 lg:h-2"></span>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'profile' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Informations personnelles */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Informations personnelles
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Gérez vos informations de profil
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Votre prénom"
                  />
                  <Input
                    label="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
                
                <Input
                  label="Nom de l'entreprise"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nom de votre entreprise"
                />
                
                <Input
                  label="Adresse"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Adresse complète"
                />
                
                <Input
                  label="SIRET"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="Numéro SIRET"
                />

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || profileLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Sauvegarde...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="h-5 w-5" />
                      <span>Sauvegarder</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Logo et préférences */}
            <div className="space-y-6">
              {/* Logo de l'entreprise */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Logo de l'entreprise
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Personnalisez vos documents
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile?.logo_url && (
                    <div className="text-center">
                      <img
                        src={profile.logo_url}
                        alt="Logo entreprise"
                        className="max-w-32 max-h-32 object-contain mx-auto border border-gray-200 rounded-lg shadow-lg"
                      />
                    </div>
                  )}
                  
                  <Button
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={logoUploading}
                    variant="secondary"
                    className="w-full"
                  >
                    {logoUploading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Upload...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4" />
                        <span>{profile?.logo_url ? 'Changer le logo' : 'Ajouter un logo'}</span>
                      </div>
                    )}
                  </Button>
                  
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Préférences d'affichage */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      {isDarkMode ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Préférences
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Personnalisez l'interface
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Sun className="h-5 w-5 text-yellow-500" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Mode clair
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Mode sombre désactivé
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                      Désactivé
                    </span>
                  </div>

                  {/* Tutoriel */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Tutoriel guidé
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Revoir le guide d'utilisation
                        </p>
                      </div>
                    </div>
                    <TutorialButton 
                      variant="ghost"
                      className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'subaccounts' && (
          <SubAccountManager />
        )}

        {activeTab === 'affiliate' && affiliateTablesExist && (
          <AffiliatePanel />
        )}

        {activeTab === 'pwa' && (
          <div className="space-y-6">
            {/* Informations PWA */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Smartphone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Application Progressive (PWA)
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Gestion de l'application et du cache
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Statut PWA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${
                    pwaManager.isPWAMode() 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        pwaManager.isPWAMode() ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        <Smartphone className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Mode PWA
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {pwaManager.isPWAMode() ? 'Actif' : 'Inactif'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${
                    pwaManager.isOnline() 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        pwaManager.isOnline() ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <span className="text-white text-sm">
                          {pwaManager.isOnline() ? '🌐' : '📱'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Connectivité
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {pwaManager.isOnline() ? 'En ligne' : 'Hors ligne'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gestion du cache */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Gestion du cache
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadCacheInfo}
                        disabled={loadingCache}
                        className="flex items-center space-x-1"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingCache ? 'animate-spin' : ''}`} />
                        <span>Actualiser</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCache}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Vider le cache</span>
                      </Button>
                    </div>
                  </div>

                  {cacheInfo ? (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 mb-3">
                        <Database className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900 dark:text-blue-300">
                          Informations de cache
                        </span>
                      </div>
                      
                      {cacheInfo.error ? (
                        <p className="text-sm text-red-600">{cacheInfo.error}</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-400">Taille totale:</span>
                            <span className="font-mono text-sm text-blue-900 dark:text-blue-300">
                              {formatBytes(cacheInfo.totalSize)}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {cacheInfo.caches?.map((cache: any, index: number) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-blue-600 dark:text-blue-400">{cache.name}:</span>
                                <span className="text-blue-800 dark:text-blue-200">
                                  {cache.entries} entrées • {formatBytes(cache.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Button
                        onClick={loadCacheInfo}
                        disabled={loadingCache}
                        variant="secondary"
                        className="flex items-center space-x-2"
                      >
                        <HardDrive className="h-4 w-4" />
                        <span>Charger les informations de cache</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Instructions PWA */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-3">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-300">
                      Installation PWA
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <div>📱 <strong>Mobile:</strong> Appuyez sur "Ajouter à l'écran d'accueil"</div>
                    <div>💻 <strong>Desktop:</strong> Cliquez sur l'icône d'installation dans la barre d'adresse</div>
                    <div>🔄 <strong>Avantage:</strong> Accès rapide et fonctionnement hors ligne</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};