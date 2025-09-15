import React, { useState, useEffect } from 'react';
import { useSubAccount } from '../../contexts/SubAccountContext';
import { supabase } from '../../lib/supabase';
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
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFDocument {
  id: string;
  file_name: string;
  template_name: string;
  form_title: string;
  user_name: string;
  file_size: number;
  created_at: string;
  pdf_content: string;
}

export const SubAccountDashboard: React.FC = () => {
  const { subAccount, mainAccountId, logoutSubAccount } = useSubAccount();
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (subAccount && mainAccountId) {
      fetchPDFs();
    }
  }, [subAccount, mainAccountId, currentPage]);

  const fetchPDFs = async () => {
    if (!mainAccountId) return;

    try {
      setLoading(true);
      
      // Configurer le token de session pour l'accès RLS
      const sessionToken = localStorage.getItem('sub_account_session_token');
      if (sessionToken) {
        await supabase.rpc('set_config', {
          parameter: 'app.sub_account_token',
          value: sessionToken
        });
      }

      const offset = (currentPage - 1) * itemsPerPage;

      // Récupérer le nombre total
      const { count, error: countError } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', mainAccountId);

      if (countError) {
        console.error('Erreur comptage PDFs:', countError);
        setTotalCount(0);
      } else {
        setTotalCount(count || 0);
      }

      // Récupérer les PDFs avec pagination
      const { data, error } = await supabase
        .from('pdf_storage')
        .select('*')
        .eq('user_id', mainAccountId)
        .range(offset, offset + itemsPerPage - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération PDFs:', error);
        setPdfs([]);
      } else {
        setPdfs(data || []);
      }
    } catch (error) {
      console.error('Erreur générale fetchPDFs:', error);
      setPdfs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (pdf: PDFDocument) => {
    try {
      if (!pdf.pdf_content) {
        toast.error('Contenu PDF non disponible');
        return;
      }

      // Convertir le contenu base64 en blob
      const base64Data = pdf.pdf_content.includes(',') 
        ? pdf.pdf_content.split(',')[1] 
        : pdf.pdf_content;
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
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
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleViewPDF = (pdf: PDFDocument) => {
    try {
      if (!pdf.pdf_content) {
        toast.error('Contenu PDF non disponible');
        return;
      }

      // Ouvrir le PDF dans un nouvel onglet
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${pdf.file_name}</title>
              <style>
                body { margin: 0; padding: 0; background: #f0f0f0; }
                iframe { width: 100vw; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${pdf.pdf_content}" type="application/pdf"></iframe>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Erreur visualisation:', error);
      toast.error('Erreur lors de la visualisation');
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
                onClick={fetchPDFs}
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
                Stockage PDF
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Accès aux documents PDF du compte principal
              </p>
              
              {totalCount > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  <span>{totalCount} document{totalCount > 1 ? 's' : ''} disponible{totalCount > 1 ? 's' : ''}</span>
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
                    placeholder="Rechercher dans les documents..."
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
                  <option value="size">Par taille</option>
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
              <p className="text-gray-600 dark:text-gray-400">Chargement des documents...</p>
            </div>
          </div>
        ) : filteredPdfs.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Aucun document trouvé' : 'Aucun document'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Aucun document PDF n\'est disponible pour le moment'
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
                    {/* Informations du document */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {pdf.file_name}
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>📝 Formulaire: {pdf.form_title}</div>
                            <div>📄 Template: {pdf.template_name}</div>
                            {pdf.user_name && (
                              <div>👤 Signataire: {pdf.user_name}</div>
                            )}
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
                              <span>{Math.round(pdf.file_size / 1024)} KB</span>
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
                        <span>Voir</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPDF(pdf)}
                        className="flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                      >
                        <Download className="h-4 w-4" />
                        <span>Télécharger</span>
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
                      Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} documents
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
      </div>
    </div>
  );
};