import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';

export class PDFGenerator {
  static async generatePDF(
    template: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      console.log('🎨 === GÉNÉRATION PDF ===');
      console.log('🎨 Template:', template.name);
      console.log('🎨 Champs:', template.fields.length);
      console.log('🎨 Données:', Object.keys(data));
      console.log('🎨 Données complètes:', data);
      
      // Charger le PDF original
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      console.log('🎨 PDF chargé:', pages.length, 'pages');
      
      // Charger les polices
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Traiter chaque champ
      for (const field of template.fields) {
        console.log(`🎨 === TRAITEMENT CHAMP ===`);
        console.log(`🎨 Variable: ${field.variable}`);
        console.log(`🎨 Type: ${field.type}`);
        console.log(`🎨 Page: ${field.page}`);
        
        const pageIndex = (field.page || 1) - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          console.warn(`Page ${field.page} non trouvée`);
          continue;
        }
        
        // Lire la taille réelle de la page en points
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        
        // Calculer les coordonnées PDF depuis les ratios avec offset ajustable
        const pdfX = (field.xRatio || 0) * pdfWidth + (field.offsetX || 0);
        const pdfY = (1 - (field.yRatio || 0) - (field.heightRatio || 0.05)) * pdfHeight + (field.offsetY || 0);
        const pdfFieldWidth = (field.widthRatio || 0.1) * pdfWidth;
        const pdfFieldHeight = (field.heightRatio || 0.05) * pdfHeight;
        
        console.log(`🎨 Position calculée: (${Math.round(pdfX)}, ${Math.round(pdfY)}) ${Math.round(pdfFieldWidth)}×${Math.round(pdfFieldHeight)}`);
        
        const value = this.getFieldValue(field, data);
        console.log(`🎨 Valeur trouvée:`, value ? (typeof value === 'string' && value.startsWith('data:image') ? 'IMAGE_DATA' : value) : 'VIDE');
        
        // Ignorer complètement les champs vides - ne rien dessiner
        if (!value) {
          console.log(`🎨 ⚠️ Valeur vide pour ${field.variable}, champ ignoré (invisible)`);
          continue;
        }

        switch (field.type) {
          case 'text':
          case 'number':
            console.log(`🎨 ✏️ Dessin texte: "${value}"`);
            await this.drawText(page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field, font);
            break;
            
          case 'date':
            const dateValue = this.formatDate(value);
            console.log(`🎨 📅 Dessin date: "${dateValue}"`);
            await this.drawText(page, dateValue, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field, font);
            break;
            
          case 'checkbox':
            console.log(`🎨 ☑️ Dessin checkbox: ${value}`);
            await this.drawCheckbox(page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field);
            break;
            
          case 'signature':
            console.log(`🎨 ✍️ Traitement signature pour variable: ${field.variable}`);
            
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              console.log(`🎨 ✅ Signature valide trouvée, dessin...`);
              await this.drawSignature(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            } else {
              console.log(`🎨 ❌ Signature non trouvée, dessin placeholder`);
              // Dessiner un placeholder pour signature manquante
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfFieldWidth,
                height: pdfFieldHeight,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 1,
                color: rgb(0.98, 0.98, 0.98),
              });
              
              page.drawText('Signature manquante', {
                x: pdfX + 2,
                y: pdfY + pdfFieldHeight / 2,
                size: Math.min(10, pdfFieldHeight * 0.6),
                color: rgb(0.7, 0.7, 0.7),
                font,
              });
            }
            break;
            
