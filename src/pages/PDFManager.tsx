import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { 
  HardDrive, 
  Download, 
  Search, 
  Filter,
  FileText,
  Calendar,
  User,
  Eye,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFStorage {
  id: string;
  file_name: string;
  response_id: string | null;
  template_name: string;
  form_title: string;
  form_data: Record<string, any>;
  pdf_content: string;
  file_size: number;
  user_name: string;
  created_at: string;
  updated_at: string;
}

export const PDFManager: React.FC = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const [pdfs, setPdfs] = useState<PDFStorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);
  const [selectedPdf, setSelectedPdf] = useState<PDFStorage | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isDemoMode) {
      fetchPDFs();
    } else if (isDemoMode) {
      // En mode démo, afficher des PDFs fictifs
      setLoading(false);
      setPdfs([]);
      setTotalCount(0);
    } else {
      setLoading(false);
    }
  }, [user, isDemoMode, currentPage]);

  const fetchPDFs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('Supabase non configuré, stockage PDF non disponible');
        setPdfs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Déterminer l'utilisateur cible (gestion impersonation)
      let targetUserId = user.id;
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('🎭 Mode impersonation: récupération PDFs pour', data.target_email);
        } catch (error) {
          console.error('Erreur parsing impersonation data:', error);
        }
      }

      const offset = (currentPage - 1) * itemsPerPage;
      
      // Requêtes parallèles optimisées
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('pdf_storage')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUserId),
        supabase
          .from('pdf_storage')
          .select('*')
          .eq('user_id', targetUserId)
          .range(offset, offset + itemsPerPage - 1)
          .order('created_at', { ascending: false })
      ]);

      const { count, error: countError } = countResult;
      const { data, error: dataError } = dataResult;

      if (dataError) {
        console.error('Erreur récupération PDFs:', dataError);
        setPdfs([]);
        setTotalCount(0);
      } else {
        setPdfs(data || []);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Erreur générale fetchPDFs:', error);
      setPdfs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async (pdf: PDFStorage) => {
    try {
      setGeneratingPdf(pdf.id);
      toast.loading('🎨 Régénération du PDF avec masques appliqués...', { duration: 10000 });

      // Récupérer les informations du formulaire original pour les masques
      const { data: responses, error: responseError } = await supabase
        .from('responses')
        .select(`
          *,
          forms!inner(
            id,
            title,
            fields
          )
        `)
        .eq('id', pdf.response_id)
        .single();

      if (responseError || !responses) {
        toast.dismiss();
        toast.error('Impossible de récupérer les données du formulaire original');
        return;
      }

      // Enrichir les données avec les métadonnées du formulaire pour les masques
      const enrichedFormData = {
        ...pdf.form_data,
        _form_metadata: { fields: responses.forms.fields },
        _original_form_fields: responses.forms.fields
      };
      
      console.log('📋 Régénération PDF avec métadonnées:', {
        fieldsCount: responses.forms.fields?.length || 0,
        hasMetadata: true,
        dataKeys: Object.keys(enrichedFormData)
      });

      // Récupérer le template PDF
      const { data: template, error: templateError } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('linked_form_id', responses.forms.id)
        .single();

      if (templateError || !template) {
        toast.dismiss();
        toast.error('Template PDF non trouvé pour ce formulaire');
        return;
      }

      // Générer le PDF avec les masques appliqués
      const { PDFGenerator } = await import('../utils/pdfGenerator');
      
      // Convertir le template
      const pdfTemplate = {
        id: template.id,
        name: template.name,
        fields: template.fields || [],
        originalPdfUrl: template.pdf_content,
      };

      // Convertir le PDF en bytes
      const base64Data = template.pdf_content.split(',')[1];
      const binaryString = atob(base64Data);
      const originalPdfBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        originalPdfBytes[i] = binaryString.charCodeAt(i);
      }

      const pdfBytes = await PDFGenerator.generatePDF(pdfTemplate, enrichedFormData, originalPdfBytes);

      // Créer le nom du fichier
      const fileName = `${pdf.form_title}_regenere_${Date.now()}.pdf`;
      
      // Télécharger le PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('PDF régénéré avec masques appliqués !');
    } catch (error) {
      console.error('Erreur régénération PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la régénération du PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const downloadPDF = (pdf: PDFStorage) => {
    try {
      const link = document.createElement('a');
      link.href = pdf.pdf_content;
      link.download = pdf.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('PDF téléchargé !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const deletePDF = async (id: string, fileName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) {
      try {
        const { error } = await supabase
          .from('pdf_storage')
          .delete()
          .eq('id', id);

        if (error) {
          toast.error('Erreur lors de la suppression');
        } else {
          toast.success('PDF supprimé');
          fetchPDFs(); // Rafraîchir la liste
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleViewPDF = (pdf: PDFStorage) => {
    setSelectedPdf(pdf);
    setShowPdfModal(true);
  };

  const filteredPdfs = pdfs.filter(pdf => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pdf.file_name.toLowerCase().includes(searchLower) ||
      pdf.form_title.toLowerCase().includes(searchLower) ||
      pdf.user_name.toLowerCase().includes(searchLower) ||
      JSON.stringify(pdf.form_data).toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.file_name.localeCompare(b.file_name);
      case 'size':
        return b.file_size - a.file_size;
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-orange-900/20 dark:to-red-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-red-600 to-pink-700 rounded-3xl shadow-2xl mb-8">
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
                Gérez tous vos documents PDF générés automatiquement
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  <span>{totalCount} PDF{totalCount > 1 ? 's' : ''} • Page {currentPage}/{totalPages}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Rechercher dans les PDFs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-orange-500 rounded-xl font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium bg-white/70 backdrop-blur-sm shadow-lg"
                >
                  <option value="date">Plus récent</option>
                  <option value="name">Par nom</option>
                  <option value="size">Par taille</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchPDFs}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Actualiser</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des PDFs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des PDFs...</p>
            </div>
          </div>
        ) : filteredPdfs.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <HardDrive className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Aucun PDF trouvé' : 'Aucun PDF stocké'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : isDemoMode 
                  ? 'En mode démo, les PDFs ne sont pas sauvegardés'
                  : 'Les PDFs générés depuis vos formulaires apparaîtront ici'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPdfs.map((pdf) => (
              <Card key={pdf.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Informations du PDF */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {pdf.file_name}
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>📝 Formulaire: {pdf.form_title}</div>
                            <div>👤 Utilisateur: {pdf.user_name}</div>
                            <div>📄 Template: {pdf.template_name}</div>
                          </div>
                        </div>
                      </div>

                      {/* Métadonnées */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDateTimeFR(pdf.created_at)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <HardDrive className="h-3 w-3" />
                              <span>{formatFileSize(pdf.file_size)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPDF(pdf)}
                        className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Détails</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPDF(pdf)}
                        className="flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                      >
                        <Download className="h-4 w-4" />
                        <span>Télécharger</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGeneratePDF(pdf)}
                        disabled={generatingPdf === pdf.id}
                        className="flex items-center space-x-1 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        {generatingPdf === pdf.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span>Générer PDF</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePDF(pdf.id, pdf.file_name)}
                        className="flex items-center space-x-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
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
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      Détails du PDF
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {selectedPdf.file_name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPdfModal(false)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informations du PDF */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                  <h3 className="text-sm font-bold text-orange-900 dark:text-orange-300 mb-3">
                    Informations du document
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Nom du fichier:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedPdf.file_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Formulaire:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedPdf.form_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Template:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedPdf.template_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Utilisateur:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedPdf.user_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Taille:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatFileSize(selectedPdf.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Créé le:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDateTimeFR(selectedPdf.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Données du formulaire */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                    Données du formulaire
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {Object.entries(selectedPdf.form_data).map(([key, value]) => {
                      if (value === undefined || value === null || value === '') return null;

                      return (
                        <div key={key} className="border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {key}
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {typeof value === 'string' && value.startsWith('data:image') ? (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border">
                                <span className="text-xs text-blue-700 dark:text-blue-400">
                                  📷 Image ({Math.round(value.length / 1024)} KB)
                                </span>
                              </div>
                            ) : Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-1">
                                {value.map((item, idx) => (
                                  <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="font-medium">{String(value)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => downloadPDF(selectedPdf)}
                    className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="h-4 w-4" />
                    <span>Télécharger PDF original</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleGeneratePDF(selectedPdf)}
                    disabled={generatingPdf === selectedPdf.id}
                    className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {generatingPdf === selectedPdf.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span>Régénérer avec masques</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};