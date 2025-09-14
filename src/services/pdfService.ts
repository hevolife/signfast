import { supabase } from '../lib/supabase';
import { stripeConfig } from '../stripe-config';
import { PDFGenerator } from '../utils/pdfGenerator';

export class PDFService {
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
      const { error } = await Promise.race([
        supabase.from('pdf_storage').insert([pdfData]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout sauvegarde métadonnées PDF')), 3000)
        )
      ]);

      if (error) {
        throw new Error(`Erreur sauvegarde métadonnées: ${error.message}`);
      }

      console.log('✅ Métadonnées PDF sauvegardées:', fileName);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde métadonnées PDF:', error);
      throw error;
    }
  }

  // COMPTER LES PDFS POUR UN UTILISATEUR SPÉCIFIQUE
  static async countPDFsForUser(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

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
              // Import direct pour éviter les problèmes de dépendance circulaire
              templateData = await this.getTemplateForGeneration(templateId);
              console.log('📄 Template récupéré via service');
            } catch (serviceError) {
              console.warn('⚠️ Erreur service template:', serviceError);
              
              // Fallback: accès direct Supabase
              const { data: templateFromDb, error: templateError } = await supabase
                .from('pdf_templates')
                .select('id, name, pdf_content, fields')
                .eq('id', templateId)
                .or('is_public.eq.true,linked_form_id.in.(select id from forms where is_published = true)')
                .single();
              
              if (!templateError && templateFromDb) {
                templateData = {
                  templateId: templateFromDb.id,
                  templateFields: templateFromDb.fields,
                  templatePdfContent: templateFromDb.pdf_content,
                };
                console.log('📄 Template récupéré depuis Supabase');
              } else {
                console.warn('⚠️ Template non trouvé dans Supabase:', templateError);
              }
            }
          }
        }
      }
      
      // FORCER L'UTILISATION DU TEMPLATE SI DISPONIBLE
      if (templateData?.templateId && templateData?.templatePdfContent) {
        console.log('📄 Génération avec template personnalisé');
        console.log('📄 Template ID:', templateData.templateId);
        console.log('📄 Nombre de champs template:', templateData.templateFields?.length || 0);
        console.log('📄 PDF content disponible:', !!templateData.templatePdfContent);
        
        // Reconstituer le template
        const template = {
          id: templateData.templateId,
          name: metadata.template_name,
          fields: templateData.templateFields || [], // Utiliser un tableau vide si pas de champs
          originalPdfUrl: templateData.templatePdfContent,
        };

        try {
          // Convertir le PDF template en bytes
          console.log('📄 Chargement du PDF template depuis:', template.originalPdfUrl.substring(0, 50) + '...');
          
          // Vérifier que l'URL du template est valide
          if (!template.originalPdfUrl || !template.originalPdfUrl.startsWith('data:application/pdf')) {
            console.warn('⚠️ URL du template PDF invalide, génération PDF simple');
            return await this.generateSimplePDF(metadata.form_data, metadata.form_title);
          }
          
          // Convertir directement depuis base64 si c'est un data URL
          let originalPdfBytes: Uint8Array;
          if (template.originalPdfUrl.startsWith('data:application/pdf')) {
            console.log('📄 Conversion depuis data URL base64');
            const base64Data = template.originalPdfUrl.split(',')[1];
            if (!base64Data) {
              console.warn('⚠️ Données base64 du template manquantes, génération PDF simple');
              return await this.generateSimplePDF(metadata.form_data, metadata.form_title);
            }
            const binaryString = atob(base64Data);
            originalPdfBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              originalPdfBytes[i] = binaryString.charCodeAt(i);
            }
          } else {
            // Fallback: fetch HTTP
            const pdfResponse = await fetch(template.originalPdfUrl);
            
            if (!pdfResponse.ok) {
              console.warn(`⚠️ Erreur HTTP ${pdfResponse.status}, génération PDF simple`);
              return await this.generateSimplePDF(metadata.form_data, metadata.form_title);
            }
            
            const pdfArrayBuffer = await pdfResponse.arrayBuffer();
            originalPdfBytes = new Uint8Array(pdfArrayBuffer);
          }
          
          console.log('📄 PDF template chargé, taille:', Math.round(originalPdfBytes.length / 1024), 'KB');

          // Importer le générateur PDF
          const { PDFGenerator } = await import('../utils/pdfGenerator');
          
          // Générer avec le template
          pdfBytes = await PDFGenerator.generatePDF(template, metadata.form_data, originalPdfBytes);
          console.log('📄 PDF généré avec template, taille finale:', Math.round(pdfBytes.length / 1024), 'KB');
        } catch (templateError) {
          console.error('❌ Erreur lors du chargement/génération avec template:', templateError);
          // Fallback vers PDF simple en cas d'erreur template
          console.log('📄 Fallback vers PDF simple suite à erreur template');
          pdfBytes = await this.generateSimplePDF(metadata.form_data, metadata.form_title);
        }
      } else {
        console.warn('⚠️ Template manquant ou incomplet');
        console.log('📄 Template data disponible:', {
          hasTemplateId: !!templateData?.templateId,
          hasFields: !!templateData?.templateFields,
          hasContent: !!templateData?.templatePdfContent
        });
        
        // Fallback vers PDF simple si template incomplet
        console.log('📄 Génération PDF simple (template incomplet)');
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
    try {
      // Récupérer l'utilisateur effectif (impersonation gérée par le contexte Auth)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return 0;
      }

      const targetUserId = user.id;
      console.log('💾 Comptage PDFs pour userId:', targetUserId);

      const { count, error } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      if (error) {
        console.warn('💾 Erreur comptage PDFs:', error);
        return 0;
      }

      console.log('💾 Nombre de PDFs:', count || 0);
      return count || 0;
    } catch (error) {
      console.error('💾 Erreur générale comptage PDFs:', error);
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
    try {
      console.log('💾 === DÉBUT listPDFs ===');
      
      // Cache plus agressif pour éviter les requêtes répétées
      const cacheKey = `pdf_list_${page}_${limit}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      // Utiliser le cache si moins de 10 secondes (cache plus court mais plus agressif)
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 10000) {
        console.log('💾 Utilisation cache pour listPDFs');
        return JSON.parse(cached);
      }
      
      // Récupérer l'utilisateur effectif (impersonation gérée par le contexte Auth)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('💾 Utilisateur non authentifié');
        return { pdfs: [], totalCount: 0, totalPages: 0 };
      }

      const targetUserId = user.id;
      console.log('💾 Liste PDFs pour userId:', targetUserId);
      
      // Requête ultra-optimisée : récupérer données et count en parallèle avec timeout
      const [countResult, dataResult] = await Promise.all([
        // Requête de comptage avec timeout
        Promise.race([
          supabase
            .from('pdf_storage')
            .select('id', { count: 'estimated', head: true })
            .eq('user_id', targetUserId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout count')), 2000)
          )
        ]),
        // Requête de données avec timeout
        Promise.race([
          supabase
            .from('pdf_storage')
            .select('file_name, response_id, template_name, form_title, file_size, created_at, form_data')
            .eq('user_id', targetUserId)
            .range((page - 1) * limit, page * limit - 1)
            .order('created_at', { ascending: false }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout data')), 3000)
          )
        ])
      ]);

      const { count: totalCount, error: countError } = countResult;
      const { data, error } = dataResult;

      if (error) {
        console.error('❌ Erreur récupération PDFs:', error);
        // En cas d'erreur, retourner les données du cache si disponibles
        if (cached) {
          console.log('💾 Fallback vers cache en cas d\'erreur');
          return JSON.parse(cached);
        }
        return { pdfs: [], totalCount: 0, totalPages: 0 };
      }

      if (countError) {
        console.warn('⚠️ Erreur comptage PDFs:', countError);
      }

      const total = totalCount || 0;
      const totalPages = Math.ceil(total / limit);

      const pdfs = (data || []).map(item => ({
        fileName: item.file_name,
        responseId: item.response_id || 'supabase',
        templateName: item.template_name || 'Template PDF',
        formTitle: item.form_title,
        createdAt: item.created_at,
        size: item.file_size || 0,
        formData: item.form_data || {}, // Charger les form_data pour l'affichage des noms
      }));

      console.log('💾 PDFs récupérés:', pdfs.length, 'sur', total);

      const result = {
        pdfs,
        totalCount: total,
        totalPages
      };
      
      // Mettre en cache le résultat
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        
        // Nettoyer les anciens caches
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('pdf_list_') && key !== cacheKey) {
            const timeKey = `${key}_time`;
            const time = sessionStorage.getItem(timeKey);
            if (!time || Date.now() - parseInt(time) > 60000) { // Supprimer les caches > 1 minute
              sessionStorage.removeItem(key);
              sessionStorage.removeItem(timeKey);
            }
          }
        }
      } catch (cacheError) {
        // Ignorer les erreurs de cache
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur générale listPDFs:', error);
      
      // En cas d'erreur générale, essayer le cache
      try {
        const cacheKey = `pdf_list_${page}_${limit}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          console.log('💾 Fallback cache en cas d\'erreur générale');
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Ignorer les erreurs de cache
      }
      
      return { pdfs: [], totalCount: 0, totalPages: 0 };
    }
  }

  // SUPPRIMER UN PDF
  static async deletePDF(fileName: string): Promise<boolean> {
    try {
      console.log('🗑️ Suppression PDF:', fileName);
      
      // Récupérer l'utilisateur effectif (impersonation gérée par le contexte Auth)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Utilisateur non authentifié pour suppression');
        return false;
      }

      const targetUserId = user.id;
      console.log('🗑️ Suppression PDF pour userId:', targetUserId);

      // Récupérer les métadonnées du PDF avant suppression pour identifier la réponse liée
      const { data: pdfData, error: fetchError } = await supabase
        .from('pdf_storage')
        .select('response_id')
        .eq('file_name', fileName)
        .eq('user_id', targetUserId)
        .single();

      if (fetchError) {
        console.warn('⚠️ Impossible de récupérer les métadonnées PDF:', fetchError);
      }

      // Supprimer l'enregistrement de la base de données
      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('file_name', fileName)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('❌ Erreur suppression base de données:', error);
        return false;
      }

      // Supprimer automatiquement la réponse liée si elle existe
      if (pdfData?.response_id) {
        console.log('🗑️ Suppression automatique de la réponse liée:', pdfData.response_id);
        
        const { error: responseError } = await supabase
          .from('responses')
          .delete()
          .eq('id', pdfData.response_id);

        if (responseError) {
          console.warn('⚠️ Erreur suppression réponse liée:', responseError);
          // Ne pas faire échouer la suppression du PDF pour autant
        } else {
          console.log('✅ Réponse liée supprimée avec succès');
        }
      }
      console.log('✅ PDF supprimé de la base de données:', fileName);
      return true;
    } catch (error) {
      console.error('❌ Erreur générale suppression PDF:', error);
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
    try {
      console.log('🗑️ Suppression de tous les PDFs...');
      
      // Récupérer l'utilisateur effectif (impersonation gérée par le contexte Auth)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Utilisateur non authentifié pour suppression massive');
        return;
      }

      const targetUserId = user.id;
      console.log('🗑️ Suppression massive PDFs pour userId:', targetUserId);

      // Récupérer tous les response_id avant suppression
      const { data: pdfDataList, error: fetchError } = await supabase
        .from('pdf_storage')
        .select('response_id')
        .eq('user_id', targetUserId)
        .not('response_id', 'is', null);

      if (fetchError) {
        console.warn('⚠️ Impossible de récupérer les métadonnées PDFs:', fetchError);
      }

      // Compter les PDFs avant suppression
      const { count: pdfCount } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      console.log('🗑️ Nombre de PDFs à supprimer:', pdfCount || 0);

      // Supprimer tous les PDFs de l'utilisateur
      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('user_id', targetUserId);

      if (error) {
        console.error('❌ Erreur suppression massive base de données:', error);
        throw new Error(`Erreur lors de la suppression: ${error.message}`);
      }

      // Supprimer automatiquement toutes les réponses liées
      if (pdfDataList && pdfDataList.length > 0) {
        const responseIds = pdfDataList.map(pdf => pdf.response_id).filter(Boolean);
        
        if (responseIds.length > 0) {
          console.log('🗑️ Suppression automatique des réponses liées:', responseIds.length, 'réponses');
          
          const { error: responsesError } = await supabase
            .from('responses')
            .delete()
            .in('id', responseIds);

          if (responsesError) {
            console.warn('⚠️ Erreur suppression réponses liées:', responsesError);
            // Ne pas faire échouer la suppression des PDFs pour autant
          } else {
            console.log('✅ Réponses liées supprimées avec succès:', responseIds.length);
          }
        }
      }
      console.log('✅ Tous les PDFs supprimés de la base de données:', pdfCount || 0, 'enregistrements');
    } catch (error) {
      console.error('❌ Erreur générale suppression massive:', error);
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

  // RÉCUPÉRER UN TEMPLATE POUR GÉNÉRATION (MÉTHODE INTERNE)
  private static async getTemplateForGeneration(templateId: string): Promise<any | null> {
    try {
      console.log('📄 Récupération template pour génération:', templateId);
      
      let { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_public', true)
        .single();

      if (error) {
        // Si le template n'est pas public, essayer de vérifier s'il est lié à un formulaire publié
        if (error.code === 'PGRST116') {
          console.log('📄 Template non public, vérification liaison formulaire...');
          
          const { data: linkedTemplate, error: linkedError } = await supabase
            .from('pdf_templates')
            .select(`
              *,
              forms!linked_form_id(is_published)
            `)
            .eq('id', templateId)
            .single();
          
          if (linkedError || !linkedTemplate) {
            console.error('❌ Template non trouvé:', linkedError);
            throw new Error(`Template PDF non trouvé: ${templateId}`);
          }
          
          // Vérifier si le formulaire lié est publié
          const isFormPublished = linkedTemplate.forms?.is_published;
          if (!isFormPublished) {
            console.error('❌ Template lié à un formulaire non publié');
            throw new Error(`Template PDF non accessible: formulaire non publié`);
          }
          
          console.log('✅ Template accessible via formulaire publié');
          data = linkedTemplate;
        } else {
          console.error('❌ Erreur récupération template:', error);
          throw new Error(`Template PDF non trouvé: ${templateId}`);
        }
      }

      console.log('✅ Template trouvé pour génération:', data.name);
      
      // Convertir au format attendu
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
    } catch (error) {
      console.error('❌ Erreur récupération template pour génération:', error);
      throw error;
    }
  }
}