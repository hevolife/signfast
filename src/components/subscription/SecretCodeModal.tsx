import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { X, Key, Gift, Crown, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SecretCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SecretCodeModal: React.FC<SecretCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Veuillez saisir un code secret');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔑 Activation code secret:', code.trim().toUpperCase(), 'pour user:', user?.id);
      
      const { data, error } = await supabase.rpc('activate_secret_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: user?.id
      });
      
      console.log('🔑 Réponse activation:', { data, error });

      if (error) {
        console.error('Erreur activation code:', error);
        toast.error(`Erreur lors de l'activation du code: ${error.message}`);
        return;
      }

      if (data.success) {
        const isLifetime = data.type === 'lifetime';
        const expiresAt = data.expires_at ? new Date(data.expires_at).toLocaleDateString('fr-FR') : null;
        
        console.log('🔑 ✅ Code activé avec succès:', {
          type: data.type,
          isLifetime,
          expiresAt,
          message: data.message
        });
        
        toast.success(
          `🎉 Code activé avec succès ! ${isLifetime ? 'Accès à vie débloqué !' : `Accès mensuel jusqu'au ${expiresAt}`}`,
          { duration: 6000 }
        );
        
        setCode('');
        onSuccess();
        onClose();
      } else {
        console.log('🔑 ❌ Échec activation:', data.error);
        toast.error(data.error || 'Code secret invalide');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'activation du code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Code Secret
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Débloquez l'accès premium
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-2">
              <Gift className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Types de codes disponibles
              </span>
            </div>
            <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
              <div className="flex items-center space-x-2">
                <Crown className="h-3 w-3" />
                <span>Codes à vie : Accès illimité permanent</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-3 w-3" />
                <span>Codes mensuels : Accès premium 1 mois</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Code secret"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Entrez votre code secret"
              className="font-mono text-center tracking-wider"
              maxLength={20}
              required
            />

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Activation...</span>
                  </div>
                ) : (
                  'Activer le code'
                )}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Les codes secrets sont sensibles à la casse et uniques
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};