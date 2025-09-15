import React, { useState, useEffect } from 'react';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { supabase } from '../lib/supabase';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { DemoWarningBanner } from '../components/demo/DemoWarningBanner';
import { useDemo } from '../contexts/DemoContext';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { 
  HardDrive, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  ArrowLeft,
  ArrowRight,
  FileText,
  Calendar,
  User,
  Activity,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFResponse {
  id: string;
  form_id: string;
  data: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  form?: {
    title: string;
  };
}

export const PDFManager: React.FC = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { isSubscribed, hasSecretCode } = useSubscription();
  const { savedPdfs: savedPdfsLimits } = useLimits();
  const [responses, setResponses] = useState<PDFResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingPdfCards, setLoadingPdfCards] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'form'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedResponseForDetails, setSelectedResponseForDetails] = useState<PDFResponse | null>(null);
  const [loadingResponseData, setLoadingResponseData] = useState(false);
  const product = stripeConfig.products[0];

  useEffect(() => {
    if (user && !isDemoMode) {
      fetchResponses();
    } else if (isDemoMode) {
      // En mode démo, simuler des données
      setLoadingPdfCards(true);
      setTimeout(() => {
        setResponses([]);
        setTotalCount(0);
        setLoadingPdfCards(false);
      }, 1000);
    } else {
      setLoadingPdfCards(false);
    }
  }, [user, isDemoMode, currentPage]);

  const fetchResponses = async () => {
    if (!user) return;

    setLoadingPdfCards(true);
    
    try {
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('Supabase non configuré, aucune donnée PDF');
        setResponses([]);
        setTotalCount(0);
        setLoadingPdfCards(false);
        return;
      }

      // Récupérer les IDs des formulaires de l'utilisateur
      const { data: userForms, error: formsError } = await supabase
        .from('forms')
        .select('id, title')
        .eq('user_id', user.id);

      if (formsError || !userForms || userForms.length === 0) {
        console.log('Aucun formulaire trouvé pour cet utilisateur');
        setResponses([]);
        setTotalCount(0);
        setLoadingPdfCards(false);
        return;
      }

      const formIds = userForms.map(form => form.id);
      const formsMap = new Map(userForms.map(form => [form.id, form]));

      // Compter le total des réponses
      const { count, error: countError } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('form_id', formIds);

      if (countError) {
        console.warn('Erreur comptage réponses:', countError);
        setTotalCount(0);
      } else {
        setTotalCount(count || 0);
      }

      // Récupérer les réponses avec pagination
      const offset = (currentPage - 1) * itemsPerPage;
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('id, form_id, created_at, ip_address, user_agent')
        .in('form_id', formIds)
        .range(offset, offset + itemsPerPage - 1)
        .order('created_at', { ascending: false });

      if (responsesError) {
        console.error('Erreur récupération réponses:', responsesError);
        setResponses([]);
        setLoadingPdfCards(false);
        return;
      }

      // Enrichir avec les informations du formulaire
      const enrichedResponses = (responsesData || []).map(response => ({
        ...response,
        data: {}, // Sera chargé à la demande
        form: formsMap.get(response.form_id)
      }));

      setResponses(enrichedResponses);
      console.log('✅ Réponses chargées:', enrichedResponses.length);
      
    } catch (error) {
      console.error('Erreur générale fetchResponses:', error);
      setResponses([]);
      setTotalCount(0);
    } finally {
      setLoadingPdfCards(false);
    }
  };

  const handleViewDetails = async (response: PDFResponse) => {
    setSelectedResponseForDetails(response);
    setShowDetailsModal(true);
    
    // Charger les données complètes de la réponse
    setLoadingResponseData(true);
    try {
      const { data: fullResponse, error } = await supabase
        .from('responses')
        .select('data')
        .eq('id', response.id)
        .single();

      if (error) {
        console.error('Erreur chargement données réponse:', error);
        toast.error('Erreur lors du chargement des détails');
      } else {
        // Mettre à jour la réponse sélectionnée avec les données complètes
        setSelectedResponseForDetails(prev => prev ? {
          ...prev,
          data: fullResponse.data
        } : null);
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoadingResponseData(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?')) {
      try {
        const { error } = await supabase
          .from('responses')
          .delete()
          .eq('id', responseId);

        if (error) {
          toast.error('Erreur lors de la suppression');
        } else {
          toast.success('Réponse supprimée avec succès');
          fetchResponses(); // Recharger la liste
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      response.form?.title?.toLowerCase().includes(searchLower) ||
      response.ip_address?.toLowerCase().includes(searchLower) ||
      response.id.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'form') {
      return (a.form?.title || '').localeCompare(b.form?.title || '');
    }
    return 0;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Fonction pour traiter et afficher les données sans doublons
  const renderResponseData = (data: Record<string, any>) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500">Aucune donnée disponible</p>
        </div>
      );
    }

    // Sets pour éviter les doublons
    const processedImages = new Set<string>();
    const processedSignatures = new Set<string>();
    const processedFields = new Set<string>();

    const renderItems: JSX.Element[] = [];

    // Traiter chaque entrée de données
    Object.entries(data).forEach(([key, value]) => {
      if (!value || value === '') return;

      // Créer un hash simple pour détecter les doublons
      const valueHash = typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value).substring(0, 100);
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Traitement des signatures
      if (typeof value === 'string' && value.startsWith('data:image') && 
          (key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign'))) {
        
        if (!processedSignatures.has(valueHash)) {
          processedSignatures.add(valueHash);
          renderItems.push(
            <div key={`signature-${processedSignatures.size}`} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs">✍️</span>
                </div>
                <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                  Signature électronique
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700 shadow-inner">
                <img
                  src={value}
                  alt="Signature électronique"
                  className="max-w-full max-h-32 object-contain mx-auto"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                  ✅ Signature valide et légale
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                  {Math.round(value.length / 1024)} KB
                </span>
              </div>
            </div>
          );
        }
      }
      // Traitement des images (non-signatures)
      else if (typeof value === 'string' && value.startsWith('data:image')) {
        if (!processedImages.has(valueHash)) {
          processedImages.add(valueHash);
          renderItems.push(
            <div key={`image-${processedImages.size}`} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs">📷</span>
                </div>
                <span className="text-sm font-bold text-green-900 dark:text-green-300">
                  Image uploadée
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-700 shadow-inner">
                <img
                  src={value}
                  alt={key}
                  className="max-w-full max-h-48 object-contain mx-auto rounded-lg shadow-md"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                  📁 Fichier image
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                  {Math.round(value.length / 1024)} KB
                </span>
              </div>
            </div>
          );
        }
      }
      // Traitement des autres champs (texte, etc.)
      else {
        const fieldHash = `${normalizedKey}-${valueHash}`;
        if (!processedFields.has(fieldHash)) {
          processedFields.add(fieldHash);
          renderItems.push(
            <div key={`field-${processedFields.size}`} className="border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
              <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                {key}
              </div>
              <div className="text-gray-900 dark:text-white font-medium">
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item, idx) => (
                      <span key={idx} className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm dark:from-blue-900 dark:to-indigo-900 dark:text-blue-300">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap font-semibold">{String(value)}</p>
                )}
              </div>
            </div>
          );
        }
      }
    });

    return renderItems.length > 0 ? renderItems : (
      <div className="text-center py-4">
        <p className="text-gray-500">Aucune donnée à afficher</p>
      </div>
    );
  };

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
                  ? `Stockage illimité avec ${product.name}`
                  : 'Gérez vos réponses et générez des PDFs à la demande'
                }
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} réponse{totalCount > 1 ? 's' : ''} • Page {currentPage}/{totalPages}</span>
                </div>
              )}
              
              {/* Actions principales */}
              <div className="mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchResponses}
                  className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold shadow-lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Actualiser</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Banners d'alerte */}
        <div className="mb-8">
          {isDemoMode && <DemoWarningBanner />}
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
                    placeholder="Rechercher par formulaire, IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-green-500 rounded-xl font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'form')}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium bg-white/70 backdrop-blur-sm shadow-lg"
                >
                  <option value="date">Plus récent</option>
                  <option value="form">Par formulaire</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grille des réponses */}
        {loadingPdfCards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
        ) : filteredResponses.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-3xl mb-6 shadow-xl">
                  <HardDrive className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchTerm ? 'Aucune réponse trouvée' : 'Aucune réponse'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les réponses à vos formulaires apparaîtront ici'
                }
              </p>
              {!searchTerm && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 max-w-md mx-auto shadow-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Astuce :</strong> Créez et publiez des formulaires pour commencer à recevoir des réponses
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredResponses.map((response) => (
                <Card key={response.id} className="group bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {response.form?.title || 'Formulaire'}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {formatDateTimeFR(response.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-2 py-1 rounded-full font-semibold shadow-sm dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300">
                          #{response.id.slice(-8)}
                        </span>
                        {response.ip_address && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full font-semibold">
                            {response.ip_address}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(response)}
                          className="flex-1 flex items-center justify-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Détails</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteResponse(response.id)}
                          className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                          title="Supprimer la réponse"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
          </>
        )}

        {/* Modal de détails de réponse */}
        {showDetailsModal && selectedResponseForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      Détails de la réponse
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {selectedResponseForDetails.form?.title || 'Formulaire'} • {formatDateTimeFR(selectedResponseForDetails.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedResponseForDetails(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingResponseData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Chargement des données...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Informations générales */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-4 rounded-xl shadow-inner">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Informations générales
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        <div>
                          <span className="font-semibold">ID de réponse :</span>
                          <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1">
                            {selectedResponseForDetails.id}
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold">Date de soumission :</span>
                          <div className="mt-1">{formatDateTimeFR(selectedResponseForDetails.created_at)}</div>
                        </div>
                        {selectedResponseForDetails.ip_address && (
                          <div>
                            <span className="font-semibold">Adresse IP :</span>
                            <div className="mt-1">{selectedResponseForDetails.ip_address}</div>
                          </div>
                        )}
                        {selectedResponseForDetails.user_agent && (
                          <div>
                            <span className="font-semibold">Navigateur :</span>
                            <div className="text-xs mt-1 truncate">{selectedResponseForDetails.user_agent}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Données soumises */}
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Données soumises
                      </h4>
                      <div className="space-y-4">
                        {renderResponseData(selectedResponseForDetails.data)}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};