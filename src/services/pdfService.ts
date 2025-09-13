import { supabase } from '../lib/supabase';
import { stripeConfig } from '../stripe-config';
import { PDFGenerator } from '../utils/pdfGenerator';

export class PDFService {
  // SAUVEGARDER LES MÉTADONNÉES PDF (sans générer le PDF)
  static async savePDFMetadata(
    fileName: string,
    metadata: {
      responseId: string;
      templateName: string;
      formTitle: string;
      formData: Record<string, any>;
      templateId?: string;
      templateFields?: any[];
      templatePdfContent?: string;
      userId?: string;
    }
  ): Promise<boolean> {
    try {
      // IMPORTANT: Pour les formulaires publics, utiliser l'userId du propriétaire du formulaire
      const targetUserId = metadata.userId;
      
      if (!targetUserId) {
        console.error('💾 ❌ ERREUR: userId manquant dans les métadonnées');
        throw new Error('Impossible de sauvegarder: propriétaire du formulaire non identifié');
      }
      
      console.log('💾 Sauvegarde PDF pour le propriétaire du formulaire:', targetUserId);

      // Vérifier les limites avant de sauvegarder
      let currentPdfsCount = 0;
      try {
        currentPdfsCount = await this.countPDFsForUser(targetUserId);
      } catch (error) {
        console.warn('💾 Impossible de compter les PDFs, on continue:', error);
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
          console.warn('💾 Erreur vérification codes secrets:', secretError);
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
        
        console.log('💾 Vérification abonnement:', {
          hasStripeAccess,
          hasActiveSecretCode,
          isSubscribed,
          currentPdfsCount,
          limit: stripeConfig.freeLimits.maxSavedPdfs
        });
      } catch (error) {
        console.warn('💾 Erreur vérification abonnement:', error);
        isSubscribed = false;
      }
      
      // Vérifier les limites pour les utilisateurs gratuits
      if (!isSubscribed && currentPdfsCount >= stripeConfig.freeLimits.maxSavedPdfs) {
        console.warn('💾 Limite de PDFs sauvegardés atteinte pour utilisateur gratuit');
        throw new Error(`Limite de ${stripeConfig.freeLimits.maxSavedPdfs} PDFs sauvegardés atteinte. Passez Pro pour un stockage illimité.`);
      }
      
      console.log('💾 Sauvegarde métadonnées PDF:', fileName);
      
      // Nettoyer les données du formulaire pour éviter les problèmes de quota
      const cleanFormData = await this.cleanFormDataForStorage(metadata.formData);
      
      // Stocker seulement l'ID du template pour éviter les gros volumes
      let templateId = null;
      if (metadata.templateId) {
        templateId = metadata.templateId;
        console.log(`💾 Template ID à stocker: ${templateId}`);
      }

      const pdfData = {
        file_name: fileName,
        response_id: metadata.responseId,
        template_name: metadata.templateName,
        form_title: metadata.formTitle,
        form_data: cleanFormData,
        pdf_content: templateId || '', // Stocker seulement l'ID du template
        file_size: 0, // Sera calculé au téléchargement
        user_id: targetUserId,
      };

      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('pdf_storage')
        .insert([pdfData]);

      if (error) {
        console.error('💾 ❌ Erreur Supabase:', error);
        throw new Error(`Erreur de sauvegarde: ${error.message}`);
      }

      console.log('💾 Métadonnées sauvegardées dans Supabase');
      return true;
    } catch (error) {
      console.error('💾 Erreur sauvegarde métadonnées:', error);
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
        console.error('💾 Erreur count pour user:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('💾 Erreur count PDFs pour user:', error);
      return 0;
    }
  }

  // NETTOYER LES DONNÉES DU FORMULAIRE POUR LE STOCKAGE
  private static cleanFormDataForStorage(formData: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      // Garder les images sans compression pour éviter la corruption
      if (typeof value === 'string' && value.startsWith('data:image')) {
        const originalSize = Math.round(value.length / 1024);
        console.log(`💾 Image ${key}: ${originalSize}KB (sans compression)`);
        
        // Si l'image est très grosse (> 2MB), essayer de la compresser intelligemment
        if (value.length > 2000000) {
          console.log(`💾 🔧 Image très grosse (${originalSize}KB), compression intelligente...`);
          try {
            const compressed = this.intelligentImageCompression(value, 1500); // Max 1.5MB
            const compressedSize = Math.round(compressed.length / 1024);
            console.log(`💾 ✅ Compression réussie: ${originalSize}KB → ${compressedSize}KB`);
            cleaned[key] = compressed;
          } catch (error) {
            console.warn(`💾 ❌ Compression échouée, remplacement par placeholder:`, error);
            cleaned[key] = '[IMAGE_TOO_LARGE_REMOVED]';
          }
        } else if (value.length > 1000000) {
          console.log(`💾 🔧 Image grosse (${originalSize}KB), compression légère...`);
          try {
            const compressed = this.intelligentImageCompression(value, 800); // Max 800KB
            const compressedSize = Math.round(compressed.length / 1024);
            console.log(`💾 ✅ Compression légère réussie: ${originalSize}KB → ${compressedSize}KB`);
            cleaned[key] = compressed;
          } catch (error) {
            console.warn(`💾 ❌ Compression légère échouée, image originale conservée:`, error);
            cleaned[key] = value; // Garder l'original en cas d'erreur
          }
        } else {
          // Garder l'image originale sans compression
          cleaned[key] = value;
        }
      } else if (typeof value === 'string' && value.length > 200) {
        // Tronquer les textes très longs
        cleaned[key] = value.substring(0, 200) + '...';
      } else {
        // Garder toutes les autres données normales
        cleaned[key] = value;
      }
    });
    
