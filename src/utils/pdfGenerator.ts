import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';

export class PDFGenerator {
  static async generatePDF(
    template: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      console.log('🎨 ===== DÉBUT GÉNÉRATION PDF =====');
      console.log('🎨 Template:', template.name);
      console.log('🎨 Data reçue:', data);
      console.log('🎨 Data keys:', Object.keys(data));
      console.log('🎨 Template fields:', template.fields?.length || 0);
      
      // Debug spécial pour les images
      const imageData = Object.entries(data).filter(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image')
      );
      console.log('🖼️ IMAGES TROUVÉES DANS DATA:', imageData.length);
      imageData.forEach(([key, value], index) => {
        console.log(`🖼️ Image ${index + 1}: clé="${key}", taille=${typeof value === 'string' ? value.length : 0} caractères`);
      });
      
      // Debug des champs image du template
      const imageFields = template.fields.filter(field => field.type === 'image');
      console.log('🎯 CHAMPS IMAGE DANS TEMPLATE:', imageFields.length);
      imageFields.forEach((field, index) => {
        console.log(`🎯 Champ image ${index + 1}: variable="${field.variable}", position=(${field.x}, ${field.y}), taille=${field.width}x${field.height}`);
      });
      
      // Détection mobile pour ajustements spécifiques
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        console.log('📱 MOBILE: Génération PDF avec template - optimisations activées');
        
        // Optimisations spécifiques mobiles
        await new Promise(resolve => setTimeout(resolve, 200)); // Délai pour stabiliser
      }
      
      // Charger le PDF original
      let pdfDoc;
      try {
        console.log('🎨 Chargement PDF original...');
        
        // Sur mobile, utiliser des options de chargement optimisées
        const loadOptions = isMobile ? {
          ignoreEncryption: true,
          parseSpeed: 1, // Plus lent mais plus stable
          maxMemoryUsage: 50 * 1024 * 1024, // 50MB max
        } : {};
        
        pdfDoc = await PDFDocument.load(originalPdfBytes);
      } catch (error) {
        console.error('🎨 ❌ Erreur chargement PDF:', error);
        
        // Retry avec options simplifiées sur mobile
        if (isMobile) {
          console.log('📱 Retry chargement PDF avec options simplifiées...');
          try {
            await new Promise(resolve => setTimeout(resolve, 500));
            pdfDoc = await PDFDocument.load(originalPdfBytes);
          } catch (retryError) {
            console.error('📱 ❌ Retry échoué:', retryError);
            throw new Error('Impossible de charger le PDF sur mobile: ' + retryError.message);
          }
        } else {
          throw new Error('Impossible de charger le PDF original: ' + error.message);
        }
      }
      
      const pages = pdfDoc.getPages();
      console.log('🎨 PDF chargé, pages:', pages.length);
      
      // Obtenir les dimensions de la première page pour la conversion de coordonnées
      const firstPage = pages[0];
      const { width: pageWidth, height: pageHeight } = firstPage.getSize();
      console.log('🎨 Dimensions page PDF:', { width: pageWidth, height: pageHeight });
      
      // Police par défaut
      let font, boldFont;
      try {
        console.log('🎨 Chargement des polices...');
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      } catch (error) {
        console.error('🎨 ❌ Erreur chargement polices:', error);
        
        // Sur mobile, essayer avec une seule police
        if (isMobile) {
          console.log('📱 Fallback: utilisation police unique...');
          try {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            boldFont = font; // Utiliser la même police
          } catch (fontError) {
            throw new Error('Impossible de charger les polices sur mobile: ' + fontError.message);
          }
        } else {
          throw new Error('Impossible de charger les polices: ' + error.message);
        }
      }
      console.log('🎨 Polices chargées');

      // Collecter tous les fichiers/images du formulaire
      const formFiles = Object.entries(data).filter(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image')
      );
      console.log('📁 ===== FICHIERS FORMULAIRE DISPONIBLES =====');
      console.log('📁 Nombre total de fichiers image:', formFiles.length);
      formFiles.forEach(([key, value], index) => {
        console.log(`📁 Fichier ${index + 1}:`);
        console.log(`📁   - Clé: "${key}"`);
        console.log(`📁   - Taille: ${typeof value === 'string' ? value.length : 0} caractères`);
      });
      
