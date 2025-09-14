import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatDateTimeFR } from '../../utils/dateFormatter';
import { useForms } from '../../hooks/useForms';
import { useFormResponses } from '../../hooks/useForms';
import { Form, FormResponse } from '../../types/form';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Download, 
  Search, 
  Filter,
  ArrowLeft,
  ArrowRight,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  Sparkles,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export const FormResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { forms } = useForms();
  const { responses, totalCount, loading: responsesLoading, fetchSingleResponseData, refetch, fetchPage } = useFormResponses(id || '');
  const [form, setForm] = useState<Form | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [loadingResponseData, setLoadingResponseData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (forms.length > 0 && id) {
      const foundForm = forms.find(f => f.id === id);
      setForm(foundForm || null);
    }
  }, [forms, id]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPage(page, itemsPerPage);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const handleViewResponse = async (response: FormResponse) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
    
    // Always fetch the full response data when viewing details
    setLoadingResponseData(true);
    try {
      const fullData = await fetchSingleResponseData(response.id);
      if (fullData) {
        // Update the selected response with the full data
        setSelectedResponse(prev => prev ? { ...prev, data: fullData } : null);
      }
    } catch (error) {
      console.error('Erreur chargement données réponse:', error);
    } finally {
      setLoadingResponseData(false);
    }
  };
  const handleDeleteResponse = async (responseId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?')) {
      try {
        // Récupérer le PDF associé avant suppression
        const { data: associatedPdf, error: pdfFetchError } = await supabase
          .from('pdf_storage')
          .select('file_name')
          .eq('response_id', responseId)
          .maybeSingle();

        if (pdfFetchError) {
          console.warn('⚠️ Erreur récupération PDF associé:', pdfFetchError);
        }

        // Supprimer la réponse
        const { error } = await supabase
          .from('responses')
          .delete()
          .eq('id', responseId);

        if (error) {
          toast.error('Erreur lors de la suppression');
        } else {
          // Supprimer automatiquement le PDF associé si il existe
          if (associatedPdf?.file_name) {
            console.log('🗑️ Suppression automatique du PDF associé:', associatedPdf.file_name);
            
            const { error: pdfDeleteError } = await supabase
              .from('pdf_storage')
              .delete()
              .eq('file_name', associatedPdf.file_name);

            if (pdfDeleteError) {
              console.warn('⚠️ Erreur suppression PDF associé:', pdfDeleteError);
              toast.success('Réponse supprimée (erreur suppression PDF associé)');
            } else {
              console.log('✅ PDF associé supprimé avec succès');
              toast.success('Réponse et PDF associé supprimés avec succès');
            }
          } else {
            toast.success('Réponse supprimée avec succès');
          }
          
          toast.success('Réponse supprimée avec succès');
          // Refresh current page
          fetchPage(currentPage, itemsPerPage);
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleDeleteAllResponses = async () => {
    if (!id) return;
    
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer les ${filteredResponses.length} réponses affichées sur cette page ?\n\nCette action supprimera aussi les PDFs associés et est IRRÉVERSIBLE.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        toast.loading('🗑️ Suppression des réponses de la page en cours...', { duration: 10000 });
        
        // 1. Récupérer les IDs des réponses affichées sur la page courante
        const currentPageResponseIds = filteredResponses.map(r => r.id);
        console.log('🗑️ Nombre de réponses de la page à supprimer:', currentPageResponseIds.length);
        
        // 2. Récupérer les PDFs associés à ces réponses de la page
        let associatedPdfs: any[] = [];
        if (currentPageResponseIds.length > 0) {
          const { data: pdfs, error: pdfFetchError } = await supabase
            .from('pdf_storage')
            .select('file_name, response_id')
            .in('response_id', currentPageResponseIds);

          if (pdfFetchError) {
            console.warn('⚠️ Erreur récupération PDFs associés:', pdfFetchError);
          } else {
            associatedPdfs = pdfs || [];
            console.log('🗑️ Nombre de PDFs associés trouvés:', associatedPdfs.length);
          }
        }

        // 3. Supprimer uniquement les réponses de la page courante
        const { error: responsesDeleteError } = await supabase
          .from('responses')
          .delete()
          .in('id', currentPageResponseIds);

        if (responsesDeleteError) {
          toast.dismiss();
          console.error('❌ Erreur suppression réponses:', responsesDeleteError);
          toast.error(`Erreur lors de la suppression des réponses: ${responsesDeleteError.message}`);
          return;
        }

        console.log('✅ Réponses de la page supprimées avec succès');
        
        // 4. Supprimer les PDFs associés à cette page
        if (associatedPdfs.length > 0) {
          console.log('🗑️ Suppression automatique des PDFs associés:', associatedPdfs.length, 'PDFs');
          
          const { error: pdfsError } = await supabase
            .from('pdf_storage')
            .delete()
            .in('response_id', associatedPdfs.map(pdf => pdf.response_id));

          if (pdfsError) {
            console.warn('⚠️ Erreur suppression PDFs associés:', pdfsError);
            toast.dismiss();
            toast.success(`${currentPageResponseIds.length} réponses supprimées (erreur suppression de ${associatedPdfs.length} PDFs associés)`);
          } else {
            console.log('✅ PDFs associés supprimés avec succès');
            toast.dismiss();
            toast.success(`${currentPageResponseIds.length} réponses et ${associatedPdfs.length} PDFs associés supprimés avec succès`);
          }
        } else {
          toast.dismiss();
          toast.success(`${currentPageResponseIds.length} réponses supprimées avec succès (aucun PDF associé)`);
        }

        // 5. Actualiser la page courante
        fetchPage(currentPage, itemsPerPage);
        
      } catch (error) {
        console.error('❌ Erreur suppression massive:', error);
        toast.dismiss();
        toast.error('Erreur lors de la suppression des réponses de la page');
      }
    }
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) return;

    // Créer les en-têtes CSV
    const headers = ['Date de soumission', 'Adresse IP'];
    const fieldLabels = form.fields?.map(field => field.label) || [];
    headers.push(...fieldLabels);

    // Créer les lignes de données
    const csvData = responses.map(response => {
      const row = [
        formatDateTimeFR(response.created_at),
        response.ip_address || 'N/A'
      ];
      
      // Ajouter les données des champs
      fieldLabels.forEach(label => {
        const value = response.data[label] || '';
        // Nettoyer les valeurs pour CSV (enlever les virgules et guillemets)
        const cleanValue = typeof value === 'string' 
          ? value.replace(/"/g, '""').replace(/\n/g, ' ')
          : String(value);
        row.push(cleanValue);
      });
      
      return row;
    });

    // Créer le contenu CSV
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${form.title}_responses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Export CSV téléchargé !');
  };

  const getFieldValue = (response: FormResponse, fieldLabel: string): string => {
    const value = response.data[fieldLabel];
    if (typeof value === 'string' && value.startsWith('data:image')) {
      return '[Image]';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value || '');
  };

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return Object.values(response.data).some(value => 
      String(value).toLowerCase().includes(searchLower)
    ) || response.ip_address?.toLowerCase().includes(searchLower);
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  // Calculer les statistiques
  const totalResponses = totalCount;
  const todayResponses = responses.filter(r => {
    const today = new Date();
    const responseDate = new Date(r.created_at);
    return responseDate.toDateString() === today.toDateString();
  }).length;

  const thisWeekResponses = responses.filter(r => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(r.created_at) > weekAgo;
  }).length;

  const avgResponsesPerDay = totalResponses > 0 && form ? 
    (totalResponses / Math.max(1, Math.ceil((Date.now() - new Date(form.created_at).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1) : '0';

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Formulaire non trouvé
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ce formulaire n'existe pas ou vous n'y avez pas accès.
            </p>
            <Link to="/forms" className="mt-4 inline-block">
              <Button>Retour aux formulaires</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Link to="/forms">
                  <Button variant="ghost" className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold shadow-lg">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span>Retour</span>
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Statistiques
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-2">
                Formulaire : <span className="font-bold">{form.title}</span>
              </p>
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium mb-6">
                <Activity className="h-4 w-4" />
                <span>{totalCount} réponse{totalCount > 1 ? 's' : ''} • Page {currentPage}/{totalPages}</span>
              </div>
              
              {/* Actions principales */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchPage(currentPage, itemsPerPage)}
                  className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold shadow-lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Actualiser</span>
                </Button>
                <Button
                  onClick={handleDeleteAllResponses}
                  disabled={responses.length === 0}
                  className="bg-red-500/80 backdrop-blur-sm text-white border border-red-400/30 hover:bg-red-600/80 font-semibold shadow-lg"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Tout supprimer</span>
                </Button>
                <Button
                  onClick={exportToCSV}
                  disabled={responses.length === 0}
                  className="bg-green-500/80 backdrop-blur-sm text-white border border-green-400/30 hover:bg-green-600/80 font-semibold shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="group bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/40 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
                    Réponses totales
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {totalResponses}
                  </p>
                </div>
                <div className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/40 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 mb-1">
                    Aujourd'hui
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                    {todayResponses}
                  </p>
                </div>
                <div className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/40 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">
                    Cette semaine
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {thisWeekResponses}
                  </p>
                </div>
                <div className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-orange-50  to-red-100 dark:from-orange-900/30 dark:to-red-900/40 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">
                    Moyenne/jour
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100">
                    {avgResponsesPerDay}
                  </p>
                </div>
                <div className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Rechercher dans les réponses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium bg-white/70 backdrop-blur-sm shadow-lg"
                >
                  <option value="date">Plus récent</option>
                  <option value="name">Par nom</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {responsesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des réponses...</p>
            </div>
          </div>
        ) : filteredResponses.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-3xl mb-6 shadow-xl">
                  <BarChart3 className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchTerm ? 'Aucune réponse trouvée' : 'Aucune réponse'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les réponses à ce formulaire apparaîtront ici'
                }
              </p>
              {!form.is_published && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 max-w-md mx-auto shadow-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 <strong>Astuce :</strong> Publiez votre formulaire pour commencer à recevoir des réponses
                  </p>
                  <Link to={`/forms/${id}/edit`} className="mt-2 inline-block">
                    <Button size="sm" className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                      Publier le formulaire
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map((response) => (
              <Card key={response.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    {/* Données de la réponse */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            Réponse #{response.id.slice(-8)}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {formatDateTimeFR(response.created_at)}
                            {response.ip_address && (
                              <span className="ml-2">• IP: {response.ip_address}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Aperçu des données principales */}
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-4 rounded-xl shadow-inner">
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                          📋 Réponse complète • {form.fields?.length || 0} champs
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-medium">
                          Cliquez sur "Voir détails" pour afficher le contenu
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResponse(response)}
                        className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Voir détails</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteResponse(response.id)}
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
          </div>
        )}

        {/* Modal de détail de réponse */}
        {showResponseModal && selectedResponse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      Détails de la réponse
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Soumise le {formatDateTimeFR(selectedResponse.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResponseModal(false)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingResponseData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Chargement des données...</p>
                    </div>
                  </div>
                ) : (
                <>
                {form.fields?.map((field) => {
                  const value = selectedResponse.data[field.label];
                  if (value === undefined || value === null || value === '') return null;

                  // Appliquer le masque de saisie si défini
                  const getDisplayValue = (fieldValue: any, field: any) => {
                    if (field.validation?.mask && typeof fieldValue === 'string') {
                      return applyMaskToValue(fieldValue, field.validation.mask);
                    }
                    return fieldValue;
                  };

                  // Fonction pour appliquer un masque à une valeur
                  const applyMaskToValue = (value: string, mask: string): string => {
                    if (!value || !mask) return value;
                    
                    let masked = '';
                    let maskIndex = 0;
                    let valueIndex = 0;
                    
                    // Nettoyer la valeur (garder seulement les caractères alphanumériques)
                    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
                    
                    while (maskIndex < mask.length && valueIndex < cleanValue.length) {
                      const maskChar = mask[maskIndex];
                      const inputChar = cleanValue[valueIndex];
                      
                      if (maskChar === '9') {
                        // Chiffre requis
                        if (/[0-9]/.test(inputChar)) {
                          masked += inputChar;
                          valueIndex++;
                        } else {
                          break;
                        }
                      } else if (maskChar === 'A') {
                        // Lettre majuscule requise
                        if (/[a-zA-Z]/.test(inputChar)) {
                          masked += inputChar.toUpperCase();
                          valueIndex++;
                        } else {
                          break;
                        }
                      } else if (maskChar === 'a') {
                        // Lettre minuscule requise
                        if (/[a-zA-Z]/.test(inputChar)) {
                          masked += inputChar.toLowerCase();
                          valueIndex++;
                        } else {
                          break;
                        }
                      } else if (maskChar === '*') {
                        // Caractère alphanumérique
                        if (/[a-zA-Z0-9]/.test(inputChar)) {
                          masked += inputChar;
                          valueIndex++;
                        } else {
                          break;
                        }
                      } else {
                        // Caractère littéral du masque
                        masked += maskChar;
                      }
                      
                      maskIndex++;
                    }
                    
                    return masked;
                  };

                  return (
                    <div key={field.id} className="border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                        {field.validation?.mask && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                            {field.validation.mask}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {typeof value === 'string' && value.startsWith('data:image') ? (
                          <div>
                            <img
                              src={value}
                              alt={field.label}
                              className="max-w-xs max-h-32 object-contain border-2 border-gray-200 rounded-xl shadow-lg"
                            />
                            <p className="text-xs text-gray-500 mt-2 font-medium">Image uploadée</p>
                          </div>
                        ) : Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-1">
                            {value.map((item, idx) => (
                              <span key={idx} className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm dark:from-blue-900 dark:to-indigo-900 dark:text-blue-300">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <p className="whitespace-pre-wrap font-semibold">{String(getDisplayValue(value, field))}</p>
                            {field.validation?.mask && getDisplayValue(value, field) !== String(value) && (
                              <p className="text-xs text-gray-500 mt-2 font-medium">
                                Valeur brute : {String(value)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </>
                )}

                {/* Métadonnées */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-4 rounded-xl shadow-inner">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Informations techniques
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                    <div>ID de réponse : {selectedResponse.id}</div>
                    <div>Date de soumission : {formatDateTimeFR(selectedResponse.created_at)}</div>
                    {selectedResponse.ip_address && (
                      <div>Adresse IP : {selectedResponse.ip_address}</div>
                    )}
                    {selectedResponse.user_agent && (
                      <div>Navigateur : {selectedResponse.user_agent}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};