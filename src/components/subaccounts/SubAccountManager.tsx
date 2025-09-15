import React, { useState } from 'react';
import { useSubAccounts } from '../../hooks/useSubAccounts';
import { formatDateTimeFR } from '../../utils/dateFormatter';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff,
  UserPlus,
  Settings,
  Shield,
  Download,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SubAccountManager: React.FC = () => {
  const { subAccounts, totalCount, loading, createSubAccount, updateSubAccount, deleteSubAccount, resetSubAccountPassword, refetch } = useSubAccounts();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  
  // Formulaire de création
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [creating, setCreating] = useState(false);

  // Formulaire d'édition
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPermissions, setEditPermissions] = useState({ pdf_access: true, download_only: true });
  const [updating, setUpdating] = useState(false);

  // Reset mot de passe
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  const handleCreateSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername.trim() || !newDisplayName.trim() || !newPassword.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(newUsername)) {
      toast.error('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères (lettres, chiffres, _ et - uniquement)');
      return;
    }

    setCreating(true);
    
    try {
      const newSubAccount = await createSubAccount({
        username: newUsername,
        display_name: newDisplayName,
        password: newPassword,
        permissions: { pdf_access: true, download_only: true }
      });

      if (newSubAccount) {
        toast.success('Sous-compte créé avec succès !');
        setShowCreateForm(false);
        setNewUsername('');
        setNewDisplayName('');
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        toast.error('Erreur lors de la création du sous-compte');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du sous-compte');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubAccount = (subAccount: SubAccount) => {
    setEditingAccount(subAccount.id);
    setEditDisplayName(subAccount.display_name);
    setEditPermissions(subAccount.permissions);
  };

  const handleSaveEdit = async (subAccountId: string) => {
    if (!editDisplayName.trim()) {
      toast.error('Le nom d\'affichage est requis');
      return;
    }

    setUpdating(true);
    
    try {
      const success = await updateSubAccount(subAccountId, {
        display_name: editDisplayName,
        permissions: editPermissions
      });

      if (success) {
        toast.success('Sous-compte mis à jour !');
        setEditingAccount(null);
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubAccount = async (subAccount: SubAccount) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le sous-compte "${subAccount.display_name}" ?`)) {
      const success = await deleteSubAccount(subAccount.id);
      if (success) {
        toast.success('Sous-compte supprimé');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleResetPassword = async (subAccountId: string) => {
    if (!resetPassword.trim()) {
      toast.error('Veuillez saisir un nouveau mot de passe');
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (resetPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setResettingPassword(subAccountId);
    
    try {
      const success = await resetSubAccountPassword(subAccountId, resetPassword);
      
      if (success) {
        toast.success('Mot de passe réinitialisé !');
        setResetPassword('');
        setResetPasswordConfirm('');
        setResettingPassword(null);
      } else {
        toast.error('Erreur lors de la réinitialisation');
      }
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setResettingPassword(null);
    }
  };

  const togglePasswordVisibility = (accountId: string) => {
    const newSet = new Set(showPasswords);
    if (newSet.has(accountId)) {
      newSet.delete(accountId);
    } else {
      newSet.add(accountId);
    }
    setShowPasswords(newSet);
  };

  const copyLoginInfo = (subAccount: SubAccount) => {
    const loginInfo = `Connexion sous-compte SignFast:
URL: ${window.location.origin}/sub-account/login
Email du compte principal: [VOTRE_EMAIL]
Nom d'utilisateur: ${subAccount.username}
Mot de passe: [DÉFINI_PAR_VOUS]`;
    
    navigator.clipboard.writeText(loginInfo);
    toast.success('Informations de connexion copiées !');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des sous-comptes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300">
                  Gestion des Sous-Comptes
                </h2>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {totalCount} sous-compte{totalCount > 1 ? 's' : ''} • Accès restreint au stockage PDF
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Actualiser</span>
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau sous-compte</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                Accès restreint des sous-comptes
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Les sous-comptes peuvent uniquement consulter et télécharger les PDFs de votre stockage. 
                Ils n'ont accès à aucune autre fonctionnalité.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des sous-comptes */}
      {subAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucun sous-compte
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Créez des sous-comptes pour donner un accès restreint à votre stockage PDF
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier sous-compte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subAccounts.map((subAccount) => (
            <Card key={subAccount.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {editingAccount === subAccount.id ? (
                  // Mode édition
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                        <Edit className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Modification de {subAccount.username}
                      </h3>
                    </div>
                    
                    <Input
                      label="Nom d'affichage"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Nom complet ou fonction"
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Permissions
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`pdf_access_${subAccount.id}`}
                            checked={editPermissions.pdf_access}
                            onChange={(e) => setEditPermissions(prev => ({ ...prev, pdf_access: e.target.checked }))}
                            className="text-blue-600"
                          />
                          <label htmlFor={`pdf_access_${subAccount.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                            Accès au stockage PDF
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`download_only_${subAccount.id}`}
                            checked={editPermissions.download_only}
                            onChange={(e) => setEditPermissions(prev => ({ ...prev, download_only: e.target.checked }))}
                            className="text-blue-600"
                          />
                          <label htmlFor={`download_only_${subAccount.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                            Téléchargement uniquement (pas de suppression)
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleSaveEdit(subAccount.id)}
                        disabled={updating}
                        className="flex items-center space-x-2"
                      >
                        {updating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>Sauvegarder</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEditingAccount(null)}
                        disabled={updating}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Mode affichage
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Informations du sous-compte */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                          subAccount.is_active 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {subAccount.display_name}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              subAccount.is_active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {subAccount.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                                @{subAccount.username}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyLoginInfo(subAccount)}
                                className="text-blue-600 hover:text-blue-700 p-1"
                                title="Copier les infos de connexion"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Créé le {formatDateTimeFR(subAccount.created_at)}
                              {subAccount.last_login_at && (
                                <span className="ml-2">• Dernière connexion: {formatDateTimeFR(subAccount.last_login_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Permissions */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Permissions accordées
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {subAccount.permissions.pdf_access && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              <FileText className="h-3 w-3 mr-1" />
                              Accès PDF
                            </span>
                          )}
                          {subAccount.permissions.download_only && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <Download className="h-3 w-3 mr-1" />
                              Téléchargement
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSubAccount(subAccount)}
                        className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Modifier</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResettingPassword(subAccount.id)}
                        className="flex items-center space-x-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                      >
                        <Key className="h-4 w-4" />
                        <span>Reset MDP</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSubAccount(subAccount)}
                        className="flex items-center space-x-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Supprimer</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Formulaire de reset mot de passe */}
                {resettingPassword === subAccount.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Réinitialiser le mot de passe
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Nouveau mot de passe"
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <Input
                        label="Confirmer le mot de passe"
                        type="password"
                        value={resetPasswordConfirm}
                        onChange={(e) => setResetPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleResetPassword(subAccount.id)}
                        disabled={!resetPassword || resetPassword !== resetPasswordConfirm}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Réinitialiser
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResettingPassword(null);
                          setResetPassword('');
                          setResetPasswordConfirm('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de création */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Nouveau sous-compte
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Accès restreint au stockage PDF
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleCreateSubAccount} className="space-y-4">
                <Input
                  label="Nom d'utilisateur"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                  placeholder="ex: employe1, assistant"
                  pattern="^[a-zA-Z0-9_-]{3,20}$"
                  required
                />
                <p className="text-xs text-gray-500 -mt-2">
                  3-20 caractères, lettres, chiffres, _ et - uniquement
                </p>
                
                <Input
                  label="Nom d'affichage"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="ex: Jean Dupont, Assistant"
                  required
                />
                
                <Input
                  label="Mot de passe"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Permissions par défaut
                  </h4>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                    <div>✅ Accès au stockage PDF de votre compte</div>
                    <div>✅ Téléchargement des PDFs</div>
                    <div>❌ Pas d'accès aux formulaires</div>
                    <div>❌ Pas d'accès aux templates</div>
                    <div>❌ Pas d'accès aux paramètres</div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                    disabled={creating}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={creating || !newUsername || !newDisplayName || !newPassword || newPassword !== newPasswordConfirm}
                  >
                    {creating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Création...</span>
                      </div>
                    ) : (
                      'Créer le sous-compte'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};