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
  Download,
  ChevronRight,
  BookOpen
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
  tips?: string[];
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
      title: 'Bienvenue sur SignFast !',
      description: 'Découvrez la signature électronique simplifiée',
      content: 'SignFast vous permet de créer des formulaires personnalisés avec signature électronique et génération PDF automatique. Ce tutoriel vous guidera étape par étape pour maîtriser toutes les fonctionnalités.',
      icon: <Sparkles className="h-6 w-6 text-white" />,
      color: 'from-blue-500 to-indigo-600',
      tips: [
        'Interface 100% française et intuitive',
        'Aucune installation requise',
        'Conforme à la réglementation européenne'
      ]
    },
    {
      id: 'dashboard-overview',
      title: 'Votre Dashboard Personnel',
      description: 'Centre de contrôle de votre activité',
      content: 'Le dashboard vous donne un aperçu complet de votre activité : nombre de formulaires créés, templates PDF configurés, réponses reçues et graphiques d\'évolution. C\'est votre centre de contrôle principal.',
      icon: <Target className="h-6 w-6 text-white" />,
      color: 'from-purple-500 to-pink-600',
      targetElement: '[data-tutorial="dashboard-stats"]',
      tips: [
        'Statistiques en temps réel',
        'Graphiques d\'activité hebdomadaire',
        'Accès rapide aux actions principales'
      ]
    },
    {
      id: 'create-form',
      title: 'Créer votre premier formulaire',
      description: 'Constructeur de formulaires intuitif',
      content: 'Utilisez notre constructeur visuel pour créer des formulaires avec différents types de champs : texte, email, téléphone, signature électronique, etc. L\'interface glisser-déposer rend la création très simple.',
      icon: <FormInput className="h-6 w-6 text-white" />,
      color: 'from-green-500 to-emerald-600',
      action: { type: 'navigate', target: '/forms/new' },
      tips: [
        'Plus de 10 types de champs disponibles',
        'Validation automatique des données',
        'Champs conditionnels avancés'
      ]
    },
    {
      id: 'form-builder',
      title: 'Palette de Champs',
      description: 'Interface drag & drop moderne',
      content: 'Ajoutez des champs en cliquant sur les éléments de la palette colorée. Chaque type de champ a sa couleur et ses propriétés spécifiques. Configurez les validations, placeholders et champs obligatoires.',
      icon: <Zap className="h-6 w-6 text-white" />,
      color: 'from-orange-500 to-red-600',
      targetElement: '[data-tutorial="field-palette"]',
      tips: [
        'Glissez-déposez ou cliquez pour ajouter',
        'Propriétés configurables en temps réel',
        'Aperçu instantané du formulaire'
      ]
    },
    {
      id: 'pdf-templates',
      title: 'Templates PDF Dynamiques',
      description: 'Documents personnalisés automatiques',
      content: 'Créez des templates PDF avec des champs positionnés précisément. Quand quelqu\'un remplit votre formulaire, un PDF personnalisé est généré automatiquement avec toutes les données.',
      icon: <FileText className="h-6 w-6 text-white" />,
      color: 'from-indigo-500 to-purple-600',
      action: { type: 'navigate', target: '/pdf/templates/new' },
      tips: [
        'Positionnement pixel-perfect',
        'Variables dynamiques automatiques',
        'Support multi-pages'
      ]
    },
    {
      id: 'signature',
      title: 'Signature Électronique',
      description: 'Signatures légales et sécurisées',
      content: 'Ajoutez des champs de signature à vos formulaires. Vos clients peuvent signer directement sur leur écran avec leur doigt ou souris. Les signatures ont une valeur légale complète en France.',
      icon: <PenTool className="h-6 w-6 text-white" />,
      color: 'from-teal-500 to-cyan-600',
      tips: [
        'Valeur légale garantie (eIDAS)',
        'Signature tactile sur mobile',
        'Horodatage certifié'
      ]
    },
    {
      id: 'publish-share',
      title: 'Publier et Partager',
      description: 'Diffusion multi-canaux',
      content: 'Une fois votre formulaire prêt, publiez-le pour obtenir un lien de partage unique. Générez un QR code pour l\'impression, intégrez dans vos emails ou partagez sur vos réseaux sociaux.',
      icon: <Share2 className="h-6 w-6 text-white" />,
      color: 'from-pink-500 to-rose-600',
      tips: [
        'Lien de partage sécurisé',
        'QR code téléchargeable',
        'Intégration email et réseaux sociaux'
      ]
    },
    {
      id: 'collect-responses',
      title: 'Collecte et Analyse',
      description: 'Gestion complète des réponses',
      content: 'Visualisez toutes les réponses dans votre dashboard avec des statistiques détaillées. Exportez en CSV, téléchargez les PDFs générés, et suivez vos performances en temps réel.',
      icon: <Download className="h-6 w-6 text-white" />,
      color: 'from-emerald-500 to-green-600',
      tips: [
        'Export CSV automatique',
        'Statistiques avancées',
        'Archivage sécurisé 10 ans'
      ]
    },
    {
      id: 'complete',
      title: 'Félicitations !',
      description: 'Vous maîtrisez maintenant SignFast',
      content: 'Vous avez découvert toutes les fonctionnalités principales de SignFast. Vous êtes maintenant prêt à créer vos premiers contrats électroniques professionnels et à digitaliser vos processus !',
      icon: <Crown className="h-6 w-6 text-white" />,
      color: 'from-yellow-500 to-orange-600',
      action: { type: 'navigate', target: '/forms/new' },
      tips: [
        'Support client disponible 7j/7',
        'Nouvelles fonctionnalités régulières',
        'Communauté active d\'utilisateurs'
      ]
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
    }, 6000); // 6 secondes par étape

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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto my-4">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
            {/* Header avec progression */}
            <div className={`relative overflow-hidden bg-gradient-to-r ${currentStepData.color} p-6`}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
              
              <div className="relative">
                {/* Contrôles en haut à droite */}
                <div className="absolute top-0 right-0 flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm rounded-full p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={togglePlayPause}
                      className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={restartTutorial}
                      className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0"
                      title="Recommencer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Titre et description */}
                <div className="pr-32">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg`}>
                      {currentStepData.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {currentStepData.title}
                      </h2>
                      <p className="text-white/90 font-medium">
                        {currentStepData.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-white/90 text-sm font-medium mb-2">
                      <span>Étape {currentStep + 1} sur {tutorialSteps.length}</span>
                      <span>{Math.round(progress)}% terminé</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 shadow-inner">
                      <div 
                        className="h-3 bg-gradient-to-r from-white to-yellow-200 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu principal - Layout horizontal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
              {/* Contenu de l'étape - Côté gauche */}
              <div className="p-8 flex flex-col justify-center">
                <div className="space-y-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                      {currentStepData.content}
                    </p>
                  </div>
                  
                  {/* Conseils spécifiques à l'étape */}
                  {currentStepData.tips && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs">💡</span>
                        </div>
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                          Points clés à retenir
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {currentStepData.tips.map((tip, index) => (
                          <div key={index} className="flex items-start space-x-2 text-sm text-blue-800 dark:text-blue-200">
                            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action spéciale selon l'étape */}
                  {currentStepData.action && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-green-900 dark:text-green-300 mb-1">
                            Action recommandée
                          </h4>
                          <p className="text-xs text-green-700 dark:text-green-400">
                            {currentStepData.action.type === 'navigate' 
                              ? 'Cliquez pour accéder à cette fonctionnalité'
                              : 'Suivez les instructions pour continuer'
                            }
                          </p>
                        </div>
                        <Button
                          onClick={handleActionClick}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Essayer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation et progression - Côté droit */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-8 flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">
                    📚 Progression du tutoriel
                  </h3>
                  
                  {/* Liste des étapes */}
                  <div className="space-y-3 mb-8 max-h-80 overflow-y-auto">
                    {tutorialSteps.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => handleStepClick(index)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                          index === currentStep
                            ? `bg-gradient-to-r ${step.color} text-white shadow-lg transform scale-105`
                            : completedSteps.has(index)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            index === currentStep
                              ? 'bg-white/20'
                              : completedSteps.has(index)
                              ? 'bg-green-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            {completedSteps.has(index) ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : (
                              <span className="text-sm font-bold text-white">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold leading-tight">
                              {step.title}
                            </div>
                            <div className="text-sm opacity-75 leading-tight mt-1">
                              {step.description}
                            </div>
                          </div>
                          {index === currentStep && (
                            <ChevronRight className="h-5 w-5 animate-pulse" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Statistiques de progression */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {completedSteps.size}/{tutorialSteps.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-4">
                        Étapes terminées
                      </div>
                      
                      {/* Barre de progression circulaire */}
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - (completedSteps.size / tutorialSteps.length))}`}
                            className="text-blue-500 transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {Math.round((completedSteps.size / tutorialSteps.length) * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Indicateur de lecture automatique */}
                      {isPlaying && currentStep < tutorialSteps.length - 1 && (
                        <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>Lecture automatique...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer avec navigation */}
            <div className="bg-gray-50 dark:bg-gray-800 px-8 py-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Précédent</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                  >
                    Passer le tutoriel
                  </Button>
                </div>

                <div className="flex items-center space-x-3">
                  {currentStep === tutorialSteps.length - 1 ? (
                    <Button
                      onClick={handleComplete}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Crown className="h-4 w-4" />
                      <span>Terminer le tutoriel</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextStep}
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <span>Suivant</span>
                      <ArrowRight className="h-4 w-4" />
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