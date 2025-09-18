import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GuidedTutorial } from './GuidedTutorial';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { BookOpen, Play, X, Sparkles } from 'lucide-react';

export const TutorialTrigger: React.FC = () => {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showResumeNotification, setShowResumeNotification] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Vérifier si l'utilisateur est nouveau et n'a pas encore vu le tutoriel
  useEffect(() => {
    if (!user) return;

    const hasCompletedTutorial = localStorage.getItem(`tutorial_completed_${user.id}`);
    const hasSkippedTutorial = localStorage.getItem(`tutorial_skipped_${user.id}`);
    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user.id}`);

    // Afficher le prompt si l'utilisateur n'a pas fait le tutoriel et a déjà vu le message d'accueil
    if (!hasCompletedTutorial && !hasSkippedTutorial && hasSeenWelcome) {
      // Délai pour laisser l'interface se charger
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Écouter l'événement global pour déclencher le tutoriel
  useEffect(() => {
    const handleShowTutorial = () => {
      setShowTutorial(true);
      setShowPrompt(false);
      setShowResumeNotification(false);
    };

    window.addEventListener('show-tutorial', handleShowTutorial);
    return () => window.removeEventListener('show-tutorial', handleShowTutorial);
  }, []);

  // Écouter l'événement pour déclencher le tutoriel après fermeture du message d'accueil
  useEffect(() => {
    const handleShowTutorialAfterWelcome = () => {
      console.log('🎯 Déclenchement tutoriel après message d\'accueil');
      setTimeout(() => {
        setShowTutorial(true);
        setShowPrompt(false);
      }, 500);
    };

    window.addEventListener('show-tutorial-after-welcome', handleShowTutorialAfterWelcome);
    return () => window.removeEventListener('show-tutorial-after-welcome', handleShowTutorialAfterWelcome);
  }, []);
  const handleStartTutorial = () => {
    setShowTutorial(true);
    setShowPrompt(false);
    setShowResumeNotification(false);
  };

  const handleDismissPrompt = () => {
    setShowPrompt(false);
    if (user) {
      localStorage.setItem(`tutorial_skipped_${user.id}`, 'true');
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setShowResumeNotification(false);
    if (user) {
      localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
    }
  };

  const handleNavigateAway = () => {
    // Sauvegarder l'étape actuelle et fermer le tutoriel
    if (user) {
      localStorage.setItem(`tutorial_current_step_${user.id}`, tutorialStep.toString());
    }
    setShowTutorial(false);
    setShowResumeNotification(true);
  };

  const handleResumeTutorial = () => {
    // Reprendre le tutoriel à l'étape sauvegardée
    if (user) {
      const savedStep = localStorage.getItem(`tutorial_current_step_${user.id}`);
      if (savedStep) {
        setTutorialStep(parseInt(savedStep));
      }
    }
    setShowResumeNotification(false);
    setShowTutorial(true);
  };

  const handleDismissResume = () => {
    setShowResumeNotification(false);
    if (user) {
      localStorage.setItem(`tutorial_skipped_${user.id}`, 'true');
      localStorage.removeItem(`tutorial_current_step_${user.id}`);
    }
  };
  return (
    <>
      {/* Prompt flottant pour proposer le tutoriel */}
      {showPrompt && (
        <div className="fixed bottom-20 right-4 z-30 animate-in slide-in-from-bottom duration-700">
          <Card className="max-w-sm bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm mb-1">
                    🎯 Tutoriel interactif
                  </h3>
                  <p className="text-white/90 text-xs mb-3">
                    Découvrez SignFast en 5 minutes avec notre guide animé !
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleStartTutorial}
                      className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold text-xs px-3 py-1.5"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Commencer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismissPrompt}
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full w-6 h-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification de reprise du tutoriel */}
      {showResumeNotification && (
        <div className="fixed bottom-20 right-4 z-30 animate-in slide-in-from-bottom duration-500">
          <Card className="max-w-sm bg-gradient-to-r from-indigo-500 to-purple-600 border-0 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm mb-1">
                    📚 Tutoriel en pause
                  </h3>
                  <p className="text-white/90 text-xs mb-3">
                    Reprenez votre tutoriel là où vous l'avez laissé !
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleResumeTutorial}
                      className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold text-xs px-3 py-1.5"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Reprendre
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismissResume}
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full w-6 h-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Tutoriel principal */}
      <GuidedTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
        autoStart={true}
        onNavigateAway={handleNavigateAway}
      />
    </>
  );
};