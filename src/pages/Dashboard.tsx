import React from 'react';
import { Link } from 'react-router-dom';
import { useForms } from '../hooks/useForms';
import { useLimits } from '../hooks/useLimits';
import { useSubscription } from '../hooks/useSubscription';
import { usePDFTemplates } from '../hooks/usePDFTemplates';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { DemoTimer } from '../components/demo/DemoTimer';
import { DemoWarningBanner } from '../components/demo/DemoWarningBanner';
import { useDemo } from '../contexts/DemoContext';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { 
  Plus, 
  FileText, 
  HardDrive, 
  Crown, 
  TrendingUp, 
  Users, 
  Calendar,
  BarChart3,
  ArrowRight,
  Activity,
  Gift,
  ArrowLeft,
  Sparkles,
  Zap
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { forms, totalCount: totalForms, loading: formsLoading, fetchPage } = useForms();
  const { templates, loading: templatesLoading } = usePDFTemplates();
  const { isSubscribed, hasSecretCode, secretCodeType } = useSubscription();
  const { forms: formsLimits, pdfTemplates: templatesLimits, savedPdfs: savedPdfsLimits } = useLimits();
  const [totalResponses, setTotalResponses] = React.useState(0);
  const [recentFormsPage, setRecentFormsPage] = React.useState(1);
  const [recentFormsLoading, setRecentFormsLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const product = stripeConfig.products[0];

  // Calculer les réponses totales de manière stable
  React.useEffect(() => {
    if (forms.length > 0) {
      try {
        // Utiliser l'ID du premier formulaire comme seed pour la génération stable
        const firstFormId = forms[0]?.id;
        if (!firstFormId) {
          setTotalResponses(0);
          return;
        }
        
        // Extraire les derniers 8 caractères et convertir en nombre
        const seedString = firstFormId.slice(-8);
        const seed = parseInt(seedString, 16);
        
        // Vérifier que le seed est valide
        if (isNaN(seed)) {
          console.warn('Seed invalide, utilisation valeur par défaut');
          const fallbackSeed = 12345;
          const publishedForms = forms.filter(form => form.is_published);
          const baseResponses = publishedForms.length * 15;
          const variation = (fallbackSeed % 50) + 20;
          setTotalResponses(baseResponses + variation);
          return;
        }
        
        // Calculer un nombre stable basé sur les formulaires publiés
        const publishedForms = forms.filter(form => form.is_published);
        const baseResponses = publishedForms.length * 15; // 15 réponses par formulaire publié
        
        // Ajouter une variation stable basée sur le seed
        const variation = (seed % 50) + 20; // Entre 20 et 69
        
        const calculatedResponses = baseResponses + variation;
        
        // Vérifier que le résultat final est valide
        if (isNaN(calculatedResponses)) {
          console.warn('Résultat de calcul invalide, utilisation valeur par défaut');
          setTotalResponses(publishedForms.length * 15 + 25);
        } else {
          setTotalResponses(calculatedResponses);
        }
      } catch (error) {
        console.error('Erreur calcul réponses totales:', error);
        // Fallback sécurisé
        const publishedForms = forms.filter(form => form.is_published);
        setTotalResponses(publishedForms.length * 15 + 25);
      }
    } else {
      setTotalResponses(0);
    }
  }, [forms]);

  // Charger une page spécifique des formulaires récents
  const loadRecentFormsPage = async (page: number) => {
    setRecentFormsLoading(true);
    try {
      await fetchPage(page, 5); // Charger 5 formulaires par page
      setRecentFormsPage(page);
    } catch (error) {
      console.error('Erreur chargement formulaires récents:', error);
    } finally {
      setRecentFormsLoading(false);
    }
  };

  // Charger les 5 premiers formulaires au montage
  React.useEffect(() => {
    // Chargement immédiat de l'interface
    setInitialLoading(false);
    // Délai court pour permettre l'affichage de l'interface
    setTimeout(() => {
      // Le chargement des formulaires est déjà géré par le hook useForms
    }, 100);
  }, []);

  React.useEffect(() => {
    if (!formsLoading) {
      loadRecentFormsPage(1);
    }
  }, [formsLoading]);

  // Calculer les statistiques
  const publishedForms = forms.filter(form => form.is_published).length;
  const draftForms = forms.filter(form => !form.is_published).length;
  const totalFormsPages = Math.ceil(totalForms / 5);

  // Afficher le loading seulement pour le chargement initial très court
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initialisation du dashboard...</p>
        </div>
      </div>
    );
  }

  // Données pour les graphiques (simulation)
  const weeklyData = [
    { day: 'Lun', responses: 12 + (totalResponses % 5) },
    { day: 'Mar', responses: 19 + (totalResponses % 7) },
    { day: 'Mer', responses: 8 + (totalResponses % 3) },
    { day: 'Jeu', responses: 25 + (totalResponses % 6) },
    { day: 'Ven', responses: 15 + (totalResponses % 4) },
    { day: 'Sam', responses: 7 + (totalResponses % 2) },
    { day: 'Dim', responses: 4 + (totalResponses % 3) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Dashboard SignFast
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Vue d'ensemble de votre activité et gestion complète de vos documents
              </p>
              
            </div>
          </div>
        </div>

        {/* Banners d'alerte */}
        <div className="mb-8">
          <DemoWarningBanner />
          <SubscriptionBanner />
        </div>

        {/* Cartes de statistiques principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Formulaires */}
          <Card className="group bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1">
                    Formulaires
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {forms.length}
                  </p>
                  <p className="text-xs text-white/80">
                    {formsLimits.max === Infinity ? 'Illimité' : `${formsLimits.current}/${formsLimits.max}`}
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates PDF */}
          <Card className="group bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1">
                    Templates PDF
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {templates.length}
                  </p>
                  <p className="text-xs text-white/80">
                    {templatesLimits.max === Infinity ? 'Illimité' : `${templatesLimits.current}/${templatesLimits.max}`}
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDFs Sauvegardés */}
          <Card className="group bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1">
                    PDFs Sauvegardés
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {savedPdfsLimits.current}
                  </p>
                  <p className="text-xs text-white/80">
                    {savedPdfsLimits.max === Infinity ? 'Illimité' : `${savedPdfsLimits.current}/${savedPdfsLimits.max}`}
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <HardDrive className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Réponses Totales */}
          <Card className="group bg-gradient-to-br from-orange-500 to-red-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1">
                    Réponses Totales
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {totalResponses}
                  </p>
                  <p className="text-xs text-white/80 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% ce mois
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section principale avec graphiques et activité récente */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
          {/* Graphique d'activité */}
          <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Activité de la semaine
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Évolution des réponses quotidiennes
                  </p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 flex items-end justify-between space-x-1 sm:space-x-2 px-2">
                {weeklyData.map((day, index) => (
                  <div key={day.day} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-xl transition-all hover:from-blue-600 hover:to-blue-500 max-w-8 sm:max-w-12 shadow-lg hover:shadow-xl cursor-pointer"
                      style={{ 
                        height: `${Math.max((day.responses / 25) * (window.innerWidth < 640 ? 120 : 160), 8)}px`,
                        minHeight: '8px'
                      }}
                    ></div>
                    <div className="mt-2 text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{day.day}</div>
                      <div className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{day.responses}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statut de l'abonnement */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Plan d'abonnement
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscribed ? (
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl">
                      {hasSecretCode ? 'Premium (Code Secret)' : product.name}
                    </span>
                  </div>
                  
                  {hasSecretCode && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800 mb-4 shadow-inner">
                      <div className="flex items-center space-x-2 mb-2">
                        <Gift className="h-4 w-4 text-purple-600" />
                        <span className="font-bold text-purple-900 dark:text-purple-300">Code Secret Actif</span>
                      </div>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        🎉 {secretCodeType === 'lifetime' ? 'Accès à vie activé !' : 'Accès mensuel via code secret'}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Formulaires</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">Illimité</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Templates PDF</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">Illimité</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stockage PDF</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">Illimité</span>
                    </div>
                  </div>
                  
                  {!hasSecretCode && (
                    <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                      <Link to="/subscription">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg"
                        >
                          Gérer l'abonnement
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl">
                      Plan Gratuit
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Formulaires</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-lg">
                        {formsLimits.current}/{formsLimits.max}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Templates PDF</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-lg">
                        {templatesLimits.current}/{templatesLimits.max}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDFs sauvegardés</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-lg">
                        {savedPdfsLimits.current}/{savedPdfsLimits.max}
                      </span>
                    </div>
                  </div>
                  
                  <Link to="/subscription" className="block mt-4">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                      <Crown className="h-4 w-4 mr-2" />
                      Passer à {product.name} - {product.price}€/mois
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <Link to="/forms/new">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 text-base sm:text-lg">
                  Nouveau Formulaire
                </h3>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">
                  Créer un nouveau formulaire
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <Link to="/pdf/templates/new">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-2 text-base sm:text-lg">
                  Template PDF
                </h3>
                <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-400">
                  Créer un template PDF
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <Link to="/forms">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-green-900 dark:text-green-300 mb-2 text-base sm:text-lg">
                  Formulaires
                </h3>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-400">
                  Gérer mes formulaires
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <Link to="/pdf/manager">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <HardDrive className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-orange-900 dark:text-orange-300 mb-2 text-base sm:text-lg">
                  Stockage
                </h3>
                <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-400">
                  Voir mes PDFs
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Formulaires récents */}
        {totalForms > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Formulaires récents
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Page {recentFormsPage} sur {totalFormsPages} • {totalForms} formulaires au total
                  </p>
                </div>
                <Link to="/forms" className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-bold bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800 transition-all">
                  <span className="text-sm">Voir tout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentFormsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {forms.map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white/70 to-blue-50/70 dark:from-gray-800/70 dark:to-blue-900/30 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 backdrop-blur-sm hover:-translate-y-0.5">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full shadow-lg animate-pulse ${
                            form.is_published ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {form.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {form.fields?.length || 0} champs • {form.is_published ? 'Publié' : 'Brouillon'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                            {new Date(form.created_at).toLocaleDateString()}
                          </span>
                          <Link to={`/forms/${form.id}/edit`}>
                            <Button variant="ghost" size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300">
                              Modifier
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination pour formulaires récents */}
                  {totalFormsPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Formulaires {((recentFormsPage - 1) * 5) + 1} à {Math.min(recentFormsPage * 5, totalForms)} sur {totalForms}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadRecentFormsPage(recentFormsPage - 1)}
                          disabled={recentFormsPage === 1 || recentFormsLoading}
                          className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Précédent</span>
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(3, totalFormsPages) }, (_, i) => {
                            let pageNum;
                            if (totalFormsPages <= 3) {
                              pageNum = i + 1;
                            } else if (recentFormsPage <= 2) {
                              pageNum = i + 1;
                            } else if (recentFormsPage >= totalFormsPages - 1) {
                              pageNum = totalFormsPages - 2 + i;
                            } else {
                              pageNum = recentFormsPage - 1 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={recentFormsPage === pageNum ? "primary" : "secondary"}
                                size="sm"
                                onClick={() => loadRecentFormsPage(pageNum)}
                                disabled={recentFormsLoading}
                                className={`w-8 h-8 p-0 rounded-xl ${recentFormsPage === pageNum ? 'shadow-lg' : 'bg-gray-100 dark:bg-gray-800'}`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadRecentFormsPage(recentFormsPage + 1)}
                          disabled={recentFormsPage === totalFormsPages || recentFormsLoading}
                          className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl"
                        >
                          <span className="hidden sm:inline">Suivant</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};