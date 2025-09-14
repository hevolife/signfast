import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PDFService } from '../services/pdfService';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { useLimits } from '../hooks/useLimits';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../components/subscription/LimitReachedModal';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { FileText, Download, Trash2, Search, Calendar, HardDrive, RefreshCw, Lock, Crown, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface SavedPDF {
  fileName: string;
  responseId: string;
  templateName: string;
  formTitle: string;
  createdAt: string;
  size: number;
}

export const PDFManager: React.FC = () => {
  const [pdfs, setPdfs] = useState<SavedPDF[]>([]);
  const [loading, setLoading] = useState(false);
  const { isSubscribed } = useSubscription();
  const { savedPdfs: savedPdfsLimits, refreshLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'template'>('date');
  const product = stripeConfig.products[0];

  // Charger les PDFs au montage avec optimisation
  useEffect(() => {
    // Chargement immédiat sans délai
    loadPDFs();
  }, []);
  const loadPDFs = async () => {
    setLoading(true);
    
    try {
      // Chargement optimisé avec plus d'éléments et cache
      const { pdfs: pdfList } = await PDFService.listPDFs(1, 100); // Charger plus d'éléments d'un coup
      setPdfs(pdfList);
    } catch (error) {
      console.error('💾 Erreur chargement PDFs:', error);
      toast.error('Erreur lors du chargement des PDFs');
      setPdfs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (pdf: SavedPDF) => {
    try {
      toast.loading('📄 Génération et téléchargement du PDF en cours...', {
        duration: 10000, // 10 secondes max
      });
      
      const success = await PDFService.generateAndDownloadPDF(pdf.fileName);
      
      toast.dismiss(); // Fermer le toast de loading
      
      if (success) {
        toast.success('📄 PDF généré et téléchargé avec succès !');
      } else {
        toast.error('❌ Erreur lors de la génération du PDF. Vérifiez que toutes les données sont disponibles.');
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.dismiss();
      toast.error('❌ Erreur lors de la génération du PDF');
    }
  };

  const handleDelete = async (pdf: SavedPDF) => {
    // Vérifier si on peut supprimer (toujours autorisé pour libérer de l'espace)
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le PDF "${pdf.fileName}" ?`)) {
      try {
        console.log('🗑️ Début suppression PDF:', pdf.fileName);
        const success = await PDFService.deletePDF(pdf.fileName);
        if (success) {
          setPdfs(prev => prev.filter(p => p.fileName !== pdf.fileName));
          refreshLimits(); // Rafraîchir les limites après suppression
          toast.success('✅ PDF et données supprimés avec succès');
          console.log('✅ PDF supprimé avec succès:', pdf.fileName);
        } else {
          toast.error('❌ Erreur lors de la suppression du PDF');
          console.error('❌ Échec suppression PDF:', pdf.fileName);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast.error('❌ Erreur lors de la suppression du PDF');
      }
    }
  };

  const clearAllPDFs = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer tous les ${pdfs.length} PDFs sauvegardés ?\n\nCette action est irréversible.`)) {
      const pdfCount = pdfs.length;
      console.log('🗑️ Début suppression massive:', pdfCount, 'PDFs');
      
      PDFService.clearAllPDFs()
        .then(() => {
          setPdfs([]);
          refreshLimits(); // Rafraîchir les limites après suppression
          toast.success(`✅ ${pdfCount} PDFs et données supprimés avec succès`);
          console.log('✅ Suppression massive réussie:', pdfCount, 'PDFs');
        })
        .catch((error) => {
          console.error('❌ Erreur suppression massive:', error);
          toast.error('❌ Erreur lors de la suppression massive');
          // Recharger la liste pour voir l'état réel
          loadPDFs();
        });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  const filteredAndSortedPDFs = pdfs
    .filter(pdf => 
      pdf.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pdf.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pdf.formTitle.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'template':
          return a.formTitle.localeCompare(b.formTitle);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Stockage
              {isSubscribed && (
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {product.name}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 hidden sm:block">
              {isSubscribed 
                ? `Stockage PDF illimité avec ${product.name} (synchronisés sur tous vos appareils)`
                : 'Gérez vos PDFs générés (synchronisés sur tous vos appareils)'
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
              <HardDrive className="h-4 w-4" />
              <span>{savedPdfsLimits.current}/{savedPdfsLimits.max === Infinity ? '∞' : savedPdfsLimits.max}</span>
            </div>
            <div className="flex items-center space-x-2 order-1 sm:order-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  loadPDFs();
                }}
                className="flex items-center space-x-1 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 sm:bg-transparent sm:text-gray-600 sm:hover:bg-gray-100 dark:sm:text-gray-400 dark:sm:hover:bg-gray-800"
                title="Actualiser la liste"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllPDFs}
                className="flex items-center space-x-1 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 sm:bg-transparent sm:text-red-600 sm:hover:text-red-700 sm:hover:bg-red-50 dark:sm:hover:bg-red-900/20"
                title="Supprimer tous les PDFs"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tout supprimer</span>
              </Button>
            </div>
          </div>
        </div>

        <SubscriptionBanner />
        
        {/* Filtres et recherche */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par nom de fichier ou template..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">Trier par:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'template')}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <option value="date">📅 Plus récent</option>
                    <option value="name">📝 Nom A-Z</option>
                    <option value="template">📄 Formulaire</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicateur de chargement des PDFs */}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Skeleton cards pendant le chargement */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedPDFs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Aucun PDF trouvé' : 'Aucun PDF sauvegardé'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les PDFs générés depuis les formulaires apparaîtront ici'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPDFs.map((pdf, index) => {
              // Un PDF est verrouillé seulement si l'utilisateur n'est pas abonné ET que l'index dépasse la limite
              const isLocked = !isSubscribed && index >= savedPdfsLimits.max && savedPdfsLimits.max !== Infinity;
              
              console.log('🔒 Vérification verrouillage PDF:', {
                index,
                isSubscribed,
                maxLimit: savedPdfsLimits.max,
                isLocked,
                pdfName: pdf.fileName
              });
              
              return (
              <Card key={pdf.fileName} hover className={`group relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-lg ${isLocked ? 'opacity-75 border-2 border-yellow-400' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/70 to-yellow-900/70 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center p-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full mb-3 shadow-lg">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">PDF verrouillé</h3>
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">💾</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
                          {pdf.formTitle}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400 line-clamp-2">
                          Template: {pdf.templateName}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900/30 dark:text-green-300">
                      {formatFileSize(pdf.size)}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Créé le {formatDateTimeFR(pdf.createdAt)}
                    </span>
                  </div>
                  
                  {/* Indicateur de statut PDF */}
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-4 flex items-center space-x-1">
                    <span>📋</span>
                    <span>Prêt à générer - Cliquez sur "Générer PDF"</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(pdf)}
                      className="flex-1 flex items-center space-x-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-all"
                      title="Générer et télécharger le PDF"
                      disabled={isLocked}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden lg:inline">Générer PDF</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pdf)}
                      className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-all"
                      title="Supprimer le PDF"
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
          limitType="savedPdfs"
          currentCount={savedPdfsLimits.current}
          maxCount={savedPdfsLimits.max}
        />
      </div>
    </div>
  );
};