    // Calculer la taille totale pour debug
    const totalSize = JSON.stringify(cleaned).length;
    const totalSizeKB = Math.round(totalSize / 1024);
    console.log(`💾 Taille totale des données après nettoyage: ${totalSizeKB}KB`);
    
    // Si encore trop gros, mesures d'urgence (seuil très augmenté)
    if (totalSize > 3000000) { // Plus de 3MB (très tolérant)
      console.log(`💾 🚨 MESURES D'URGENCE: ${totalSizeKB}KB > 3MB`);
      
      // Étape 1: Compresser davantage les images non-signatures les plus grosses
      Object.keys(cleaned).forEach(key => {
        const value = cleaned[key];
        if (typeof value === 'string' && value.startsWith('data:image')) {
          const isSignature = key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign');
          
          if (!isSignature && value.length > 1500000) { // 1.5MB pour images normales
            // Compression ultra-agressive pour les très grosses images
            console.log(`💾 Compression ultra-agressive image: ${key} (${Math.round(value.length/1024)}KB)`);
            try {
              cleaned[key] = this.intelligentImageCompression(value, 800); // Compresser vers 800KB
            } catch (error) {
              console.log(`💾 Compression échouée, remplacement par placeholder: ${key}`);
              cleaned[key] = '[IMAGE_COMPRESSION_FAILED]';
            }
          } else if (isSignature && value.length > 2000000) { // 2MB pour signatures
            // Compression agressive pour les signatures énormes
            console.log(`💾 Compression signature énorme: ${key} (${Math.round(value.length/1024)}KB)`);
            try {
              cleaned[key] = this.intelligentImageCompression(value, 1000); // Compresser vers 1MB
            } catch (error) {
              console.log(`💾 Compression signature échouée, remplacement par placeholder: ${key}`);
              cleaned[key] = '[SIGNATURE_COMPRESSION_FAILED]';
            }
          }
        }
      });
      
      // Étape 2: Tronquer les textes encore plus
      Object.keys(cleaned).forEach(key => {
        const value = cleaned[key];
        if (typeof value === 'string' && !value.startsWith('data:image') && value.length > 100) {
          cleaned[key] = value.substring(0, 100) + '...';
        }
      });
      
      const newSize = JSON.stringify(cleaned).length;
      const newSizeKB = Math.round(newSize / 1024);
      console.log(`💾 Taille après mesures d'urgence: ${totalSizeKB}KB → ${newSizeKB}KB`);
      
      // Si ENCORE trop gros (très rare maintenant), garder seulement l'essentiel
      if (newSize > 4000000) { // 4MB - seuil très élevé
        console.log(`💾 🆘 RÉDUCTION DRASTIQUE: ${newSizeKB}KB > 4MB - cas extrême`);
        const essentialData: Record<string, any> = {};
        let signatureCount = 0;
        let imageCount = 0;
        for (const key of Object.keys(cleaned)) {
          if (typeof cleaned[key] === 'string' && cleaned[key].startsWith('data:image')) {
            if (key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign')) {
              if (signatureCount < 5 && cleaned[key].length < 1000000) { // Max 5 signatures < 1MB
                essentialData[key] = cleaned[key]; // Garder sans compression
                signatureCount++;
              }
            } else {
              // Garder les images normales importantes
              if (imageCount < 3 && cleaned[key].length < 800000) { // Max 3 images < 800KB
                essentialData[key] = cleaned[key];
                imageCount++;
              }
            }
          } else if (typeof cleaned[key] === 'string' && cleaned[key].length <= 50) {
            // Garder seulement les textes courts
            essentialData[key] = cleaned[key];
          } else if (typeof cleaned[key] !== 'string') {
            // Garder les autres types de données
            essentialData[key] = cleaned[key];
          }
        }
        
        const finalSize = JSON.stringify(essentialData).length;
        console.log(`💾 Taille finale après mesures extrêmes: ${Math.round(finalSize / 1024)}KB`);
        
        return essentialData;
      }
    }
    
