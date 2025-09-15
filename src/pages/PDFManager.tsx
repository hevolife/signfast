import React, { useState, useEffect } from 'react';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../components/subscription/LimitReachedModal';
import { supabase } from '../lib/supabase';
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
  Eye,
  FileText,
  Calendar,
  User,
  Activity,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFStorageItem {
  id: string;
  file_name: string;
  response_id: string | null;
  template_name: string;
  form_title: string;
  form_data: Record<string, any>;
  pdf_content?: string;
  file_size: number;
  user_name: string;
  created_at: string;
  updated_at: string;
}

export const PDFManager: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { savedPdfs: savedPdfsLimits } = useLimits();
  const [pdfs, setPdfs] = useState<PDFStorageItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'form'>('date');
  const [selectedPdf, setSelectedPdf] = useState<PDFStorageItem | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPDFs();
    }
  }, [user, currentPage]);

  const fetchPDFs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        setPdfs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const offset = (currentPage - 1) * itemsPerPage;

      // Requêtes parallèles pour optimiser les performances
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('pdf_storage')
          .select('id', { count: 'estimated', head: true })
          .eq('user_id', user.id),
        supabase
          .from('pdf_storage')
          .select('id, file_name, response_id, template_name, form_title, form_data, file_size, user_name, created_at, updated_at')
          .eq('user_id', user.id)
          .range(offset, offset + itemsPerPage - 1)
          .order('created_at', { ascending: false })
      ]);

      const { count, error: countError } = countResult;
      const { data, error } = dataResult;

      if (error) {
        throw error;
      }

      if (countError) {
        setTotalCount(data?.length || 0);
      } else {
        setTotalCount(count || 0);
      }

      setPdfs(data || []);
    } catch (error) {
      setPdfs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewPdf = (pdf: PDFStorageItem) => {
    setSelectedPdf(pdf);
    setShowPdfModal(true);
  };

  const handleDeletePdf = async (id: string, fileName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) {
      try {
        const { error } = await supabase
          .from('pdf_storage')
          .delete()
          .eq('id', id)
          .eq('user_id', user?.id);

        if (error) {
          toast.error('Erreur lors de la suppression');
        } else {
          toast.success('PDF supprimé avec succès');
          fetchPDFs();
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleDownloadPdf = async (pdf: PDFStorageItem) => {
    try {
      let pdfContent = pdf.pdf_content;
      
      // Si le contenu PDF n'est pas déjà chargé, le récupérer
      if (!pdfContent) {
        const { data, error } = await supabase
          .from('pdf_storage')
          .select('pdf_content')
          .eq('id', pdf.id)
          .eq('user_id', user?.id)
          .single();
          
        if (error || !data?.pdf_content) {
          toast.error('Erreur lors du chargement du PDF');
          return;
        }
        
        pdfContent = data.pdf_content;
      }

      // Convertir le contenu base64 en blob
      let pdfData: Uint8Array;
      
      if (pdfContent.startsWith('data:application/pdf;base64,')) {
        const base64Data = pdfContent.split(',')[1];
        const binaryString = atob(base64Data);
        pdfData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pdfData[i] = binaryString.charCodeAt(i);
        }
      } else {
        toast.error('Format PDF non supporté');
        return;
      }

      // Créer et télécharger le fichier
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdf.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF téléchargé !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteAllPdfs = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer tous les ${pdfs.length} PDFs ?`)) {
      try {
        const { error } = await supabase
          .from('pdf_storage')
          .delete()
          .eq('user_id', user?.id);

        if (error) {
          toast.error('Erreur lors de la suppression');
        } else {
          toast.success('Tous les PDFs supprimés');
          fetchPDFs();
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // Fonction optimisée pour extraire et déduplicquer les données
  const getCleanFormData = (formData: Record<string, any>): Array<{key: string, value: any, type: string}> => {
    const cleanData: Array<{key: string, value: any, type: string}> = [];
    const seenValues = new Set<string>();
    
    // Priorité aux champs avec des noms explicites
    const priorityKeys = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'signature'];
    
    // Traiter d'abord les champs prioritaires
    priorityKeys.forEach(priority => {
      const entries = Object.entries(formData).filter(([key]) => 
        key.toLowerCase().includes(priority)
      );
      
      entries.forEach(([key, value]) => {
        if (value && !seenValues.has(String(value))) {
          const type = getValueType(value);
          cleanData.push({ key: formatKey(key), value, type });
          seenValues.add(String(value));
        }
      });
    });
    
    // Puis traiter les autres champs non vus
    Object.entries(formData).forEach(([key, value]) => {
      if (value && !seenValues.has(String(value))) {
        // Ignorer les clés techniques ou dupliquées
        if (!isSystemKey(key) && !isDuplicateKey(key, cleanData)) {
          const type = getValueType(value);
          cleanData.push({ key: formatKey(key), value, type });
          seenValues.add(String(value));
        }
      }
    });
    
    return cleanData.slice(0, 10); // Limiter à 10 champs max pour l'affichage
  };

  const getValueType = (value: any): string => {
    if (typeof value === 'string' && value.startsWith('data:image')) {
      return value.includes('signature') ? 'signature' : 'image';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'string' && value.match(/^\d{2}\/\d{2}\/\d{4}$/)) return 'date';
    if (typeof value === 'string' && value.includes('@')) return 'email';
    if (typeof value === 'string' && value.match(/^[\d\s\-\+\(\)]+$/)) return 'phone';
    return 'text';
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const isSystemKey = (key: string): boolean => {
    const systemKeys = ['date_creation', 'heure_creation', 'numero_reponse', 'timestamp'];
    return systemKeys.some(sysKey => key.toLowerCase().includes(sysKey));
  };

  const isDuplicateKey = (key: string, existingData: Array<{key: string}>): boolean => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    return existingData.some(item => 
      item.key.toLowerCase().replace(/[^a-z]/g, '') === normalizedKey
    );
  };

  const renderValue = (value: any, type: string) => {
    switch (type) {
      case 'signature':
        return (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xs">✍️</span>
              </div>
              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                Signature électronique
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-blue-200 dark:border-blue-700 shadow-inner">
              <img
                src={value}
                alt="Signature"
                className="max-w-full max-h-20 object-contain mx-auto"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xs">📷</span>
              </div>
              <span className="text-sm font-bold text-green-900 dark:text-green-300">
                Image
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-green-200 dark:border-green-700 shadow-inner">
              <img
                src={value}
                alt="Image"
                className="max-w-full max-h-32 object-contain mx-auto rounded"
              />
            </div>
          </div>
        );
      
      case 'array':
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item: any, idx: number) => (
              <span key={idx} className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold shadow-sm dark:from-blue-900 dark:to-indigo-900 dark:text-blue-300">
                {String(item)}
              </span>
            ))}
          </div>
        );
      
      default:
        return (
          <p className="text-gray-900 dark:text-white font-medium break-words">
            {String(value)}
          </p>
        );
    }
  };

  const filteredPdfs = pdfs.filter(pdf => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pdf.file_name.toLowerCase().includes(searchLower) ||
      pdf.form_title.toLowerCase().includes(searchLower) ||
      pdf.template_name.toLowerCase().includes(searchLower) ||
      pdf.user_name.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'name':
        return a.file_name.localeCompare(b.file_name);
      case 'form':
        return a.form_title.localeCompare(b.form_title);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Gérez tous vos documents PDF générés et signés
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} PDF{totalCount > 1 ? 's' : ''} • Page {currentPage}/{totalPages}</span>
                </div>
              )}
              
              {/* Actions principales */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={fetchPDFs}
                  className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Activity className="h-5 w-5 mr-2" />
                  Actualiser
                </Button>
                {pdfs.length > 0 && (
                  <Button
                    onClick={handleDeleteAllPdfs}
                    className="bg-red-500/80 backdrop-blur-sm text-white border border-red-400/30 hover:bg-red-600/80 font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Tout supprimer
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

        {/* Filtres et recherche */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par nom de fichier, formulaire..."
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
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'form')}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium bg-white/70 backdrop-blur-sm shadow-lg"
                >
                  <option value="date">Plus récent</option>
                  <option value="name">Par nom</option>
                  <option value="form">Par formulaire</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des PDFs...</p>
            </div>
          </div>
        ) : filteredPdfs.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-3xl mb-6 shadow-xl">
                  <HardDrive className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchTerm ? 'Aucun PDF trouvé' : 'Aucun PDF sauvegardé'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les PDFs générés depuis vos formulaires apparaîtront ici'
                }
              </p>
              {!searchTerm && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 max-w-md mx-auto shadow-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Astuce :</strong> Activez la génération PDF dans vos formulaires pour commencer à sauvegarder des documents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPdfs.map((pdf) => (
              <Card key={pdf.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    {/* Informations du PDF */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            {pdf.file_name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                            <span>📝 {pdf.form_title}</span>
                            <span>📄 {pdf.template_name}</span>
                            <span>👤 {pdf.user_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Métadonnées */}
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateTimeFR(pdf.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <HardDrive className="h-4 w-4" />
                          <span>{Math.round(pdf.file_size / 1024)} KB</span>
                        </div>
                      </div>

                      {/* Aperçu des données (optimisé) */}
                      <div className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900/20 p-4 rounded-xl shadow-inner">
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-2">
                          📋 Données du formulaire
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-32 overflow-y-auto">
                          {getCleanFormData(pdf.form_data).map((item, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {item.key}:
                              </span>
                              <div className="mt-1">
                                {item.type === 'signature' || item.type === 'image' ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                                    {item.type === 'signature' ? '✍️ Signature' : '📷 Image'}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {String(item.value).substring(0, 50)}
                                    {String(item.value).length > 50 ? '...' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPdf(pdf)}
                        className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Détails</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPdf(pdf)}
                        className="flex items-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="h-4 w-4" />
                        <span>Télécharger</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePdf(pdf.id, pdf.file_name)}
                        className="flex items-center space-x-1 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Supprimer</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} PDFs
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
        )}

        {/* Modal de détail PDF */}
        {showPdfModal && selectedPdf && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedPdf.file_name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Généré le {formatDateTimeFR(selectedPdf.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPdfModal(false)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations du document */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">
                      📄 Informations du document
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Formulaire :</strong> {selectedPdf.form_title}</div>
                      <div><strong>Template :</strong> {selectedPdf.template_name}</div>
                      <div><strong>Utilisateur :</strong> {selectedPdf.user_name}</div>
                      <div><strong>Taille :</strong> {Math.round(selectedPdf.file_size / 1024)} KB</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
                    <h4 className="text-sm font-bold text-green-900 dark:text-green-300 mb-3">
                      🕒 Horodatage
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Créé :</strong> {formatDateTimeFR(selectedPdf.created_at)}</div>
                      <div><strong>Modifié :</strong> {formatDateTimeFR(selectedPdf.updated_at)}</div>
                      {selectedPdf.response_id && (
                        <div><strong>Réponse ID :</strong> {selectedPdf.response_id.slice(-8)}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Données du formulaire (optimisées) */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    📋 Données du formulaire
                  </h4>
                  <div className="grid gap-4">
                    {getCleanFormData(selectedPdf.form_data).map((item, index) => (
                      <div key={index} className="border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                          {item.key}
                        </div>
                        {renderValue(item.value, item.type)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <Button
                    onClick={() => handleDownloadPdf(selectedPdf)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le PDF
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowPdfModal(false)}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
                  >
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
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