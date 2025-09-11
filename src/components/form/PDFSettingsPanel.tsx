import React from 'react';
import { Form } from '../../types/form';
import { usePDFTemplates } from '../../hooks/usePDFTemplates';
import { useForms } from '../../hooks/useForms';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { FileText, Mail, Webhook } from 'lucide-react';

interface PDFSettingsPanelProps {
  form: Form;
  onUpdate: (updates: Partial<Form>) => void;
}

export const PDFSettingsPanel: React.FC<PDFSettingsPanelProps> = ({
  form,
  onUpdate,
}) => {
  const { templates, loading } = usePDFTemplates();
  const { forms } = useForms();

  const handleSettingsUpdate = (key: string, value: any) => {
    onUpdate({
      settings: {
        ...form.settings,
        [key]: value,
      },
    });
  };

  // Générer les variables disponibles à partir des champs du formulaire
  const getFormVariables = () => {
    if (!form.fields) return [];
    
    console.log('📋 Génération variables pour formulaire:', form.title);
    console.log('📋 Champs disponibles:', form.fields.map(f => f.label));
    
    const variables = form.fields.map(field => {
      // Normaliser le nom du champ pour créer une variable
      const variableName = field.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
        .replace(/[^a-z0-9]/g, '_') // Remplacer les caractères spéciaux par _
        .replace(/_+/g, '_') // Éviter les _ multiples
        .replace(/^_|_$/g, ''); // Enlever les _ en début/fin
      
      return `\${${variableName}}`;
    });
    
    // Ajouter des variables système
    variables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
    
    console.log('📋 Variables générées:', variables);
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
                  onChange={(e) => handleSettingsUpdate('pdfTemplateId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">⚠️ Sélectionner un template (obligatoire)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              )}
              {templates.length === 0 && !loading && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ❌ <strong>Aucun template PDF disponible !</strong>
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Vous devez créer un template PDF pour activer la génération.
                  </p>
                  <a href="/pdf/templates/new" className="text-blue-600 hover:underline ml-1">
                    → Créer un template PDF maintenant
                  </a>
                </div>
              )}
              {form.settings?.pdfTemplateId && templates.length > 0 && !templates.find(t => t.id === form.settings.pdfTemplateId) && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Le template PDF sélectionné n'existe plus. Sélectionnez un autre template.
                  </p>
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
                <Input
                  placeholder="https://votre-site.com/webhook"
                  value={form.settings?.webhookUrl || ''}
                  onChange={(e) => handleSettingsUpdate('webhookUrl', e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  URL où envoyer les données du formulaire et le PDF généré
                </p>
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