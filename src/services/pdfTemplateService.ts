import { supabase } from '../lib/supabase';
import { PDFTemplate } from '../types/pdf';
import { templatesCache, cachedRequest } from '../utils/cache';

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
        console.error('Error creating template:', error);
        return null;
      }

      // Invalider le cache après création
      templatesCache.invalidatePattern(`templates_${userId}`);

      return data.id;
    } catch (error) {
      console.error('Error in createTemplate:', error);
      return null;
    }
  }

  // RÉCUPÉRER UN TEMPLATE PAR ID (ACCÈS PUBLIC)
  static async getTemplate(templateId: string): Promise<PDFTemplate | null> {
    const cacheKey = `template_${templateId}`;

    try {
      return await cachedRequest(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('pdf_templates')
            .select('*')
            .eq('id', templateId)
            .eq('is_public', true)
            .single();

          if (error) {
            throw error;
          }

          // Convertir au format PDFTemplate
          return {
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
        },
        10 * 60 * 1000, // 10 minutes de cache pour les templates individuels
        templatesCache
      );
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  // LISTER LES TEMPLATES DE L'UTILISATEUR
  static async getUserTemplates(userId: string, page: number = 1, limit: number = 10): Promise<{
    templates: PDFTemplate[];
    totalCount: number;
    totalPages: number;
  }> {
    const cacheKey = `templates_${userId}_${page}_${limit}`;
    
    try {
      return await cachedRequest(
        cacheKey,
        async () => {
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
            throw countError;
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
            throw error;
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
        },
        3 * 60 * 1000, // 3 minutes de cache
        templatesCache
      );
    } catch (error) {
      console.error('Error getting user templates:', error);
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
        console.error('Error updating template:', error);
        return false;
      }

      // Invalider le cache après mise à jour
      templatesCache.invalidate(`template_${templateId}`);
      templatesCache.invalidatePattern(`templates_`);

      return true;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
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
        console.error('Error deleting template:', error);
        return false;
      }

      // Invalider le cache après suppression
      templatesCache.invalidate(`template_${templateId}`);
      templatesCache.invalidatePattern(`templates_`);

      return true;
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
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