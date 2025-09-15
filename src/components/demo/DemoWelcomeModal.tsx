import React, { useState, useEffect } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { X, Sparkles, Zap, CheckCircle, Clock, Gift, ArrowRight } from 'lucide-react';

export const DemoWelcomeModal: React.FC = () => {
  const { isDemoMode, demoSettings, endDemo } = useDemo();
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);

  // Afficher le modal seulement au début de la démo
  useEffect(() => {
    if (isDemoMode) {
      // Délai pour laisser le temps à l'interface de se charger
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Commencer l'animation des fonctionnalités après 1 seconde
        setTimeout(() => {
          setShowFeatures(true);
        }, 1000);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isDemoMode]);

  // Animation des fonctionnalités
  useEffect(() => {
    if (showFeatures && demoSettings.features?.length > 0) {
      const interval = setInterval(() => {
        setCurrentFeatureIndex(prev => 
          prev >= demoSettings.features.length - 1 ? 0 : prev + 1
        );
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [showFeatures, demoSettings.features]);

  const handleStartDemo = () => {
    setIsVisible(false);
  };

  const handleEndDemo = () => {
    endDemo();
    window.location.href = '/';
  };

  if (!isDemoMode || !isVisible) return null;

  const features = demoSettings.features || [
    'Création de formulaires illimitée',
    'Templates PDF avec champs dynamiques',
    'Génération PDF automatique',
    'Signature électronique',
    'Interface responsive'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-500">
      <Card className="max-w-2xl w-full bg-white/95 backdrop-blur-sm border-0 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
        <CardHeader className="relative overflow-hidden">
          {/* Background gradient animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 via-purple-600/80 to-pink-600/80"></div>
          
          {/* Éléments décoratifs animés */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-bounce"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-yellow-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
          
          <div className="relative text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-6 shadow-xl animate-in zoom-in duration-1000 delay-300">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-in slide-in-from-top duration-700 delay-500">
              🎉 Bienvenue dans SignFast !
            </h1>
            
            <p className="text-lg text-white/90 mb-6 animate-in slide-in-from-top duration-700 delay-700">
              {demoSettings.welcomeMessage || 'Bienvenue dans la démo SignFast ! Testez toutes les fonctionnalités pendant 30 minutes.'}
            </p>
            
            {/* Timer de démo */}
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white/90 text-sm font-medium animate-in zoom-in duration-700 delay-1000">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>{demoSettings.durationMinutes || 30} minutes d'accès complet</span>
            </div>
          </div>
          
          {/* Bouton fermer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndDemo}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full w-10 h-10 p-0 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8">
          {/* Fonctionnalités avec animation */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 animate-in slide-in-from-left duration-500 delay-1200">
                🚀 Fonctionnalités débloquées
              </h3>
            </div>
            
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-500 ${
                    showFeatures && index <= currentFeatureIndex
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 shadow-lg animate-in slide-in-from-left'
                      : 'bg-gray-50 dark:bg-gray-800 opacity-50'
                  }`}
                  style={{
                    animationDelay: `${1400 + index * 200}ms`,
                    animationDuration: '600ms'
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    showFeatures && index <= currentFeatureIndex
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg animate-pulse'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    {showFeatures && index <= currentFeatureIndex ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium transition-colors duration-300 ${
                      showFeatures && index <= currentFeatureIndex
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {feature}
                    </span>
                  </div>
                  {showFeatures && index === currentFeatureIndex && (
                    <div className="animate-in zoom-in duration-300">
                      <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Conseils et astuces */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-inner animate-in slide-in-from-bottom duration-700 delay-2000">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <h4 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                💡 Conseils pour votre démo
              </h4>
            </div>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">📝</span>
                <span>Créez un formulaire avec signature électronique</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">📄</span>
                <span>Testez la génération PDF avec un template personnalisé</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">🔗</span>
                <span>Partagez votre formulaire et testez la signature</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">💾</span>
                <span>Explorez le stockage PDF et les statistiques</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom duration-700 delay-2500">
            <Button
              onClick={handleStartDemo}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-center space-x-3">
                <Zap className="h-5 w-5 group-hover:animate-pulse" />
                <span>Commencer la démo</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleEndDemo}
              className="sm:w-auto bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-4 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Quitter la démo
            </Button>
          </div>

          {/* Note en bas */}
          <div className="text-center animate-in fade-in duration-1000 delay-3000">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              ✨ Toutes les données de démo seront supprimées à la fin de la session
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};