      let fileIndex = 0; // Index pour l'assignation automatique des images

      // Traiter chaque champ
      let processedFields = 0;
      const totalFields = template.fields.length;
      
      console.log('🎨 ===== TRAITEMENT DES CHAMPS =====');
      console.log('🎨 Pages disponibles:', pages.length);
      console.log('🎨 Champs par page:', template.fields.reduce((acc, field) => {
        acc[field.page] = (acc[field.page] || 0) + 1;
        return acc;
      }, {} as Record<number, number>));
      
      for (const field of template.fields) {
        console.log(`🎨 ===== CHAMP ${processedFields + 1}/${totalFields} =====`);
        console.log(`🎨 Variable: "${field.variable}"`);
        console.log(`🎨 Type: ${field.type}`);
        console.log(`🎨 Position: (${field.x}, ${field.y})`);
        console.log(`🎨 Taille: ${field.width}x${field.height}`);
        console.log(`🎨 Page: ${field.page}`);
        
        // Sur mobile, ajouter des pauses entre les champs pour éviter les blocages
        if (isMobile && processedFields > 0 && processedFields % 3 === 0) {
          console.log(`📱 Pause mobile après ${processedFields} champs...`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const pageIndex = (field.page || 1) - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          console.log(`🎨 ❌ Page ${field.page} non trouvée (index ${pageIndex}), pages disponibles: ${pages.length}`);
          continue;
        }
        
        console.log(`🎨 ✅ Page ${field.page} trouvée (index ${pageIndex})`);

        const { height: currentPageHeight } = page.getSize();
        console.log(`🎨 Hauteur page ${field.page}: ${currentPageHeight}`);
        
        // CORRECTION CRITIQUE: Utiliser directement les coordonnées de l'éditeur
        // L'éditeur utilise un système top-left (0,0 en haut à gauche)
        // PDF-lib utilise un système bottom-left (0,0 en bas à gauche)
        // Conversion: y_pdf = pageHeight - y_editor - fieldHeight
        
        // Conversion de coordonnées: éditeur (top-left) vers PDF (bottom-left)
        const pdfX = field.x;
        const pdfY = currentPageHeight - field.y - field.height;
        
        console.log(`🎨   - Position éditeur: (${field.x}, ${field.y}) sur page ${field.page}`);
        console.log(`🎨   - Position PDF finale: (${pdfX}, ${pdfY}) sur page ${field.page}`);
        
        let value;
        
        // Pour les champs image, utiliser automatiquement les fichiers du formulaire
        if (field.type === 'image') {
          console.log(`🖼️ ===== TRAITEMENT CHAMP IMAGE =====`);
          console.log(`🖼️ Variable recherchée: "${field.variable}"`);
          console.log(`🖼️ Fichiers disponibles:`, formFiles.map(([key]) => key));
          
          // D'abord essayer de récupérer la valeur via la variable normale
          value = this.getFieldValue(field, data);
          
          // Si pas trouvé et qu'on a des fichiers disponibles, utiliser l'assignation automatique
          if (!value && fileIndex < formFiles.length) {
            value = formFiles[fileIndex][1];
            console.log(`🖼️ ✅ ASSIGNATION AUTOMATIQUE:`);
            console.log(`🖼️   - Champ: ${field.variable}`);
            console.log(`🖼️   - Fichier auto: ${fileIndex + 1}/${formFiles.length}`);
            console.log(`🖼️   - Clé source: "${formFiles[fileIndex][0]}"`);
            console.log(`🖼️   - Taille données: ${value.length} caractères`);
            fileIndex++;
          } else if (value) {
            console.log(`🖼️ ✅ VALEUR TROUVÉE VIA VARIABLE:`);
            console.log(`🖼️   - Champ: ${field.variable}`);
            console.log(`🖼️   - Taille: ${typeof value === 'string' ? value.length : 0} caractères`);
          } else {
            console.log(`🖼️ ❌ AUCUN FICHIER DISPONIBLE:`);
            console.log(`🖼️   - Champ: ${field.variable}`);
            console.log(`🖼️   - Fichiers disponibles: ${formFiles.length}`);
            console.log(`🖼️   - FileIndex actuel: ${fileIndex}`);
            value = null;
          }
        } else {
          value = this.getFieldValue(field, data);
        }
        
        console.log(`🎨   - Valeur: ${
          typeof value === 'string' && value.startsWith('data:image') 
            ? `IMAGE_BASE64 (${value.length} caractères)` 
            : `"${value}"`
        }`);
        
        if (!value && !field.required) {
          console.log(`🎨 ⏭️ Champ vide et non requis, ignoré`);
          processedFields++;
          continue;
        }

        switch (field.type) {
          case 'text':
          case 'number':
            try {
              await this.drawText(page, value, pdfX, pdfY, field, font);
              console.log(`🎨 ✅ Texte dessiné: "${value}" sur page ${field.page}`);
            } catch (error) {
              console.error(`🎨 ❌ Erreur dessin texte pour ${field.variable}:`, error);
              if (isMobile) {
                console.log('📱 Tentative de dessin texte simplifié...');
                try {
                  await this.drawSimpleText(page, value, pdfX, pdfY, field, font);
                } catch (simpleError) {
                  console.error('📱 ❌ Même le texte simplifié a échoué:', simpleError);
                }
              }
            }
            break;
            
          case 'date':
            const dateValue = this.formatDate(value);
            try {
              await this.drawText(page, dateValue, pdfX, pdfY, field, font);
              console.log(`🎨 ✅ Date dessinée: "${dateValue}" sur page ${field.page}`);
            } catch (error) {
              console.error(`🎨 ❌ Erreur dessin date pour ${field.variable}:`, error);
            }
            break;
            
          case 'checkbox':
            try {
              await this.drawCheckbox(page, value, pdfX, pdfY, field);
              console.log(`🎨 ✅ Checkbox dessinée: ${value} sur page ${field.page}`);
            } catch (error) {
              console.error(`🎨 ❌ Erreur dessin checkbox pour ${field.variable}:`, error);
            }
            break;
            
          case 'signature':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              try {
                console.log(`✍️ ===== TRAITEMENT SIGNATURE =====`);
                console.log(`✍️ Variable: ${field.variable}`);
                console.log(`✍️ Page: ${field.page}`);
                console.log(`✍️ Taille données: ${value.length} caractères`);
                await this.drawSignature(pdfDoc, page, value, pdfX, pdfY, field);
                console.log(`✍️ ✅ Signature dessinée avec succès sur page ${field.page}`);
              } catch (error) {
                console.error(`✍️ ❌ Erreur dessin signature pour ${field.variable}:`, error);
                if (isMobile) {
                  console.log('📱 Signature ignorée sur mobile (trop complexe)');
                }
              }
            } else {
              console.log(`✍️ ❌ Champ signature ignoré - pas de données valides`);
              console.log(`✍️ Variable: ${field.variable}, Value type: ${typeof value}`);
            }
            break;
            
          case 'image':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              try {
                console.log(`🖼️ ===== DÉBUT DESSIN IMAGE ${processedFields + 1} =====`);
                console.log(`🖼️ Variable: ${field.variable}`);
                console.log(`🖼️ Variable normalisée: ${field.variable.replace(/^\$\{|\}$/g, '')}`);
                console.log(`🖼️ Page: ${field.page}`);
                console.log(`🖼️ Position: (${pdfX}, ${pdfY})`);
                console.log(`🖼️ Taille: ${field.width}x${field.height}`);
                console.log(`🖼️ Type de données: base64`);
                console.log(`🖼️ Début données: ${value.substring(0, 50)}...`);
                console.log(`🖼️ Taille totale: ${value.length} caractères`);
                
                // Vérifier que l'image est valide
                if (value.length < 100) {
                  console.log(`🖼️ ⚠️ Image trop petite, probablement corrompue`);
                  throw new Error('Image trop petite ou corrompue');
                }
                
                await this.drawImage(pdfDoc, page, value, pdfX, pdfY, field);
                console.log(`🖼️ ✅ IMAGE DESSINÉE AVEC SUCCÈS sur page ${field.page}`);
              } catch (error) {
                console.error(`🖼️ ❌ ERREUR DESSIN IMAGE:`, error);
                console.error(`🖼️ Variable problématique: ${field.variable}`);
                console.error(`🖼️ Page problématique: ${field.page}`);
                console.error(`🖼️ Taille données: ${typeof value === 'string' ? value.length : 'N/A'}`);
                if (isMobile) {
                  console.log('📱 ❌ Image ignorée sur mobile (erreur)');
                }
                
                // Dessiner un placeholder en cas d'erreur
                try {
                  page.drawRectangle({
                    x: pdfX,
                    y: pdfY,
                    width: field.width,
                    height: field.height,
                    borderColor: rgb(0.8, 0.8, 0.8),
                    borderWidth: 1,
                  });
                  
                  page.drawText('Image non disponible', {
                    x: pdfX + 5,
                    y: pdfY + field.height / 2,
                    size: 8,
                    font,
                    color: rgb(0.5, 0.5, 0.5),
                  });
                  console.log(`🖼️ ✅ Placeholder dessiné sur page ${field.page}`);
                } catch (placeholderError) {
                  console.error('🖼️ ❌ Impossible de dessiner le placeholder:', placeholderError);
                }
              }
            } else {
              console.log(`🖼️ ❌ CHAMP IMAGE IGNORÉ (pas de données valides):`);
              console.log(`🖼️   - Champ: ${field.variable}`);
              console.log(`🖼️   - Page: ${field.page}`);
              console.log(`🖼️   - Type valeur: ${typeof value}`);
              console.log(`🖼️   - Valeur: ${typeof value === 'string' ? (value.startsWith('data:') ? 'BASE64_DATA' : value) : value}`);
              console.log(`🖼️   - Valeur valide: ${typeof value === 'string' && value.startsWith('data:image')}`);
              console.log(`🖼️   - Fichiers disponibles: ${formFiles.length}`);
              
              // Essayer l'assignation automatique même si la variable n'est pas trouvée
              if (fileIndex < formFiles.length) {
                const autoValue = formFiles[fileIndex][1];
                console.log(`🖼️ 🔄 TENTATIVE ASSIGNATION AUTOMATIQUE:`);
                console.log(`🖼️   - Fichier auto: ${fileIndex + 1}/${formFiles.length}`);
                console.log(`🖼️   - Clé source: "${formFiles[fileIndex][0]}"`);
                console.log(`🖼️   - Page cible: ${field.page}`);
                
                try {
                  await this.drawImage(pdfDoc, page, autoValue, pdfX, pdfY, field);
                  console.log(`🖼️ ✅ IMAGE ASSIGNÉE AUTOMATIQUEMENT sur page ${field.page}`);
                  fileIndex++;
                } catch (autoError) {
                  console.error(`🖼️ ❌ Erreur assignation automatique:`, autoError);
                  fileIndex++;
                }
              } else {
                console.log(`🖼️ ❌ Aucun fichier disponible pour assignation automatique`);
              }
            }
            break;
        }
        
