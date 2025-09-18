import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { X, Sparkles, Zap, CheckCircle, Clock, Gift, ArrowRight, FormInput, FileText, PenTool, Crown } from 'lucide-react';
import { BookOpen } from 'lucide-react';

export const WelcomeModal: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSteps, setShowSteps] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  // Vérifier si c'est un nouvel utilisateur (créé il y a moins de 5 minutes)
  const isNewUser = user && user.created_at && 
    (Date.now() - new Date(user.created_at).getTime()) < 24 * 60 * 60 * 1000; // 24h au lieu de 5 min

  // Vérifier si l'utilisateur a déjà vu le message d'accueil
  const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user?.id}`);

  // Écouter les événements pour réactiver le modal
  useEffect(() => {
    const handleShowWelcome = () => {
      console.log('🎉 Réactivation du message d\'accueil');
      setForceShow(true);
      setIsVisible(true);
      setTimeout(() => {
        setShowSteps(true);
      }, 1000);
    };

    window.addEventListener('show-welcome-modal', handleShowWelcome);
    return () => window.removeEventListener('show-welcome-modal', handleShowWelcome);
  }, []);

  // Afficher le modal seulement pour les nouveaux utilisateurs qui n'ont pas encore vu le message
  useEffect(() => {
    if ((isNewUser && !hasSeenWelcome && user) || forceShow) {
      // Délai pour laisser le temps à l'interface de se charger
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Commencer l'animation des étapes après 1 seconde
        setTimeout(() => {
          setShowSteps(true);
        }, 1000);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isNewUser, hasSeenWelcome, user, forceShow]);

  // Animation des étapes
  useEffect(() => {
    if (showSteps && steps.length > 0) {
      const interval = setInterval(() => {
        setCurrentStepIndex(prev => 
          prev >= steps.length - 1 ? 0 : prev + 1
        );
      }, 2500);
      
      return () => clearInterval(interval);
    }
  }, [showSteps]);

  const handleStartJourney = () => {
    if (user) {
      localStorage.setItem(`welcome_seen_${user.id}`, 'true');
    }
    setForceShow(false);
    setIsVisible(false);
    // Rediriger vers la création du premier formulaire
    window.location.href = '/forms/new';
  };

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`welcome_seen_${user.id}`, 'true');
    }
    setForceShow(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const steps = [
    {
      icon: <FormInput className="h-5 w-5 text-white" />,
      title: "Créez votre premier formulaire",
      description: "Utilisez notre constructeur intuitif pour créer des formulaires personnalisés",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <FileText className="h-5 w-5 text-white" />,
      title: "Configurez un template PDF",
      description: "Liez vos formulaires à des templates PDF pour générer des documents automatiquement",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: <PenTool className="h-5 w-5 text-white" />,
      title: "Collectez les signatures",
      description: "Partagez vos formulaires et collectez des signatures électroniques légales",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: <Crown className="h-5 w-5 text-white" />,
      title: "Gérez vos documents",
      description: "Accédez à tous vos PDFs signés depuis votre dashboard personnel",
      color: "from-orange-500 to-red-600"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-500 overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md mx-auto my-4">
        <Card className="w-full bg-white/95 backdrop-blur-sm border-0 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
        <CardHeader className="relative overflow-hidden p-4 sm:p-6">
          {/* Background gradient animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/80 via-blue-600/80 to-purple-600/80"></div>
          
          {/* Éléments décoratifs animés */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full blur-xl animate-bounce"></div>
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 w-12 h-12 sm:w-16 sm:h-16 bg-yellow-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
          
          <div className="relative text-center py-2 sm:py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-3xl mb-3 sm:mb-4 shadow-xl animate-in zoom-in duration-1000 delay-300">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-pulse" />
            </div>
            
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 animate-in slide-in-from-top duration-700 delay-500">
              🎉 Bienvenue sur SignFast !
            </h1>
            
            <p className="text-xs sm:text-sm text-white/90 mb-2 sm:mb-3 animate-in slide-in-from-top duration-700 delay-700">
              Félicitations ! Votre compte est créé. Découvrez comment créer vos premiers contrats électroniques.
            </p>
            
            {/* Badge nouveau utilisateur */}
            <div className="inline-flex items-center space-x-1 sm:space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 text-white/90 text-xs font-medium animate-in zoom-in duration-700 delay-1000">
              <Gift className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
              <span>Nouveau membre SignFast</span>
            </div>
          </div>
          
          {/* Bouton fermer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 z-10"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Étapes avec animation */}
          <div className="space-y-2 sm:space-y-3">
            <div className="text-center">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 animate-in slide-in-from-left duration-500 delay-1200">
                🚀 Votre parcours en 4 étapes
              </h3>
            </div>
            
            <div className="grid gap-1 sm:gap-2">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-2 p-2 sm:p-3 rounded-lg transition-all duration-500 ${
                    showSteps && index <= currentStepIndex
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 shadow-lg animate-in slide-in-from-left'
                      : 'bg-gray-50 dark:bg-gray-800 opacity-50'
                  }`}
                  style={{
                    animationDelay: `${1400 + index * 200}ms`,
                    animationDuration: '600ms'
                  }}
                >
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    showSteps && index <= currentStepIndex
                      ? `bg-gradient-to-br ${step.color} shadow-lg animate-pulse`
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    {showSteps && index <= currentStepIndex ? (
                      step.icon
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                      showSteps && index <= currentStepIndex
                        ? 'text-blue-900 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs sm:text-sm transition-colors duration-300 ${
                      showSteps && index <= currentStepIndex
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-500'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                  {showSteps && index === currentStepIndex && (
                    <div className="animate-in zoom-in duration-300">
                      <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Guide de démarrage */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-inner animate-in slide-in-from-bottom duration-700 delay-2000">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-300">
                💡 Par où commencer ?
              </h4>
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-green-800 dark:text-green-200">
              <div className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">1️⃣</span>
                <span>Créez votre premier formulaire (contrat, enquête...)</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">2️⃣</span>
                <span>Ajoutez des champs (nom, email, signature...)</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">3️⃣</span>
                <span>Publiez et partagez le lien à vos clients</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">4️⃣</span>
                <span>Récupérez les réponses et PDFs signés</span>
              </div>
            </div>
          </div>

          {/* Avantages premium */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-3 sm:p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 shadow-inner animate-in slide-in-from-bottom duration-700 delay-2200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-yellow-900 dark:text-yellow-300">
                🎁 Plan gratuit inclus
              </h4>
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
                <span>1 formulaire gratuit pour commencer</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
                <span>1 template PDF inclus</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
                <span>3 PDFs sauvegardés</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
                <span>Signature électronique légale</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:gap-3 animate-in slide-in-from-bottom duration-700 delay-2500">
            <Button
              onClick={handleStartJourney}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 sm:py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-center space-x-2">
                <FormInput className="h-3 w-3 sm:h-4 sm:w-4 group-hover:animate-pulse" />
                <span>Créer mon premier formulaire</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setIsVisible(false);
                // Déclencher le tutoriel après fermeture du modal
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('show-tutorial-after-welcome'));
                }, 500);
              }}
              variant="ghost"
              className="bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 font-semibold py-2 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Tutoriel</span>
              </div>
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-2 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <span className="text-xs sm:text-sm">Plus tard</span>
            </Button>
            </div>
          </div>

          {/* Note en bas */}
          <div className="text-center animate-in fade-in duration-1000 delay-3000 pt-1 sm:pt-2">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
              ✨ Vous pouvez toujours accéder à ce guide depuis les paramètres
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};