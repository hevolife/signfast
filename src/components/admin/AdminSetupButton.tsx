import React, { useState } from 'react';
import { useAdminSetup } from '../../hooks/useAdminSetup';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Shield, Copy, Eye, EyeOff, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminSetupButton: React.FC = () => {
  const { loading, createAdminAccount } = useAdminSetup();
  const [credentials, setCredentials] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSetup = async () => {
    const result = await createAdminAccount();
    
    if (result.success) {
      setCredentials(result);
      setShowModal(true);
      toast.success('🎉 Compte super admin créé avec succès !');
    } else {
      toast.error(result.error || 'Erreur lors de la création du compte admin');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papiers !`);
  };

  if (showModal && credentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Compte Super Admin Créé !
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sauvegardez ces informations en lieu sûr
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Identifiants */}
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-3 flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Identifiants Super Admin</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email :</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="flex-1 bg-white dark:bg-gray-800 p-2 rounded border text-sm">
                      {credentials.credentials.email}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(credentials.credentials.email, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe :</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="flex-1 bg-white dark:bg-gray-800 p-2 rounded border text-sm">
                      {showPassword ? credentials.credentials.password : '••••••••••••'}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(credentials.credentials.password, 'Mot de passe')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Codes secrets */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Codes Secrets Créés</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {credentials.secretCodes?.map((code: string, index: number) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono">{code}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code, 'Code secret')}
                        className="p-1"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Instructions d'utilisation
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Connectez-vous avec les identifiants ci-dessus</li>
                <li>Accédez au dashboard admin via le lien "Admin" dans la navbar</li>
                <li>Gérez les utilisateurs, créez des codes secrets et consultez les statistiques</li>
                <li>Utilisez l'impersonation pour vous connecter en tant qu'autres utilisateurs</li>
              </ol>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowModal(false);
                  window.location.href = '/login';
                }}
                className="flex-1"
              >
                Aller à la connexion
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Always show the button if no admin account exists yet
  // This allows creation of the initial admin account in production

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleSetup}
        disabled={loading}
        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white shadow-lg"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <Shield className="h-4 w-4" />
        )}
        <span>{loading ? 'Création...' : 'Créer Admin'}</span>
      </Button>
    </div>
  );
};
  // Always show the button if no admin account exists yet
  // This allows creation of the initial admin account in production

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleSetup}
        disabled={loading}
        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white shadow-lg"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <Shield className="h-4 w-4" />
        )}
        <span>{loading ? 'Création...' : 'Créer Admin'}</span>
      </Button>
    </div>
  );
};