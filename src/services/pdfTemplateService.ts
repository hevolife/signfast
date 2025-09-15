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
      let { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_public', true)
        .single();

      if (error) {
        // Si le template n'est pas public, essayer de vérifier s'il est lié à un formulaire publié
        if (error.code === 'PGRST116') {
          const { data: linkedTemplate, error: linkedError } = await supabase
            .from('pdf_templates')
            .select(`
              *,
              forms!linked_form_id(is_published)
            `)
            .eq('id', templateId)
            .single();
          
          if (linkedError || !linkedTemplate) {
            return null;
          }
          
          // Vérifier si le formulaire lié est publié
          const isFormPublished = linkedTemplate.forms?.is_published;
          if (!isFormPublished) {
            return null;
          }
          
          data = linkedTemplate;
        } else {
          return null;
        }
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

      return template;
    } catch (error) {
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
      // Cache pour éviter les requêtes répétées
      const cacheKey = `pdf_templates_${userId}_${page}_${limit}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      // Utiliser le cache si moins de 30 secondes
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 30000) {
        return JSON.parse(cached);
      }
      
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        return { templates: [], totalCount: 0, totalPages: 0 };
      }

      // Requêtes parallèles optimisées
      const [countResult, dataResult] = await Promise.all([
        supabase
        .from('pdf_templates')
        .select('id', { count: 'estimated', head: true })
        .eq('user_id', userId),
        supabase
        .from('pdf_templates')
        .select('*')
        .eq('user_id', userId)
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      ]);

      const { count, error: countError } = countResult;
      const { data, error } = dataResult;
      
      if (countError) {
        return { templates: [], totalCount: 0, totalPages: 0 };
      }

      if (error) {
        return { templates: [], totalCount: 0, totalPages: 0 };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

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


      const result = {
        templates,
        totalCount,
        totalPages
      };
      
      // Mettre en cache le résultat
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      } catch (cacheError) {
        // Ignorer les erreurs de cache
      }
      
      return result;
    } catch (error) {
      return { templates: [], totalCount: 0, totalPages: 0 };
    }
  }

  // METTRE À JOUR UN TEMPLATE
  static async updateTemplate(templateId: string, updates: Partial<PDFTemplate>): Promise<boolean> {
    try {
      // Vérifier d'abord que le template existe et récupérer son user_id
      const { data: existingTemplate, error: checkError } = await supabase
        .from('pdf_templates')
        .select('user_id')
        .eq('id', templateId)
        .single();

      if (checkError || !existingTemplate) {
        return false;
      }


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
        .eq('id', templateId)
        .eq('user_id', existingTemplate.user_id);

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
      // Vérifier d'abord que le template existe et récupérer son user_id
      const { data: existingTemplate, error: checkError } = await supabase
        .from('pdf_templates')
        .select('user_id')
        .eq('id', templateId)
        .single();

      if (checkError || !existingTemplate) {
        return false;
      }


      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', existingTemplate.user_id);

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
        .maybeSingle();

      if (checkError || !templateExists) {
        throw new Error(`Erreur lors de la vérification du template: ${checkError.message}`);
      }

      const { error } = await supabase
        .from('pdf_templates')
        .update({ linked_form_id: formId || null })
        .eq('id', templateId);

      if (error) {
        throw new Error('Template PDF non trouvé');
      }

      // IMPORTANT: Mettre à jour aussi le formulaire pour qu'il pointe vers ce template
      if (formId) {
        // Vérifier que le formulaire existe
        const { data: formExists, error: checkFormError } = await supabase
          .from('forms')
          .select('id, settings')
          .eq('id', formId)
          .maybeSingle();

        if (checkFormError || !formExists) {
          throw new Error('Formulaire non trouvé');
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
          throw new Error(`Erreur lors de la mise à jour du formulaire: ${formUpdateError.message}`);
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}