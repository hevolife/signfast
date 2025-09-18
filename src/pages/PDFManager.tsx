import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { useForms } from '../hooks/useForms';
import { useSubscription } from '../hooks/useSubscription';
import { useLimits } from '../hooks/useLimits';
import { PDFService } from '../services/pdfService';
import { supabase } from '../lib/supabase';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../components/subscription/LimitReachedModal';
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
  RefreshCw,
  FileText,
  Calendar,
  User,
  Eye,
  ArrowLeft,
  ArrowRight,
  Activity,
  Sparkles,
  Crown,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFResponse {
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

export const PDFManager: React.FC = () => {
  const { user } = useAuth();
  const { forms } = useForms();
  const { isSubscribed, hasSecretCode } = useSubscription();
  const { savedPdfs: savedPdfsLimits } = useLimits();
  const { isDemoMode } = useDemo();
  const [responses, setResponses] = useState<PDFResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedResponse, setSelectedResponse] = useState<PDFResponse | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const product = stripeConfig.products[0];
  
  // Composant de carte PDF avec lazy loading
  const PDFCard: React.FC<{
    response: PDFResponse;
    index: number;
  }> = ({ response, index }) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            // Délai progressif basé sur l'index pour un effet de cascade
            setTimeout(() => {
              setIsVisible(true);
            }, index * 100);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '50px'
        }
      );

      if (cardRef.current) {
        observer.observe(cardRef.current);
      }

      return () => observer.disconnect();
    }, [index]);

    // Extraire le nom de l'utilisateur depuis les données
    const getUserName = (data: Record<string, any>): string => {
      const firstName = data['Prénom'] || data['prénom'] || data['Prenom'] || data['prenom'] || 
                       data['first_name'] || data['firstName'] || data['nom_complet']?.split(' ')[0] || '';
      const lastName = data['Nom'] || data['nom'] || data['Nom de famille'] || data['nom_de_famille'] || 
                      data['last_name'] || data['lastName'] || data['nom_complet']?.split(' ').slice(1).join(' ') || '';
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }
      
      if (data['nom_complet'] || data['Nom complet'] || data['nomComplet']) {
        return data['nom_complet'] || data['Nom complet'] || data['nomComplet'];
      }
      
      if (firstName) return firstName;
      if (lastName) return lastName;
      
      return `Réponse #${response.id.slice(-8)}`;
    };

    const isLocked = !isSubscribed && !hasSecretCode && index >= savedPdfsLimits.max && savedPdfsLimits.max !== Infinity;

    return (
      <div ref={cardRef} className="min-h-[200px]">
        {isVisible ? (
          <Card className={`group relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-500 ${isLocked ? 'opacity-75' : ''}`}>
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
            
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                {/* Informations de la réponse */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {getUserName(response.data)}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>📝 Formulaire: {response.form_title}</div>
                        <div>📄 Template: {response.template_name || 'Aucun template'}</div>
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
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-3 rounded-xl shadow-inner">
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
                    className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isLocked}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Détails</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateAndDownloadPDF(response)}
                    disabled={!response.can_generate_pdf || isLocked}
                    className={`flex items-center space-x-1 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 ${
                      response.can_generate_pdf && !isLocked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Générer PDF</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteResponse(response.id)}
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                    disabled={isLocked}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Skeleton card pendant le chargement
          <Card className="animate-pulse bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (user && !isDemoMode) {
      fetchResponses();
    } else if (isDemoMode) {
      loadDemoData();
    } else {
      setLoading(false);
    }
  }, [user, isDemoMode, currentPage]);

  const fetchResponses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('📄 Chargement réponses PDF (pas de cache)...');
      
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

      // L'utilisateur effectif est déjà géré par le contexte Auth
      const targetUserId = user.id;

      // 1. Récupérer les formulaires de l'utilisateur avec leurs settings
      const { data: userForms, error: formsError } = await supabase
        .from('forms')
        .select('id, title, settings')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (formsError || !userForms || userForms.length === 0) {
        console.log('📄 Aucun formulaire trouvé');
        setResponses([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const formIds = userForms.map(f => f.id);
      console.log('📄 Formulaires trouvés:', formIds.length);

      // 2. Compter le nombre total de réponses
      const { count, error: countError } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('form_id', formIds)
        .order('created_at', { ascending: false });

      if (countError) {
        console.warn('📄 Erreur comptage:', countError);
        setTotalCount(0);
      } else {
        setTotalCount(count || 0);
      }

      // 3. Récupérer les réponses avec pagination
      const offset = (currentPage - 1) * itemsPerPage;
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .in('form_id', formIds)
        .range(offset, offset + itemsPerPage - 1)
        .order('created_at', { ascending: false });

      if (responsesError) {
        console.error('📄 Erreur récupération réponses:', responsesError);
        setResponses([]);
        setLoading(false);
        return;
      }

      // 4. Enrichir les réponses avec les informations des formulaires
      const enrichedResponses: PDFResponse[] = (responsesData || []).map(response => {
        const form = userForms.find(f => f.id === response.form_id);
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

  const loadDemoData = () => {
    // Données de démonstration
    const demoResponses: PDFResponse[] = [
      {
        id: 'demo-1',
        form_id: 'demo-form-1',
        data: {
          'nom_complet': 'Jean Dupont',
          'email': 'jean.dupont@email.com',
          'telephone': '01 23 45 67 89',
          'type_de_contrat': 'Location',
          'date_de_debut': '2024-01-15',
        },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        form_title: 'Contrat de Démonstration',
        template_name: 'Template configuré',
        can_generate_pdf: true,
      },
      {
        id: 'demo-2',
        form_id: 'demo-form-1',
        data: {
          'nom_complet': 'Marie Martin',
          'email': 'marie.martin@email.com',
          'telephone': '06 78 90 12 34',
          'type_de_contrat': 'Prestation de service',
          'date_de_debut': '2024-01-20',
        },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        form_title: 'Contrat de Démonstration',
        template_name: 'Template configuré',
        can_generate_pdf: true,
      },
    ];

    setResponses(demoResponses);
    setTotalCount(demoResponses.length);
    setLoading(false);
  };

  const handleGenerateAndDownloadPDF = async (response: PDFResponse) => {
    try {
      if (!response.can_generate_pdf) {
        toast.error('Aucun template PDF configuré pour ce formulaire');
        return;
      }

      // Vérifier les limites
      if (!savedPdfsLimits.canSave) {
        setShowLimitModal(true);
        return;
      }

      if (isDemoMode) {
        // Simulation en mode démo
        toast.loading('🎨 Génération PDF de démonstration...', { duration: 2000 });
        setTimeout(() => {
          toast.success('📄 PDF de démonstration généré ! (Mode démo)');
        }, 2000);
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
      const pdfBytes = await PDFService.generatePDFFromResponse(
        response.id,
        response.data,
        response.form_title,
        form.settings.pdfTemplateId
      );

      // Créer le nom du fichier
      const userName = (() => {
        const data = response.data || {};
        const firstName = data['Prénom'] || data['prénom'] || data['Prenom'] || data['prenom'] || 
                         data['first_name'] || data['firstName'] || '';
        const lastName = data['Nom'] || data['nom'] || data['Nom de famille'] || data['nom_de_famille'] || 
                        data['last_name'] || data['lastName'] || '';
        
        if (firstName && lastName) {
          return `${firstName}_${lastName}`;
        }
        
        if (data['nom_complet']) {
          return data['nom_complet'].replace(/\s+/g, '_');
        }
        
        return `reponse_${response.id.slice(-8)}`;
      })();

      const fileName = `${response.form_title.replace(/\s+/g, '_')}_${userName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
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
      toast.success('📄 PDF généré et téléchargé !');
    } catch (error) {
      console.error('Erreur génération/téléchargement PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleViewResponse = (response: PDFResponse) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?')) {
      try {
        if (isDemoMode) {
          // Simulation en mode démo
          setResponses(prev => prev.filter(r => r.id !== responseId));
          setTotalCount(prev => prev - 1);
          toast.success('Réponse supprimée (mode démo)');
          return;
        }

        // Supprimer la réponse
        const { error } = await supabase
          .from('responses')
          .delete()
          .eq('id', responseId);

        if (error) {
          toast.error('Erreur lors de la suppression');
        } else {
          toast.success('Réponse supprimée avec succès');
          // Recharger immédiatement les données
          await fetchResponses();
        }
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      response.form_title.toLowerCase().includes(searchLower) ||
      response.id.toLowerCase().includes(searchLower) ||
      JSON.stringify(response.data).toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.form_title.localeCompare(b.form_title);
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
                {isSubscribed && (
                  <span className="block text-lg sm:text-xl text-white/90 font-medium mt-2">
                    {product.name} • Illimité
                  </span>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                {isSubscribed 
                  ? `Stockage PDF illimité avec ${product.name}`
                  : 'Gérez vos réponses de formulaires et générez des PDFs personnalisés'
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
                  onClick={() => fetchResponses()}
                  className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Actualiser
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
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium bg-white/70 backdrop-blur-sm shadow-lg"
                >
                  <option value="date">Plus récent</option>
                  <option value="name">Par nom</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des réponses...</p>
            </div>
          </div>
        ) : filteredResponses.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-3xl mb-6 shadow-xl">
                  <HardDrive className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchTerm ? 'Aucune réponse trouvée' : 'Aucune réponse'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Les réponses de vos formulaires apparaîtront ici pour génération PDF'
                }
              </p>
              {!searchTerm && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 max-w-md mx-auto shadow-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Astuce :</strong> Créez un formulaire avec un template PDF pour commencer à recevoir des réponses
                  </p>
                  <Link to="/forms/new" className="mt-2 inline-block">
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                      Créer un formulaire
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map((response, index) => {
              return (
                <PDFCard
                  key={response.id}
                  response={response}
                  index={index}
                />
              );
            })}

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
                {Object.entries(selectedResponse.data).map(([key, value]) => {
                  if (value === undefined || value === null || value === '') return null;

                  return (
                    <div key={key} className="border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        {key}
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {typeof value === 'string' && value.startsWith('data:image') ? (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white text-xs">📷</span>
                              </div>
                              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                                Image/Signature
                              </span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700 shadow-inner">
                              <img
                                src={value}
                                alt={key}
                                className="max-w-full max-h-48 object-contain mx-auto rounded-lg shadow-md"
                              />
                            </div>
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
                          <p className="whitespace-pre-wrap font-semibold">{String(value)}</p>
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
                  </div>
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