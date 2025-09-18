import React from 'react';
import { Link } from 'react-router-dom';
import { formatDateFR } from '../utils/dateFormatter';
import { useForms } from '../hooks/useForms';
import { useLimits } from '../hooks/useLimits';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../components/subscription/LimitReachedModal';
import { DemoWarningBanner } from '../components/demo/DemoWarningBanner';
import { useDemo } from '../contexts/DemoContext';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Plus, Eye, BarChart3, Edit, Trash2, ExternalLink, Lock, Crown, Sparkles, FileText as FileTextIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Activity } from 'lucide-react';
import { QrCode } from 'lucide-react';
import { QRCodeGenerator } from '../components/form/QRCodeGenerator';
import toast from 'react-hot-toast';

export const MyForms: React.FC = () => {
  const { forms, totalCount, loading, deleteForm, fetchPage } = useForms();
  const { isSubscribed, hasSecretCode } = useSubscription();
  const { forms: formsLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const { isDemoMode } = useDemo();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(10);
  const product = stripeConfig.products[0];
  const [showQRCode, setShowQRCode] = React.useState(false);
  const [selectedFormForQR, setSelectedFormForQR] = React.useState<{ id: string; title: string } | null>(null);

  const totalPages = Math.ceil(totalCount / itemsPerPage);


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPage(page, itemsPerPage);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le formulaire "${title}" ?`)) {
      const success = await deleteForm(id);
      if (success) {
        // Si on supprime le dernier formulaire d'une page, retourner à la page précédente
        if (forms.length === 1 && currentPage > 1) {
          handlePageChange(currentPage - 1);
        } else {
          // Sinon, recharger la page courante
          fetchPage(currentPage, itemsPerPage);
        }
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
    if (!isDemoMode && !formsLimits.canCreate) {
      setShowLimitModal(true);
      return;
    }
    
    if (isDemoMode && forms.length >= 3) {
      toast.error('Limite de 3 formulaires en mode démo. Créez un compte pour plus !');
      return;
    }
    // Navigation handled by Link component
  };

  const handleShowQRCode = (formId: string, formTitle: string) => {
    setSelectedFormForQR({ id: formId, title: formTitle });
    setShowQRCode(true);
  };

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
                <FileTextIcon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Mes Formulaires
                {isSubscribed && (
                  <span className="block text-lg sm:text-xl text-white/90 font-medium mt-2">
                    {product.name} • Illimité
                  </span>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                {isSubscribed 
                  ? `Créez et gérez vos formulaires illimités avec ${product.name}`
                  : 'Créez, gérez et analysez vos formulaires en toute simplicité'
                }
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} formulaire{totalCount > 1 ? 's' : ''} • Page {currentPage}/{totalPages}</span>
                </div>
              )}
              
              {/* Bouton d'action principal */}
              <div className="mt-8">
                {formsLimits.canCreate ? (
                  <Link to="/forms/new">
                    <Button className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                      <Plus className="h-5 w-5 mr-2" />
                      Nouveau formulaire
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={handleCreateForm}
                    className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nouveau formulaire
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Banners d'alerte */}
        <div className="mb-8">
          {isDemoMode && <DemoWarningBanner />}
          <SubscriptionBanner />
        </div>

        {forms.length === 0 ? (
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
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-3xl mb-6 shadow-xl">
                  <Plus className="h-8 w-8" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Aucun formulaire
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Créez votre premier formulaire pour commencer à collecter des réponses
              </p>
              {formsLimits.canCreate ? (
                <Link to="/forms/new">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                    <Plus className="h-5 w-5 mr-2" />
                    Créer mon premier formulaire
                  </Button>
                </Link>
              ) : (
                <Button onClick={handleCreateForm} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                  <Plus className="h-5 w-5 mr-2" />
                  Créer mon premier formulaire
                </Button>
              )}
              {isDemoMode && forms.length >= 3 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl border border-orange-200 dark:border-orange-800 shadow-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    💡 Limite de 3 formulaires en mode démo. Créez un compte gratuit pour plus !
                  </p>
                </div>
              )}
            </CardContent>
            </Card>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {forms.map((form, index) => {
              const isLocked = !isSubscribed && !hasSecretCode && index >= formsLimits.max && formsLimits.max !== Infinity;
              
              return (
              <Card key={form.id} className={`group relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${isLocked ? 'opacity-75' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/80 to-yellow-900/80 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="text-center p-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 text-orange-600 rounded-3xl mb-4 shadow-xl">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-3">Formulaire verrouillé</h3>
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
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-white text-lg">📝</span>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                          {form.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 font-medium">
                          {form.description || 'Aucune description'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 text-xs rounded-full font-bold shadow-lg ${
                      form.is_published
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    }`}>
                      {form.is_published ? 'Publié' : 'Brouillon'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1 rounded-full font-semibold shadow-sm dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300">
                      {form.fields?.length || 0} champs
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-semibold">
                      Créé le {formatDateFR(form.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/forms/${form.id}/edit`} className="flex-1">
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
                    
                    <Link to={`/forms/${form.id}/results`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center justify-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                        disabled={isLocked}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Stats</span>
                      </Button>
                    </Link>
                    
                    {form.is_published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyFormLink(form.id)}
                        className="flex items-center justify-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                        title="Copier le lien"
                        disabled={isLocked}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Lien</span>
                      </Button>
                    )}
                    
                    {form.is_published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowQRCode(form.id, form.title)}
                        className="flex items-center justify-center space-x-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                        title="Générer QR code"
                        disabled={isLocked}
                      >
                        <QrCode className="h-4 w-4" />
                        <span className="hidden sm:inline">QR</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(form.id, form.title)}
                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} formulaires
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
          limitType="forms"
          currentCount={formsLimits.current}
          maxCount={formsLimits.max}
        />
        
        {/* QR Code Modal */}
        {selectedFormForQR && (
          <QRCodeGenerator
            formId={selectedFormForQR.id}
            formTitle={selectedFormForQR.title}
            isOpen={showQRCode}
            onClose={() => {
              setShowQRCode(false);
              setSelectedFormForQR(null);
            }}
          />
        )}
      </div>
    </div>
  );
};