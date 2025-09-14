import { supabase, isSupabaseReady } from '../lib/supabase';
import { stripeConfig } from '../stripe-config';
import { PDFGenerator } from '../utils/pdfGenerator';

// Cache pour les PDFs
const pdfCache = new Map<string, { data: any[]; timestamp: number; totalCount: number }>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes pour les PDFs (plus court car données plus volatiles)

export class PDFService {
  // Nettoyer le cache expiré
  private static cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of pdfCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        pdfCache.delete(key);
      }
    }
  }

  // Invalider le cache
  static invalidateCache() {
    pdfCache.clear();
  }

  // SAUVEGARDER LES MÉTADONNÉES PDF POUR GÉNÉRATION ULTÉRIEURE
  static async savePDFMetadataForLaterGeneration(
    fileName: string,
    metadata: {
      responseId: string;
      templateName: string;
      formTitle: string;
      formData: Record<string, any>;
      userId?: string;
      templateId?: string | null;
      templateFields?: any[] | null;
      templatePdfContent?: string | null;
    }
  ): Promise<boolean> {
    try {
      // IMPORTANT: Pour les formulaires publics, utiliser l'userId du propriétaire du formulaire
      const targetUserId = metadata.userId;
      
      if (!targetUserId) {
        throw new Error('Impossible de sauvegarder: propriétaire du formulaire non identifié');
      }
      
      // Vérifier les limites avant de sauvegarder
      let currentPdfsCount = 0;
      try {
        currentPdfsCount = await this.countPDFsForUser(targetUserId);
      } catch (error) {
        // Silent error
      }
      
      // Vérifier si l'utilisateur est abonné (via les données Supabase)
      let isSubscribed = false;
      try {
        // Vérifier l'abonnement Stripe
        const { data: stripeSubscription } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status')
          .eq('customer_id', targetUserId)
          .maybeSingle();
        
        const hasStripeAccess = stripeSubscription && 
                               (stripeSubscription.subscription_status === 'active' || 
                                stripeSubscription.subscription_status === 'trialing');
        
        // Vérifier les codes secrets
        const { data: secretCodeData, error: secretError } = await supabase
          .from('user_secret_codes')
          .select('expires_at, secret_codes!inner(type, is_active)')
          .eq('user_id', targetUserId)
          .eq('secret_codes.is_active', true);

        if (secretError) {
          // Silent error
        }

        let hasActiveSecretCode = false;
        if (secretCodeData && secretCodeData.length > 0) {
          // Vérifier chaque code
          for (const codeData of secretCodeData) {
            const codeType = codeData.secret_codes?.type;
            const expiresAt = codeData.expires_at;
            
            if (codeType === 'lifetime') {
              hasActiveSecretCode = true;
              break;
            } else if (codeType === 'monthly') {
              if (!expiresAt || new Date(expiresAt) > new Date()) {
                hasActiveSecretCode = true;
                break;
              }
            }
          }
        }
        
        // L'utilisateur est considéré comme abonné s'il a un abonnement Stripe OU un code secret actif
        isSubscribed = hasStripeAccess || hasActiveSecretCode;
      } catch (error) {
        isSubscribed = false;
      }
      
      // Vérifier les limites pour les utilisateurs gratuits
      if (!isSubscribed && currentPdfsCount >= stripeConfig.freeLimits.maxSavedPdfs) {
        throw new Error(`Limite de ${stripeConfig.freeLimits.maxSavedPdfs} PDFs sauvegardés atteinte. Passez Pro pour un stockage illimité.`);
      }
      
      // Nettoyer drastiquement les données pour éviter les timeouts
      const cleanFormData = this.cleanFormDataForStorage(metadata.formData);
      
      // Préparer les métadonnées du template pour stockage
      const templateMetadata = metadata.templateId ? {
        templateId: metadata.templateId,
        templateFields: metadata.templateFields,
        templatePdfContent: metadata.templatePdfContent,
      } : null;

      const pdfData = {
        file_name: fileName,
        response_id: metadata.responseId,
        template_name: metadata.templateName,
        form_title: metadata.formTitle,
        form_data: cleanFormData,
        pdf_content: templateMetadata ? JSON.stringify(templateMetadata) : '', // Stocker les métadonnées du template
        file_size: 0, // Sera calculé lors de la génération
        user_id: targetUserId,
      };

      // Sauvegarder dans Supabase avec timeout réduit
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout sauvegarde')), 2000)
      );

      const { error } = await Promise.race([
        supabase.from('pdf_storage').insert([pdfData]),
        timeoutPromise
      ]);

      if (error) {
        throw new Error(`Erreur sauvegarde métadonnées: ${error.message}`);
      }

      // Invalider le cache après insertion
      this.invalidateCache();
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  // COMPTER LES PDFS POUR UN UTILISATEUR SPÉCIFIQUE
  static async countPDFsForUser(userId: string): Promise<number> {
    try {
      // Timeout court pour le comptage
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );

      const countPromise = supabase
        .from('pdf_storage')
        .select('id', { count: 'estimated', head: true })
        .eq('user_id', userId);

      const { count, error } = await Promise.race([countPromise, timeoutPromise]);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  // NETTOYER LES DONNÉES DU FORMULAIRE POUR LE STOCKAGE (VERSION SYNCHRONE)
  private static cleanFormDataForStorage(formData: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.startsWith('data:image')) {
        // Conserver les images pour génération ultérieure
        const originalSize = Math.round(value.length / 1024);
        console.log(`💾 Conservation image ${key}: ${originalSize}KB`);
        
        if (originalSize > 2000) {
          // Compression légère si très gros (garde la qualité pour le PDF final)
          console.warn(`⚠️ Image ${key} très grosse (${originalSize}KB), compression légère`);
          cleaned[key] = this.lightCompress(value);
        } else {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  // COMPRESSION D'URGENCE POUR IMAGES TRÈS VOLUMINEUSES
  private static lightCompress(base64Image: string): string {
    try {
      const [header, data] = base64Image.split(',');
      if (!data) return base64Image;
      
      // Compression légère : prendre 3 caractères sur 4
      let compressedData = '';
      for (let i = 0; i < data.length; i += 4) {
        compressedData += data[i];
        if (i + 1 < data.length) compressedData += data[i + 1];
        if (i + 2 < data.length) compressedData += data[i + 2];
      }
      
      const result = `${header},${compressedData}`;
      console.log(`🗜️ Compression légère: ${Math.round(base64Image.length / 1024)}KB → ${Math.round(result.length / 1024)}KB`);
      
      return result;
    } catch (error) {
      console.error('Erreur compression légère:', error);
      return base64Image;
    }
  }

  // COMPRESSION D'IMAGE AVEC CANVAS
  private static async compressImageWithCanvas(base64Image: string, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Canvas context non disponible'));
              return;
            }
            
            // Calculer les nouvelles dimensions (réduire si trop grand)
            let { width, height } = img;
            const maxDimension = 1200; // Limite raisonnable
            
            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Fond blanc pour éviter la transparence
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // Dessiner l'image redimensionnée
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir en JPEG avec qualité spécifiée
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Impossible de charger l\'image'));
        };
        
        img.src = base64Image;
      } catch (error) {
        reject(error);
      }
    });
  }

  // COMPRESSION SIMPLE PAR ÉCHANTILLONNAGE
  private static compressImageSimple(base64Image: string): string {
    try {
      const [header, data] = base64Image.split(',');
      if (!data) throw new Error('Format base64 invalide');
      
      // Compression simple par échantillonnage (réduire de 50%)
      const originalSize = Math.round(base64Image.length / 1024);
      
      // Prendre 1 caractère sur 2 pour réduire la taille
      let compressedData = '';
      for (let i = 0; i < data.length; i += 2) {
        compressedData += data[i];
      }
      
      const compressedImage = `${header},${compressedData}`;
      const compressedSize = Math.round(compressedImage.length / 1024);
      
      return compressedImage;
    } catch (error) {
      return base64Image; // Retourner l'original en cas d'erreur
    }
  }

  // GÉNÉRER ET TÉLÉCHARGER UN PDF
  static async generateAndDownloadPDF(fileName: string): Promise<boolean> {
    try {
      console.log('📄 === GÉNÉRATION PDF À LA DEMANDE ===');
      console.log('📄 Fichier demandé:', fileName);
      
      // 1. Récupérer les métadonnées
      const metadata = await this.getPDFMetadata(fileName);
      if (!metadata) {
        console.error('❌ Métadonnées non trouvées pour:', fileName);
        return false;
      }

      console.log('📄 Métadonnées récupérées:', {
        templateName: metadata.template_name,
        formTitle: metadata.form_title,
        hasFormData: !!metadata.form_data,
        hasPdfContent: !!metadata.pdf_content
      });
      // 2. Générer le PDF
      let pdfBytes: Uint8Array;
      let templateData: any = null;
      
      // Récupérer les métadonnées du template
      if (metadata.pdf_content) {
        try {
          // Essayer de parser les métadonnées du template
          templateData = JSON.parse(metadata.pdf_content);
          console.log('📄 Template data récupéré:', {
            hasTemplateId: !!templateData?.templateId,
            hasFields: !!templateData?.templateFields,
            hasContent: !!templateData?.templatePdfContent
          });
        } catch (error) {
          console.warn('⚠️ Erreur parsing template metadata:', error);
          
          // Fallback: essayer comme ID de template simple
          const templateId = metadata.pdf_content;
          if (templateId && templateId.length < 100) {
            console.log('📄 Tentative récupération template par ID:', templateId);
            try {
              const { data: templateFromDb, error: templateError } = await supabase
                .from('pdf_templates')
                .select('id, name, pdf_content, fields')
                .eq('id', templateId)
                .eq('is_public', true)
                .single();
              
              if (!templateError && templateFromDb) {
                templateData = {
                  templateId: templateFromDb.id,
                  templateFields: templateFromDb.fields,
                  templatePdfContent: templateFromDb.pdf_content,
                };
                console.log('📄 Template récupéré depuis Supabase');
              }
            } catch (dbError) {
              console.warn('⚠️ Erreur récupération template depuis DB:', dbError);
            }
          }
        }
      }
      
      if (templateData?.templateId && templateData?.templateFields && templateData?.templatePdfContent) {
        console.log('📄 Génération avec template personnalisé');
        // Reconstituer le template
        const template = {
          id: templateData.templateId,
          name: metadata.template_name,
          fields: templateData.templateFields,
          originalPdfUrl: templateData.templatePdfContent,
        };

        // Convertir le PDF template en bytes
        const pdfResponse = await fetch(template.originalPdfUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const originalPdfBytes = new Uint8Array(pdfArrayBuffer);

        // Générer avec le template
        pdfBytes = await PDFGenerator.generatePDF(template, metadata.form_data, originalPdfBytes);
      } else {
        console.log('📄 Génération PDF simple');
        // Générer un PDF simple
        pdfBytes = await this.generateSimplePDF(metadata.form_data, metadata.form_title);
      }

      console.log('📄 PDF généré, taille:', Math.round(pdfBytes.length / 1024), 'KB');

      // 3. Télécharger directement
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 4. Optionnel : mettre à jour la taille du fichier en base
      await this.updatePDFSize(fileName, pdfBytes.length);

      console.log('✅ PDF généré et téléchargé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur génération PDF à la demande:', error);
      return false;
    }
  }

  // RÉCUPÉRER LES MÉTADONNÉES PDF
  private static async getPDFMetadata(fileName: string): Promise<any | null> {
    try {
      // Essayer Supabase d'abord
      try {
        const { data, error } = await supabase
          .from('pdf_storage')
          .select('file_name, response_id, template_name, form_title, form_data, pdf_content, file_size, created_at, updated_at')
          .eq('file_name', fileName)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

        if (error) {
          // Silent error
        } else if (data) {
          return data;
        }
      } catch (supabaseError) {
        // Silent error
      }

      // Fallback localStorage
      const localPDFs = this.getLocalPDFs();
      const localData = localPDFs[fileName];
      
      if (localData) {
        return localData;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // METTRE À JOUR LA TAILLE DU FICHIER
  private static async updatePDFSize(fileName: string, size: number): Promise<void> {
    try {
      await supabase
        .from('pdf_storage')
        .update({ file_size: size })
        .eq('file_name', fileName);
    } catch (error) {
      // Silent error
    }
  }

  // COMPTER LES PDFS (optimisé pour éviter les timeouts)
  static async countPDFs(): Promise<number> {
    if (!isSupabaseReady) return 0;

    try {
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return 0;
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
        } catch (error) {
          // Silent error
        }
      }

      const { count, error } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  // LISTER LES PDFS (métadonnées uniquement)
  static async listPDFs(page: number = 1, limit: number = 10): Promise<{
    pdfs: Array<{
    fileName: string;
    responseId: string;
    templateName: string;
    formTitle: string;
    createdAt: string;
    size: number;
    formData: Record<string, any>;
    }>;
    totalCount: number;
    totalPages: number;
  }> {
    if (!isSupabaseReady) {
      return { pdfs: [], totalCount: 0, totalPages: 0 };
    }

    try {
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { pdfs: [], totalCount: 0, totalPages: 0 };
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
        } catch (error) {
          // Silent error
        }
      }
      
      // Vérifier le cache
      const cacheKey = `pdfs-${targetUserId}-${page}-${limit}`;
      this.cleanExpiredCache();
      
      const cached = pdfCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        const totalPages = Math.ceil(cached.totalCount / limit);
        return {
          pdfs: cached.data,
          totalCount: cached.totalCount,
          totalPages
        };
      }

      // Requêtes parallèles optimisées
      const countPromise = supabase
        .from('pdf_storage')
        .select('id', { count: 'estimated', head: true })
        .eq('user_id', targetUserId);

      const offset = (page - 1) * limit;

      const dataPromise = supabase
        .from('pdf_storage')
        .select('file_name, response_id, template_name, form_title, file_size, created_at')
        .eq('user_id', targetUserId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Timeout global

      const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

      const [{ count, error: countError }, { data, error: dataError }] = countResult;

      if (countError || dataError) {
        return { pdfs: [], totalCount: 0, totalPages: 0 };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const pdfs = (data || []).map(item => ({
        fileName: item.file_name,
        responseId: item.response_id || 'supabase',
        templateName: item.template_name || 'Template PDF',
        formTitle: item.form_title,
        createdAt: item.created_at,
        size: item.file_size || 0,
        formData: {}, // Charger à la demande pour économiser la mémoire
      }));

      // Mettre en cache
      pdfCache.set(cacheKey, {
        data: pdfs,
        totalCount,
        timestamp: Date.now()
      });

      return {
        pdfs,
        totalCount,
        totalPages
      };
    } catch (error) {
      return { pdfs: [], totalCount: 0, totalPages: 0 };
    }
  }

  // CHARGER LES DONNÉES D'UN PDF SPÉCIFIQUE (à la demande)
  static async getPDFFormData(fileName: string): Promise<Record<string, any>> {
    if (!isSupabaseReady) return {};

    try {
      const { data, error } = await supabase
        .from('pdf_storage')
        .select('form_data')
        .eq('file_name', fileName)
        .single();

      if (error) return {};
      return data.form_data || {};
    } catch (error) {
      return {};
    }
  }

  // SUPPRIMER UN PDF
  static async deletePDF(fileName: string): Promise<boolean> {
    if (!isSupabaseReady) return false;

    try {
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return false;
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
        } catch (error) {
          // Silent error
        }
      }

      // Requête optimisée pour récupérer seulement le response_id
      const { data: pdfData } = await supabase
        .from('pdf_storage')
        .select('response_id')
        .eq('file_name', fileName)
        .eq('user_id', targetUserId)
        .maybeSingle();

      // Supprimer l'enregistrement de la base de données
      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('file_name', fileName)
        .eq('user_id', targetUserId);

      if (error) {
        return false;
      }

      // Supprimer automatiquement la réponse liée si elle existe
      if (pdfData?.response_id) {
        await supabase
          .from('responses')
          .delete()
          .eq('id', pdfData.response_id);
      }

      // Invalider le cache
      this.invalidateCache();
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // GÉNÉRER PDF SIMPLE
  static async generateSimplePDF(
    formData: Record<string, any>,
    formTitle: string
  ): Promise<Uint8Array> {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Titre
      doc.setFontSize(16);
      doc.text(formTitle, 20, 20);
      
      // Infos
      doc.setFontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
      
      // Données
      let yPosition = 50;
      doc.setFontSize(12);
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && !value.startsWith('data:image')) {
          const text = `${key}: ${value}`;
          doc.text(text, 20, yPosition);
          yPosition += 10;
          
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
        }
      });
      
      return new Uint8Array(doc.output('arraybuffer'));
    } catch (error) {
      console.error('🎯 Erreur génération PDF simple:', error);
      throw error;
    }
  }

  // NETTOYER TOUS LES PDFS
  static async clearAllPDFs(): Promise<void> {
    if (!isSupabaseReady) {
      throw new Error('Supabase non configuré');
    }

    try {
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
        } catch (error) {
          // Silent error
        }
      }

      // Requête optimisée pour récupérer seulement les response_id
      const { data: pdfDataList } = await supabase
        .from('pdf_storage')
        .select('response_id')
        .eq('user_id', targetUserId)
        .not('response_id', 'is', null);

      // Supprimer tous les PDFs de l'utilisateur
      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('user_id', targetUserId);

      if (error) {
        throw new Error(`Erreur lors de la suppression: ${error.message}`);
      }

      // Supprimer automatiquement toutes les réponses liées
      if (pdfDataList && pdfDataList.length > 0) {
        const responseIds = pdfDataList.map(pdf => pdf.response_id).filter(Boolean);
        
        if (responseIds.length > 0) {
          await supabase
            .from('responses')
            .delete()
            .in('id', responseIds);
        }
      }

      // Invalider le cache
      this.invalidateCache();
      
    } catch (error) {
      throw error;
    }
  }

  // GET LOCAL PDFS
  private static getLocalPDFs(): Record<string, any> {
    try {
      const localData = localStorage.getItem('saved_pdfs');
      return localData ? JSON.parse(localData) : {};
    } catch (error) {
      return {};
    }
  }
}