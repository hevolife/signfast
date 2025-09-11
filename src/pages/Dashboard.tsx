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
  Activity
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { forms, loading: formsLoading } = useForms();
  const { templates, loading: templatesLoading } = usePDFTemplates();
  const { isSubscribed, hasSecretCode, secretCodeType } = useSubscription();
  const { forms: formsLimits, pdfTemplates: templatesLimits, savedPdfs: savedPdfsLimits } = useLimits();
  const product = stripeConfig.products[0];

  // Calculer les statistiques
  const totalResponses = forms.reduce((acc, form) => {
    // Simulation - dans un vrai cas, vous récupéreriez les vraies données
    return acc + Math.floor(Math.random() * 50);
  }, 0);

  const publishedForms = forms.filter(form => form.is_published).length;
  const draftForms = forms.filter(form => !form.is_published).length;

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

  if (formsLoading || templatesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

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
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    Formulaires
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {forms.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formsLimits.max === Infinity ? 'Illimité' : `${formsLimits.current}/${formsLimits.max}`}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates PDF */}
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    Templates PDF
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {templates.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {templatesLimits.max === Infinity ? 'Illimité' : `${templatesLimits.current}/${templatesLimits.max}`}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDFs Sauvegardés */}
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    PDFs Sauvegardés
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {savedPdfsLimits.current}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {savedPdfsLimits.max === Infinity ? 'Illimité' : `${savedPdfsLimits.current}/${savedPdfsLimits.max}`}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  <HardDrive className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Réponses Totales */}
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    Réponses Totales
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {totalResponses}
                  </p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% ce mois
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section principale avec graphiques et activité récente */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Graphique d'activité */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Activité de la semaine
                </h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64 flex items-end justify-between space-x-1 sm:space-x-2 px-2">
                {weeklyData.map((day, index) => (
                  <div key={day.day} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600 max-w-8 sm:max-w-12"
                      style={{ 
                        height: `${Math.max((day.responses / 25) * 160, 8)}px`,
                        minHeight: '8px'
                      }}
                    ></div>
                    <div className="mt-2 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{day.day}</div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{day.responses}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statut de l'abonnement */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Plan d'abonnement
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscribed ? (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {hasSecretCode ? 'Premium (Code Secret)' : product.name}
                    </span>
                  </div>
                  
                  {hasSecretCode && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <p className="text-sm text-purple-800 dark:text-purple-300">
                        🎉 {secretCodeType === 'lifetime' ? 'Accès à vie activé !' : 'Accès mensuel via code secret'}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Formulaires</span>
                      <span className="text-green-600 font-medium">Illimité</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Templates PDF</span>
                      <span className="text-green-600 font-medium">Illimité</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Stockage PDF</span>
                      <span className="text-green-600 font-medium">Illimité</span>
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
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Plan Gratuit
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Formulaires</span>
                      <span className="text-orange-600 font-medium">{formsLimits.current}/{formsLimits.max}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Templates PDF</span>
                      <span className="text-orange-600 font-medium">{templatesLimits.current}/{templatesLimits.max}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">PDFs sauvegardés</span>
                      <span className="text-orange-600 font-medium">{savedPdfsLimits.current}/{savedPdfsLimits.max}</span>
                    </div>
                  </div>
                  
                  <Link to="/subscription" className="block mt-4">
                    <Button className="w-full" size="sm">
                      Passer Pro - {product.price}€/mois
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/forms/new">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-4">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Nouveau Formulaire
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Créer un nouveau formulaire
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/pdf/templates/new">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-full mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Template PDF
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Créer un template PDF
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/forms">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-4">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Mes Formulaires
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gérer mes formulaires
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/pdf/manager">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full mb-4">
                  <HardDrive className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  PDFs Sauvegardés
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Voir mes PDFs
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Formulaires récents */}
        {forms.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Formulaires récents
                </h3>
                <Link to="/forms" className="flex items-center space-x-1 text-blue-600 hover:text-blue-700">
                  <span className="text-sm">Voir tout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forms.slice(0, 5).map((form) => (
                  <div key={form.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        form.is_published ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {form.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {form.fields?.length || 0} champs • {form.is_published ? 'Publié' : 'Brouillon'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {new Date(form.created_at).toLocaleDateString()}
                      </span>
                      <Link to={`/forms/${form.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Modifier
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};