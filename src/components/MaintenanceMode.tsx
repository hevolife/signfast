import React from 'react';
import { Card, CardContent } from './ui/Card';
import { AlertTriangle, Wrench, Clock } from 'lucide-react';

export const MaintenanceMode: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="text-center py-16 px-8">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Wrench className="w-12 h-12 text-orange-600 animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Site en maintenance
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            SignFast est temporairement indisponible pour maintenance. 
            Nous travaillons à améliorer votre expérience.
          </p>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-orange-900 dark:text-orange-300">
                Maintenance en cours
              </span>
            </div>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              • Mise à jour des serveurs<br/>
              • Amélioration des performances<br/>
              • Nouvelles fonctionnalités en préparation
            </p>
          </div>

          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Nous serons de retour très bientôt !
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <span>🔧</span>
              <span>Équipe SignFast</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};