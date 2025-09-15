import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';
import { normalizeLabel } from './dataNormalizer';

export class PDFGenerator {
  static async generatePDF(
    template: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Charger le PDF original
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      
      // Charger les polices
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Traiter chaque champ
      for (const field of template.fields) {
        const pageIndex = (field.page || 1) - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          continue;
        }
        
        // Lire la taille réelle de la page en points
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        
        // Calculer les coordonnées PDF depuis les ratios avec offset ajustable
        const pdfX = (field.xRatio || 0) * pdfWidth + (field.offsetX || 0);
        const pdfY = (1 - (field.yRatio || 0) - (field.heightRatio || 0.05)) * pdfHeight + (field.offsetY || 0);
        const pdfFieldWidth = (field.widthRatio || 0.1) * pdfWidth;
        const pdfFieldHeight = (field.heightRatio || 0.05) * pdfHeight;
        
        const value = this.getFieldValue(field, data);
        
        // Ignorer complètement les champs vides - ne rien dessiner
        if (!value) {
          continue;
        }

        switch (field.type) {
          case 'text':
          case 'number':
            await this.drawText(page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field, font);
            break;
            
          case 'date':
            const dateValue = this.formatDate(value);
            await this.drawText(page, dateValue, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field, font);
            break;
            
          case 'checkbox':
            await this.drawCheckbox(page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field);
            break;
            
          case 'signature':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawSignature(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            } else {
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
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              console.log('🖼️ Dessin image pour champ:', field.variable, 'taille:', Math.round(value.length / 1024), 'KB');
              await this.drawImage(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            } else {
              console.warn('🖼️ Pas d\'image pour champ:', field.variable, 'valeur:', typeof value, value?.substring?.(0, 50));
              // Dessiner un placeholder pour image manquante
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfFieldWidth,
                height: pdfFieldHeight,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 1,
                color: rgb(0.98, 0.98, 0.98),
              });
              
              page.drawText('Image manquante', {
                x: pdfX + 2,
                y: pdfY + pdfFieldHeight / 2,
                size: Math.min(10, pdfFieldHeight * 0.6),
                color: rgb(0.7, 0.7, 0.7),
                font,
              });
            }
            break;
        }
      }

      const finalPdf = await pdfDoc.save();
      
      return finalPdf;
    } catch (error) {
      throw new Error(`Impossible de générer le PDF: ${error.message}`);
    }
  }

  private static getFieldValue(field: PDFField, data: Record<string, any>): string {
    if (!field.variable) {
      return '';
    }
    
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    
    console.log(`🔍 Recherche valeur pour variable: "${variableName}"`);
    console.log(`🔍 Clés disponibles dans data:`, Object.keys(data));
    
    // Pour les signatures, recherche spéciale et prioritaire
    if (field.type === 'signature') {
      // 1. Recherche par clé normalisée (PRIORITÉ ABSOLUE)
      const normalizedVariableName = normalizeLabel(variableName);
      let signatureValue = data[normalizedVariableName];
      
      if (signatureValue && typeof signatureValue === 'string' && signatureValue.startsWith('data:image')) {
        console.log(`🔍 ✅ Signature trouvée par clé normalisée: "${normalizedVariableName}"`);
        return signatureValue;
      }
      
      // 2. Recherche STRICTEMENT par variable exacte
     signatureValue = data[variableName];
      
      if (signatureValue && typeof signatureValue === 'string' && signatureValue.startsWith('data:image')) {
        console.log(`🔍 ✅ Signature trouvée par clé exacte: "${variableName}"`);
        return signatureValue;
      }
      
      // 3. Recherche insensible à la casse SEULEMENT pour la variable spécifique
      if (!signatureValue) {
        const lowerVariableName = variableName.toLowerCase();
        const matchingKey = Object.keys(data).find(key => 
          key.toLowerCase() === lowerVariableName
        );
        
        if (matchingKey && typeof data[matchingKey] === 'string' && data[matchingKey].startsWith('data:image')) {
          signatureValue = data[matchingKey];
          console.log(`🔍 ✅ Signature trouvée par recherche insensible à la casse: "${matchingKey}"`);
          return signatureValue;
        }
      }
      
      // 4. Recherche par correspondance partielle pour les signatures
      if (!signatureValue) {
        const partialMatchKey = Object.keys(data).find(key => {
          const keyLower = key.toLowerCase();
          const varLower = variableName.toLowerCase();
          return (keyLower.includes(varLower) || varLower.includes(keyLower)) &&
                 typeof data[key] === 'string' && data[key].startsWith('data:image');
        });
        
        if (partialMatchKey) {
          signatureValue = data[partialMatchKey];
          console.log(`🔍 ✅ Signature trouvée par correspondance partielle: "${partialMatchKey}"`);
          return signatureValue;
        }
      }
      
      // 5. Recherche générique pour les signatures si la variable contient "signature"
      if (!signatureValue && variableName.toLowerCase().includes('signature')) {
        const signatureKeys = Object.keys(data).filter(key => {
          const keyLower = key.toLowerCase();
          return (keyLower.includes('signature') || 
                  keyLower.includes('sign') ||
                  keyLower.includes('signer')) &&
                 typeof data[key] === 'string' && 
                 data[key].startsWith('data:image');
        });
        
        if (signatureKeys.length > 0) {
          signatureValue = data[signatureKeys[0]];
          console.log(`🔍 ✅ Signature trouvée par recherche générique: "${signatureKeys[0]}"`);
          return signatureValue;
        }
      }
      
      // ARRÊTER ICI - Pas de recherche générique pour éviter les doublons
      // Retourner vide si aucune signature correspondante trouvée
      console.log(`🔍 ❌ Aucune signature trouvée pour: "${variableName}"`);
      return '';
    }
    
    // Pour les images, recherche spéciale similaire aux signatures
    if (field.type === 'image') {
      // 1. Recherche par clé normalisée (PRIORITÉ ABSOLUE)
      const normalizedVariableName = normalizeLabel(variableName);
      let imageValue = data[normalizedVariableName];
      
      if (imageValue && typeof imageValue === 'string' && imageValue.startsWith('data:image')) {
        console.log(`🔍 ✅ Image trouvée par clé normalisée: "${normalizedVariableName}"`);
        return imageValue;
      }
      
      // 2. Recherche EXACTE par variable (priorité absolue)
     imageValue = data[variableName];
      
      if (imageValue && typeof imageValue === 'string' && imageValue.startsWith('data:image')) {
        console.log(`🔍 ✅ Image trouvée par clé exacte: "${variableName}"`);
        return imageValue;
      }
      
      // 3. Recherche insensible à la casse
      if (!imageValue) {
        const lowerVariableName = variableName.toLowerCase();
        const matchingKey = Object.keys(data).find(key => 
          key.toLowerCase() === lowerVariableName
        );
        
        if (matchingKey) {
          imageValue = data[matchingKey];
          console.log(`🔍 ✅ Image trouvée par recherche insensible à la casse: "${matchingKey}"`);
        }
      }
      
      // 4. Recherche par clés contenant la variable
      if (!imageValue) {
        const partialMatchKey = Object.keys(data).find(key => {
          const keyLower = key.toLowerCase();
          const varLower = variableName.toLowerCase();
          return (keyLower.includes(varLower) || varLower.includes(keyLower)) &&
                 typeof data[key] === 'string' && data[key].startsWith('data:image');
        });
        
        if (partialMatchKey) {
          imageValue = data[partialMatchKey];
          console.log(`🔍 ✅ Image trouvée par correspondance partielle: "${partialMatchKey}"`);
        }
      }
      
      // 5. SEULEMENT si la variable contient des mots-clés génériques
      if (!imageValue && (
        variableName.toLowerCase().includes('image') ||
        variableName.toLowerCase().includes('photo') ||
        variableName.toLowerCase().includes('picture') ||
        variableName.toLowerCase().includes('img')
      )) {
        const imageKeys = Object.keys(data).filter(key => {
          const keyLower = key.toLowerCase();
          return (keyLower.includes('image') || 
                  keyLower.includes('photo') ||
                  keyLower.includes('picture') ||
                  keyLower.includes('img')) &&
                 typeof data[key] === 'string' && 
                 data[key].startsWith('data:image');
        });
        
        if (imageKeys.length > 0) {
          imageValue = data[imageKeys[0]];
          console.log(`🔍 ✅ Image trouvée par recherche générique: "${imageKeys[0]}"`);
        }
      }
      
      // NE PLUS FAIRE DE FALLBACK AUTOMATIQUE - respecter la variable spécifique
      if (imageValue) {
        console.log(`🔍 ✅ Image finale sélectionnée`);
        return imageValue;
      } else {
        console.log(`🔍 ❌ Aucune image trouvée pour: "${variableName}"`);
        return '';
      }
    }
    
    // Pour les autres types de champs, recherche normale
    // 1. Recherche par clé normalisée (PRIORITÉ)
    const normalizedVariableName = normalizeLabel(variableName);
    let value = data[normalizedVariableName];
    
    if (value !== undefined && value !== null && value !== '') {
      console.log(`🔍 ✅ Valeur trouvée par clé normalisée: "${normalizedVariableName}" = "${value}"`);
      return String(value);
    }
    
    // 2. Recherche par variable exacte
    value = data[variableName];
    
    // Si pas trouvé, essayer plusieurs stratégies de recherche
    if (!value) {
      // 3. Recherche insensible à la casse
      const matchingKey = Object.keys(data).find(key => 
        key.toLowerCase() === variableName.toLowerCase()
      );
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 ✅ Valeur trouvée par recherche insensible à la casse: "${matchingKey}"`);
      } else {
        // 4. Recherche par clé contenant la variable
        const partialMatchKey = Object.keys(data).find(key => 
          key.toLowerCase().includes(variableName.toLowerCase()) ||
          variableName.toLowerCase().includes(key.toLowerCase())
        );
        
        if (partialMatchKey) {
          value = data[partialMatchKey];
          console.log(`🔍 ✅ Valeur trouvée par correspondance partielle: "${partialMatchKey}"`);
        }
      }
    }
    
    const finalValue = value || '';
    
    if (finalValue) {
      console.log(`🔍 ✅ Valeur finale pour "${variableName}": "${finalValue}"`);
    } else {
      console.log(`🔍 ❌ Aucune valeur trouvée pour: "${variableName}"`);
    }
    
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
      if (!signatureData || !signatureData.startsWith('data:image')) {
        throw new Error('Données de signature invalides');
      }

      const [header, base64Data] = signatureData.split(',');
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Données base64 vides');
      }
      
      // Conversion base64 vers bytes
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
      } catch (conversionError) {
        throw new Error(`Conversion base64 échouée: ${conversionError.message}`);
      }
      
      // Embedder l'image (PNG en priorité)
      let image;
      try {
        if (header.includes('png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
      } catch (embedError) {
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
      
      // Dessiner la signature
      page.drawImage(image, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      
    } catch (error) {
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
      if (!imageData || !imageData.startsWith('data:image')) {
        throw new Error('Données image invalides');
      }
      
      const [header, base64Data] = imageData.split(',');
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Données base64 image vides');
      }
      
      // Conversion base64 vers bytes
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
      } catch (conversionError) {
        throw new Error(`Conversion base64 image échouée: ${conversionError.message}`);
      }
      
      let image;
      
      try {
        // Détecter le format plus précisément
        const isPng = header.includes('png') || header.includes('PNG');
        const isJpeg = header.includes('jpeg') || header.includes('jpg') || header.includes('JPEG') || header.includes('JPG');
        const isWebp = header.includes('webp') || header.includes('WEBP');
        
        if (isPng) {
          image = await pdfDoc.embedPng(imageBytes);
        } else if (isWebp) {
          // WebP n'est pas supporté par pdf-lib, convertir en JPEG
          const convertedJpeg = await this.convertWebPToJpeg(imageData);
          const [, convertedBase64] = convertedJpeg.split(',');
          const convertedBytes = new Uint8Array(atob(convertedBase64).split('').map(c => c.charCodeAt(0)));
          image = await pdfDoc.embedJpg(convertedBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
        
      } catch (embedError) {
        // Essayer de convertir en JPEG si l'embedding échoue
        try {
          const convertedJpeg = await this.convertToJpeg(imageData);
          const [, convertedBase64] = convertedJpeg.split(',');
          const convertedBytes = new Uint8Array(atob(convertedBase64).split('').map(c => c.charCodeAt(0)));
          image = await pdfDoc.embedJpg(convertedBytes);
        } catch (conversionError) {
          throw new Error(`Embedding image échoué: ${embedError.message}`);
        }
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
      
      page.drawImage(image, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      
    } catch (error) {
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
  
  /**
   * Convertit une image WebP en JPEG pour compatibilité pdf-lib
   */
  private static async convertWebPToJpeg(webpDataUrl: string): Promise<string> {
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
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Fond blanc pour éviter la transparence
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Dessiner l'image
            ctx.drawImage(img, 0, 0);
            
            // Convertir en JPEG
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.75);
            resolve(jpegDataUrl);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Impossible de charger l\'image WebP'));
        };
        
        img.src = webpDataUrl;
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Convertit n'importe quelle image en JPEG pour compatibilité maximale
   */
  private static async convertToJpeg(imageDataUrl: string): Promise<string> {
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
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Fond blanc pour éviter la transparence
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Dessiner l'image
            ctx.drawImage(img, 0, 0);
            
            // Convertir en JPEG avec bonne qualité
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.75);
            resolve(jpegDataUrl);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Impossible de charger l\'image'));
        };
        
        img.src = imageDataUrl;
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Valide qu'une image est correctement formée
   */
  private static validateImageData(imageData: string): boolean {
    try {
      if (!imageData || typeof imageData !== 'string') {
        return false;
      }
      
      if (!imageData.startsWith('data:image')) {
        return false;
      }
      
      const [header, base64Data] = imageData.split(',');
      if (!header || !base64Data) {
        return false;
      }
      
      // Vérifier que le base64 est valide
      try {
        atob(base64Data);
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
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