import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { useLimits } from '../../hooks/useLimits';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Crown, AlertTriangle, Zap } from 'lucide-react';
import { stripeConfig } from '../../stripe-config';

export const SubscriptionBanner: React.FC = () => {
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { forms, pdfTemplates, savedPdfs, loading: limitsLoading } = useLimits();

  // Debug pour vérifier l'état
  console.log('🔍 SubscriptionBanner - État:', {
    isSubscribed,
    subscriptionLoading,
    limitsLoading,
    shouldShow: !subscriptionLoading && !limitsLoading && !isSubscribed
  });

  if (subscriptionLoading || limitsLoading || isSubscribed) {
    return null;
  }

  const isNearLimit = !forms.canCreate || !pdfTemplates.canCreate || !savedPdfs.canSave;

  const product = stripeConfig.products[0];

  return (
    <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {isNearLimit ? (
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              ) : (
                <Crown className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {isNearLimit ? 'Limites atteintes' : 'Version gratuite'}
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>📝 Formulaires: {forms.current}/{forms.max === Infinity ? '∞' : forms.max}</div>
                <div>📄 Templates PDF: {pdfTemplates.current}/{pdfTemplates.max === Infinity ? '∞' : pdfTemplates.max}</div>
                <div>💾 PDFs sauvegardés: {savedPdfs.current}/{savedPdfs.max === Infinity ? '∞' : savedPdfs.max}</div>
                <div className="pt-1 text-blue-600 dark:text-blue-400 font-medium">
                  🚀 Passez à {product.name} pour {product.price}€/mois
                </div>
              </div>
            </div>
          </div>
          <Link to="/subscription">
            <Button size="sm" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Passer Pro</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};