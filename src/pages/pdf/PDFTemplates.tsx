import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePDFTemplates } from '../../hooks/usePDFTemplates';
import { useLimits } from '../../hooks/useLimits';
import { useSubscription } from '../../hooks/useSubscription';
import { SubscriptionBanner } from '../../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../../components/subscription/LimitReachedModal';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { stripeConfig } from '../../stripe-config';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Plus, FileText, Edit, Trash2, Download, Lock, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

export const PDFTemplates: React.FC = () => {
  const { templates, loading, refetch } = usePDFTemplates();
  const { isSubscribed } = useSubscription();
  const { pdfTemplates: templatesLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const product = stripeConfig.products[0];

  // Gérer le chargement initial
  React.useEffect(() => {
    if (!loading && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [loading, initialLoadDone]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le template "${name}" ?`)) {
      try {
        const success = await PDFTemplateService.deleteTemplate(id);
        if (success) {
          await refetch(); // Recharger la liste
          toast.success('Template supprimé avec succès');
        } else {
          toast.error('Erreur lors de la suppression');
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleCreateTemplate = () => {
    if (!templatesLimits.canCreate) {
      setShowLimitModal(true);
      return;
    }
    // Navigation handled by Link component
  };

  // Afficher le loading seulement au premier chargement et pas trop longtemps
  if (loading && !initialLoadDone) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des templates...</p>
          <p className="text-xs text-gray-500 mt-2">Si le chargement est trop long, la page s'affichera automatiquement</p>
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
              Templates
              {isSubscribed && (
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {product.name}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isSubscribed 
                ? `Créez des templates illimités avec ${product.name}`
                : 'Gérez vos templates PDF avec champs dynamiques'
              }
            </p>
            
            {/* Bloc limites atteintes */}
            <div className="mt-6">
              <SubscriptionBanner />
            </div>
            
            {/* Bouton nouveau template */}
            <div className="mt-6">
              {templatesLimits.canCreate ? (
                <Link to="/pdf/templates/new">
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Nouveau template</span>
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={handleCreateTemplate}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nouveau template</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Aucun template PDF
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Créez votre premier template PDF pour générer des documents automatiquement
              </p>
              {templatesLimits.canCreate ? (
                <Link to="/pdf/templates/new">
                  <Button>Créer mon premier template</Button>
                </Link>
              ) : (
                <Button onClick={handleCreateTemplate}>
                  Créer mon premier template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => {
              const isLocked = !isSubscribed && index >= templatesLimits.max;
              
              return (
              <Card key={template.id} hover className={`group relative ${isLocked ? 'opacity-75 border-2 border-yellow-400' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/70 to-yellow-900/70 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center p-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full mb-3 shadow-lg">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">Template verrouillé</h3>
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
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-300">
                      {template.fields.length} champs
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Créé le {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/pdf/templates/${template.id}/edit`} className="flex-1">
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
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center space-x-1 bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 [&>svg]:text-white"
                      title="Télécharger le template"
                      disabled={isLocked}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden lg:inline">Télécharger</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                      className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      title="Supprimer le template"
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
          limitType="pdfTemplates"
          currentCount={templatesLimits.current}
          maxCount={templatesLimits.max}
        />
      </div>
    </div>
  );
};