import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { FormBuilder } from '../../components/form/FormBuilder';
import { PDFSettingsPanel } from '../../components/form/PDFSettingsPanel';
import { useForms } from '../../hooks/useForms';
import { FormField } from '../../types/form';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ExternalLink, Eye, Settings, Share2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFTemplate } from '../../types/pdf';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { useSubscription } from '../../hooks/useSubscription';
import { stripeConfig } from '../../stripe-config';

export const EditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { forms, updateForm, loading } = useForms();
  const { isSubscribed } = useSubscription();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');

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

    console.log('🔧 === DÉBUT SAUVEGARDE FORMULAIRE ===');
    console.log('🔧 Form ID:', id);
    console.log('🔧 Nombre de champs:', fields.length);
    console.log('🔧 User depuis useAuth:', user?.id, user?.email);
    
    setSaving(true);
    try {
      console.log('🔧 Appel updateForm...');
      const success = await updateForm(id, { fields });
      console.log('🔧 Résultat updateForm:', success);
      
      if (success) {
        toast.success('Formulaire sauvegardé avec succès !');
        
        // Sauvegarder les formulaires dans localStorage ET sessionStorage pour les templates PDF
        const currentUserForms = forms.map(f => f.id === id ? { ...f, fields } : f);
        
        // En mode impersonation, utiliser l'ID de l'utilisateur cible
        const impersonationData = localStorage.getItem('admin_impersonation');
        if (impersonationData) {
          try {
            const data = JSON.parse(impersonationData);
            console.log('🎭 Sauvegarde formulaires pour utilisateur cible:', data.target_email);
          } catch (error) {
            console.error('Erreur parsing impersonation data:', error);
          }
        }
        
        localStorage.setItem('currentUserForms', JSON.stringify(currentUserForms));
        sessionStorage.setItem('currentUserForms', JSON.stringify(currentUserForms));
        
        // Aussi sauvegarder dans une variable globale
        if (typeof window !== 'undefined') {
          (window as any).currentUserForms = currentUserForms;
        }
        
        console.log('💾 Formulaires sauvegardés pour templates PDF:', currentUserForms.length);
        console.log('💾 Formulaire mis à jour:', {
          id,
          title: form.title,
          fieldsCount: fields.length,
          fieldLabels: fields.map(f => f.label)
        });
      } else {
        console.error('🔧 updateForm a retourné false');
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('🔧 Exception dans handleSaveForm:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      console.log('🔧 === FIN SAUVEGARDE FORMULAIRE ===');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {form.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {form.description || 'Aucune description'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {form.is_published && (
              <>
                <Button
                  variant="ghost"
                  onClick={openFormPreview}
                  className="flex items-center justify-center space-x-2 bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 [&>svg]:text-white"
                  disabled={!isSubscribed && forms.findIndex(f => f.id === id) >= stripeConfig.freeLimits.maxForms}
                >
                  <span className="flex items-center justify-center">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Aperçu</span>
                  </span>
                </Button>
              </>
            )}
            <Button
              onClick={handlePublishForm}
              disabled={saving}
              variant={form.is_published ? 'danger' : 'primary'}
              className="flex items-center justify-center space-x-2"
            >
              <span className="flex items-center justify-center">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{form.is_published ? 'Dépublier' : 'Publier'}</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Menu responsive avec scroll horizontal */}
        <div className="mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-1 sm:space-x-2 md:space-x-8 overflow-x-auto scrollbar-hide pb-0 justify-center">
              <button
                onClick={() => setActiveTab('builder')}
                className={`py-2 px-3 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'builder'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg'
                }`}
              >
                <span className="flex items-center justify-center">
                  <span className="text-lg">🔧</span>
                  <span className="hidden sm:inline ml-2">Constructeur</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg'
                }`}
              >
                <span className="flex items-center justify-center">
                  <span className="text-lg">⚙️</span>
                  <span className="hidden sm:inline ml-2">Paramètres</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`py-2 px-3 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'pdf'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg'
                }`}
              >
                <span className="flex items-center justify-center">
                  <span className="text-lg">📄</span>
                  <span className="hidden sm:inline ml-2">PDF</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('share')}
                className={`py-2 px-3 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'share'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg'
                }`}
              >
                <span className="flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                  <span className="hidden sm:inline ml-2">Partage</span>
                </span>
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
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  className="w-full"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </Button>
              </div>
              
              {/* Avertissement si génération PDF activée sans template */}
              {form.settings?.generatePdf && !form.settings?.pdfTemplateId && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
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
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Partager le formulaire
              </h2>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.is_published ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lien public du formulaire
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={`${window.location.origin}/form/${id}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button onClick={copyFormLink} variant="secondary">
                      Copier
                    </Button>
                    <Button onClick={openFormPreview} variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Partagez ce lien pour permettre aux utilisateurs de remplir votre formulaire
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Publiez votre formulaire pour générer un lien de partage
                  </p>
                  <Button onClick={handlePublishForm} disabled={saving}>
                    Publier le formulaire
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};