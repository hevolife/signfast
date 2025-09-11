import React from 'react';
import { Link } from 'react-router-dom';
import { useForms } from '../hooks/useForms';
import { useLimits } from '../hooks/useLimits';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../components/subscription/LimitReachedModal';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Plus, Eye, BarChart3, Edit, Trash2, ExternalLink, Lock, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

export const MyForms: React.FC = () => {
  const { forms, loading, deleteForm } = useForms();
  const { isSubscribed } = useSubscription();
  const { forms: formsLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const product = stripeConfig.products[0];

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le formulaire "${title}" ?`)) {
      const success = await deleteForm(id);
      if (success) {
        toast.success('Formulaire supprimé avec succès');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const copyFormLink = (id: string) => {
    const link = `${window.location.origin}/form/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié dans le presse-papiers !');
  };

  const handleCreateForm = () => {
    if (!formsLimits.canCreate) {
      setShowLimitModal(true);
      return;
    }
    // Navigation handled by Link component
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement de vos formulaires...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Mes Formulaires
              {isSubscribed && (
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {product.name}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isSubscribed 
                ? `Gérez et analysez vos formulaires illimités avec ${product.name}`
                : 'Gérez et analysez vos formulaires'
              }
            </p>
            
            {/* Bloc limites atteintes */}
            <div className="mt-6">
              <SubscriptionBanner />
            </div>
            
            {/* Bouton nouveau formulaire */}
            <div className="mt-6">
              {formsLimits.canCreate ? (
                <Link to="/forms/new">
                  <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4" />
                    <span>Nouveau formulaire</span>
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={handleCreateForm}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouveau formulaire</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {forms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-6">
                  <Plus className="h-8 w-8" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Aucun formulaire
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Créez votre premier formulaire pour commencer à collecter des réponses
              </p>
              {formsLimits.canCreate ? (
                <Link to="/forms/new">
                  <Button>Créer mon premier formulaire</Button>
                </Link>
              ) : (
                <Button onClick={handleCreateForm}>
                  Créer mon premier formulaire
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form, index) => {
              const isLocked = !isSubscribed && index >= formsLimits.max;
              
              return (
              <Card key={form.id} hover className={`group relative ${isLocked ? 'opacity-75 border-2 border-yellow-400' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/70 to-yellow-900/70 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center p-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full mb-3 shadow-lg">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">Formulaire verrouillé</h3>
                      <p className="text-orange-100 text-sm mb-3">
                        Passez à {product.name} pour débloquer
                      </p>
                      <Link to="/subscription">
                        <Button size="sm" className="flex items-center justify-center space-x-1 bg-orange-500 hover:bg-orange-600 text-white shadow-lg mx-auto">
                          <Crown className="h-4 w-4" />
                         <span>Passer Pro</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {form.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {form.description || 'Aucune description'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      form.is_published
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {form.is_published ? 'Publié' : 'Brouillon'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-300">
                      {form.fields?.length || 0} champs
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Créé le {new Date(form.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/forms/${form.id}/edit`} className="flex-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full flex items-center space-x-1 bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:text-white dark:hover:bg-orange-700 [&>svg]:text-white"
                        disabled={isLocked}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden lg:inline">Modifier</span>
                      </Button>
                    </Link>
                    
                    <Link to={`/forms/${form.id}/results`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center space-x-1 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 [&>svg]:text-white"
                        disabled={isLocked}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden lg:inline">Stats</span>
                      </Button>
                    </Link>
                    
                    {form.is_published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyFormLink(form.id)}
                        className="flex items-center space-x-1 bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 [&>svg]:text-white"
                        title="Copier le lien"
                        disabled={isLocked}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden lg:inline">Lien</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(form.id, form.title)}
                      className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      title="Supprimer le formulaire"
                      disabled={isLocked}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
        
        <LimitReachedModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          limitType="forms"
          currentCount={formsLimits.current}
          maxCount={formsLimits.max}
        />
      </div>
    </div>
  );
};