import React, { useState } from 'react';
import { useAffiliate } from '../../hooks/useAffiliate';
import { formatDateFR } from '../../utils/dateFormatter';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { 
  Users, 
  Copy, 
  ExternalLink, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Gift,
  Share2,
  Crown,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AffiliatePanel: React.FC = () => {
  const { program, referrals, loading, tablesExist } = useAffiliate();
  const [showDetails, setShowDetails] = useState(false);

  const copyAffiliateLink = () => {
    if (!program) return;
    
    const link = `${window.location.origin}/signup?ref=${program.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien d\'affiliation copié !');
  };

  const copyAffiliateCode = () => {
    if (!program) return;
    
    navigator.clipboard.writeText(program.affiliate_code);
    toast.success('Code d\'affiliation copié !');
  };

  const shareOnSocial = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    if (!program) return;
    
    const link = `${window.location.origin}/signup?ref=${program.affiliate_code}`;
    const text = "Découvrez SignFast, la solution française de signature électronique ! Créez vos contrats en 2 minutes ⚡";
    
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'paid':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'paid':
        return 'Payé';
      case 'cancelled':
        return 'Annulé';
      default:
        return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  if (!tablesExist) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Système d'affiliation en cours de configuration
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Les tables d'affiliation sont en cours de création. Veuillez patienter ou contacter l'administrateur.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!program) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Programme d'affiliation en cours de création
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Votre programme d'affiliation sera activé automatiquement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Parrainages totaux
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                  {program.total_referrals}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {referrals.filter(r => r.status === 'confirmed').length} confirmés
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Gains ce mois
                </p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                  {program.monthly_earnings.toFixed(2)}€
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Commission {program.commission_rate}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Gains totaux
                </p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                  {program.total_earnings.toFixed(2)}€
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Depuis le début
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lien d'affiliation */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Votre lien d'affiliation
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Partagez ce lien pour gagner {program.commission_rate}% de commission sur chaque abonnement
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code d'affiliation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Code d'affiliation
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={program.affiliate_code}
                readOnly
                className="flex-1 font-mono bg-gray-50 dark:bg-gray-800"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAffiliateCode}
                className="flex items-center space-x-1"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copier</span>
              </Button>
            </div>
          </div>

          {/* Lien complet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lien de parrainage
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={`${window.location.origin}/signup?ref=${program.affiliate_code}`}
                readOnly
                className="flex-1 text-sm bg-gray-50 dark:bg-gray-800"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAffiliateLink}
                className="flex items-center space-x-1"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copier</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`${window.location.origin}/signup?ref=${program.affiliate_code}`, '_blank')}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Boutons de partage social */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareOnSocial('twitter')}
              className="flex items-center space-x-2 bg-blue-500 text-white hover:bg-blue-600"
            >
              <span>🐦</span>
              <span>Twitter</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareOnSocial('linkedin')}
              className="flex items-center space-x-2 bg-blue-700 text-white hover:bg-blue-800"
            >
              <span>💼</span>
              <span>LinkedIn</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareOnSocial('facebook')}
              className="flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <span>📘</span>
              <span>Facebook</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comment ça marche */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comment ça marche ?
            </h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">1. Partagez</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Partagez votre lien d'affiliation avec vos contacts
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Crown className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">2. Ils s'abonnent</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vos filleuls s'inscrivent et souscrivent à SignFast Pro
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">3. Vous gagnez</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recevez {program.commission_rate}% de commission récurrente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des parrainages */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vos parrainages ({referrals.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Masquer' : 'Voir détails'}
              </Button>
            </div>
          </CardHeader>
          {showDetails && (
            <CardContent>
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(referral.status)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {(referral as any).referred_profile?.company_name || 
                           `${(referral as any).referred_profile?.first_name || ''} ${(referral as any).referred_profile?.last_name || ''}`.trim() ||
                           (referral as any).referred_user?.email || 'Utilisateur'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateFR(referral.created_at)} • {getStatusLabel(referral.status)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        +{referral.commission_amount.toFixed(2)}€
                      </div>
                      <div className="text-xs text-gray-500">
                        {referral.commission_rate}% commission
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Conseils pour maximiser les gains */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300">
              Maximisez vos gains
            </h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-yellow-800 dark:text-yellow-200">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">💡</span>
              <span>Partagez avec des entrepreneurs, agents immobiliers et consultants</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">🎯</span>
              <span>Mettez en avant la simplicité et le gain de temps de SignFast</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">📱</span>
              <span>Utilisez les réseaux sociaux pour toucher plus de prospects</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">💰</span>
              <span>Commission récurrente : vous gagnez tant qu'ils restent abonnés !</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};