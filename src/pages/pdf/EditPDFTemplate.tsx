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
    console.log('📋 getFormVariables appelée, template.linkedFormId:', template?.linkedFormId);
    
    if (!template?.linkedFormId) {
      console.log('📋 Pas de formulaire lié, variables par défaut');
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
        console.log('📋 currentUserForms vide, essai sessionStorage...');
        formsData = sessionStorage.getItem('currentUserForms');
      }
      
      if (!formsData) {
        console.log('📋 sessionStorage vide, essai forms standard...');
        formsData = localStorage.getItem('forms');
      }
      
      if (!formsData) {
        console.log('📋 Aucune source de données trouvée');
        throw new Error('Aucune donnée de formulaires trouvée');
      }
      
      const forms = JSON.parse(formsData);
      console.log('📋 Forms chargés:', forms.length, 'formulaires');
      console.log('📋 Recherche formulaire ID:', template.linkedFormId);
      
      const linkedForm = forms.find((f: any) => f.id === template.linkedFormId);
      
      if (linkedForm && linkedForm.fields) {
        console.log('📋 Formulaire lié trouvé:', linkedForm.title);
        console.log('📋 Champs du formulaire:', linkedForm.fields.map((f: any) => f.label));
        
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
            console.log('📋 Variable ajoutée:', `\${${variableName}}`, 'depuis champ:', field.label);
            
            // Ajouter les champs conditionnels s'ils existent
            if (field.conditionalFields) {
              console.log('📋 Champs conditionnels trouvés pour:', field.label);
              console.log('📋 Options conditionnelles:', Object.keys(field.conditionalFields));
              Object.values(field.conditionalFields).forEach((conditionalFieldsArray: any) => {
                if (Array.isArray(conditionalFieldsArray)) {
                  console.log('📋 Extraction champs conditionnels:', conditionalFieldsArray.length, 'champs');
                  console.log('📋 Champs conditionnels:', conditionalFieldsArray.map((cf: any) => cf.label));
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
        
        console.log('📋 Variables extraites (avec conditionnels):', uniqueVariables);
        console.log('📋 Nombre total de variables:', uniqueVariables.length);
        
        // Ajouter des variables système
        uniqueVariables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
        
        console.log('📋 Variables finales:', uniqueVariables);
        return uniqueVariables;
      } else {
        console.warn('📋 Formulaire lié non trouvé ou sans champs');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du formulaire lié:', error);
    }
    
    // Variables par défaut en cas d'erreur
    console.log('📋 Retour aux variables par défaut');
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
      console.log('📄 Chargement template pour édition:', id);
      
      // Utiliser les templates du hook qui gère déjà l'impersonation
      const foundTemplate = templates.find(t => t.id === id);
      
      if (foundTemplate) {
        console.log('✅ Template trouvé:', foundTemplate.name);
        setTemplate(foundTemplate);
        // Marquer les champs comme prêts après un délai
        setTimeout(() => {
          console.log('🎯 Champs marqués comme prêts pour affichage');
          setFieldsReady(true);
        }, 1000);
      } else {
        console.error('❌ Template non trouvé:', id);
        toast.error('Template PDF non trouvé');
        navigate('/pdf/templates');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
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
        console.log('📄 Mode normal: mise à jour template dans Supabase');
        console.log('📄 Template ID:', id);
        console.log('📄 Updates:', updates);
        
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
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour du template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormLinkChange = async (formId: string | null) => {
    if (!template || !id) return;

    try {
      console.log('🔗 Début liaison template-formulaire:', id, '→', formId);
      
      // Vérifier si on est en mode démo
      if (isDemoMode) {
        console.log('🎭 Mode démo détecté, mise à jour locale');
        
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
        
        console.log('✅ Liaison démo réussie');
      } else {
        // Mettre à jour la liaison dans Supabase
        const success = await PDFTemplateService.linkTemplateToForm(id, formId);
        
        console.log('✅ Liaison Supabase réussie');
        
        // IMPORTANT: Mettre à jour aussi le formulaire pour qu'il pointe vers ce template
        if (formId && user) {
          console.log('🔗 Mise à jour du formulaire cible:', formId);
          const selectedForm = forms.find(f => f.id === formId);
          
          if (!selectedForm) {
            console.warn('⚠️ Formulaire non trouvé dans la liste locale, actualisation...');
            await refetchForms();
            const refreshedForms = forms.find(f => f.id === formId);
            if (!refreshedForms) {
              console.error('❌ Formulaire toujours non trouvé après actualisation');
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
              console.warn('⚠️ Erreur mise à jour formulaire:', formUpdateError);
              toast.error('Template lié mais erreur mise à jour formulaire');
            } else {
              console.log('✅ Formulaire mis à jour avec le template ID');
              // Rafraîchir la liste des formulaires pour refléter les changements
              await refetchForms();
              console.log('✅ Liste des formulaires actualisée');
            }
          } catch (formError) {
            console.warn('⚠️ Erreur lors de la mise à jour du formulaire:', formError);
            toast.error('Template lié mais erreur mise à jour formulaire');
          }
        }
      }
      
      // Mettre à jour le template local
      setTemplate({ ...template, linkedFormId: formId });
      
      toast.success(formId ? 'Formulaire lié avec succès !' : 'Formulaire délié avec succès !');
    } catch (error) {
      console.error('Erreur liaison formulaire:', error);
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