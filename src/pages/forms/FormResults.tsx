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
  CheckCircle
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
    
    // If response data is empty, fetch it
    if (Object.keys(response.data).length === 0) {
      setLoadingResponseData(true);
      await fetchSingleResponseData(response.id);
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
          // Refresh current page
          fetchPage(currentPage, itemsPerPage);
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link to="/forms">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Statistiques
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Formulaire : <span className="font-medium">{form.title}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount} réponse{totalCount > 1 ? 's' : ''} au total • Page {currentPage} sur {totalPages}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchPage(currentPage, itemsPerPage)}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={responses.length === 0}
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Réponses totales
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                    {totalResponses}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Aujourd'hui
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                    {todayResponses}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Cette semaine
                  </p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                    {thisWeekResponses}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    Moyenne/jour
                  </p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                    {avgResponsesPerDay}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher dans les réponses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
          <Card>
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 text-gray-400 rounded-full mb-6">
                  <BarChart3 className="h-8 w-8" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Aucune réponse trouvée' : 'Aucune réponse'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les réponses à ce formulaire apparaîtront ici'
                }
              </p>
              {!form.is_published && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 max-w-md mx-auto">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 <strong>Astuce :</strong> Publiez votre formulaire pour commencer à recevoir des réponses
                  </p>
                  <Link to={`/forms/${id}/edit`} className="mt-2 inline-block">
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
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
              <Card key={response.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    {/* Données de la réponse */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Réponse #{response.id.slice(-8)}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDateTimeFR(response.created_at)}
                            {response.ip_address && (
                              <span className="ml-2">• IP: {response.ip_address}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Aperçu des données principales */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          📋 Réponse complète • {form.fields?.length || 0} champs
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
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
                        className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Voir détails</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteResponse(response.id)}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Supprimer</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="mt-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} réponses
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center space-x-1"
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
                              variant={currentPage === pageNum ? "primary" : "ghost"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
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
                        className="flex items-center space-x-1"
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
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Détails de la réponse
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Soumise le {formatDateTimeFR(selectedResponse.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResponseModal(false)}
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

                  return (
                    <div key={field.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="text-gray-900 dark:text-white">
                        {typeof value === 'string' && value.startsWith('data:image') ? (
                          <div>
                            <img
                              src={value}
                              alt={field.label}
                              className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
                            />
                            <p className="text-xs text-gray-500 mt-1">Image uploadée</p>
                          </div>
                        ) : Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-1">
                            {value.map((item, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs dark:bg-blue-900 dark:text-blue-300">
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{String(value)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                </>
                )}

                {/* Métadonnées */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Informations techniques
                  </h4>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
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