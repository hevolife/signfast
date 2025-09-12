import { supabase } from '../lib/supabase';
import { PDFTemplate } from '../types/pdf';

export class PDFTemplateService {
  // CRÉER UN TEMPLATE PDF DANS SUPABASE
  static async createTemplate(template: Omit<PDFTemplate, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<string | null> {
    try {
      console.log('📄 Création template PDF dans Supabase');
      
      const { data, error } = await supabase
        .from('pdf_templates')
        .insert([{
          name: template.name,
          description: template.description,
          pdf_content: template.originalPdfUrl, // Base64 content
          fields: template.fields,
          user_id: userId,
          is_public: true, // IMPORTANT: Rendre public pour accès depuis formulaires
          linked_form_id: template.linkedFormId,
          pages: template.pages,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création template:', error);
        return null;
      }

      console.log('✅ Template créé avec succès:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Erreur création template:', error);
      return null;
    }
  }

  // RÉCUPÉRER UN TEMPLATE PAR ID (ACCÈS PUBLIC)
  static async getTemplate(templateId: string): Promise<PDFTemplate | null> {
    try {
      console.log('📄 Récupération template:', templateId);
      
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_public', true) // Seulement les templates publics
        .single();

      if (error) {
        console.error('❌ Template non trouvé:', error);
        return null;
      }

      // Convertir au format PDFTemplate
      const template: PDFTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        originalPdfUrl: data.pdf_content,
        fields: data.fields || [],
        linkedFormId: data.linked_form_id,
        pages: data.pages,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
      };

      console.log('✅ Template récupéré:', template.name);
      return template;
    } catch (error) {
      console.error('❌ Erreur récupération template:', error);
      return null;
    }
  }

  // LISTER LES TEMPLATES DE L'UTILISATEUR
  static async getUserTemplates(userId: string): Promise<PDFTemplate[]> {
    try {
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('📄 Supabase non configuré - retour liste vide');
        return [];
      }

      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('📄 Supabase non disponible - retour liste vide:', error.message);
        return [];
      }

      return data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        originalPdfUrl: item.pdf_content,
        fields: item.fields || [],
        linkedFormId: item.linked_form_id,
        pages: item.pages,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id,
      }));
    } catch (error) {
      console.error('❌ Erreur récupération templates:', error);
      return [];
    }
  }

  // METTRE À JOUR UN TEMPLATE
  static async updateTemplate(templateId: string, updates: Partial<PDFTemplate>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pdf_templates')
        .update({
          name: updates.name,
          description: updates.description,
          pdf_content: updates.originalPdfUrl,
          fields: updates.fields,
          linked_form_id: updates.linkedFormId,
          pages: updates.pages,
        })
        .eq('id', templateId);

      if (error) {
        console.error('❌ Erreur mise à jour template:', error);
        return false;
      }

      console.log('✅ Template mis à jour:', templateId);
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour template:', error);
      return false;
    }
  }

  // SUPPRIMER UN TEMPLATE
  static async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('❌ Erreur suppression template:', error);
        return false;
      }

      console.log('✅ Template supprimé:', templateId);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression template:', error);
      return false;
    }
  }

  // LIER UN TEMPLATE À UN FORMULAIRE
  static async linkTemplateToForm(templateId: string, formId: string | null): Promise<boolean> {
    try {
      console.log('🔗 Liaison template-formulaire:', templateId, '→', formId);
      
      const { error } = await supabase
        .from('pdf_templates')
        .update({ linked_form_id: formId || null })
        .eq('id', templateId);

      if (error) {
        console.error('❌ Erreur liaison template-formulaire:', error);
        return false;
      }

      console.log('✅ Template lié au formulaire:', templateId, '→', formId);
      
      // IMPORTANT: Mettre à jour aussi le formulaire pour qu'il pointe vers ce template
      if (formId) {
        try {
          // Récupérer les settings actuels du formulaire
          const { data: currentForm, error: getFormError } = await supabase
            .from('forms')
            .select('settings')
            .eq('id', formId)
            .single();

          if (!getFormError && currentForm) {
            const { error: formUpdateError } = await supabase
              .from('forms')
              .update({
                settings: {
                  ...currentForm.settings,
                  pdfTemplateId: templateId,
                  generatePdf: true, // Activer automatiquement la génération PDF
                }
              })
              .eq('id', formId);

            if (formUpdateError) {
              console.warn('⚠️ Erreur mise à jour settings formulaire:', formUpdateError);
            } else {
              console.log('✅ Settings formulaire mis à jour avec template ID');
            }
          }
        } catch (formError) {
          console.warn('⚠️ Erreur lors de la mise à jour du formulaire:', formError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur liaison template-formulaire:', error);
      return false;
    }
  }
}