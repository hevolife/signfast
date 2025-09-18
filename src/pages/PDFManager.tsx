import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDateTimeFR } from '../utils/dateFormatter';
import { useLimits } from '../hooks/useLimits';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useForms } from '../hooks/useForms';
import { SubscriptionBanner } from '../components/subscription/SubscriptionBanner';
import { LimitReachedModal } from '../components/subscription/LimitReachedModal';
import { stripeConfig } from '../stripe-config';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { FileText, Download, Trash2, Search, Calendar, HardDrive, RefreshCw, Lock, Crown, ArrowLeft, ArrowRight, Sparkles, Activity, Eye, User, Wifi, WifiOff } from 'lucide-react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

// Composant pour une carte PDF avec lazy loading
const PDFCard: React.FC<{
  pdf: any;
  index: number;
  onView: (pdf: any) => void;
  onDownload: (pdf: any) => void;
  onDelete: (pdf: any) => void;
}> = ({ pdf, index, onView, onDownload, onDelete }) => {
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Délai progressif pour effet de cascade
      const delay = index * 100;
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, index]);

  return (
    <div ref={ref} className="min-h-[200px]">
      {shouldRender ? (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-500">
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
                      {pdf.user_name || `Réponse #${pdf.response_id?.slice(-8) || 'N/A'}`}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>📝 Formulaire: {pdf.form_title}</div>
                      <div>📄 Template: {pdf.template_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        Fichier: {pdf.file_name}
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
                        <span>{formatDateTimeFR(pdf.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
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
                  onClick={() => onView(pdf)}
                  className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <Eye className="h-4 w-4" />
                  <span>Détails</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(pdf)}
                  className="flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                >
                  <Download className="h-4 w-4" />
                  <span>Télécharger</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(pdf)}
                  className="flex items-center space-x-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
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
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3"></div>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PDFCardWithActions: React.FC<{
  pdf: any;
  onDownload: (fileName: string, formTitle: string) => void;
  onDelete: (fileName: string, formTitle: string) => void;
}> = ({ pdf, onDownload, onDelete }) => {
  return (
    <div className="min-h-[200px]">
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-500">
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
                    {pdf.fileName}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>📝 Formulaire: {pdf.formTitle}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(pdf.fileName, pdf.formTitle)}
                className="flex items-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                title="Télécharger le PDF"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(pdf.fileName, pdf.formTitle)}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-xl"
                title="Supprimer le PDF"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PDFGenerationPage: React.FC = () => {
  const { user } = useAuth();
  const { forms, loading: formsLoading } = useForms();
  const { isSubscribed, product, hasSecretCode } = useSubscription();
  const { savedPdfsLimits } = useLimits();
  
  const [responses, setResponses] = useState<FormResponsePDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdfCards, setLoadingPdfCards] = useState(false);
  const [loadedResponsesCount, setLoadedResponsesCount] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedResponseForDetails, setSelectedResponseForDetails] = useState<FormResponsePDF | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 12;
  
  // Filtres et recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormFilter, setSelectedFormFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'form_title'>('date');