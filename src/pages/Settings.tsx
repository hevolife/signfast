import React, { useState } from 'react';
import { formatDateFR } from '../utils/dateFormatter';
import { useUserProfile } from '../hooks/useUserProfile';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SecretCodeModal } from '../components/subscription/SecretCodeModal';
import { AffiliatePanel } from '../components/affiliate/AffiliatePanel';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { 
  User, 
  Crown, 
  Check, 
  Zap, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  Key, 
  Gift,
  Upload,
  Building,
  MapPin,
  FileText,
  Camera,
  Shield,
  Users,
  Moon,
  Sun,
  Sparkles,
  Settings as SettingsIcon
} from 'lucide-react';
import { stripeConfig } from '../stripe-config';
import { useDarkMode } from '../hooks/useDarkMode';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile, uploadLogo } = useUserProfile();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');
  
  const { 
    isSubscribed, 
    subscriptionStatus, 
    currentPeriodEnd, 
    cancelAtPeriodEnd,
    hasSecretCode,
    secretCodeType,
    secretCodeExpiresAt,
    loading: subscriptionLoading 
  } = useSubscription();
  const { forms, pdfTemplates, savedPdfs, loading: limitsLoading } = useLimits();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'affiliate' | 'subscription' | 'admin'>('profile');
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  
  // États du formulaire profil
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [siret, setSiret] = useState(profile?.siret || '');

  // États pour la sécurité
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<'1month' | '2months' | '6months' | '1year' | 'lifetime'>('1month');
  const [isSubscriptionActionLoading, setIsSubscriptionActionLoading] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setCompanyName(profile.company_name || '');
      setAddress(profile.address || '');
      setSiret(profile.siret || '');
    }
  }, [profile]);

  React.useEffect(() => {
    if (user?.email) {
      setNewEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Mot de passe mis à jour avec succès !');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailPassword) {
      toast.error('Veuillez saisir votre mot de passe pour confirmer le changement d\'email');
      return;
    }

    if (newEmail === user?.email) {
      toast.error('La nouvelle adresse email est identique à l\'actuelle');
      return;
    }

    setSaving(true);

    try {
      // Vérifier d'abord le mot de passe actuel
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: emailPassword
      });

      if (signInError) {
        toast.error('Mot de passe incorrect');
        setSaving(false);
        return;
      }

      // Mettre à jour l'email
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email mis à jour avec succès ! Vérifiez votre nouvelle boîte email pour confirmer.');
        setEmailPassword('');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour de l\'email');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error('Seuls les fichiers JPEG et PNG sont acceptés');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5MB');
      return;
    }

    setLogoUploading(true);

    try {
      const success = await uploadLogo(file);
      if (success) {
        // Mettre à jour le profil avec la nouvelle URL du logo
        const updatedSuccess = await updateProfile({
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          address: address,
          siret: siret,
          logo_url: success, // Ajouter l'URL du logo
        });
        
        if (updatedSuccess) {
          toast.success('Logo mis à jour avec succès !');
        } else {
          toast.error('Logo uploadé mais erreur lors de la sauvegarde du profil');
        }
      } else {
        toast.error('Erreur lors de l\'upload du logo');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upload du logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubscribe = async () => {
    setSaving(true);
    try {
      // Vérifier que l'utilisateur est connecté
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }
      
      const product = stripeConfig.products[0];
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: product.priceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/settings?canceled=true`,
          mode: product.mode,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Erreur lors de la création de la session de paiement');
    } finally {
      setSaving(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    setIsSubscriptionActionLoading(true);
    
    try {
      // Créer un code secret avec la durée sélectionnée
      const codeType = selectedDuration === 'lifetime' ? 'lifetime' : 'monthly';
      const description = `Extension manuelle ${selectedDuration} par l'utilisateur`;
      
      // Calculer la date d'expiration pour les codes mensuels
      let expiresAt = null;
      if (codeType === 'monthly') {
        const durationMap = {
          '1month': 30,
          '2months': 60,
          '6months': 180,
          '1year': 365,
        };
        const days = durationMap[selectedDuration] || 30;
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      // Créer le code secret directement dans la base
      const code = `USER${Date.now().toString().slice(-8).toUpperCase()}`;
      
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

      // Activer automatiquement le code pour l'utilisateur
      const { data: result, error: activateError } = await supabase.rpc('activate_secret_code', {
        code_input: code,
        user_id_input: user.id
      });

      if (activateError || !result?.success) {
        console.error('Erreur activation code:', activateError);
        toast.error('Code créé mais erreur d\'activation');
        return;
      }

      toast.success(`🎉 Abonnement ${selectedDuration} activé avec succès !`);
      setShowSubscriptionManager(false);
      
      // Recharger la page pour actualiser les données d'abonnement
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Erreur extension abonnement:', error);
      toast.error('Erreur lors de l\'extension de l\'abonnement');
    } finally {
      setIsSubscriptionActionLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return formatDateFR(new Date(timestamp * 1000));
  };

  const handleSecretCodeSuccess = () => {
    window.location.reload();
  };

  const getTabColorClasses = (tabName: string, isActive: boolean) => {
    const colorMap = {
      profile: isActive 
        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 hover:text-white hover:shadow-md',
      security: isActive 
        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-500 hover:to-emerald-600 hover:text-white hover:shadow-md',
      affiliate: isActive 
        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-500 hover:to-purple-600 hover:text-white hover:shadow-md',
      subscription: isActive 
        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-orange-500 hover:to-orange-600 hover:text-white hover:shadow-md',
    };
    return colorMap[tabName] || colorMap.profile;
  };

  const getTabEmoji = (tabName: string) => {
    const emojiMap = {
      profile: '👤',
      security: '🔐',
      affiliate: '🤝',
      subscription: '👑',
    };
    return emojiMap[tabName] || '⚙️';
  };

  if (profileLoading || subscriptionLoading || limitsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const product = stripeConfig.products[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                Gérez votre profil, sécurité et abonnement en toute simplicité
              </p>
              
              {/* Bouton Code Secret dans le header */}
              <div className="mt-8">
                <Button
                  variant="ghost"
                  onClick={() => setShowSecretCodeModal(true)}
                  className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Key className="h-5 w-5 mr-2" />
                  <span>J'ai un code secret</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-3 shadow-xl">
          <div>
            <nav className="flex space-x-3 justify-center flex-wrap">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('profile', activeTab === 'profile')}`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg">
                    <span className="text-sm">{getTabEmoji('profile')}</span>
                  </div>
                  <span>Profil</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('security', activeTab === 'security')}`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg">
                    <span className="text-sm">{getTabEmoji('security')}</span>
                  </div>
                  <span>Sécurité</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('affiliate')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('affiliate', activeTab === 'affiliate')}`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg">
                    <span className="text-sm">{getTabEmoji('affiliate')}</span>
                  </div>
                  <span>Affiliation</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-105 ${getTabColorClasses('subscription', activeTab === 'subscription')}`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg">
                    <span className="text-sm">{getTabEmoji('subscription')}</span>
                  </div>
                  <span>Abonnement</span>
                </div>
              </button>
              <button
                onClick={toggleDarkMode}
                className="py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-105 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-slate-200 hover:text-gray-700 hover:shadow-lg"
                title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg">
                    <span className="text-sm">{isDarkMode ? '☀️' : '🌙'}</span>
                  </div>
                  <span>{isDarkMode ? 'Mode clair' : 'Mode sombre'}</span>
                </div>
              </button>
              <button
                onClick={() => {
                  // Déclencher l'événement pour réactiver le message d'accueil
                  window.dispatchEvent(new CustomEvent('show-welcome-modal'));
                }}
                className="py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-105 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-100 hover:to-emerald-200 hover:text-green-700 hover:shadow-lg"
                title="Revoir le guide de démarrage"
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg">
                    <span className="text-sm">🎯</span>
                  </div>
                  <span>Guide démarrage</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Bouton Admin pour super admins */}
        {isSuperAdmin && (
          <div className="mb-8 flex justify-center">
            <Link to="/admin">
              <Button className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                <Shield className="h-4 w-4" />
                <span>Dashboard Super Admin</span>
              </Button>
            </Link>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Logo de l'entreprise */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">📷</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      Logo de l'entreprise
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Personnalisez l'apparence de vos formulaires
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="flex-shrink-0">
                    {profile?.logo_url ? (
                      <img
                        src={profile.logo_url}
                        alt="Logo entreprise"
                        className="w-20 h-20 object-cover rounded-2xl border-2 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center shadow-lg">
                        <Building className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={logoUploading}
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl shadow-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                        logoUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoUploading ? 'Upload en cours...' : 'Changer le logo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      JPEG ou PNG, max 5MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations personnelles */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      Informations personnelles
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Gérez vos informations de profil
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Adresse
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Adresse complète de l'entreprise"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 font-medium shadow-lg transition-all"
                      rows={3}
                    />
                  </div>
                  
                  <Input
                    label="Numéro SIRET"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    placeholder="Numéro SIRET de l'entreprise"
                  />

                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Changement d'email */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">📧</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      Adresse email
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Modifiez votre adresse de connexion
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangeEmail} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Email actuel
                    </label>
                    <div className="px-4 py-3 bg-gray-100/70 dark:bg-gray-800/70 border border-gray-300/50 dark:border-gray-600/50 rounded-xl text-gray-600 dark:text-gray-400 font-medium backdrop-blur-sm">
                      {user?.email}
                    </div>
                  </div>
                  
                  <Input
                    label="Nouvelle adresse email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nouvelle@email.com"
                    required
                  />
                  
                  <Input
                    label="Mot de passe actuel (pour confirmation)"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />

                  <Button
                    type="submit"
                    disabled={saving || newEmail === user?.email}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {saving ? 'Mise à jour...' : 'Changer l\'adresse email'}
                  </Button>
                </form>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 shadow-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Vous recevrez un email de confirmation à votre nouvelle adresse.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Changement de mot de passe */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">🔐</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      Mot de passe
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Changez votre mot de passe de connexion
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <Input
                    label="Nouveau mot de passe"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  
                  <Input
                    label="Confirmer le nouveau mot de passe"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />

                  <Button
                    type="submit"
                    disabled={saving || !newPassword || newPassword !== confirmPassword}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {saving ? 'Mise à jour...' : 'Changer le mot de passe'}
                  </Button>
                </form>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Le mot de passe doit contenir au moins 6 caractères.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'affiliate' && (
          <AffiliatePanel />
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Affichage du code secret actif */}
            {hasSecretCode && (
              <Card className="border-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-300">
                        Code Secret Actif !
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">
                        {secretCodeType === 'lifetime' 
                          ? '🎉 Accès à vie débloqué !' 
                          : `Accès premium jusqu'au ${secretCodeExpiresAt ? new Date(secretCodeExpiresAt).toLocaleDateString('fr-FR') : 'N/A'}`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {/* Plan Gratuit */}
              <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ${!isSubscribed ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">🆓</span>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        Plan Gratuit
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Fonctionnalités de base
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      0€
                      <span className="text-sm font-medium text-gray-500">/mois</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Formulaires</span>
                      <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                        {forms.current}/{stripeConfig.freeLimits.maxForms}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Templates PDF</span>
                      <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                        {pdfTemplates.current}/{stripeConfig.freeLimits.maxPdfTemplates}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">PDFs sauvegardés</span>
                      <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">
                        {savedPdfs.current}/{stripeConfig.freeLimits.maxSavedPdfs}
                      </span>
                    </div>
                  </div>
                  
                  {!isSubscribed && (
                    <div className="text-center pt-4">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-lg">
                        Plan actuel
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Plan Pro */}
              <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ${isSubscribed ? 'ring-2 ring-green-400 ring-opacity-50' : 'ring-2 ring-blue-400 ring-opacity-50'} relative`}>
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-xl">
                    <Crown className="h-4 w-4 mr-1" />
                    Recommandé
                  </span>
                </div>
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">👑</span>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {product.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {product.price}€
                      <span className="text-sm font-medium text-gray-500">/mois</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {product.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isSubscribed ? (
                    <div className="space-y-3 pt-4">
                      <div className="text-center">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg">
                          <Crown className="h-4 w-4 mr-1" />
                          {hasSecretCode ? 'Accès Premium Actif' : 'Abonnement actif'}
                        </span>
                      </div>
                      
                      {hasSecretCode && secretCodeType === 'lifetime' && (
                        <div className="text-center text-sm text-purple-600 dark:text-purple-400 font-semibold bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-xl">
                          <Gift className="h-4 w-4 inline mr-1" />
                          Accès à vie via code secret
                        </div>
                      )}
                      
                      {hasSecretCode && secretCodeType === 'monthly' && secretCodeExpiresAt && (
                        <div className="text-center text-sm text-purple-600 dark:text-purple-400 font-semibold bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-xl">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Code secret expire le {new Date(secretCodeExpiresAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      
                      {currentPeriodEnd && !hasSecretCode && (
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400 font-semibold bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {cancelAtPeriodEnd ? 'Se termine le' : 'Renouvellement le'} {formatDate(currentPeriodEnd)}
                        </div>
                      )}

                      {cancelAtPeriodEnd && (
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl shadow-lg">
                          <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-300">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Votre abonnement sera annulé à la fin de la période
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-4 space-y-3">
                      <Button
                        onClick={handleSubscribe}
                        disabled={saving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {saving ? 'Redirection...' : 'S\'abonner maintenant'}
                      </Button>
                      
                      {/* Option d'extension manuelle */}
                      <div className="border-t pt-3">
                        {!showSubscriptionManager ? (
                          <Button
                            onClick={() => setShowSubscriptionManager(true)}
                            variant="ghost"
                            size="sm"
                            className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          >
                            <Gift className="h-4 w-4 mr-2" />
                            Étendre mon abonnement manuellement
                          </Button>
                        ) : (
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                                Extension d'abonnement
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSubscriptionManager(false)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                                Durée d'extension
                              </label>
                              <select
                                value={selectedDuration}
                                onChange={(e) => setSelectedDuration(e.target.value as any)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                              >
                                <option value="1month">1 mois</option>
                                <option value="2months">2 mois</option>
                                <option value="6months">6 mois</option>
                                <option value="1year">1 an</option>
                                <option value="lifetime">À vie</option>
                              </select>
                            </div>
                            
                            <Button
                              onClick={handleExtendSubscription}
                              disabled={isSubscriptionActionLoading}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              {isSubscriptionActionLoading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Extension...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Gift className="h-4 w-4" />
                                  <span>Étendre l'abonnement</span>
                                </div>
                              )}
                            </Button>
                            
                            <p className="text-xs text-purple-600 dark:text-purple-400 text-center">
                              ⚠️ Cette action créera un code secret automatiquement
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Modal Code Secret */}
        <SecretCodeModal
          isOpen={showSecretCodeModal}
          onClose={() => setShowSecretCodeModal(false)}
          onSuccess={handleSecretCodeSuccess}
        />
      </div>
    </div>
  );
};