        processedFields++;
        
        // Progression sur mobile
        if (isMobile) {
          console.log(`📱 Progression: ${processedFields}/${totalFields} champs traités`);
        }
      }

      console.log('🎨 Tous les champs traités, sauvegarde du PDF...');
      console.log('🎨 Résumé des champs traités par page:');
      const fieldsByPage = template.fields.reduce((acc, field) => {
        acc[field.page] = (acc[field.page] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      Object.entries(fieldsByPage).forEach(([page, count]) => {
        console.log(`🎨   Page ${page}: ${count} champs`);
      });
      
      // Retourner le PDF généré
      let finalPdf;
      try {
        // Options de sauvegarde optimisées pour mobile
        const saveOptions = {};
        
        if (isMobile) {
          console.log('📱 Sauvegarde avec options mobiles optimisées...');
          // Pas d'options spéciales, utiliser les défauts
        }
        
        finalPdf = await pdfDoc.save(saveOptions);
      } catch (error) {
        console.error('🎨 ❌ Erreur sauvegarde PDF:', error);
        
        // Retry sur mobile avec options minimales
        if (isMobile) {
          console.log('📱 Retry sauvegarde PDF...');
          try {
            await new Promise(resolve => setTimeout(resolve, 300));
            finalPdf = await pdfDoc.save();
          } catch (retryError) {
            throw new Error('Impossible de sauvegarder le PDF sur mobile: ' + retryError.message);
          }
        } else {
          throw new Error('Impossible de sauvegarder le PDF: ' + error.message);
        }
      }
      
      console.log('🎨 PDF final généré, taille:', finalPdf.length);
      return finalPdf;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      console.error('Stack trace:', error.stack);
      
      // Message d'erreur adapté selon l'appareil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const errorMessage = isMobile 
        ? `Erreur génération PDF mobile avec template: ${error.message}`
        : `Impossible de générer le PDF: ${error.message}`;
      
      throw new Error(errorMessage);
    }
  }

  // Méthode de dessin de texte simplifiée pour mobile
  private static async drawSimpleText(
    page: any,
    text: string,
    x: number,
    y: number,
    field: PDFField,
    font: any
  ) {
    console.log('📱 Dessin texte simplifié mobile');
    
    // Version ultra-simplifiée pour mobile
    page.drawText(text.substring(0, 50), { // Limiter la longueur
      x: x + 2,
      y: y + 5,
      size: Math.min(field.fontSize || 12, 14), // Taille limitée
      font,
      color: rgb(0, 0, 0), // Couleur fixe
    });
  }

  private static getFieldValue(field: PDFField, data: Record<string, any>): string {
    // Extraire le nom de la variable (enlever ${})
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    
    console.log(`🔍 ===== RECHERCHE VARIABLE =====`);
    console.log(`🔍 Variable recherchée: "${variableName}"`);
    console.log(`🔍 Type de champ: ${field.type}`);
    console.log(`🔍 Clés disponibles dans data:`, Object.keys(data));
    
    // Debug spécial pour voir toutes les valeurs
    console.log(`🔍 Toutes les données disponibles:`);
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string' && !value.startsWith('data:image')) {
        console.log(`🔍   "${key}" = "${value}"`);
      } else if (typeof value === 'string' && value.startsWith('data:image')) {
        console.log(`🔍   "${key}" = IMAGE_DATA (${value.length} chars)`);
      } else {
        console.log(`🔍   "${key}" = ${typeof value} (${value})`);
      }
    });
    
    // Debug spécial pour les images
    if (field.type === 'image') {
      const imageKeys = Object.keys(data).filter(key => {
        const value = data[key];
        return typeof value === 'string' && value.startsWith('data:image');
      });
      console.log(`🔍 🖼️ Clés contenant des images:`, imageKeys);
      imageKeys.forEach(key => {
        console.log(`🔍 🖼️ Image "${key}": ${data[key].substring(0, 50)}...`);
      });
    }
    
    let value = data[variableName];
    
    // Si pas trouvé, essayer avec différentes variations
    if (!value) {
      // Essayer différentes variations de la clé
      const originalKeys = Object.keys(data);
      
      // 1. Recherche exacte
      let matchingKey = originalKeys.find(key => key === variableName);
      
      // 2. Recherche normalisée
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          this.normalizeKey(key) === variableName
        );
      }
      
      // 3. Recherche insensible à la casse
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          key.toLowerCase() === variableName.toLowerCase()
        );
      }
      
      // 4. Recherche partielle (contient la variable)
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          this.normalizeKey(key).includes(variableName) || 
          variableName.includes(this.normalizeKey(key))
        );
      }
      
      // 5. Recherche par similarité (pour les champs conditionnels)
      if (!matchingKey) {
        // Essayer de trouver une clé qui ressemble à la variable
        const variableWords = variableName.split('_').filter(w => w.length > 2);
        matchingKey = originalKeys.find(key => {
          const keyNormalized = this.normalizeKey(key);
          return variableWords.some(word => keyNormalized.includes(word));
        });
      }
      
      console.log(`🔍 Recherche étendue pour "${variableName}":`);
      console.log(`🔍   - Recherche exacte: ${originalKeys.includes(variableName) ? 'TROUVÉ' : 'NON'}`);
      console.log(`🔍   - Recherche normalisée: ${matchingKey ? `TROUVÉ (${matchingKey})` : 'NON'}`);
      console.log(`🔍   - Clés normalisées disponibles:`, originalKeys.map(k => `${k} → ${this.normalizeKey(k)}`));
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 ✅ Trouvé via clé: "${matchingKey}" = ${typeof value === 'string' && value.startsWith('data:') ? 'IMAGE_DATA' : `"${value}"`}`);
      } else {
        console.log(`🔍 ❌ Variable "${variableName}" non trouvée avec toutes les méthodes`);
        console.log(`🔍 Suggestions de debug:`);
        console.log(`🔍   - Variable attendue: "${variableName}"`);
        console.log(`🔍   - Clés disponibles:`, originalKeys);
        console.log(`🔍   - Clés normalisées:`, originalKeys.map(k => this.normalizeKey(k)));
        
        // Essayer de trouver des clés similaires pour aider au debug
        const similarKeys = originalKeys.filter(key => {
          const keyLower = key.toLowerCase();
          const varLower = variableName.toLowerCase();
          return keyLower.includes(varLower.substring(0, 3)) || varLower.includes(keyLower.substring(0, 3));
        });
        
        if (similarKeys.length > 0) {
          console.log(`🔍   - Clés similaires trouvées:`, similarKeys);
        }
      }
    } else {
      console.log(`🔍 ✅ Variable trouvée directement: "${variableName}" = ${typeof value === 'string' && value.startsWith('data:') ? 'IMAGE_DATA' : `"${value}"`}`);
    }
    
    // Pour les champs image, s'assurer qu'on a bien une image
    if (field.type === 'image') {
      if (value && typeof value === 'string' && value.startsWith('data:image')) {
        console.log(`🔍 ✅ Champ image trouvé: ${variableName}, taille: ${value.length}`);
        return value;
      } else {
        console.log(`🔍 ❌ Champ image "${variableName}" mais pas de données image valides`);
        console.log(`🔍 Type valeur: ${typeof value}, valide: ${typeof value === 'string' && value.startsWith('data:image')}`);
        return '';
      }
    }
    
    console.log(`🔍 Valeur finale pour ${variableName}:`, typeof value === 'string' && value.startsWith('data:') ? 'DONNÉES_BASE64' : (value || field.placeholder || 'VIDE'));
    
    return value || field.placeholder || '';
  }
  
  private static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9]/g, '_') // Remplacer les caractères spéciaux par _
      .replace(/_+/g, '_') // Éviter les _ multiples
      .replace(/^_|_$/g, ''); // Enlever les _ en début/fin
  }

  private static async drawText(
    page: any,
    text: string,
    x: number,
    y: number,
    field: PDFField,
    font: any
  ) {
    const fontSize = field.fontSize || 12;
    const color = this.hexToRgb(field.fontColor || '#000000');
    
    // Dessiner le fond si spécifié
    if (field.backgroundColor && field.backgroundColor !== '#ffffff') {
      const bgColor = this.hexToRgb(field.backgroundColor);
      page.drawRectangle({
        x,
        y,
        width: field.width,
        height: field.height,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }

    // Dessiner le texte
    page.drawText(text, {
      x: x + 5, // Petit padding
      y: y + (field.height - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  private static async drawCheckbox(
    page: any,
    value: boolean | string,
    x: number,
    y: number,
    field: PDFField
  ) {
    const isChecked = value === true || value === 'true' || value === '1';
    
    // Dessiner la case
    page.drawRectangle({
      x,
      y,
      width: Math.min(field.width, field.height),
      height: Math.min(field.width, field.height),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Dessiner la coche si nécessaire
    if (isChecked) {
      const size = Math.min(field.width, field.height);
      page.drawText('✓', {
        x: x + size / 4,
        y: y + size / 4,
        size: size * 0.6,
        color: rgb(0, 0, 0),
      });
    }
  }

  private static async drawSignature(
    pdfDoc: any,
    page: any,
    signatureData: string,
    x: number,
    y: number,
    field: PDFField
  ) {
    try {
      // Convertir la signature base64 en image
      const imageBytes = this.base64ToBytes(signatureData);
      const image = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la signature:', error);
    }
  }

  private static async drawImage(
    pdfDoc: any,
    page: any,
    imageData: string,
    x: number,
    y: number,
    field: PDFField
  ) {
    console.log(`🖼️ ===== drawImage APPELÉE =====`);
    console.log(`🖼️ Position: (${x}, ${y})`);
    console.log(`🖼️ Taille: ${field.width}x${field.height}`);
    console.log(`🖼️ Taille données: ${imageData.length} caractères`);
    console.log(`🖼️ Format: ${imageData.substring(0, 30)}...`);
    
    // Validation des données d'entrée
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Données image invalides: pas de string');
    }
    
    if (!imageData.startsWith('data:image')) {
      throw new Error('Données image invalides: pas de format data:image');
    }
    
    if (imageData.length < 100) {
      throw new Error('Données image trop petites: probablement corrompues');
    }
    
    try {
      let image;
      
      console.log(`🖼️ Traitement image base64...`);
      // Image base64
      const imageBytes = this.base64ToBytes(imageData);
      console.log(`🖼️ Bytes extraits: ${imageBytes.length} bytes`);
      
      if (imageBytes.length === 0) {
        throw new Error('Conversion base64 échouée: 0 bytes');
      }
      
      if (imageData.includes('data:image/png')) {
        console.log(`🖼️ Format détecté: PNG`);
        image = await pdfDoc.embedPng(imageBytes);
      } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
        console.log(`🖼️ Format détecté: JPEG`);
        image = await pdfDoc.embedJpg(imageBytes);
      } else {
        console.log(`🖼️ Format inconnu, tentative PNG...`);
        // Essayer PNG par défaut pour les autres formats
        try {
          image = await pdfDoc.embedPng(imageBytes);
          console.log(`🖼️ ✅ PNG réussi`);
        } catch {
          console.log(`🖼️ PNG échoué, tentative JPEG...`);
          // Si PNG échoue, essayer JPG
          image = await pdfDoc.embedJpg(imageBytes);
          console.log(`🖼️ ✅ JPEG réussi`);
        }
      }
      
      console.log(`🖼️ Image embedée avec succès, dessin sur la page...`);
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
      
      console.log(`🖼️ ✅ IMAGE DESSINÉE AVEC SUCCÈS !`);
    } catch (error) {
      console.error('🖼️ ❌ ERREUR CRITIQUE lors de l\'ajout de l\'image:', error);
      console.error('🖼️ Données image problématiques:', imageData.substring(0, 100) + '...');
      
      // En cas d'erreur, dessiner un placeholder
      console.log(`🖼️ Dessin d'un placeholder à la place...`);
      try {
        page.drawRectangle({
          x,
          y,
          width: field.width,
          height: field.height,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });
        
        // Ajouter un texte d'erreur
        page.drawText('Image non disponible', {
          x: x + 5,
          y: y + field.height / 2,
          size: 8,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        console.log(`🖼️ Placeholder dessiné`);
      } catch (placeholderError) {
        console.error('🖼️ ❌ Impossible de dessiner le placeholder:', placeholderError);
      }
      
      // Re-throw l'erreur pour que l'appelant soit au courant
      throw error;
    }
  }

  private static formatDate(value: string): string {
    if (!value) return '';
    
    try {
      // Détecter si c'est déjà au format ISO (YYYY-MM-DD)
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Sinon, essayer de parser comme date normale
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value; // Retourner la valeur originale si ce n'est pas une date valide
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return value;
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    } : { r: 0, g: 0, b: 0 };
  }

  private static base64ToBytes(base64: string): Uint8Array {
    try {
      if (!base64 || typeof base64 !== 'string') {
        throw new Error('Base64 string invalide');
      }
      
      if (!base64.includes(',')) {
        throw new Error('Format base64 invalide: pas de virgule trouvée');
      }
      
      const base64Data = base64.split(',')[1];
      
      if (!base64Data) {
        throw new Error('Pas de données après la virgule dans base64');
      }
      
      const binaryString = atob(base64Data);
      
      if (binaryString.length === 0) {
        throw new Error('Décodage base64 a produit 0 bytes');
      }
      
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`🔧 Base64 décodé: ${base64Data.length} chars → ${bytes.length} bytes`);
      return bytes;
    } catch (error) {
      console.error('🔧 ❌ Erreur conversion base64:', error);
      console.error('🔧 Données problématiques:', base64.substring(0, 100) + '...');
      throw new Error(`Conversion base64 échouée: ${error.message}`);
    }
  }
}