import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDateFR } from '../../utils/dateFormatter';
import { usePDFTemplates } from '../../hooks/usePDFTemplates';
import { useLimits } from '../../hooks/useLimits';
import { useSubscription } from '../../hooks/useSubscription';
import { SubscriptionBanner } from '../../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../../components/subscription/LimitReachedModal';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { stripeConfig } from '../../stripe-config';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Plus, FileText, Edit, Trash2, Download, Lock, Crown, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const PDFTemplates: React.FC = () => {
  const { templates, totalCount, totalPages, loading, fetchPage } = usePDFTemplates();
  const { isSubscribed } = useSubscription();
  const { pdfTemplates: templatesLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const product = stripeConfig.products[0];

  useEffect(() => {
    // Chargement immédiat de l'interface, puis des templates
    setInitialLoading(false);
    // Délai court pour permettre l'affichage de l'interface
    setTimeout(() => {
      // Le chargement des templates est déjà géré par le hook usePDFTemplates
    }, 100);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPage(page, itemsPerPage);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le template "${name}" ?`)) {
      try {
        const success = await PDFTemplateService.deleteTemplate(id);
        if (success) {
          // Si on supprime le dernier template d'une page, retourner à la page précédente
          if (templates.length === 1 && currentPage > 1) {
            handlePageChange(currentPage - 1);
          } else {
            // Sinon, recharger la page courante
            fetchPage(currentPage, itemsPerPage);
          }
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

  // Afficher le loading seulement pour le chargement initial très court
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initialisation...</p>
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
                : `Gérez vos templates PDF avec champs dynamiques`
              }
              {totalCount > 0 && (
                <span className="block text-sm text-gray-500 mt-1">
                  {totalCount} template{totalCount > 1 ? 's' : ''} au total • Page {currentPage} sur {totalPages}
                </span>
              )}
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
            
            {/* Indicateur de chargement des templates */}
            {loading && (
              <Card className="mt-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600 dark:text-gray-400">Chargement des templates...</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        {templates.length === 0 ? (
          loading ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chargement des templates...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Récupération de vos templates PDF en cours
                </p>
              </CardContent>
            </Card>
          ) : (
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
          )
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => {
              const isLocked = !isSubscribed && index >= templatesLimits.max;
              
              return (
              <Card key={template.id} hover className={`group relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-lg ${isLocked ? 'opacity-75 border-2 border-yellow-400' : ''}`}>
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
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">📄</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                          {template.name}
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-400 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded dark:bg-purple-900/30 dark:text-purple-300">
                      {template.fields.length} champs
                    </span>
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      Créé le {formatDateFR(template.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/pdf/templates/${template.id}/edit`} className="flex-1">
                      <Button
                        variant="ghost" 
                        size="sm" 
                        className="w-full flex items-center space-x-1 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 hover:from-orange-200 hover:to-red-200 dark:from-orange-900/30 dark:to-red-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-all"
                        disabled={isLocked}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden lg:inline">Modifier</span>
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center space-x-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-all"
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
                      className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-all"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} templates
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Précédent</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {/* Afficher les numéros de page */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "primary" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-1"
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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