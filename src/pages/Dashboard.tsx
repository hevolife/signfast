import React from 'react';
import { Link } from 'react-router-dom';
import { useForms } from '../hooks/useForms';
import { useLimits } from '../hooks/useLimits';
import { useSubscription } from '../hooks/useSubscription';
import { usePDFTemplates } from '../hooks/usePDFTemplates';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
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
  ArrowLeft
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { forms, totalCount: totalForms, loading: formsLoading, fetchPage } = useForms();
  const { templates, loading: templatesLoading } = usePDFTemplates();
  const { isSubscribed, hasSecretCode, secretCodeType } = useSubscription();
  const { forms: formsLimits, pdfTemplates: templatesLimits, savedPdfs: savedPdfsLimits } = useLimits();
  const [recentFormsPage, setRecentFormsPage] = React.useState(1);
  const [recentFormsLoading, setRecentFormsLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const product = stripeConfig.products[0];

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
  const totalResponses = totalForms * 8; // Estimation basée sur le nombre total de formulaires
  const displayedResponses = forms.reduce((acc, form) => {
    // Simulation - dans un vrai cas, vous récupéreriez les vraies données
    return acc + Math.floor(Math.random() * 50);
  }, 0);

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
    { day: 'Lun', responses: 12 },
    { day: 'Mar', responses: 19 },
    { day: 'Mer', responses: 8 },
    { day: 'Jeu', responses: 25 },
    { day: 'Ven', responses: 15 },
    { day: 'Sam', responses: 7 },
    { day: 'Dim', responses: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête du dashboard */}
        <div className="text-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard SignFast
              {isSubscribed && (
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <Crown className="h-4 w-4 mr-1" />
                  {hasSecretCode ? 'Premium (Code Secret)' : product.name}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Vue d'ensemble de votre activité SignFast
            </p>
            
            {/* Bloc limites atteintes */}
            <div className="mt-6">
              <SubscriptionBanner />
            </div>
          </div>
        </div>

        {/* Cartes de statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Formulaires */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Formulaires
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                    {forms.length}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {formsLimits.max === Infinity ? 'Illimité' : `${formsLimits.current}/${formsLimits.max}`}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates PDF */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Templates PDF
                  </p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                    {templates.length}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {templatesLimits.max === Infinity ? 'Illimité' : `${templatesLimits.current}/${templatesLimits.max}`}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDFs Sauvegardés */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    PDFs Sauvegardés
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                    {savedPdfsLimits.current}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {savedPdfsLimits.max === Infinity ? 'Illimité' : `${savedPdfsLimits.current}/${savedPdfsLimits.max}`}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <HardDrive className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Réponses Totales */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    Réponses Totales
                  </p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                    {displayedResponses}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% ce mois
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section principale avec graphiques et activité récente */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Graphique d'activité */}
          <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Activité de la semaine
                </h3>
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-2 px-2">
                {weeklyData.map((day, index) => (
                  <div key={day.day} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500 max-w-12 shadow-sm"
                      style={{ 
                        height: `${Math.max((day.responses / 25) * 160, 8)}px`,
                        minHeight: '8px'
                      }}
                    ></div>
                    <div className="mt-2 text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{day.day}</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{day.responses}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statut de l'abonnement */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Plan d'abonnement
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscribed ? (
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                      {hasSecretCode ? 'Premium (Code Secret)' : product.name}
                    </span>
                  </div>
                  
                  {hasSecretCode && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Gift className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-purple-900 dark:text-purple-300">Code Secret Actif</span>
                      </div>
                      <p className="text-sm text-purple-800 dark:text-purple-300">
                        🎉 {secretCodeType === 'lifetime' ? 'Accès à vie activé !' : 'Accès mensuel via code secret'}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Formulaires</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">Illimité</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Templates PDF</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">Illimité</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Stockage PDF</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">Illimité</span>
                    </div>
                  </div>
                  
                  {!hasSecretCode && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link to="/subscription">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Gérer l'abonnement
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                      Plan Gratuit
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Formulaires</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {formsLimits.current}/{formsLimits.max}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Templates PDF</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {templatesLimits.current}/{templatesLimits.max}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">PDFs sauvegardés</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {savedPdfsLimits.current}/{savedPdfsLimits.max}
                      </span>
                    </div>
                  </div>
                  
                  <Link to="/subscription" className="block mt-4">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <Link to="/forms/new">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 text-lg">
                  Nouveau Formulaire
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Créer un nouveau formulaire
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <Link to="/pdf/templates/new">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-2 text-lg">
                  Template PDF
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  Créer un template PDF
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <Link to="/forms">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-green-900 dark:text-green-300 mb-2 text-lg">
                  Formulaires
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Gérer mes formulaires
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <Link to="/pdf/manager">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <HardDrive className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-orange-900 dark:text-orange-300 mb-2 text-lg">
                  Stockage
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Voir mes PDFs
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Formulaires récents */}
        {totalForms > 0 && (
          <Card className="mt-8 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Formulaires récents
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {recentFormsPage} sur {totalFormsPages} • {totalForms} formulaires au total
                  </p>
                </div>
                <Link to="/forms" className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium">
                  <span className="text-sm">Voir tout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentFormsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {forms.map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full shadow-sm ${
                            form.is_published ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {form.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {form.fields?.length || 0} champs • {form.is_published ? 'Publié' : 'Brouillon'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(form.created_at).toLocaleDateString()}
                          </span>
                          <Link to={`/forms/${form.id}/edit`}>
                            <Button variant="ghost" size="sm" className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800">
                              Modifier
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination pour formulaires récents */}
                  {totalFormsPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Formulaires {((recentFormsPage - 1) * 5) + 1} à {Math.min(recentFormsPage * 5, totalForms)} sur {totalForms}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadRecentFormsPage(recentFormsPage - 1)}
                          disabled={recentFormsPage === 1 || recentFormsLoading}
                          className="flex items-center space-x-1"
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
                                variant={recentFormsPage === pageNum ? "primary" : "ghost"}
                                size="sm"
                                onClick={() => loadRecentFormsPage(pageNum)}
                                disabled={recentFormsLoading}
                                className="w-8 h-8 p-0"
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
                          className="flex items-center space-x-1"
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