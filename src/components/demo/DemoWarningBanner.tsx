import React from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { AlertTriangle, Clock, UserPlus } from 'lucide-react';

export const DemoWarningBanner: React.FC = () => {
  const { isDemoMode, timeRemaining, endDemo } = useDemo();

  if (!isDemoMode) return null;

  const isExpiringSoon = timeRemaining < 300; // Moins de 5 minutes

  return (
    <Card className={`mb-6 ${
      isExpiringSoon 
        ? 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
        : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isExpiringSoon 
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {isExpiringSoon ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${
                isExpiringSoon 
                  ? 'text-red-900 dark:text-red-300'
                  : 'text-blue-900 dark:text-blue-300'
              }`}>
                {isExpiringSoon ? 'Démo bientôt expirée' : 'Mode Démonstration'}
              </h3>
              <p className={`text-xs ${
                isExpiringSoon 
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-blue-700 dark:text-blue-400'
              }`}>
                {isExpiringSoon 
                  ? `Plus que ${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')} restantes`
                  : 'Vous testez SignFast gratuitement pendant 30 minutes'
                }
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button 
              size="sm" 
              className="flex items-center space-x-2"
              onClick={() => {
                endDemo();
                window.location.href = '/signup';
              }}
            >
              <UserPlus className="h-4 w-4" />
              <span>Créer un compte</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};