          case 'image':
            console.log(`🎨 🖼️ Traitement image`);
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawImage(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            }
            break;
        }
      }

      console.log('🎨 Génération terminée, sauvegarde...');
      const finalPdf = await pdfDoc.save();
      console.log('🎨 PDF final:', finalPdf.length, 'bytes');
      
      return finalPdf;
    } catch (error) {
      console.error('🎨 Erreur génération PDF:', error);
      throw new Error(`Impossible de générer le PDF: ${error.message}`);
    }
  }

  private static getFieldValue(field: PDFField, data: Record<string, any>): string {
    if (!field.variable) {
      console.log(`🔍 ❌ Pas de variable définie pour le champ ${field.type}`);
      return '';
    }
    
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    console.log(`🔍 Recherche variable: "${variableName}" pour champ ${field.type}`);
    console.log(`🔍 Données disponibles:`, Object.keys(data));
    
    // Debug spécial pour les images
    if (field.type === 'image' || field.type === 'signature') {
      console.log(`🔍 🖼️ RECHERCHE ${field.type.toUpperCase()}:`);
      console.log(`🔍 Variable recherchée: "${variableName}"`);
      
      // Lister toutes les images disponibles
      const allImages = Object.entries(data).filter(([key, val]) => 
        typeof val === 'string' && val.startsWith('data:image')
      );
      console.log(`🔍 Images disponibles dans data:`, allImages.map(([k, v]) => ({
        key: k,
        type: typeof v === 'string' && v.startsWith('data:image/png') ? 'PNG' : 'JPG',
        size: typeof v === 'string' ? `${Math.round(v.length/1024)}KB` : 'N/A'
      })));
    }
    
    // Pour les signatures, recherche spéciale et prioritaire
    if (field.type === 'signature') {
      console.log(`🔍 ✍️ Recherche signature spéciale...`);
      
      // 1. Recherche directe par variable exacte
      let signatureValue = data[variableName];
      console.log(`🔍 1. Variable exacte "${variableName}":`, signatureValue ? 'TROUVÉ' : 'NON');
      
      // 2. Recherche insensible à la casse
      if (!signatureValue) {
        const lowerVariableName = variableName.toLowerCase();
        const matchingKey = Object.keys(data).find(key => 
          key.toLowerCase() === lowerVariableName
        );
        
        if (matchingKey) {
          signatureValue = data[matchingKey];
          console.log(`🔍 2. Clé insensible casse "${matchingKey}":`, signatureValue ? 'TROUVÉ' : 'NON');
        }
      }
      
      // 3. Recherche par clés contenant "signature"
      if (!signatureValue) {
        const signatureKeys = Object.keys(data).filter(key => 
          key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign')
        );
        console.log(`🔍 3. Clés signature trouvées:`, signatureKeys);
        
        for (const key of signatureKeys) {
          const val = data[key];
          if (typeof val === 'string' && val.startsWith('data:image')) {
            signatureValue = val;
            console.log(`🔍 ✅ Signature trouvée via clé: "${key}"`);
            break;
          }
        }
      }
      
      // 4. Fallback : première image trouvée
      if (!signatureValue) {
        const allImages = Object.entries(data).filter(([key, val]) => 
          typeof val === 'string' && val.startsWith('data:image')
        );
        console.log(`🔍 4. Images disponibles:`, allImages.length);
        
        if (allImages.length > 0) {
          signatureValue = allImages[0][1];
          console.log(`🔍 ✅ Utilisation première image: "${allImages[0][0]}"`);
        }
      }
      
      if (signatureValue) {
        console.log(`🔍 ✅ SIGNATURE FINALE: ${signatureValue.length} chars`);
        return signatureValue;
      } else {
        console.log(`🔍 ❌ AUCUNE SIGNATURE TROUVÉE`);
        return '';
      }
    }
    
    // Pour les images, recherche spéciale similaire aux signatures
    if (field.type === 'image') {
      console.log(`🔍 🖼️ Recherche image spéciale...`);
      
      // 1. Recherche directe par variable exacte
      let imageValue = data[variableName];
      console.log(`🔍 1. Variable exacte "${variableName}":`, imageValue ? 'TROUVÉ' : 'NON');
      
      // 2. Recherche insensible à la casse
      if (!imageValue) {
        const lowerVariableName = variableName.toLowerCase();
        const matchingKey = Object.keys(data).find(key => 
          key.toLowerCase() === lowerVariableName
        );
        
        if (matchingKey) {
          imageValue = data[matchingKey];
          console.log(`🔍 2. Clé insensible casse "${matchingKey}":`, imageValue ? 'TROUVÉ' : 'NON');
        }
      }
      
      // 3. Recherche par clés contenant "image" ou "photo"
      if (!imageValue) {
        const imageKeys = Object.keys(data).filter(key => 
          key.toLowerCase().includes('image') || 
          key.toLowerCase().includes('photo') ||
          key.toLowerCase().includes('picture')
        );
        console.log(`🔍 3. Clés image trouvées:`, imageKeys);
        
        for (const key of imageKeys) {
          const val = data[key];
          if (typeof val === 'string' && val.startsWith('data:image')) {
            imageValue = val;
            console.log(`🔍 ✅ Image trouvée via clé: "${key}"`);
            break;
          }
        }
      }
      
      // 4. Fallback : première image non-signature trouvée
      if (!imageValue) {
        const allImages = Object.entries(data).filter(([key, val]) => 
          typeof val === 'string' && val.startsWith('data:image') &&
          !key.toLowerCase().includes('signature') && !key.toLowerCase().includes('sign')
        );
        console.log(`🔍 4. Images non-signature disponibles:`, allImages.length);
        
        if (allImages.length > 0) {
          imageValue = allImages[0][1];
          console.log(`🔍 ✅ Utilisation première image non-signature: "${allImages[0][0]}"`);
        }
      }
      
      if (imageValue) {
        console.log(`🔍 ✅ IMAGE FINALE: ${imageValue.length} chars`);
        return imageValue;
      } else {
        console.log(`🔍 ❌ AUCUNE IMAGE TROUVÉE`);
        return '';
      }
    }
    
    // Pour les autres types de champs, recherche normale
    let value = data[variableName];
    console.log(`🔍 Recherche normale "${variableName}":`, value ? 'TROUVÉ' : 'NON');
    
    // Si pas trouvé, essayer plusieurs stratégies de recherche
    if (!value) {
      console.log(`🔍 Tentative recherche alternative pour "${variableName}"`);
      
      // 1. Recherche insensible à la casse
      const matchingKey = Object.keys(data).find(key => 
        key.toLowerCase() === variableName.toLowerCase()
      );
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 ✅ Trouvé via clé insensible: "${matchingKey}"`);
      } else {
        // 2. Recherche par clé contenant la variable
        const partialMatchKey = Object.keys(data).find(key => 
          key.toLowerCase().includes(variableName.toLowerCase()) ||
          variableName.toLowerCase().includes(key.toLowerCase())
        );
        
        if (partialMatchKey) {
          value = data[partialMatchKey];
          console.log(`🔍 ✅ Trouvé via correspondance partielle: "${partialMatchKey}"`);
        } else {
          // 3. Recherche par libellé de champ original (avant normalisation)
          const originalLabelKey = Object.keys(data).find(key => {
            const normalizedKey = key
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            return normalizedKey === variableName;
          });
          
          if (originalLabelKey) {
            value = data[originalLabelKey];
            console.log(`🔍 ✅ Trouvé via libellé original: "${originalLabelKey}"`);
          }
        }
      }
    }
    
    // Si toujours pas trouvé, afficher les clés similaires pour debug
    if (!value) {
      const similarKeys = Object.keys(data).filter(key => 
        key.toLowerCase().includes(variableName.toLowerCase().substring(0, 3)) ||
        variableName.toLowerCase().includes(key.toLowerCase().substring(0, 3))
      );
      console.log(`🔍 ❌ Variable "${variableName}" non trouvée. Clés similaires:`, similarKeys);
    }
    
    const finalValue = value || '';
    console.log(`🔍 Valeur finale:`, finalValue ? (typeof finalValue === 'string' && finalValue.startsWith('data:image') ? 'IMAGE_DATA' : finalValue) : 'VIDE');
    
    return finalValue;
  }

  private static async drawText(
    page: any,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    field: PDFField,
    font: any
  ) {
    const fontSize = field.fontSize || 12;
    const color = this.hexToRgb(field.fontColor || '#000000');
    
    console.log(`🎨 ✏️ Dessin texte "${text}" à (${Math.round(x)}, ${Math.round(y)})`);
    
    // Fond si spécifié
    if (field.backgroundColor && field.backgroundColor !== '#ffffff') {
      const bgColor = this.hexToRgb(field.backgroundColor);
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }

    // Dessiner le texte avec positionnement précis
    page.drawText(text, {
      x: x + 2,
      y: y + 2,
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
    width: number,
    height: number,
    field: PDFField
  ) {
    const isChecked = value === true || value === 'true' || value === '1';
    const size = Math.min(width, height, 16);
    
    console.log(`🎨 ☑️ Dessin checkbox: ${isChecked ? 'cochée' : 'vide'}`);
    
    // Case
    page.drawRectangle({
      x,
      y,
      width: size,
      height: size,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    // Coche
    if (isChecked) {
      page.drawText('✓', {
        x: x + size * 0.1,
        y: y + size * 0.1,
        size: size * 0.7,
        color: rgb(0, 0.6, 0),
      });
    }
  }

  private static async drawSignature(
    pdfDoc: any,
    page: any,
    signatureData: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    try {
      console.log(`🎨 ✍️ Dessin signature à (${Math.round(x)}, ${Math.round(y)}) ${Math.round(width)}×${Math.round(height)}`);
      console.log(`🎨 ✍️ Données signature reçues: ${signatureData.length} chars`);
      console.log(`🎨 ✍️ Format signature: ${signatureData.substring(0, 30)}...`);
      
      if (!signatureData || !signatureData.startsWith('data:image')) {
        console.log(`🎨 ❌ Données signature invalides:`, signatureData ? signatureData.substring(0, 50) : 'undefined');
        throw new Error('Données de signature invalides');
      }

      const [header, base64Data] = signatureData.split(',');
      if (!base64Data || base64Data.length === 0) {
        console.log(`🎨 ❌ Base64 vide après split:`, { header, base64Length: base64Data?.length });
        throw new Error('Données base64 vides');
      }
      
      console.log(`🎨 ✍️ Header: ${header}`);
      console.log(`🎨 ✍️ Base64 length: ${base64Data.length}`);
      
      // Conversion base64 vers bytes
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`🎨 ✍️ Conversion base64 réussie: ${imageBytes.length} bytes`);
      } catch (conversionError) {
        console.error(`🎨 ❌ Erreur conversion base64:`, conversionError);
        throw new Error(`Conversion base64 échouée: ${conversionError.message}`);
      }
      
      // Embedder l'image (PNG en priorité)
      let image;
      try {
        if (header.includes('png')) {
          console.log(`🎨 ✍️ Embedding PNG...`);
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.log(`🎨 ✍️ Embedding JPG...`);
          image = await pdfDoc.embedJpg(imageBytes);
        }
        console.log(`🎨 ✍️ Image embedded successfully: ${image.width}x${image.height}`);
      } catch (embedError) {
        console.error(`🎨 ❌ Erreur embedding image:`, embedError);
        throw new Error(`Embedding image échoué: ${embedError.message}`);
      }
      
      // Calculer les dimensions en gardant les proportions
      const imageAspectRatio = image.width / image.height;
      const fieldAspectRatio = width / height;
      
      let drawWidth = width;
      let drawHeight = height;
      
      if (fieldAspectRatio > imageAspectRatio) {
        // Le champ est plus large que l'image
        drawWidth = height * imageAspectRatio;
      } else {
        // Le champ est plus haut que l'image
        drawHeight = width / imageAspectRatio;
      }
      
      // Centrer la signature dans le champ
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;
      
      console.log(`🎨 ✍️ Signature finale: ${Math.round(drawWidth)}×${Math.round(drawHeight)}`);
      
      // Fond blanc avec bordure
      page.drawRectangle({
        x: x + offsetX - 1,
        y: y + offsetY - 1,
        width: drawWidth + 2,
        height: drawHeight + 2,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.3,
      });
      
      // Dessiner la signature
      page.drawImage(image, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      
      console.log(`🎨 ✅ Signature dessinée avec succès`);
      
    } catch (error) {
      console.error('Erreur dessin signature:', error);
      
      // Placeholder d'erreur
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      page.drawText('Signature non disponible', {
        x: x + 5,
        y: y + height / 2,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  private static async drawImage(
    pdfDoc: any,
    page: any,
    imageData: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    try {
      console.log(`🎨 🖼️ Dessin image à (${Math.round(x)}, ${Math.round(y)})`);
      console.log(`🎨 🖼️ Données image reçues: ${imageData.length} chars`);
      console.log(`🎨 🖼️ Format image: ${imageData.substring(0, 30)}...`);
      
      if (!imageData || !imageData.startsWith('data:image')) {
        console.log(`🎨 ❌ Données image invalides:`, imageData ? imageData.substring(0, 50) : 'undefined');
        throw new Error('Données image invalides');
      }
      
      const [header, base64Data] = imageData.split(',');
      if (!base64Data || base64Data.length === 0) {
        console.log(`🎨 ❌ Base64 image vide:`, { header, base64Length: base64Data?.length });
        throw new Error('Données base64 image vides');
      }
      
      console.log(`🎨 🖼️ Header: ${header}`);
      console.log(`🎨 🖼️ Base64 length: ${base64Data.length}`);
      
      // Conversion base64 vers bytes
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`🎨 🖼️ Conversion base64 réussie: ${imageBytes.length} bytes`);
      } catch (conversionError) {
        console.error(`🎨 ❌ Erreur conversion base64 image:`, conversionError);
        throw new Error(`Conversion base64 image échouée: ${conversionError.message}`);
      }
      
      let image;
      
      try {
        if (header.includes('png')) {
          console.log(`🎨 🖼️ Embedding PNG image...`);
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.log(`🎨 🖼️ Embedding JPG image...`);
          image = await pdfDoc.embedJpg(imageBytes);
        }
        console.log(`🎨 🖼️ Image embedded successfully: ${image.width}x${image.height}`);
      } catch (embedError) {
        console.error(`🎨 ❌ Erreur embedding image:`, embedError);
        throw new Error(`Embedding image échoué: ${embedError.message}`);
      }
      
      // Calculer les dimensions en gardant les proportions
      const imageAspectRatio = image.width / image.height;
      const fieldAspectRatio = width / height;
      
      let drawWidth = width;
      let drawHeight = height;
      
      if (fieldAspectRatio > imageAspectRatio) {
        // Le champ est plus large que l'image
        drawWidth = height * imageAspectRatio;
      } else {
        // Le champ est plus haut que l'image
        drawHeight = width / imageAspectRatio;
      }
      
      // Centrer l'image dans le champ
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;
      
      console.log(`🎨 🖼️ Image finale: ${Math.round(drawWidth)}×${Math.round(drawHeight)}`);
      
      page.drawImage(image, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      
      console.log(`🎨 ✅ Image dessinée avec succès`);
      
    } catch (error) {
      console.error('🎨 ❌ Erreur dessin image:', error);
      
      // Placeholder en cas d'erreur
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      page.drawText('Image non disponible', {
        x: x + 5,
        y: y + height / 2,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  private static formatDate(value: string): string {
    if (!value) return '';
    
    try {
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value;
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
}