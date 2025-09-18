import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FormBuilder } from '../../components/form/FormBuilder';
import { PDFSettingsPanel } from '../../components/form/PDFSettingsPanel';
import { useForms } from '../../hooks/useForms';
import { FormField } from '../../types/form';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ExternalLink, Eye, Settings, Share2, FileText, Sparkles, Edit as EditIcon, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFTemplate } from '../../types/pdf';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { useSubscription } from '../../hooks/useSubscription';
import { stripeConfig } from '../../stripe-config';
import { QRCodeGenerator } from '../../components/form/QRCodeGenerator';

export const EditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { forms, updateForm, loading } = useForms();
  const { isSubscribed } = useSubscription();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (forms.length > 0 && id) {
      const foundForm = forms.find(f => f.id === id);
      if (foundForm) {
        setForm(foundForm);
      } else {
        navigate('/dashboard');
        toast.error('Formulaire non trouvé');
      }
    }
  }, [forms, id, navigate]);

  // Validate PDF template exists - removed to avoid localStorage conflicts in impersonation mode
  // Template validation is now handled in the PDFSettingsPanel component

  const handleSaveForm = async (fields: FormField[]) => {
    if (!form || !id) return;

    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ à votre formulaire');
      return;
    }

    setSaving(true);
    try {
      const success = await updateForm(id, { fields });
      
      if (success) {
        toast.success('Formulaire sauvegardé avec succès !');
        
        // Sauvegarder les formulaires dans localStorage ET sessionStorage pour les templates PDF
        const currentUserForms = forms.map(f => f.id === id ? { ...f, fields } : f);
        
        // En mode impersonation, utiliser l'ID de l'utilisateur cible
        const impersonationData = localStorage.getItem('admin_impersonation');
        if (impersonationData) {
          try {
            const data = JSON.parse(impersonationData);
          } catch (error) {
          }
        }
        
        localStorage.setItem('currentUserForms', JSON.stringify(currentUserForms));
        sessionStorage.setItem('currentUserForms', JSON.stringify(currentUserForms));
        
        // Aussi sauvegarder dans une variable globale
        if (typeof window !== 'undefined') {
          (window as any).currentUserForms = currentUserForms;
        }
        
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };
  const handlePublishForm = async () => {
    if (!form || !id) return;

    if (!form.fields || form.fields.length === 0) {
      toast.error('Ajoutez au moins un champ avant de publier');
      return;
    }

    setSaving(true);
    try {
      const success = await updateForm(id, { is_published: !form.is_published });
      if (success) {
        setForm({ ...form, is_published: !form.is_published });
        toast.success(form.is_published ? 'Formulaire dépublié' : 'Formulaire publié avec succès !');
      } else {
        toast.error('Erreur lors de la publication');
      }
    } catch (error) {
      toast.error('Erreur lors de la publication');
    } finally {
      setSaving(false);
    }
  };

  const copyFormLink = () => {
    const link = `${window.location.origin}/form/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié dans le presse-papiers !');
  };

  const openFormPreview = () => {
    window.open(`/form/${id}`, '_blank');
  };

  // Fonction pour lier un template PDF à ce formulaire
  const updatePDFTemplateFormLink = (templateId: string, formId: string) => {
    try {
      // Mettre à jour la liaison dans Supabase via le service
      PDFTemplateService.linkTemplateToForm(templateId, formId)
        .then(success => {
          if (success) {
            console.log('✅ Template lié au formulaire dans Supabase');
          } else {
            console.warn('⚠️ Erreur liaison template-formulaire dans Supabase');
          }
        })
        .catch(error => {
          console.error('❌ Erreur liaison template-formulaire:', error);
        });
      
      // Fallback localStorage pour compatibilité
      try {
        const templates = JSON.parse(localStorage.getItem('pdfTemplates') || '[]');
        const updatedTemplates = templates.map((template: PDFTemplate) => 
          template.id === templateId 
            ? { ...template, linkedFormId: formId }
            : template
        );
        localStorage.setItem('pdfTemplates', JSON.stringify(updatedTemplates));
        sessionStorage.setItem('pdfTemplates', JSON.stringify(updatedTemplates));
      } catch (error) {
        console.warn('Impossible de sauvegarder dans localStorage/sessionStorage:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la liaison du template au formulaire:', error);
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du formulaire...</p>
        </div>
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
                <EditIcon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                {form.title}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                {form.description || 'Éditez et configurez votre formulaire'}
              </p>
              
              {/* Actions principales dans le header */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {form.is_published && (
                  <Button
                    variant="ghost"
                    onClick={openFormPreview}
                    className="bg-green-500/80 backdrop-blur-sm text-white border border-green-400/30 hover:bg-green-600/80 font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                    disabled={!isSubscribed && forms.findIndex(f => f.id === id) >= stripeConfig.freeLimits.maxForms}
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    <span>Aperçu</span>
                  </Button>
                )}
                {form.is_published && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowQRCode(true)}
                    className="bg-purple-500/80 backdrop-blur-sm text-white border border-purple-400/30 hover:bg-purple-600/80 font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                    disabled={!isSubscribed && forms.findIndex(f => f.id === id) >= stripeConfig.freeLimits.maxForms}
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    <span>QR Code</span>
                  </Button>
                )}
                <Button
                  onClick={handlePublishForm}
                  disabled={saving}
                  className={`font-bold px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 ${
                    form.is_published 
                      ? 'bg-red-500/80 backdrop-blur-sm text-white border border-red-400/30 hover:bg-red-600/80'
                      : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
                  }`}
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  <span>{form.is_published ? 'Dépublier' : 'Publier'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu responsive avec scroll horizontal */}
        <div className="mb-8 sticky top-0 z-10 py-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 shadow-xl">
            <nav className="flex space-x-3 overflow-x-auto scrollbar-hide justify-center">
              <button
                onClick={() => setActiveTab('builder')}
                className={`py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${
                  activeTab === 'builder'
                    ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                  <span className="text-lg">🔧</span>
                  </div>
                  <span>Constructeur</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-100 hover:text-green-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                  <span className="text-lg">⚙️</span>
                  </div>
                  <span>Paramètres</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${
                  activeTab === 'pdf'
                    ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                  <span className="text-lg">📄</span>
                  </div>
                  <span>PDF</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('share')}
                className={`py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all active:scale-95 hover:scale-105 ${
                  activeTab === 'share'
                    ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 hover:text-orange-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/70 rounded-lg shadow-md">
                  <span className="text-lg">🔗</span>
                  </div>
                  <span>Partage</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'builder' && (
          <FormBuilder
            initialFields={form.fields || []}
            onSave={handleSaveForm}
            saving={saving}
          />
        )}

        {activeTab === 'settings' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Paramètres du formulaire
              </h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Input
                  label="Titre du formulaire"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                  }}
                  className="font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white font-medium shadow-lg transition-all"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultiple"
                  checked={form.settings?.allowMultiple || false}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      settings: { ...form.settings, allowMultiple: e.target.checked }
                    });
                  }}
                  className="text-blue-600"
                />
                <label htmlFor="allowMultiple" className="text-sm text-gray-700 dark:text-gray-300">
                  Autoriser plusieurs réponses par utilisateur
                </label>
              </div>
              
              {/* Bouton de sauvegarde pour les paramètres */}
              <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const success = await updateForm(id!, {
                        title: form.title,
                        description: form.description,
                        settings: form.settings
                      });
                      if (success) {
                        toast.success('Paramètres sauvegardés !');
                      } else {
                        toast.error('Erreur lors de la sauvegarde');
                      }
                    } catch (error) {
                      toast.error('Erreur lors de la sauvegarde');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </Button>
              </div>
              
              {/* Avertissement si génération PDF activée sans template */}
              {form.settings?.generatePdf && !form.settings?.pdfTemplateId && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800 shadow-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ⚠️ <strong>Génération PDF activée mais aucun template sélectionné !</strong>
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Allez dans l'onglet "PDF" pour configurer un template, sinon la génération échouera.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'pdf' && (
          <PDFSettingsPanel
            form={form}
            onUpdate={(updates) => {
              setForm({ ...form, ...updates });
              // Auto-save PDF settings
              if (id) {
                updateForm(id, updates);
                
                // Si un template PDF est sélectionné, mettre à jour sa liaison avec ce formulaire
                if (updates.settings?.pdfTemplateId) {
                  updatePDFTemplateFormLink(updates.settings.pdfTemplateId, id);
                }
              }
            }}
          />
        )}

        {activeTab === 'share' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Partager le formulaire
              </h2>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.is_published ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Lien public du formulaire
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={`${window.location.origin}/form/${id}`}
                      readOnly
                      className="flex-1 font-mono bg-gray-50 dark:bg-gray-800"
                    />
                    <Button onClick={copyFormLink} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                      Copier
                    </Button>
                    <Button onClick={openFormPreview} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 font-medium">
                    Partagez ce lien pour permettre aux utilisateurs de remplir votre formulaire
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                    Publiez votre formulaire pour générer un lien de partage
                  </p>
                  <Button onClick={handlePublishForm} disabled={saving} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5">
                    Publier le formulaire
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* QR Code Modal */}
        <QRCodeGenerator
          formId={id!}
          formTitle={form.title}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
        />
      </div>
    </div>
  );
};