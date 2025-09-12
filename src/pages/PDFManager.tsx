import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { FileText, Download, Trash2, Search, Calendar, HardDrive, RefreshCw, Lock, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

interface SavedPDF {
  fileName: string;
  responseId: string;
  templateName: string;
  formTitle: string;
  createdAt: string;
  size: number;
  formData: Record<string, any>;
}

export const PDFManager: React.FC = () => {
  const [pdfs, setPdfs] = useState<SavedPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSubscribed } = useSubscription();
  const { savedPdfs: savedPdfsLimits, refreshLimits } = useLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'template'>('date');
  const product = stripeConfig.products[0];


  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    setLoading(true);
    try {
      const pdfList = await PDFService.listPDFs();
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
      toast.loading('📄 Génération du PDF en cours...');
      
      const success = await PDFService.generateAndDownloadPDF(pdf.fileName);
      
      if (success) {
        toast.success('📄 PDF téléchargé avec succès');
      } else {
        toast.error('❌ Erreur lors de la génération du PDF');
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('❌ Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (pdf: SavedPDF) => {
    // Vérifier si on peut supprimer (toujours autorisé pour libérer de l'espace)
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le PDF "${pdf.fileName}" ?`)) {
      try {
        const success = await PDFService.deletePDF(pdf.fileName);
        if (success) {
          setPdfs(prev => prev.filter(p => p.fileName !== pdf.fileName));
          refreshLimits(); // Rafraîchir les limites après suppression
          toast.success('PDF supprimé avec succès');
        } else {
          toast.error('Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const clearAllPDFs = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer tous les ${pdfs.length} PDFs sauvegardés ?\n\nCette action est irréversible.`)) {
      PDFService.clearAllPDFs();
      setPdfs([]);
      refreshLimits(); // Rafraîchir les limites après suppression
      toast.success(`${pdfs.length} PDFs supprimés avec succès`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDisplayName = (formData: Record<string, any>): string | null => {
    if (!formData) return null;
    
    // Rechercher différentes variations de nom/prénom
    const nom = formData.nom || formData.Nom || formData.lastname || formData.last_name || 
                formData['Nom de famille'] || formData['nom de famille'] || formData.surname;
    
    const prenom = formData.prenom || formData.prénom || formData.firstname || formData.first_name || 
                   formData['Prénom'] || formData['prénom'] || formData.givenname || formData['given name'];
    
    // Rechercher d'autres champs qui pourraient contenir un nom
    const nomComplet = formData['nom complet'] || formData['Nom complet'] || formData['full name'] || 
                       formData.fullname || formData['nom_complet'];
    
    const nomUtilisateur = formData.username || formData['nom utilisateur'] || formData.login;
    
    // Priorité d'affichage
    if (prenom && nom) return `${prenom} ${nom}`;
    if (nomComplet) return nomComplet;
    if (nom) return nom;
    if (prenom) return prenom;
    if (nomUtilisateur) return nomUtilisateur;
    
    // Rechercher tout champ contenant "nom" dans la clé
    const nomFields = Object.entries(formData).find(([key, value]) => 
      key.toLowerCase().includes('nom') && 
      typeof value === 'string' && 
      value.trim().length > 0 &&
      !key.startsWith('_') // Éviter les champs techniques
    );
    
    if (nomFields) return nomFields[1] as string;
    
    // Rechercher tout champ contenant "prénom" dans la clé
    const prenomFields = Object.entries(formData).find(([key, value]) => 
      key.toLowerCase().includes('prénom') && 
      typeof value === 'string' && 
      value.trim().length > 0 &&
      !key.startsWith('_')
    );
    
    if (prenomFields) return prenomFields[1] as string;
    
    return null;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des PDFs...</p>
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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <HardDrive className="h-4 w-4" />
              <span>{savedPdfsLimits.current}/{savedPdfsLimits.max === Infinity ? '∞' : savedPdfsLimits.max}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadPDFs()}
                className="flex items-center space-x-1 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 sm:bg-transparent sm:text-gray-600 sm:hover:bg-gray-100 dark:sm:text-gray-400 dark:sm:hover:bg-gray-800"
                title="Actualiser la liste"
              >
                <RefreshCw className="h-4 w-4" />
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

        {filteredAndSortedPDFs.length === 0 ? (
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
              <Card key={pdf.fileName} hover className={`group relative ${isLocked ? 'opacity-75 border-2 border-yellow-400' : ''}`}>
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
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {getDisplayName(pdf.formData) || `Document ${pdf.formTitle}`}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {getDisplayName(pdf.formData) ? `Formulaire: ${pdf.formTitle}` : `Template: ${pdf.templateName}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(pdf)}
                        className="bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 [&>svg]:text-white"
                        title="Télécharger le PDF"
                        disabled={isLocked}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pdf)}
                        className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                        title="Supprimer le PDF"
                        disabled={isLocked}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {formatDateTimeFR(pdf.createdAt)}
                      </span>
                    </div>
                    
                    {/* Afficher les données détectées pour debug */}
                    {getDisplayName(pdf.formData) && (
                      <div className="text-xs text-green-600 dark:text-green-400 truncate">
                        👤 Identité détectée: {getDisplayName(pdf.formData)}
                      </div>
                    )}
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