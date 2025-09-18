import React from 'react';
import { Form } from '../../types/form';
import { usePDFTemplates } from '../../hooks/usePDFTemplates';
import { useOptimizedForms } from '../../hooks/useOptimizedForms';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, Mail, Webhook, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFSettingsPanelProps {
  form: Form;
  onUpdate: (updates: Partial<Form>) => void;
}

export const PDFSettingsPanel: React.FC<PDFSettingsPanelProps> = ({
  form,
  onUpdate,
}) => {
  const { templates, loading } = usePDFTemplates();
  const { forms, refetch: refetchForms } = useOptimizedForms();
  const [updatingTemplate, setUpdatingTemplate] = React.useState(false);
  const [testingWebhook, setTestingWebhook] = React.useState(false);

  const handleSettingsUpdate = (key: string, value: any) => {
    // Si on change de template PDF, mettre à jour la liaison dans le template
    if (key === 'pdfTemplateId' && value && value !== form.settings?.pdfTemplateId) {
      updateTemplateFormLink(value, form.id);
    }
    
    onUpdate({
      settings: {
        ...form.settings,
        [key]: value,
      },
    });
  };

  // Fonction pour mettre à jour la liaison template-formulaire
  const updateTemplateFormLink = async (templateId: string, formId: string) => {
    setUpdatingTemplate(true);
    try {
      console.log('🔗 Mise à jour liaison depuis formulaire:', templateId, '←→', formId);
      
      const success = await PDFTemplateService.linkTemplateToForm(templateId, formId);
      
      if (success) {
        console.log('✅ Liaison template-formulaire mise à jour');
        toast.success('Template PDF lié avec succès !');
        
        // Rafraîchir les données
        await refetchForms();
      } else {
        console.warn('⚠️ Erreur liaison template-formulaire');
        toast.error('Erreur lors de la liaison du template');
      }
    } catch (error) {
      console.error('❌ Erreur liaison:', error);
      toast.error('Erreur lors de la liaison du template');
    } finally {
      setUpdatingTemplate(false);
    }
  };

  const testWebhook = async () => {
    if (!form.settings?.webhookUrl) {
      toast.error('Veuillez saisir une URL de webhook');
      return;
    }

    setTestingWebhook(true);
    
    try {
      // Créer des données de test
      const testData = {
        test: true,
        form_id: form.id,
        form_title: form.title,
        timestamp: new Date().toISOString(),
        data: {
          nom: 'Test',
          email: 'test@example.com',
          message: 'Ceci est un test de webhook depuis SignFast'
        },
        webhook_test: true
      };

      console.log('🧪 Test webhook vers:', form.settings.webhookUrl);
      
      const response = await fetch(form.settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SignFast-Webhook-Test/1.0'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const responseText = await response.text();
        toast.success(`✅ Webhook testé avec succès ! (${response.status})`);
        console.log('✅ Réponse webhook:', responseText);
      } else {
        toast.error(`❌ Erreur webhook: ${response.status} ${response.statusText}`);
        console.error('❌ Erreur webhook:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Erreur test webhook:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error('❌ Impossible de joindre le webhook (CORS ou URL invalide)');
      } else {
        toast.error('❌ Erreur lors du test du webhook');
      }
    } finally {
      setTestingWebhook(false);
    }
  };
  // Générer les variables disponibles à partir des champs du formulaire
  const getFormVariables = () => {
    if (!form.fields) return [];
    
    // Utiliser un Set pour éviter les doublons
    const uniqueVariables = new Set<string>();
    
    // Traiter les champs principaux
    form.fields.forEach(field => {
      // Normaliser le nom du champ pour créer une variable
      const variableName = field.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
        .replace(/[^a-z0-9]/g, '_') // Remplacer les caractères spéciaux par _
        .replace(/_+/g, '_') // Éviter les _ multiples
        .replace(/^_|_$/g, ''); // Enlever les _ en début/fin
      
      const variable = `\${${variableName}}`;
      uniqueVariables.add(variable);
      
      // Traiter les champs conditionnels
      if (field.conditionalFields) {
        Object.values(field.conditionalFields).forEach((conditionalFieldsArray: any) => {
          if (Array.isArray(conditionalFieldsArray)) {
            conditionalFieldsArray.forEach((conditionalField: any) => {
              const conditionalVariableName = conditionalField.label
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
              
              const conditionalVariable = `\${${conditionalVariableName}}`;
              uniqueVariables.add(conditionalVariable);
            });
          }
        });
      }
    });
    
    // Ajouter des variables système uniques
    uniqueVariables.add('${date_creation}');
    uniqueVariables.add('${heure_creation}');
    uniqueVariables.add('${numero_reponse}');
    
    // Convertir le Set en Array et trier
    const variables = Array.from(uniqueVariables).sort();
    
    return variables;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Génération PDF
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configurez la génération automatique de PDF
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activer la génération PDF */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="generatePdf"
            checked={form.settings?.generatePdf || false}
            onChange={(e) => handleSettingsUpdate('generatePdf', e.target.checked)}
            className="text-blue-600"
          />
          <label htmlFor="generatePdf" className="text-sm text-gray-700 dark:text-gray-300">
            Générer un PDF automatiquement lors de l'envoi
          </label>
        </div>

        {form.settings?.generatePdf && (
          <>
            {/* Sélection du template PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template PDF (obligatoire)
              </label>
              {loading ? (
                <div className="text-sm text-gray-500">Chargement des templates...</div>
              ) : (
                <select
                  value={form.settings?.pdfTemplateId || ''}
                  onChange={(e) => {
                    const newTemplateId = e.target.value;
                    handleSettingsUpdate('pdfTemplateId', newTemplateId);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                  disabled={updatingTemplate}
                >
                  <option value="">⚠️ Sélectionner un template (obligatoire)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.linkedFormId === form.id ? '(lié à ce formulaire)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {updatingTemplate && (
                <div className="mt-2 flex items-center space-x-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Mise à jour de la liaison...</span>
                </div>
              )}
              
              {templates.length === 0 && !loading && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ❌ <strong>Aucun template PDF disponible !</strong>
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Vous devez créer un template PDF pour activer la génération.
                  </p>
                  <a 
                    href="/pdf/templates/new" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1 inline-flex items-center space-x-1"
                  >
                    <span>→ Créer un template PDF maintenant</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              
              {/* Afficher des informations sur le template sélectionné */}
              {form.settings?.pdfTemplateId && templates.length > 0 && (
                <div className="mt-2">
                  {(() => {
                    const selectedTemplate = templates.find(t => t.id === form.settings.pdfTemplateId);
                    if (selectedTemplate) {
                      return (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-800 dark:text-green-200">
                                ✅ <strong>Template sélectionné :</strong> {selectedTemplate.name}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                                {selectedTemplate.fields?.length || 0} champs configurés
                              </p>
                            </div>
                            <a
                              href={`/pdf/templates/${selectedTemplate.id}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 flex items-center space-x-1"
                              title="Modifier le template PDF"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            ❌ <strong>Template PDF introuvable !</strong>
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                            Le template sélectionné n'existe plus. Sélectionnez un autre template.
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              
              {!form.settings?.pdfTemplateId && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ <strong>Template PDF requis :</strong> Vous devez sélectionner un template pour que la génération PDF fonctionne.
                  </p>
                </div>
              )}
            </div>

            {/* Options d'envoi */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Options d'envoi du PDF
              </h4>

              {/* Envoi par email */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="emailPdf"
                  checked={form.settings?.emailPdf || false}
                  onChange={(e) => handleSettingsUpdate('emailPdf', e.target.checked)}
                  className="text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="emailPdf" className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                    <Mail className="h-4 w-4" />
                    <span>Envoyer le PDF par email</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Le PDF sera envoyé à l'adresse email fournie dans le formulaire
                  </p>
                </div>
              </div>

              {/* Sauvegarde sur serveur */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="savePdfToServer"
                  checked={form.settings?.savePdfToServer || false}
                  onChange={(e) => handleSettingsUpdate('savePdfToServer', e.target.checked)}
                  className="text-blue-600 mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="savePdfToServer" className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                    <FileText className="h-4 w-4" />
                    <span>Sauvegarder le PDF sur le serveur</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Le PDF sera stocké sur le serveur et accessible depuis le dashboard
                  </p>
                </div>
              </div>

              {/* Webhook */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Webhook className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Webhook URL (optionnel)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="https://votre-site.com/webhook"
                    value={form.settings?.webhookUrl || ''}
                    onChange={(e) => handleSettingsUpdate('webhookUrl', e.target.value || undefined)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={testWebhook}
                    disabled={!form.settings?.webhookUrl || testingWebhook}
                    className="flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                  >
                    {testingWebhook ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                    ) : (
                      <span>🧪</span>
                    )}
                    <span className="text-xs">{testingWebhook ? 'Test...' : 'Tester'}</span>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  URL où envoyer les données du formulaire et le PDF généré
                </p>
                {form.settings?.webhookUrl && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    💡 Cliquez sur "Tester" pour vérifier que votre webhook fonctionne
                  </div>
                )}
              </div>
            </div>

            {/* Mapping des champs */}
            {form.settings?.pdfTemplateId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Variables disponibles depuis ce formulaire
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                  Ces variables sont générées automatiquement à partir des champs de votre formulaire :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {getFormVariables().map((variable, index) => (
                    <div key={index} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                      <code className="text-blue-600 dark:text-blue-400">{variable}</code>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    📱 <strong>Note :</strong> La génération PDF sur mobile peut être plus lente et moins fiable. 
                    Pour une meilleure expérience, utilisez un ordinateur.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};