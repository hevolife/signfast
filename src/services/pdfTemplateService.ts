import { supabase } from '../lib/supabase';
import { PDFTemplate } from '../types/pdf';

export class PDFTemplateService {
  // CRÉER UN TEMPLATE PDF DANS SUPABASE
  static async createTemplate(template: Omit<PDFTemplate, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<string | null> {
    try {
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
        return null;
      }

      return data.id;
    } catch (error) {
      return null;
    }
  }

  // RÉCUPÉRER UN TEMPLATE PAR ID (ACCÈS PUBLIC)
  static async getTemplate(templateId: string): Promise<PDFTemplate | null> {
    try {
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('Supabase non configuré, impossible de récupérer le template');
        return null;
      }

      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_public', true) // Templates publics accessibles à tous
        .single();

      if (error) {
        console.warn('Erreur récupération template public:', error);
        return null;
      }

      // Convertir au format PDFTemplate
      const template: PDFTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        originalPdfUrl: data.pdf_content,
        fields: (data.fields || []).map((field: any) => ({
          ...field,
          xRatio: typeof field.xRatio === 'number' ? field.xRatio : 0,
          yRatio: typeof field.yRatio === 'number' ? field.yRatio : 0,
          widthRatio: typeof field.widthRatio === 'number' ? field.widthRatio : 0.1,
          heightRatio: typeof field.heightRatio === 'number' ? field.heightRatio : 0.05,
        })),
        linkedFormId: data.linked_form_id,
        pages: data.pages,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
      };

      console.log('✅ Template public récupéré:', template.name, 'avec', template.fields.length, 'champs');
      return template;
    } catch (error) {
      console.error('❌ Erreur récupération template public:', error);
      return null;
    }
  }

  // LISTER LES TEMPLATES DE L'UTILISATEUR
  static async getUserTemplates(userId: string, page: number = 1, limit: number = 10): Promise<{
    templates: PDFTemplate[];
    totalCount: number;
    totalPages: number;
  }> {
    try {
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        return { templates: [], totalCount: 0, totalPages: 0 };
      }

      // Timeout pour éviter les blocages
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout Supabase')), 3000);
      });

      // Compter le total d'abord
      const countPromise = supabase
        .from('pdf_templates')
        .select('id', { count: 'estimated', head: true })
        .eq('user_id', userId);

      const { count, error: countError } = await Promise.race([countPromise, timeoutPromise]);

      if (countError) {
        return { templates: [], totalCount: 0, totalPages: 0 };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      // Récupérer les templates avec pagination
      const queryPromise = supabase
        .from('pdf_templates')
        .select('*')
        .eq('user_id', userId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        return { templates: [], totalCount: 0, totalPages: 0 };
      }

      const templates = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        originalPdfUrl: item.pdf_content,
        fields: (item.fields || []).map((field: any) => ({
          ...field,
          xRatio: typeof field.xRatio === 'number' ? field.xRatio : 0,
          yRatio: typeof field.yRatio === 'number' ? field.yRatio : 0,
          widthRatio: typeof field.widthRatio === 'number' ? field.widthRatio : 0.1,
          heightRatio: typeof field.heightRatio === 'number' ? field.heightRatio : 0.05,
        })),
        linkedFormId: item.linked_form_id,
        pages: item.pages,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id,
      }));

      return {
        templates,
        totalCount,
        totalPages
      };
    } catch (error) {
      return { templates: [], totalCount: 0, totalPages: 0 };
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
        return false;
      }

      return true;
    } catch (error) {
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
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // LIER UN TEMPLATE À UN FORMULAIRE
  static async linkTemplateToForm(templateId: string, formId: string | null): Promise<boolean> {
    try {
      // Vérifier que le template existe
      const { data: templateExists, error: checkError } = await supabase
        .from('pdf_templates')
        .select('id, name')
        .eq('id', templateId)
        .single();

      if (checkError || !templateExists) {
        return false;
      }

      const { error } = await supabase
        .from('pdf_templates')
        .update({ linked_form_id: formId || null })
        .eq('id', templateId);

      if (error) {
        return false;
      }

      // IMPORTANT: Mettre à jour aussi le formulaire pour qu'il pointe vers ce template
      if (formId) {
        try {
          // Vérifier que le formulaire existe
          const { data: formExists, error: checkFormError } = await supabase
            .from('forms')
            .select('id, title, settings')
            .eq('id', formId)
            .single();

          if (checkFormError || !formExists) {
            return false;
          }

          // Récupérer les settings actuels du formulaire
          const { error: formUpdateError } = await supabase
            .from('forms')
            .update({
              settings: {
                ...formExists.settings,
                pdfTemplateId: templateId,
                generatePdf: true, // Activer automatiquement la génération PDF
                savePdfToServer: true, // Activer aussi la sauvegarde
              }
            })
            .eq('id', formId);

          if (formUpdateError) {
            return false;
          } else {
            // Success
          }
        } catch (formError) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}