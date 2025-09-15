import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFTemplateEditor } from '../../components/pdf/PDFTemplateEditor';
import { PDFField, PDFTemplate } from '../../types/pdf';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { useAuth } from '../../contexts/AuthContext';
import { useForms } from '../../hooks/useForms';
import { usePDFTemplates } from '../../hooks/usePDFTemplates';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export const EditPDFTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { forms, refetch: refetchForms } = useForms();
  const { templates, loading: templatesLoading } = usePDFTemplates();
  const { isDemoMode, updateDemoTemplate, updateDemoForm } = useDemo();
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldsReady, setFieldsReady] = useState(false);

  // Générer les variables à partir du formulaire lié
  const getFormVariables = () => {
    if (!template?.linkedFormId) {
      // Variables par défaut si aucun formulaire n'est lié
      return [
        '${nom}',
        '${prenom}',
        '${email}',
        '${telephone}',
        '${adresse}',
        '${date_naissance}',
        '${signature}',
        '${date_creation}',
      ];
    }
    
    try {
      // Essayer plusieurs sources de données
      let formsData = localStorage.getItem('currentUserForms');
      
      if (!formsData) {
        formsData = sessionStorage.getItem('currentUserForms');
      }
      
      if (!formsData) {
        formsData = localStorage.getItem('forms');
      }
      
      if (!formsData) {
        throw new Error('Aucune donnée de formulaires trouvée');
      }
      
      const forms = JSON.parse(formsData);
      
      const linkedForm = forms.find((f: any) => f.id === template.linkedFormId);
      
      if (linkedForm && linkedForm.fields) {
        const formVariables: string[] = [];
        
        // Fonction récursive pour extraire tous les champs, y compris conditionnels
        const extractFieldVariables = (fields: any[]) => {
          fields.forEach((field: any) => {
            // Ajouter le champ principal
            const variableName = field.label
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            
            formVariables.push(`\${${variableName}}`);
            
            // Ajouter les champs conditionnels s'ils existent
            if (field.conditionalFields) {
              Object.values(field.conditionalFields).forEach((conditionalFieldsArray: any) => {
                if (Array.isArray(conditionalFieldsArray)) {
                  extractFieldVariables(conditionalFieldsArray);
                }
              });
            }
          });
        };
        
        // Extraire tous les champs (principaux + conditionnels)
        extractFieldVariables(linkedForm.fields);
        
        // Supprimer les doublons
        const uniqueVariables = [...new Set(formVariables)];
        
        // Ajouter des variables système
        uniqueVariables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
      } else {
          }
    }
    
    // Variables par défaut en cas d'erreur
    return ['${nom}', '${email}', '${date_creation}'];
  };

  useEffect(() => {
    if (id && !templatesLoading && templates) {
      loadTemplate();
    }
  }, [id, templates, templatesLoading]);

  const loadTemplate = async () => {
    if (!id) return;
    
    try {
      // Utiliser les templates du hook qui gère déjà l'impersonation
      const foundTemplate = templates.find(t => t.id === id);
      
      if (foundTemplate) {
        setTemplate(foundTemplate);
        // Marquer les champs comme prêts après un délai
        setTimeout(() => {
          setFieldsReady(true);
        }, 1000);
      } else {
        toast.error('Template PDF non trouvé');
        navigate('/pdf/templates');
      }
    } catch (error) {
      toast.error('Erreur lors du chargement du template');
      navigate('/pdf/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fields: PDFField[], pdfFile: File) => {
    if (!template || !id) return;

    setSaving(true);
    
    try {
      if (!user && !isDemoMode) {
        toast.error('Vous devez être connecté pour modifier un template');
        return;
      }

      // Convertir le fichier PDF en Data URL pour le stockage
      const pdfDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      // Préparer les mises à jour
      const updates: Partial<PDFTemplate> = {
        name: template.name || pdfFile.name.replace('.pdf', ''),
        description: `Template PDF avec ${fields.length} champs`,
        fields: fields,
        originalPdfUrl: pdfDataUrl,
        pages: 1, // Placeholder
        linkedFormId: template.linkedFormId, // Préserver la liaison existante
      };

      if (isDemoMode) {
        // Mode démo : utiliser le contexte démo
        const success = updateDemoTemplate(id, updates);
        if (success) {
          toast.success('Template PDF mis à jour avec succès !');
          navigate('/pdf/templates');
        } else {
          toast.error('Erreur lors de la mise à jour du template');
        }
      } else {
        // Mode normal : mettre à jour dans Supabase
        const success = await PDFTemplateService.updateTemplate(id, updates);
        
        if (success) {
          toast.success('Template PDF mis à jour avec succès !');
          navigate('/pdf/templates');
        } else {
          toast.error('Erreur lors de la mise à jour du template');
        }
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormLinkChange = async (formId: string | null) => {
    if (!template || !id) return;

    try {
      // Vérifier si on est en mode démo
      if (isDemoMode) {
        // Mettre à jour le template en mode démo
        updateDemoTemplate(id, { linkedFormId: formId });
        
        // Mettre à jour le formulaire en mode démo si nécessaire
        if (formId) {
          updateDemoForm(formId, {
            settings: {
              pdfTemplateId: id,
              generatePdf: true,
            }
          });
        }
        
      } else {
        // Mettre à jour la liaison dans Supabase
        const success = await PDFTemplateService.linkTemplateToForm(id, formId);
        
        // IMPORTANT: Mettre à jour aussi le formulaire pour qu'il pointe vers ce template
        if (formId && user) {
          const selectedForm = forms.find(f => f.id === formId);
          
          if (!selectedForm) {
            await refetchForms();
            const refreshedForms = forms.find(f => f.id === formId);
            if (!refreshedForms) {
              toast.error('Formulaire non trouvé');
              return;
            }
          }
          
          try {
            const { error: formUpdateError } = await supabase
              .from('forms')
              .update({
                settings: {
                  ...selectedForm?.settings,
                  pdfTemplateId: id,
                  generatePdf: true, // Activer automatiquement la génération PDF
                }
              })
              .eq('id', formId)
              .eq('user_id', user.id);

            if (formUpdateError) {
              toast.error('Template lié mais erreur mise à jour formulaire');
            } else {
              // Rafraîchir la liste des formulaires pour refléter les changements
              await refetchForms();
            }
          } catch (formError) {
            toast.error('Template lié mais erreur mise à jour formulaire');
          }
        }
      }
      
      // Mettre à jour le template local
      setTemplate({ ...template, linkedFormId: formId });
      
      toast.success(formId ? 'Formulaire lié avec succès !' : 'Formulaire délié avec succès !');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la liaison du formulaire';
      toast.error(errorMessage);
    }
  };

  const handleTemplateNameChange = (name: string) => {
    setTemplate(prev => prev ? { ...prev, name } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Template non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <PDFTemplateEditor
      onSave={handleSave}
      initialFields={fieldsReady ? template.fields : []}
      formVariables={getFormVariables()}
      existingPdfUrl={template.originalPdfUrl}
      templateName={template.name}
      linkedFormId={template.linkedFormId}
      onFormLinkChange={handleFormLinkChange}
      onTemplateNameChange={handleTemplateNameChange}
      key={fieldsReady ? 'ready' : 'loading'}
    />
  );
};