    return cleaned;
  }

  // COMPRESSION INTELLIGENTE PAR ÉCHANTILLONNAGE (évite les images noires)
  private static intelligentImageCompression(base64Image: string, maxSizeKB: number): string {
    try {
      console.log(`🔧 Compression intelligente - Cible: ${maxSizeKB}KB`);
      
      const [header, data] = base64Image.split(',');
      if (!data) throw new Error('Format base64 invalide');
      
      const originalSizeKB = Math.round(base64Image.length / 1024);
      console.log(`🔧 Taille originale: ${originalSizeKB}KB`);
      
      // Si déjà assez petit, ne pas compresser
      if (originalSizeKB <= maxSizeKB) {
        console.log(`🔧 ✅ Image déjà assez petite, pas de compression`);
        return base64Image;
      }
      
      // Utiliser canvas pour une vraie compression d'image
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context non disponible');
            
            // Calculer les nouvelles dimensions pour atteindre la taille cible
            const targetRatio = Math.sqrt(maxSizeKB / originalSizeKB);
            const newWidth = Math.floor(img.width * targetRatio);
            const newHeight = Math.floor(img.height * targetRatio);
            
            console.log(`🔧 Redimensionnement: ${img.width}×${img.height} → ${newWidth}×${newHeight}`);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Dessiner l'image redimensionnée avec qualité optimale
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Essayer différents niveaux de qualité JPEG
            let quality = 0.8;
            let compressedImage = canvas.toDataURL('image/jpeg', quality);
            let compressedSizeKB = Math.round(compressedImage.length / 1024);
            
            console.log(`🔧 Première tentative qualité ${quality}: ${compressedSizeKB}KB`);
            
            // Ajuster la qualité si nécessaire
            while (compressedSizeKB > maxSizeKB && quality > 0.3) {
              quality -= 0.1;
              compressedImage = canvas.toDataURL('image/jpeg', quality);
              compressedSizeKB = Math.round(compressedImage.length / 1024);
              console.log(`🔧 Tentative qualité ${quality.toFixed(1)}: ${compressedSizeKB}KB`);
            }
            
            console.log(`🔧 ✅ Compression canvas terminée: ${originalSizeKB}KB → ${compressedSizeKB}KB (qualité: ${quality.toFixed(1)})`);
            resolve(compressedImage);
          } catch (error) {
            console.error(`🔧 ❌ Erreur compression canvas:`, error);
            reject(error);
          }
        };
        
        img.onerror = () => {
          console.error(`🔧 ❌ Erreur chargement image pour compression`);
          reject(new Error('Impossible de charger l\'image'));
        };
        
        img.src = base64Image;
      });
      
    } catch (error) {
      console.error(`🔧 ❌ Erreur compression intelligente:`, error);
      throw error;
    }
  }

  // GÉNÉRER ET TÉLÉCHARGER LE PDF (uniquement au moment du téléchargement)
  static async generateAndDownloadPDF(fileName: string): Promise<boolean> {
    try {
      console.log('📄 🚀 DÉBUT Génération PDF à la demande:', fileName);
      
      // 1. Récupérer les métadonnées
      console.log('📄 🔍 Étape 1: Récupération métadonnées...');
      const metadata = await this.getPDFMetadata(fileName);
      if (!metadata) {
        console.error('📄 ❌ ÉCHEC: Métadonnées non trouvées pour:', fileName);
        
        // Debug: lister tous les PDFs disponibles
        console.log('📄 🔍 DEBUG: Listage de tous les PDFs disponibles...');
        const allPDFs = await this.listPDFs();
        console.log('📄 📋 PDFs disponibles:', allPDFs.map(p => p.fileName));
        
        return false;
      }

      console.log('📄 ✅ Étape 1 OK: Métadonnées récupérées:', {
        templateName: metadata.template_name,
        formTitle: metadata.form_title,
        dataKeys: Object.keys(metadata.form_data || {}),
        signaturesCount: Object.values(metadata.form_data || {}).filter(v => 
          typeof v === 'string' && v.startsWith('data:image')
        ).length,
      });

      console.log('📄 🔧 Étape 2: Génération du PDF...');
      let pdfBytes: Uint8Array;

      // 2. Générer le PDF selon le type
      let templateData = null;
      
      // Récupérer les métadonnées du template depuis pdf_content
      if (metadata.pdf_content) {
        try {
          // Si pdf_content contient un ID de template, le récupérer depuis Supabase
          const templateId = metadata.pdf_content;
          if (templateId && templateId.length < 100) { // C'est probablement un ID
            console.log('📄 Récupération template depuis ID:', templateId);
            
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
          } else {
            // Ancien format JSON
            templateData = JSON.parse(metadata.pdf_content);
            console.log('📄 Template data récupéré depuis JSON (ancien format)');
          }
        } catch (error) {
          console.warn('📄 Impossible de parser template data:', error);
        }
      }
      
      // Fallback vers form_data si disponible
      if (!templateData && metadata.form_data?._template) {
        templateData = metadata.form_data._template;
        console.log('📄 Template data récupéré depuis form_data (fallback)');
      }
      
      if (templateData?.templateId && templateData?.templateFields && templateData?.templatePdfContent) {
        console.log('📄 🎨 Génération avec template PDF avancé');
        
        // Reconstituer le template
        const template = {
          id: templateData.templateId,
          name: metadata.template_name,
          fields: templateData.templateFields,
          originalPdfUrl: templateData.templatePdfContent,
        };

        console.log('📄 Template reconstitué:', {
          id: template.id,
          name: template.name,
          fieldsCount: template.fields?.length || 0,
          hasPdfContent: !!template.originalPdfUrl
        });

        // Convertir le PDF template en bytes
        const pdfResponse = await fetch(template.originalPdfUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const originalPdfBytes = new Uint8Array(pdfArrayBuffer);

        // Générer avec le template
        
        // Nettoyer les données du formulaire (enlever les métadonnées du template)
        const cleanFormData = { ...metadata.form_data };
        delete cleanFormData._template;
        delete cleanFormData._templateId;
        
        pdfBytes = await PDFGenerator.generatePDF(template, cleanFormData, originalPdfBytes);
      } else {
        console.log('📄 📝 Génération PDF simple - template non disponible');
        console.log('📄 Debug template data:', {
          hasTemplateData: !!templateData,
          hasTemplateId: !!templateData?.templateId,
          hasFields: !!templateData?.templateFields?.length,
          hasContent: !!templateData?.templatePdfContent
        });
        
        
        // Nettoyer les données du formulaire
        const cleanFormData = { ...metadata.form_data };
        delete cleanFormData._template;
        delete cleanFormData._templateId;
        
        // Générer un PDF simple
        pdfBytes = await this.generateSimplePDF(cleanFormData, metadata.form_title);
      }

      console.log('📄 ⬇️ Étape 3: Téléchargement...');
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
      console.log('📄 💾 Étape 4: Mise à jour taille fichier...');
      await this.updatePDFSize(fileName, pdfBytes.length);

      console.log('📄 ✅ SUCCÈS: PDF généré et téléchargé avec succès!');
      return true;
    } catch (error) {
      console.error('📄 ❌ ERREUR génération PDF:', error);
      return false;
    }
  }

  // RÉCUPÉRER LES MÉTADONNÉES PDF
  private static async getPDFMetadata(fileName: string): Promise<any | null> {
    try {
      console.log('💾 🔍 Récupération métadonnées pour:', fileName);
      
      // Essayer Supabase d'abord
      try {
        console.log('💾 🔍 Tentative Supabase...');
        const { data, error } = await supabase
          .from('pdf_storage')
          .select('file_name, response_id, template_name, form_title, form_data, pdf_content, file_size, created_at, updated_at')
          .eq('file_name', fileName)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

        if (error) {
          console.warn('💾 ❌ Erreur Supabase lors de la récupération:', error);
        } else if (data) {
          console.log('💾 ✅ Métadonnées trouvées dans Supabase:', {
            fileName: data.file_name,
            templateName: data.template_name,
            formTitle: data.form_title,
            hasFormData: !!data.form_data,
            createdAt: data.created_at
          });
          return data;
        } else {
          console.log('💾 ⚠️ Aucune donnée trouvée dans Supabase pour:', fileName);
        }
      } catch (supabaseError) {
        console.warn('💾 ❌ Erreur requête Supabase:', supabaseError);
      }

      // Fallback localStorage
      console.log('💾 🔍 Tentative récupération depuis localStorage...');
      const localPDFs = this.getLocalPDFs();
      console.log('💾 📋 Fichiers locaux disponibles:', Object.keys(localPDFs));
      const localData = localPDFs[fileName];
      
      if (localData) {
        console.log('💾 ✅ Métadonnées trouvées dans localStorage:', {
          fileName: localData.file_name,
          templateName: localData.template_name,
          formTitle: localData.form_title,
          hasFormData: !!localData.form_data
        });
        return localData;
      }
      
      console.log('💾 ❌ Aucune métadonnée trouvée nulle part pour:', fileName);
      console.log('💾 📋 Fichiers disponibles dans Supabase: (vérifiez manuellement)');
      console.log('💾 📋 Fichiers disponibles en local:', Object.keys(localPDFs));
      return null;
    } catch (error) {
      console.error('💾 ❌ Erreur récupération métadonnées:', error);
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
      console.warn('💾 Impossible de mettre à jour la taille:', error);
    }
  }

  // COMPTER LES PDFS (optimisé pour éviter les timeouts)
  static async countPDFs(): Promise<number> {
    try {
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('💾 Utilisateur non connecté pour count');
        return 0;
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💾 🎭 Mode impersonation: count PDFs pour', data.target_email);
        } catch (error) {
          console.error('💾 Erreur parsing impersonation data pour count:', error);
        }
      }

      console.log('💾 Count PDFs pour user_id:', targetUserId);
      
      const { count, error } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      if (error) {
        console.error('💾 Erreur count:', error);
        return 0;
      }

      console.log('💾 Count résultat:', count);
      return count || 0;
    } catch (error) {
      console.error('💾 Erreur count PDFs:', error);
      return 0;
    }
  }

  // LISTER LES PDFS (métadonnées uniquement)
  static async listPDFs(): Promise<Array<{
    fileName: string;
    responseId: string;
    templateName: string;
    formTitle: string;
    createdAt: string;
    size: number;
    formData: Record<string, any>;
  }>> {
    try {
      console.log('💾 === DÉBUT listPDFs ===');
      
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('💾 Utilisateur non connecté');
        return [];
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💾 🎭 Mode impersonation: récupération PDFs pour', data.target_email, 'userId:', targetUserId);
        } catch (error) {
          console.error('💾 Erreur parsing impersonation data:', error);
        }
      }
      
      console.log('💾 Target user ID final:', targetUserId);

      console.log('💾 Requête Supabase pour user_id:', targetUserId);
      const { data, error } = await supabase
        .from('pdf_storage')
        .select('file_name, response_id, template_name, form_title, form_data, file_size, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('💾 Erreur Supabase listPDFs:', error);
        return [];
      }

      console.log('💾 Données Supabase reçues:', data?.length || 0, 'PDFs');
      
      return (data || []).map(item => ({
        fileName: item.file_name,
        responseId: item.response_id || 'supabase',
        templateName: item.template_name || 'Template PDF',
        formTitle: item.form_title,
        createdAt: item.created_at,
        size: item.file_size || 0,
        formData: item.form_data || {},
      }));
    } catch (error) {
      console.error('💾 ❌ Erreur chargement PDFs:', error);
      return [];
    }
  }

  // SUPPRIMER UN PDF
  static async deletePDF(fileName: string): Promise<boolean> {
    try {
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('💾 Utilisateur non connecté pour delete');
        return false;
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💾 🎭 Mode impersonation: suppression PDF pour', data.target_email);
        } catch (error) {
          console.error('💾 Erreur parsing impersonation data pour delete:', error);
        }
      }

      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('file_name', fileName)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('💾 Erreur suppression:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('💾 Erreur suppression PDF:', error);
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
      // Récupérer l'utilisateur cible (avec gestion impersonation)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('💾 Utilisateur non connecté pour clear');
        return;
      }

      let targetUserId = user.id;
      
      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💾 🎭 Mode impersonation: nettoyage PDFs pour', data.target_email);
        } catch (error) {
          console.error('💾 Erreur parsing impersonation data pour clear:', error);
        }
      }

      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('user_id', targetUserId);

      if (error) {
        console.error('💾 Erreur nettoyage:', error);
      }
    } catch (error) {
      console.error('💾 Erreur nettoyage complet:', error);
    }
  }

  // UTILITAIRES PRIVÉS
  private static getLocalPDFs(): Record<string, any> {
    try {
      const data = localStorage.getItem('allSavedPDFs');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('💾 Erreur lecture localStorage:', error);
      return {};
    }
  }
}