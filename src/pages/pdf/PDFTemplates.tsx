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
import { Plus, FileText, Edit, Trash2, Download, Lock, Crown, ArrowLeft, ArrowRight, Sparkles, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export const PDFTemplates: React.FC = () => {
  const { templates, totalCount, totalPages, loading, fetchPage } = usePDFTemplates();
  const { isSubscribed } = useSubscription();
  const { pdfTemplates: templatesLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const product = stripeConfig.products[0];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Templates PDF
                {isSubscribed && (
                  <span className="block text-lg sm:text-xl text-white/90 font-medium mt-2">
                    {product.name} • Illimité
                  </span>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                {isSubscribed 
                  ? `Créez des templates PDF illimités avec ${product.name}`
                  : 'Créez des templates PDF avec champs dynamiques et positionnement précis'
                }
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} template{totalCount > 1 ? 's' : ''} • Page {currentPage}/{totalPages}</span>
                </div>
              )}
              
              {/* Bouton d'action principal */}
              <div className="mt-8">
                {templatesLimits.canCreate ? (
                  <Link to="/pdf/templates/new">
                    <Button className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                      <Plus className="h-5 w-5 mr-2" />
                      Nouveau template
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={handleCreateTemplate}
                    className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nouveau template
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Banners d'alerte */}
        <div className="mb-8">
          <SubscriptionBanner />
        </div>

        {templates.length === 0 ? (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Skeleton cards pendant le chargement */}
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse bg-white/60 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="text-center py-16">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-3xl mb-6 shadow-xl">
                    <FileText className="h-10 w-10" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Aucun template PDF
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Créez votre premier template PDF pour générer des documents automatiquement
                </p>
                {templatesLimits.canCreate ? (
                  <Link to="/pdf/templates/new">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                      <Plus className="h-5 w-5 mr-2" />
                      Créer mon premier template
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={handleCreateTemplate} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                    <Plus className="h-5 w-5 mr-2" />
                    Créer mon premier template
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.map((template, index) => {
              const isLocked = !isSubscribed && index >= templatesLimits.max;
              
              return (
              <Card key={template.id} className={`group relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${isLocked ? 'opacity-75' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/80 to-yellow-900/80 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="text-center p-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 text-orange-600 rounded-3xl mb-4 shadow-xl">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-3">Template verrouillé</h3>
                      <p className="text-orange-100 text-sm mb-4 font-medium">
                        Passez à {product.name} pour débloquer
                      </p>
                      <Link to="/subscription">
                        <Button size="sm" className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 mx-auto font-bold">
                          <Crown className="h-4 w-4" />
                         <span>Passer Pro</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-white text-lg">📄</span>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 font-medium">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-3 py-1 rounded-full font-semibold shadow-sm dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300">
                      {template.fields.length} champs
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-semibold">
                      Créé le {formatDateFR(template.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/pdf/templates/${template.id}/edit`} className="flex-1">
                      <Button
                        variant="ghost" 
                        size="sm" 
                        className="w-full flex items-center justify-center space-x-1 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                        disabled={isLocked}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Modifier</span>
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center justify-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                      title="Télécharger le template"
                      disabled={isLocked}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Télécharger</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
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
          <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} templates
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
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
                          variant={currentPage === pageNum ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 p-0 rounded-xl font-bold ${currentPage === pageNum ? 'shadow-lg' : 'bg-gray-100 dark:bg-gray-800'}`}
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
                    className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
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