import React, { useState, useEffect } from 'react';
import { useSubAccount } from '../../contexts/SubAccountContext';
import { supabase } from '../../lib/supabase';
import { OptimizedPDFService } from '../../services/optimizedPDFService';
import { formatDateTimeFR } from '../../utils/dateFormatter';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
  HardDrive, 
  Download, 
  Search, 
  Filter,
  FileText,
  Calendar,
  User,
  LogOut,
  Eye,
  RefreshCw,
  Shield,
  FormInput,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FormResponse } from '../../types/form';

interface ResponseWithPDF {
  id: string;
  form_id: string;
  data: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  form_title: string;
  template_name?: string;
  can_generate_pdf: boolean;
}

export const SubAccountDashboard: React.FC = () => {
  const { subAccount, mainAccountId, logoutSubAccount } = useSubAccount();
  const [responses, setResponses] = useState<ResponseWithPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);
  const [selectedResponse, setSelectedResponse] = useState<ResponseWithPDF | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  useEffect(() => {
    if (subAccount && mainAccountId) {
      fetchResponses();
    }
  }, [subAccount, mainAccountId, currentPage]);

  const fetchResponses = async () => {
    if (!mainAccountId) {
      console.log('❌ Pas de mainAccountId disponible pour récupérer les réponses');
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Récupération réponses pour compte principal:', mainAccountId);
      
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.log('❌ Supabase non configuré pour les réponses');
        setResponses([]);
        setTotalCount(0);
        return;
      }

      // 1. Récupérer les formulaires du compte principal
      console.log('📝 Récupération formulaires du compte principal...');
      const { data: forms, error: formsError } = await supabase
        .from('forms')
        .select('id, title, settings')
        .eq('user_id', mainAccountId)
        .eq('is_published', true);

      if (formsError) {
        console.log('❌ Erreur récupération formulaires:', formsError);
        setResponses([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      console.log('📝 Formulaires trouvés:', forms?.length || 0);
      
      if (!forms || forms.length === 0) {
        console.log('📝 Aucun formulaire publié trouvé pour le compte principal');
        setResponses([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const formIds = forms.map(f => f.id);
      console.log('📝 IDs des formulaires:', formIds);

      // 2. Compter le nombre total de réponses
      let totalCount = 0;
      try {
        console.log('📊 Comptage réponses pour formulaires:', formIds);
        const { count, error: countError } = await supabase
          .from('responses')
          .select('id', { count: 'exact', head: true })
          .in('form_id', formIds);

        if (countError) {
          console.log('❌ Erreur comptage réponses:', countError);
          totalCount = 0;
        } else {
          totalCount = count || 0;
          console.log('📊 Nombre total de réponses:', totalCount);
        }
      } catch (countError) {
        console.log('❌ Erreur réseau comptage réponses');
        totalCount = 0;
      }

      setTotalCount(totalCount);

      // 3. Récupérer les réponses avec pagination
      let responsesData: any[] = [];
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        console.log('📋 Récupération réponses avec pagination:', { offset, limit: itemsPerPage });
        
        const { data, error } = await supabase
          .from('responses')
          .select('*')
          .in('form_id', formIds)
          .range(offset, offset + itemsPerPage - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('❌ Erreur récupération réponses:', error);
          responsesData = [];
        } else {
          responsesData = data || [];
          console.log('📋 Réponses récupérées:', responsesData.length);
        }
      } catch (fetchError) {
        console.log('❌ Erreur réseau récupération réponses');
        responsesData = [];
      }
      
      // 4. Enrichir les réponses avec les informations des formulaires et templates
      const enrichedResponses: ResponseWithPDF[] = responsesData.map(response => {
        const form = forms.find(f => f.id === response.form_id);
        const formTitle = form?.title || 'Formulaire inconnu';
        const templateId = form?.settings?.pdfTemplateId;
        const canGeneratePdf = form?.settings?.generatePdf && templateId;
        
        return {
          ...response,
          form_title: formTitle,
          template_name: templateId ? 'Template configuré' : 'Aucun template',
          can_generate_pdf: canGeneratePdf || false,
        };
      });

      console.log('📋 Réponses enrichies:', enrichedResponses.length);
      console.log('📋 Réponses avec PDF générables:', enrichedResponses.filter(r => r.can_generate_pdf).length);
      
      setResponses(enrichedResponses);
    } catch (error) {
      console.log('❌ Erreur générale fetchResponses');
      setResponses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndDownloadPDF = async (response: ResponseWithPDF) => {
    try {
      if (!response.can_generate_pdf) {
        toast.error('Aucun template PDF configuré pour ce formulaire');
        return;
      }

      toast.loading('🎨 Génération du PDF en cours...', { duration: 10000 });

      // Récupérer le formulaire pour obtenir le template ID
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('settings, title')
        .eq('id', response.form_id)
        .single();

      if (formError || !form?.settings?.pdfTemplateId) {
        toast.dismiss();
        toast.error('Template PDF non trouvé pour ce formulaire');
        return;
      }

      // Générer le PDF avec le service
      const pdfBytes = await OptimizedPDFService.generatePDF({
        templateId: form.settings.pdfTemplateId,
        formTitle: response.form_title,
        responseId: response.id,
        formData: response.data,
        saveToServer: false,
      });

      // Créer le nom du fichier
      const fileName = `${response.form_title}_${response.id.slice(-8)}_${new Date().toISOString().split('T')[0]}.pdf`;
      
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
      toast.success('PDF téléchargé !');
    } catch (error) {
      console.error('Erreur génération/téléchargement PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleViewResponse = (response: ResponseWithPDF) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
  };

  const getResponseDisplayName = (response: ResponseWithPDF): string => {
    const data = response.data || {};
    
    console.log('🔍 Données de réponse pour extraction nom:', Object.keys(data));
    
    // Chercher les champs nom/prénom avec toutes les variantes possibles
    const firstNameVariants = [
      'Prénom', 'prénom', 'Prenom', 'prenom', 'first_name', 'firstName', 'firstname',
      'First Name', 'First_Name', 'PRENOM', 'PRÉNOM', 'Nom complet', 'nom_complet'
    ];
    
    const lastNameVariants = [
      'Nom', 'nom', 'Nom de famille', 'nom_de_famille', 'last_name', 'lastName', 'lastname',
      'Last Name', 'Last_Name', 'NOM', 'family_name', 'familyName', 'surname'
    ];
    
    const fullNameVariants = [
      'Nom complet', 'nom_complet', 'nomComplet', 'full_name', 'fullName', 'Full Name',
      'Nom et prénom', 'nom_et_prenom', 'name', 'Name', 'Nom_complet', 'NOM_COMPLET'
    ];
    
    // 1. Chercher d'abord un nom complet
    let fullName = '';
    for (const variant of fullNameVariants) {
      if (data[variant] && typeof data[variant] === 'string' && data[variant].trim()) {
        fullName = data[variant].trim();
        console.log('✅ Nom complet trouvé:', variant, '=', fullName);
        break;
      }
    }
    
    if (fullName) {
      return fullName;
    }
    
    // 2. Chercher prénom et nom séparément
    let firstName = '';
    let lastName = '';
    
    for (const variant of firstNameVariants) {
      if (data[variant] && typeof data[variant] === 'string' && data[variant].trim()) {
        firstName = data[variant].trim();
        console.log('✅ Prénom trouvé:', variant, '=', firstName);
        break;
      }
    }
    
    for (const variant of lastNameVariants) {
      if (data[variant] && typeof data[variant] === 'string' && data[variant].trim()) {
        lastName = data[variant].trim();
        console.log('✅ Nom trouvé:', variant, '=', lastName);
        break;
      }
    }
    
    // Si on a nom ET prénom
    if (firstName && lastName) {
      console.log('✅ Nom complet construit:', `${firstName} ${lastName}`);
      return `${firstName} ${lastName}`;
    }
    
    // Si on a seulement le prénom
    if (firstName) {
      console.log('✅ Prénom seul:', firstName);
      return firstName;
    }
    
    // Si on a seulement le nom
    if (lastName) {
      console.log('✅ Nom seul:', lastName);
      return lastName;
    }
    
    // 3. Chercher dans d'autres champs qui pourraient contenir un nom
    const otherNameFields = ['client', 'Client', 'utilisateur', 'Utilisateur', 'personne', 'Personne'];
    for (const field of otherNameFields) {
      if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
        console.log('✅ Nom trouvé dans champ alternatif:', field, '=', data[field]);
        return data[field].trim();
      }
    }
    
    // 4. Chercher le premier champ texte qui ressemble à un nom (plus de 2 caractères, pas d'email)
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && 
          value.trim().length > 2 && 
          !value.includes('@') && 
          !value.startsWith('data:') &&
          !value.match(/^\d+$/) && // Pas que des chiffres
          !value.match(/^\d{2}\/\d{2}\/\d{4}$/) && // Pas une date
          key.toLowerCase().includes('nom') || key.toLowerCase().includes('name')) {
        console.log('✅ Nom potentiel trouvé:', key, '=', value);
        return value.trim();
      }
    }
    
    console.log('❌ Aucun nom trouvé, utilisation fallback');
    // Fallback vers l'ID si aucun nom trouvé
    return `Réponse #${response.id.slice(-8)}`;
  };

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      response.form_title.toLowerCase().includes(searchLower) ||
      response.id.toLowerCase().includes(searchLower) ||
      JSON.stringify(response.data).toLowerCase().includes(searchLower) ||
      getResponseDisplayName(response).toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return getResponseDisplayName(a).localeCompare(getResponseDisplayName(b));
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!subAccount) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Accès non autorisé
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Vous devez être connecté avec un sous-compte valide.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Header avec informations du sous-compte */}
      <div className="bg-white/80 backdrop-blur-sm shadow-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo et info sous-compte */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FormInput className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    SignFast
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold dark:bg-blue-900 dark:text-blue-300">
                    Sous-compte
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Connecté en tant que <span className="font-bold">{subAccount.display_name}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchResponses}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logoutSubAccount}
                className="flex items-center space-x-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header principal */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <HardDrive className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Réponses et PDFs
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Accès aux réponses de formulaires et génération PDF du compte principal
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  <span>{totalCount} réponse{totalCount > 1 ? 's' : ''} disponible{totalCount > 1 ? 's' : ''}</span>
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
                  onClick={fetchResponses}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium bg-white/70 backdrop-blur-sm shadow-lg"
                >
                  <option value="date">Plus récent</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des PDFs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des réponses...</p>
            </div>
          </div>
        ) : filteredResponses.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Aucune réponse trouvée' : 'Aucune réponse'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Aucune réponse de formulaire n\'est disponible pour le moment'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map((response) => (
              <Card key={response.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Informations de la réponse */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {(() => {
                              const displayName = getResponseDisplayName(response);
                              return displayName.startsWith('Réponse #') ? displayName : displayName;
                            })()}
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>📝 Formulaire: {response.form_title}</div>
                            <div>📅 {formatDateTimeFR(response.created_at)}</div>
                            <div>📄 Template: {response.template_name}</div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              response.can_generate_pdf 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {response.can_generate_pdf ? '✅ PDF génératable' : '❌ Pas de template'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Métadonnées */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDateTimeFR(response.created_at)}</span>
                            </div>
                            {response.ip_address && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{response.ip_address}</span>
                              </div>
                            )}
                          </div>
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
                        <span>Détails</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateAndDownloadPDF(response)}
                        disabled={!response.can_generate_pdf}
                        className={`flex items-center space-x-1 ${
                          response.can_generate_pdf
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                        }`}
                      >
                        <Download className="h-4 w-4" />
                        <span>Générer PDF</span>
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
                      {getResponseDisplayName(selectedResponse)} • {formatDateTimeFR(selectedResponse.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResponseModal(false)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(selectedResponse.data).map(([key, value]) => {
                  if (value === undefined || value === null || value === '') return null;

                  return (
                    <div key={key} className="border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        {key}
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {typeof value === 'string' && value.startsWith('data:image') ? (
                          <div>
                            {key.toLowerCase().includes('signature') ? (
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
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
                            ) : (
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
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
                            )}
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
                            <p className="whitespace-pre-wrap font-semibold">{String(value)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

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
                    <div>Formulaire : {selectedResponse.form_title}</div>
                    <div>Template : {selectedResponse.template_name}</div>
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