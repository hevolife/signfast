import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SecretCodeModal } from '../components/subscription/SecretCodeModal';
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
  Shield
} from 'lucide-react';
import { stripeConfig } from '../stripe-config';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile, uploadLogo } = useUserProfile();
  
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
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription' | 'admin'>('profile');
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
        const updatedSuccess = await updateProfile({
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          address: address,
          siret: siret,
        });
        
        if (updatedSuccess) {
          toast.success('Logo mis à jour avec succès !');
        } else {
          toast.error('Erreur lors de la sauvegarde du logo');
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
      const product = stripeConfig.products[0];
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR');
  };

  const handleSecretCodeSuccess = () => {
    window.location.reload();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Paramètres
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez votre profil et votre abonnement
          </p>
        </div>

        {/* Onglets */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 justify-center">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Profil</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Sécurité</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'subscription'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4" />
                  <span>Abonnement</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Bouton Admin pour super admins */}
        {isSuperAdmin && (
          <div className="mb-8 flex justify-center">
            <Link to="/admin">
              <Button className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white">
                <Shield className="h-4 w-4" />
                <span>Dashboard Super Admin</span>
              </Button>
            </Link>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Logo de l'entreprise */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Logo de l'entreprise</span>
                </h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {profile?.logo_url ? (
                      <img
                        src={profile.logo_url}
                        alt="Logo entreprise"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
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
                      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                        logoUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoUploading ? 'Upload en cours...' : 'Changer le logo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      JPEG ou PNG, max 5MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Informations personnelles</span>
                </h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Adresse
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Adresse complète de l'entreprise"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
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
                    className="w-full"
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
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Adresse email</span>
                </h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangeEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email actuel
                    </label>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400">
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
                    className="w-full"
                  >
                    {saving ? 'Mise à jour...' : 'Changer l\'adresse email'}
                  </Button>
                </form>
                
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Vous recevrez un email de confirmation à votre nouvelle adresse.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Changement de mot de passe */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>Mot de passe</span>
                </h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
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
                    className="w-full"
                  >
                    {saving ? 'Mise à jour...' : 'Changer le mot de passe'}
                  </Button>
                </form>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Le mot de passe doit contenir au moins 6 caractères.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Affichage du code secret actif */}
            {hasSecretCode && (
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                        Code Secret Actif !
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
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

            {/* Bouton Code Secret */}
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setShowSecretCodeModal(true)}
                className="flex items-center space-x-2 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              >
                <Key className="h-4 w-4" />
                <span>J'ai un code secret</span>
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Plan Gratuit */}
              <Card className={`${!isSubscribed ? 'ring-2 ring-gray-300' : ''}`}>
                <CardHeader>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Plan Gratuit
                    </h3>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      0€
                      <span className="text-sm font-normal text-gray-500">/mois</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Formulaires</span>
                      <span className="text-sm font-medium">
                        {forms.current}/{stripeConfig.freeLimits.maxForms}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Templates PDF</span>
                      <span className="text-sm font-medium">
                        {pdfTemplates.current}/{stripeConfig.freeLimits.maxPdfTemplates}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">PDFs sauvegardés</span>
                      <span className="text-sm font-medium">
                        {savedPdfs.current}/{stripeConfig.freeLimits.maxSavedPdfs}
                      </span>
                    </div>
                  </div>
                  
                  {!isSubscribed && (
                    <div className="text-center pt-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                        Plan actuel
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Plan Pro */}
              <Card className={`${isSubscribed ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-300'} relative`}>
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-600 text-white">
                    <Crown className="h-4 w-4 mr-1" />
                    Recommandé
                  </span>
                </div>
                <CardHeader>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {product.name}
                    </h3>
                    <div className="text-3xl font-bold text-blue-600">
                      {product.price}€
                      <span className="text-sm font-normal text-gray-500">/mois</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {product.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {product.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isSubscribed ? (
                    <div className="space-y-3 pt-4">
                      <div className="text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <Crown className="h-4 w-4 mr-1" />
                          {hasSecretCode ? 'Accès Premium Actif' : 'Abonnement actif'}
                        </span>
                      </div>
                      
                      {hasSecretCode && secretCodeType === 'lifetime' && (
                        <div className="text-center text-sm text-purple-600 dark:text-purple-400">
                          <Gift className="h-4 w-4 inline mr-1" />
                          Accès à vie via code secret
                        </div>
                      )}
                      
                      {hasSecretCode && secretCodeType === 'monthly' && secretCodeExpiresAt && (
                        <div className="text-center text-sm text-purple-600 dark:text-purple-400">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Code secret expire le {new Date(secretCodeExpiresAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      
                      {currentPeriodEnd && !hasSecretCode && (
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {cancelAtPeriodEnd ? 'Se termine le' : 'Renouvellement le'} {formatDate(currentPeriodEnd)}
                        </div>
                      )}

                      {cancelAtPeriodEnd && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                          <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-300">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                              Votre abonnement sera annulé à la fin de la période
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-4">
                      <Button
                        onClick={handleSubscribe}
                        disabled={saving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {saving ? 'Redirection...' : 'S\'abonner maintenant'}
                      </Button>
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