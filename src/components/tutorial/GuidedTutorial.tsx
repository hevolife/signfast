import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  FormInput, 
  FileText, 
  PenTool, 
  Crown,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Target,
  Zap,
  Eye,
  Share2,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: string;
  icon: React.ReactNode;
  color: string;
  targetElement?: string;
  action?: {
    type: 'navigate' | 'click' | 'highlight' | 'demo';
    target?: string;
    data?: any;
  };
  animation?: {
    type: 'bounce' | 'pulse' | 'slide' | 'zoom' | 'glow';
    duration?: number;
  };
}

interface GuidedTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  autoStart?: boolean;
}

export const GuidedTutorial: React.FC<GuidedTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
  autoStart = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showOverlay, setShowOverlay] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Bienvenue sur SignFast ! 🎉',
      description: 'Découvrez comment créer vos premiers contrats électroniques',
      content: 'SignFast vous permet de créer des formulaires personnalisés avec signature électronique et génération PDF automatique. Ce tutoriel vous guidera étape par étape.',
      icon: <Sparkles className="h-8 w-8 text-white" />,
      color: 'from-blue-500 to-indigo-600',
      animation: { type: 'bounce', duration: 2000 }
    },
    {
      id: 'dashboard-overview',
      title: 'Votre Dashboard Personnel',
      description: 'Vue d\'ensemble de votre activité',
      content: 'Le dashboard vous donne un aperçu complet : nombre de formulaires, templates PDF, réponses reçues et graphiques d\'activité. C\'est votre centre de contrôle.',
      icon: <Target className="h-8 w-8 text-white" />,
      color: 'from-purple-500 to-pink-600',
      targetElement: '[data-tutorial="dashboard-stats"]',
      animation: { type: 'pulse', duration: 1500 }
    },
    {
      id: 'create-form',
      title: 'Créer votre premier formulaire',
      description: 'Construisez des formulaires personnalisés',
      content: 'Utilisez notre constructeur intuitif pour créer des formulaires avec différents types de champs : texte, email, signature électronique, etc. Glissez-déposez les éléments !',
      icon: <FormInput className="h-8 w-8 text-white" />,
      color: 'from-green-500 to-emerald-600',
      action: { type: 'navigate', target: '/forms/new' },
      animation: { type: 'slide', duration: 1000 }
    },
    {
      id: 'form-builder',
      title: 'Constructeur de Formulaire',
      description: 'Interface drag & drop intuitive',
      content: 'Ajoutez des champs en cliquant sur les éléments de la palette. Configurez chaque champ : libellé, validation, champs obligatoires. L\'aperçu se met à jour en temps réel.',
      icon: <Zap className="h-8 w-8 text-white" />,
      color: 'from-orange-500 to-red-600',
      targetElement: '[data-tutorial="field-palette"]',
      animation: { type: 'glow', duration: 2000 }
    },
    {
      id: 'pdf-templates',
      title: 'Templates PDF Dynamiques',
      description: 'Liez vos formulaires à des documents PDF',
      content: 'Créez des templates PDF avec des champs positionnés précisément. Quand quelqu\'un remplit votre formulaire, un PDF personnalisé est généré automatiquement.',
      icon: <FileText className="h-8 w-8 text-white" />,
      color: 'from-indigo-500 to-purple-600',
      action: { type: 'navigate', target: '/pdf/templates/new' },
      animation: { type: 'zoom', duration: 1200 }
    },
    {
      id: 'signature',
      title: 'Signature Électronique',
      description: 'Collectez des signatures légales',
      content: 'Ajoutez des champs de signature à vos formulaires. Vos clients peuvent signer directement sur leur écran avec leur doigt ou souris. Valeur légale garantie.',
      icon: <PenTool className="h-8 w-8 text-white" />,
      color: 'from-teal-500 to-cyan-600',
      animation: { type: 'bounce', duration: 1800 }
    },
    {
      id: 'publish-share',
      title: 'Publier et Partager',
      description: 'Diffusez vos formulaires',
      content: 'Une fois votre formulaire prêt, publiez-le pour obtenir un lien de partage. Générez un QR code, intégrez dans vos emails ou partagez sur vos réseaux sociaux.',
      icon: <Share2 className="h-8 w-8 text-white" />,
      color: 'from-pink-500 to-rose-600',
      animation: { type: 'pulse', duration: 1600 }
    },
    {
      id: 'collect-responses',
      title: 'Collecte des Réponses',
      description: 'Analysez et gérez les données',
      content: 'Visualisez toutes les réponses dans votre dashboard. Exportez en CSV, téléchargez les PDFs générés, et suivez vos statistiques en temps réel.',
      icon: <Download className="h-8 w-8 text-white" />,
      color: 'from-emerald-500 to-green-600',
      animation: { type: 'slide', duration: 1400 }
    },
    {
      id: 'complete',
      title: 'Félicitations ! 🎊',
      description: 'Vous maîtrisez maintenant SignFast',
      content: 'Vous avez découvert toutes les fonctionnalités principales. Vous êtes prêt à créer vos premiers contrats électroniques professionnels !',
      icon: <Crown className="h-8 w-8 text-white" />,
      color: 'from-yellow-500 to-orange-600',
      action: { type: 'navigate', target: '/forms/new' },
      animation: { type: 'bounce', duration: 2500 }
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const timer = setTimeout(() => {
      if (currentStep < tutorialSteps.length - 1) {
        handleNextStep();
      } else {
        setIsPlaying(false);
      }
    }, 5000); // 5 secondes par étape

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, isOpen]);

  // Highlight target elements
  useEffect(() => {
    const step = tutorialSteps[currentStep];
    if (step?.targetElement) {
      setHighlightedElement(step.targetElement);
      setShowOverlay(true);
      
      // Scroll to element if it exists
      const element = document.querySelector(step.targetElement);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
      setShowOverlay(false);
    }
  }, [currentStep]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setHighlightedElement(null);
      setShowOverlay(false);
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setIsPlaying(false);
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Marquer le tutoriel comme terminé
    if (user) {
      localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
    }
    
    toast.success('🎉 Tutoriel terminé ! Vous êtes prêt à utiliser SignFast.');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`tutorial_skipped_${user.id}`, 'true');
    }
    onClose();
  };

  const handleActionClick = () => {
    const step = tutorialSteps[currentStep];
    if (step.action) {
      switch (step.action.type) {
        case 'navigate':
          if (step.action.target) {
            navigate(step.action.target);
            onClose();
          }
          break;
        case 'demo':
          // Déclencher une démo spécifique
          toast.success('Démo lancée !');
          break;
      }
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsPlaying(true);
  };

  const getAnimationClass = (animation?: TutorialStep['animation']) => {
    if (!animation) return '';
    
    const baseClass = 'animate-';
    switch (animation.type) {
      case 'bounce':
        return 'animate-bounce';
      case 'pulse':
        return 'animate-pulse';
      case 'slide':
        return 'animate-in slide-in-from-left duration-1000';
      case 'zoom':
        return 'animate-in zoom-in duration-700';
      case 'glow':
        return 'animate-pulse shadow-2xl';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <>
      {/* Overlay pour mettre en évidence les éléments */}
      {showOverlay && highlightedElement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 pointer-events-none">
          <style>
            {`
              ${highlightedElement} {
                position: relative !important;
                z-index: 50 !important;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.4) !important;
                border-radius: 12px !important;
                pointer-events: auto !important;
              }
            `}
          </style>
        </div>
      )}

      {/* Modal principal du tutoriel */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto my-4 min-h-0">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
            {/* Header avec progression */}
            <div className={`relative overflow-hidden bg-gradient-to-r ${currentStepData.color} p-4 sm:p-6`}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg ${getAnimationClass(currentStepData.animation)}`}>
                    {currentStepData.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 truncate">
                      {currentStepData.title}
                    </h2>
                    <p className="text-sm sm:text-base text-white/90 font-medium line-clamp-2">
                      {currentStepData.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                  {/* Contrôles de lecture */}
                  <div className="flex items-center space-x-1 sm:space-x-2 bg-white/20 backdrop-blur-sm rounded-full p-1 sm:p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={togglePlayPause}
                      className="text-white hover:bg-white/20 rounded-full w-6 h-6 sm:w-8 sm:h-8 p-0"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="h-3 w-3 sm:h-4 sm:w-4" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={restartTutorial}
                      className="text-white hover:bg-white/20 rounded-full w-6 h-6 sm:w-8 sm:h-8 p-0"
                      title="Recommencer"
                    >
                      <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Barre de progression */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center justify-between text-white/90 text-sm font-medium mb-2">
                  <span>Étape {currentStep + 1} sur {tutorialSteps.length}</span>
                  <span>{Math.round(progress)}% terminé</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 shadow-inner">
                  <div 
                    className="h-2 bg-gradient-to-r from-white to-yellow-200 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {/* Contenu de l'étape */}
                <div className="lg:col-span-2">
                  <div className="prose max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base lg:text-lg">
                      {currentStepData.content}
                    </p>
                  </div>
                  
                  {/* Action spéciale selon l'étape */}
                  {currentStepData.action && (
                    <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-300 mb-1">
                            Action recommandée
                          </h4>
                          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">
                            {currentStepData.action.type === 'navigate' 
                              ? 'Cliquez pour accéder à cette fonctionnalité'
                              : 'Suivez les instructions pour continuer'
                            }
                          </p>
                        </div>
                        <Button
                          onClick={handleActionClick}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex-shrink-0"
                        >
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Essayer
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Conseils selon l'étape */}
                  {currentStep === 2 && (
                    <div className="mt-4 sm:mt-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 sm:p-4 rounded-xl border border-green-200 dark:border-green-800">
                      <h4 className="text-sm sm:text-base font-bold text-green-900 dark:text-green-300 mb-2 sm:mb-3 flex items-center">
                        <span className="mr-2">💡</span>
                        Conseils pour votre premier formulaire
                      </h4>
                      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-green-800 dark:text-green-200">
                        <div className="flex items-start space-x-2">
                          <span className="text-green-600 mt-0.5">📝</span>
                          <span>Commencez simple : nom, email, et un champ signature</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-green-600 mt-0.5">🎯</span>
                          <span>Utilisez des libellés clairs et des placeholders explicites</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-green-600 mt-0.5">✅</span>
                          <span>Marquez les champs importants comme obligatoires</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="mt-4 sm:mt-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 sm:p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                      <h4 className="text-sm sm:text-base font-bold text-purple-900 dark:text-purple-300 mb-2 sm:mb-3 flex items-center">
                        <span className="mr-2">🎨</span>
                        Astuces pour les templates PDF
                      </h4>
                      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-600 mt-0.5">📄</span>
                          <span>Uploadez votre contrat PDF existant comme base</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-600 mt-0.5">🎯</span>
                          <span>Positionnez les champs précisément sur le document</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-600 mt-0.5">🔗</span>
                          <span>Liez le template à votre formulaire pour l'automatisation</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation et mini-carte des étapes */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-6 sm:p-8 shadow-lg">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center">
                      Progression du tutoriel
                    </h3>
                    
                    <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 max-h-80 sm:max-h-96 lg:max-h-[500px] overflow-y-auto">
                      {tutorialSteps.map((step, index) => (
                        <button
                          key={step.id}
                          onClick={() => handleStepClick(index)}
                          className={`w-full text-left p-2 sm:p-3 rounded-lg transition-all duration-300 ${
                            index === currentStep
                              ? `bg-gradient-to-r ${step.color} text-white shadow-lg transform scale-105`
                              : completedSteps.has(index)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-4 sm:space-x-5">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              index === currentStep
                                ? 'bg-white/20'
                                : completedSteps.has(index)
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}>
                              {completedSteps.has(index) ? (
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                              ) : (
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base lg:text-lg font-semibold line-clamp-2">
                                {step.title.replace(/[🎉🎊]/g, '').trim()}
                              </div>
                              <div className="text-xs sm:text-sm lg:text-base opacity-75 line-clamp-2 mt-1">
                                {step.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Statistiques de progression */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-inner">
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                          {completedSteps.size}/{tutorialSteps.length}
                        </div>
                        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium mb-4">
                          Étapes terminées
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                          <div 
                            className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                            style={{ width: `${(completedSteps.size / tutorialSteps.length) * 100}%` }}
                          ></div>
                        </div>
                        <div className="mt-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {Math.round((completedSteps.size / tutorialSteps.length) * 100)}% terminé
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Footer avec navigation */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Button
                    variant="ghost"
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-1 sm:space-x-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold rounded-xl text-sm"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Précédent</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium text-sm"
                  >
                    Passer le tutoriel
                  </Button>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Indicateur de lecture automatique */}
                  {isPlaying && currentStep < tutorialSteps.length - 1 && (
                    <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="hidden sm:inline">Lecture automatique...</span>
                      <span className="sm:hidden">Auto...</span>
                    </div>
                  )}
                  
                  {currentStep === tutorialSteps.length - 1 ? (
                    <Button
                      onClick={handleComplete}
                      className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Terminer le tutoriel</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextStep}
                      className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <span>Suivant</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};