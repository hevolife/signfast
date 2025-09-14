import React from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Clock, X } from 'lucide-react';

export const DemoTimer: React.FC = () => {
  const { isDemoMode, timeRemaining, endDemo } = useDemo();

  if (!isDemoMode) return null;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 600) return 'text-green-600'; // > 10 min
    if (timeRemaining > 300) return 'text-yellow-600'; // > 5 min
    return 'text-red-600'; // < 5 min
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  Mode Démo
                </div>
                <div className={`text-lg font-bold ${getTimerColor()}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={endDemo}
              className="text-gray-500 hover:text-gray-700"
              title="Quitter la démo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 text-xs text-blue-700 dark:text-blue-400">
            Démo gratuite • Toutes les fonctionnalités
          </div>
        </CardContent>
      </Card>
    </div>
  );
};