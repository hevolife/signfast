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
import { FileText, Download, Trash2, Search, Calendar, HardDrive, RefreshCw, Lock, Crown, ArrowLeft, ArrowRight, Sparkles, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

interface SavedPDF {
  fileName: string;
  responseId: string;
  templateName: string;
  formTitle: string;
  userName: string;
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
      pdf.formTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pdf.userName.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <HardDrive className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Stockage PDF
                {isSubscribed && (
                  <span className="block text-lg sm:text-xl text-white/90 font-medium mt-2">
                    {product.name} • Illimité
                  </span>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                {isSubscribed 
                  ? `Stockage PDF illimité avec ${product.name} • Synchronisé sur tous vos appareils`
                  : 'Gérez vos PDFs générés • Synchronisés sur tous vos appareils'
                }
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{savedPdfsLimits.current}/{savedPdfsLimits.max === Infinity ? '∞' : savedPdfsLimits.max} PDFs</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLoading(true);
                      loadPDFs();
                    }}
                    className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    title="Actualiser la liste"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline ml-2">Actualiser</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllPDFs}
                    className="bg-red-500/80 backdrop-blur-sm text-white border border-red-400/30 hover:bg-red-600/80 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    title="Supprimer tous les PDFs"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Tout supprimer</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banners d'alerte */}
        <div className="mb-8">
          <SubscriptionBanner />
        </div>
        
        {/* Filtres et recherche */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par nom, fichier ou template..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-green-500 rounded-xl font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline font-semibold">Trier par:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'template')}
                    className="appearance-none bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-all backdrop-blur-sm font-medium shadow-lg"
                  >
                    <option value="date">📅 Plus récent</option>
                    <option value="name">📝 Nom A-Z</option>
                    <option value="template">📄 Formulaire</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Skeleton cards pendant le chargement */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedPDFs.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-3xl mb-6 shadow-xl">
                <FileText className="h-10 w-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchTerm ? 'Aucun PDF trouvé' : 'Aucun PDF sauvegardé'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les PDFs générés depuis les formulaires apparaîtront ici'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <Card key={pdf.fileName} className={`group relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${isLocked ? 'opacity-75' : ''}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/80 to-yellow-900/80 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="text-center p-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 text-orange-600 rounded-3xl mb-4 shadow-xl">
                        <Lock className="h-6 w-6" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-3">PDF verrouillé</h3>
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-white text-lg">💾</span>
                      </div>
                      <div>
                        {pdf.userName ? (
                          <>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                              {pdf.userName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 font-medium">
                              {pdf.formTitle} • {pdf.templateName}
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                              {pdf.formTitle}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 font-medium">
                              Template: {pdf.templateName}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1 rounded-full font-semibold shadow-sm dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300">
                      {formatFileSize(pdf.size)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-semibold">
                      Créé le {formatDateTimeFR(pdf.createdAt)}
                    </span>
                  </div>
                  
                  {/* Indicateur de statut PDF */}
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-4 flex items-center space-x-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl font-medium">
                    <span>📋</span>
                    <span>Prêt à générer - Cliquez sur "Générer PDF"</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(pdf)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                      title="Générer et télécharger le PDF"
                      disabled={isLocked}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Générer PDF</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pdf)}
                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
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