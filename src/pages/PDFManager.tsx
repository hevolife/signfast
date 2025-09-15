import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { useForms } from '../hooks/useForms';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { DemoWarningBanner } from '../components/demo/DemoWarningBanner';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { 
  HardDrive, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  FileText,
  Calendar,
  User,
  Activity,
  Sparkles,
  Eye,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFResponse {
  id: string;
  form_id: string;
  data: Record<string, any>;
  created_at: string;
  form?: {
    id: string;
    title: string;
    user_id: string;
  };
  isDataLoaded?: boolean;
}

export const PDFManager: React.FC = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { forms } = useForms();
  const { isSubscribed, hasSecretCode } = useSubscription();
  const { savedPdfs: savedPdfsLimits } = useLimits();
  const [responses, setResponses] = useState<PDFResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'form' | 'size'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState<Set<string>>(new Set());
  const [loadedData, setLoadedData] = useState<Map<string, any>>(new Map());
  const product = stripeConfig.products[0];

  useEffect(() => {
    if (user && !isDemoMode) {
      fetchResponses();
    } else if (isDemoMode) {
      // En mode démo, simuler des données
      setResponses([]);
      setTotalCount(0);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [user, isDemoMode, currentPage]);

  // Précharger les données des réponses visibles de manière optimisée
  useEffect(() => {
    if (responses.length > 0 && !isDemoMode) {
      preloadVisibleResponsesData();
    }
  }, [responses, isDemoMode]);

  const preloadVisibleResponsesData = async () => {
    // Identifier les réponses visibles qui n'ont pas encore leurs données
    const visibleResponses = responses.filter(response => !response.isDataLoaded);
    
    if (visibleResponses.length === 0) return;

    console.log('⚡ Préchargement optimisé de', visibleResponses.length, 'réponses');
    
    // Charger par petits lots pour éviter la surcharge
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < visibleResponses.length; i += batchSize) {
      batches.push(visibleResponses.slice(i, i + batchSize));
    }

    // Traiter les lots séquentiellement avec délai minimal
    for (const batch of batches) {
      const batchPromises = batch.map(async (response) => {
        if (loadingQueue.has(response.id)) return;
        
        setLoadingQueue(prev => new Set(prev).add(response.id));
        
        try {
          const { data, error } = await supabase
            .from('responses')
            .select('data')
            .eq('id', response.id)
            .single();

          if (!error && data) {
            setLoadedData(prev => new Map(prev).set(response.id, data.data));
            
            // Marquer comme chargé
            setResponses(prev => prev.map(r => 
              r.id === response.id 
                ? { ...r, data: data.data, isDataLoaded: true }
                : r
            ));
          }
        } catch (error) {
          console.warn('Erreur préchargement réponse:', response.id, error);
        } finally {
          setLoadingQueue(prev => {
            const newSet = new Set(prev);
            newSet.delete(response.id);
            return newSet;
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Petit délai entre les lots pour éviter la surcharge
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const fetchResponses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('📄 Chargement réponses PDF pour userId:', user.id);
      
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('📄 Supabase non configuré');
        setResponses([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Récupérer d'abord les IDs des formulaires de l'utilisateur
      const { data: userForms, error: formsError } = await supabase
        .from('forms')
        .select('id, title')
        .eq('user_id', user.id);

      if (formsError || !userForms || userForms.length === 0) {
        console.log('📄 Aucun formulaire trouvé pour cet utilisateur');
        setResponses([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const formIds = userForms.map(form => form.id);
      console.log('📄 Formulaires trouvés:', formIds.length);

      // Compter le total des réponses
      const { count, error: countError } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('form_id', formIds);

      if (countError) {
        console.error('📄 Erreur comptage:', countError);
        setTotalCount(0);
      } else {
        setTotalCount(count || 0);
      }

      // Récupérer les réponses avec pagination (métadonnées seulement pour optimiser)
      const offset = (currentPage - 1) * itemsPerPage;
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('id, form_id, created_at, data')
        .in('form_id', formIds)
        .range(offset, offset + itemsPerPage - 1)
        .order('created_at', { ascending: false });

      if (responsesError) {
        console.error('📄 Erreur récupération réponses:', responsesError);
        setResponses([]);
        setLoading(false);
        return;
      }

      // Enrichir avec les informations des formulaires
      const enrichedResponses = (responsesData || []).map(response => {
        const form = userForms.find(f => f.id === response.form_id);
        return {
          ...response,
          data: response.data || {}, // Utiliser les données si disponibles
          isDataLoaded: !!response.data, // Marquer comme chargé si données présentes
          form: form ? {
            id: form.id,
            title: form.title,
            user_id: user.id,
          } : undefined,
        };
      });

      console.log('📄 Réponses enrichies:', enrichedResponses.length);
      setResponses(enrichedResponses);
      
    } catch (error) {
      console.error('📄 Erreur générale fetchResponses:', error);
      setResponses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données d'une réponse spécifique de manière optimisée
  const loadResponseData = async (responseId: string) => {
    // Vérifier si déjà en cache
    if (loadedData.has(responseId)) {
      return loadedData.get(responseId);
    }

    // Vérifier si déjà en cours de chargement
    if (loadingQueue.has(responseId)) {
      // Attendre que le chargement en cours se termine
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (loadedData.has(responseId)) {
            resolve(loadedData.get(responseId));
          } else if (!loadingQueue.has(responseId)) {
            resolve(null);
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }

    setLoadingQueue(prev => new Set(prev).add(responseId));

    try {
      const { data, error } = await supabase
        .from('responses')
        .select('data')
        .eq('id', responseId)
        .single();

      if (error) {
        console.error('Erreur chargement données réponse:', error);
        return null;
      }

      // Mettre en cache
      setLoadedData(prev => new Map(prev).set(responseId, data.data));
      
      // Mettre à jour la réponse
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { ...response, data: data.data, isDataLoaded: true }
          : response
      ));

      return data.data;
    } catch (error) {
      console.error('Erreur loadResponseData:', error);
      return null;
    } finally {
      setLoadingQueue(prev => {
        const newSet = new Set(prev);
        newSet.delete(responseId);
        return newSet;
      });
    }
  };

  const generatePDF = async (response: PDFResponse) => {
    if (!response.form) {
      toast.error('Formulaire non trouvé pour cette réponse');
      return;
    }

    // Utiliser les données en cache ou les charger rapidement
    let responseData = loadedData.get(response.id) || response.data;
    
    if (!responseData || Object.keys(responseData).length === 0) {
      console.log('📄 Chargement express données pour PDF...');
      responseData = await loadResponseData(response.id);
      if (!responseData) {
        toast.error('Impossible de charger les données de la réponse');
        return;
      }
    }

    setGeneratingPdf(response.id);

    try {
      toast.loading('📄 Génération du PDF en cours...', { duration: 10000 });

      // Importer jsPDF dynamiquement
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // En-tête du PDF
      doc.setFontSize(18);
      doc.text(response.form.title, 20, 20);

      // Informations générales
      doc.setFontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
      doc.text(`Réponse du: ${formatDateTimeFR(response.created_at)}`, 20, 35);

      // Données du formulaire
      let yPosition = 50;
      doc.setFontSize(12);

      Object.entries(responseData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && !value.startsWith('data:image')) {
          const text = `${key}: ${value}`;
          
          // Gérer le retour à la ligne si le texte est trop long
          const splitText = doc.splitTextToSize(text, 170);
          doc.text(splitText, 20, yPosition);
          yPosition += splitText.length * 5;
          
          // Nouvelle page si nécessaire
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
        }
      });

      // Télécharger le PDF
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${response.form.title}_${response.id.slice(-8)}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('📄 PDF généré et téléchargé avec succès !');

    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      toast.dismiss();
      toast.error('❌ Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Précharger intelligemment les données au scroll
  const handleScroll = React.useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Si on approche du bas (80%), précharger plus de données
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      const unloadedResponses = responses.filter(r => !r.isDataLoaded).slice(0, 3);
      unloadedResponses.forEach(response => {
        if (!loadingQueue.has(response.id)) {
          loadResponseData(response.id);
        }
      });
    }
  }, [responses, loadingQueue]);

  // Ajouter l'écouteur de scroll
  useEffect(() => {
    const container = document.querySelector('.pdf-manager-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const deleteResponse = async (responseId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?')) {
      return;
    }

    setDeletingResponse(responseId);

    try {
      const { error } = await supabase
        .from('responses')
        .delete()
        .eq('id', responseId);

      if (error) {
        console.error('❌ Erreur suppression réponse:', error);
        toast.error('Erreur lors de la suppression');
        return;
      }

      // Recharger les données
      await fetchResponses();
      toast.success('✅ Réponse supprimée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur générale suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingResponse(null);
    }
  };

  // Optimisation: Nettoyer le cache quand on change de page
  useEffect(() => {
    return () => {
      setLoadedData(new Map());
      setLoadingQueue(new Set());
    };
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      response.form?.title?.toLowerCase().includes(searchLower) ||
      response.id.toLowerCase().includes(searchLower) ||
      Object.values(loadedData.get(response.id) || response.data || {}).some(value => 
        String(value).toLowerCase().includes(searchLower)
      )
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'form':
        return (a.form?.title || '').localeCompare(b.form?.title || '');
      case 'size':
        const aSize = JSON.stringify(a.data || {}).length;
        const bSize = JSON.stringify(b.data || {}).length;
        return bSize - aSize;
      default:
        return 0;
    }
  });

  return (
    <div className="pdf-manager-container min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <HardDrive className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Génération PDF
                {isSubscribed && (
                  <span className="block text-lg sm:text-xl text-white/90 font-medium mt-2">
                    {product.name} • Illimité
                  </span>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                {isSubscribed 
                  ? `Générez des PDFs illimités depuis vos réponses avec ${product.name}`
                  : 'Générez des PDFs depuis les réponses de vos formulaires'
                }
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} réponse{totalCount > 1 ? 's' : ''} disponible{totalCount > 1 ? 's' : ''}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchResponses}
                  className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  title="Actualiser la liste"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline ml-2">Actualiser</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Banners d'alerte */}
        <div className="mb-8">
          <SubscriptionBanner />
          <DemoWarningBanner />
        </div>
        
        {/* Filtres et recherche */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par formulaire, ID ou contenu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline font-semibold">Trier par:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'form' | 'size')}
                  className="appearance-none bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-all backdrop-blur-sm font-medium shadow-lg"
                >
                  <option value="date">📅 Plus récent</option>
                  <option value="form">📝 Par formulaire</option>
                  <option value="size">📊 Par taille</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Skeleton cards optimisées */}
            {Array.from({ length: 6 }, (_, i) => (
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
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3"></div>
                    <div className="flex gap-2 mt-4">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl mb-6 shadow-lg">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {isDemoMode ? 'Mode démo activé' : 'Aucune réponse trouvée'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {isDemoMode 
                ? 'Les fonctionnalités PDF sont désactivées en mode démo. Connectez-vous pour accéder à vos données.'
                : searchTerm 
                  ? 'Aucune réponse ne correspond à votre recherche. Essayez avec d\'autres termes.'
                  : 'Vos réponses de formulaires apparaîtront ici une fois que vous en aurez reçu.'
              }
            </p>
            {!isDemoMode && (
              <Link to="/forms">
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Voir mes formulaires
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredResponses.map((response, index) => {
              const isLocked = !isSubscribed && !hasSecretCode && index >= savedPdfsLimits.max && savedPdfsLimits.max !== Infinity;
              
              return (
                <Card key={response.id} className={`group relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${isLocked ? 'opacity-75' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                          {response.form?.title || 'Formulaire supprimé'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Réponse #{response.id.slice(-8)} • {formatDateTimeFR(response.created_at)}
                        </p>
                      </div>
                      {/* Indicateur de chargement des données */}
                      {loadingQueue.has(response.id) && (
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>

                    {/* Aperçu des données */}
                    {(() => {
                      const responseData = loadedData.get(response.id) || response.data || {};
                      const hasData = Object.keys(responseData).length > 0;
                      
                      return (
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-4 rounded-xl shadow-inner mb-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-2">
                            📋 Données de la réponse
                          </div>
                          {hasData ? (
                            <div className="space-y-1">
                              {Object.entries(responseData).slice(0, 3).map(([key, value]) => {
                                if (typeof value === 'string' && value.startsWith('data:image')) {
                                  return (
                                    <div key={key} className="text-xs text-gray-500">
                                      <span className="font-medium">{key}:</span> [Image - {Math.round(value.length / 1024)}KB]
                                    </div>
                                  );
                                }
                                return (
                                  <div key={key} className="text-xs text-gray-500">
                                    <span className="font-medium">{key}:</span> {String(value).substring(0, 50)}{String(value).length > 50 ? '...' : ''}
                                  </div>
                                );
                              })}
                              {Object.keys(responseData).length > 3 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  +{Object.keys(responseData).length - 3} autres champs...
                                </div>
                              )}
                            </div>
                          ) : loadingQueue.has(response.id) ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Chargement des données...
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 italic">
                              Cliquez sur "Générer PDF" pour charger les données
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => generatePDF(response)}
                        disabled={generatingPdf === response.id}
                        className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {generatingPdf === response.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Génération...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>Générer PDF</span>
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => deleteResponse(response.id)}
                        disabled={deletingResponse === response.id}
                        className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        title="Supprimer la réponse"
                      >
                        {deletingResponse === response.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} réponses
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
      </div>
    </div>
  );
};