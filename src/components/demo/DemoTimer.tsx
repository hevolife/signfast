import React from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Clock, Sparkles, Zap, Minimize2, Maximize2 } from 'lucide-react';

export const DemoTimer: React.FC = () => {
  const { isDemoMode, timeRemaining, endDemo } = useDemo();
  const [isMinimized, setIsMinimized] = React.useState(false);

  if (!isDemoMode) return null;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 600) return 'text-green-600 dark:text-green-400'; // > 10 min
    if (timeRemaining > 300) return 'text-yellow-600 dark:text-yellow-400'; // > 5 min
    return 'text-red-600 dark:text-red-400'; // < 5 min
  };

  const getProgressColor = () => {
    if (timeRemaining > 600) return 'from-green-500 to-emerald-500'; // > 10 min
    if (timeRemaining > 300) return 'from-yellow-500 to-orange-500'; // > 5 min
    return 'from-red-500 to-pink-500'; // < 5 min
  };

  const getBackgroundColor = () => {
    if (timeRemaining > 600) return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'; // > 10 min
    if (timeRemaining > 300) return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'; // > 5 min
    return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800'; // < 5 min
  };

  // Calculer le pourcentage de temps restant (sur 30 minutes par défaut)
  const totalTime = 30 * 60; // 30 minutes en secondes
  const progressPercentage = Math.max(0, (timeRemaining / totalTime) * 100);

  return (
    <div className={`fixed top-20 lg:top-24 right-4 z-40 transition-all duration-300 ${
      isMinimized ? 'max-w-[120px]' : 'max-w-xs w-full'
    }`}>
      <Card className={`bg-gradient-to-br ${getBackgroundColor()} border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center ${isMinimized ? 'space-x-2' : 'space-x-3'}`}>
              <div className="relative">
                <div className={`${isMinimized ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br ${getProgressColor()} rounded-full flex items-center justify-center shadow-lg`}>
                  <Clock className={`${isMinimized ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                </div>
                {timeRemaining <= 300 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse">
                    <span className="text-white text-xs font-bold flex items-center justify-center h-full">!</span>
                  </div>
                )}
              </div>
              {!isMinimized && (
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Mode Démo
                    </span>
                  </div>
                  <div className={`text-xl font-bold ${getTimerColor()} font-mono`}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              )}
              {isMinimized && (
                <div className={`text-lg font-bold ${getTimerColor()} font-mono`}>
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-full w-8 h-8 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
                title={isMinimized ? "Agrandir le timer" : "Réduire le timer"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Barre de progression */}
              <div className="mb-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 shadow-inner">
                  <div 
                    className={`h-2 bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  <span>0:00</span>
                  <span>30:00</span>
                </div>
              </div>

              {/* Informations et actions */}
              <div className="space-y-3">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      Accès complet
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <div>✅ Formulaires illimités</div>
                    <div>✅ Templates PDF illimités</div>
                    <div>✅ Génération PDF</div>
                    <div>✅ Toutes les fonctionnalités</div>
                  </div>
                </div>

                {timeRemaining <= 300 && (
                  <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 p-3 rounded-xl border border-orange-200 dark:border-orange-800 shadow-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold text-red-900 dark:text-red-300">
                        Démo bientôt expirée !
                      </span>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                      Créez un compte pour continuer à utiliser SignFast
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        endDemo();
                        window.location.href = '/signup';
                      }}
                      className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Créer un compte
                    </Button>
                  </div>
                )}

                {timeRemaining > 300 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      endDemo();
                      window.location.href = '/signup';
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Créer un compte
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Version minimisée - juste le temps et un indicateur */}
          {isMinimized && (
            <div className="text-center">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 shadow-inner mb-2">
                <div 
                  className={`h-1 bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Démo • {Math.floor(timeRemaining / 60)}min
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};