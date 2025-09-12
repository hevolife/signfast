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
      
      // Charger le PDF original
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      console.log('🎨 PDF chargé:', pages.length, 'pages');
      
      // Charger les polices
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Traiter chaque champ
      for (const field of template.fields) {
        const pageIndex = (field.page || 1) - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          console.warn(`Page ${field.page} non trouvée`);
          continue;
        }
        
        const { height: pageHeight } = page.getSize();
        
        // Conversion coordonnées: éditeur (top-left) vers PDF (bottom-left)
        const pdfX = field.x;
        const pdfY = pageHeight - field.y - field.height;
        
        const value = this.getFieldValue(field, data);
        
        console.log(`🎨 Champ ${field.variable}: "${value}" à (${pdfX}, ${pdfY})`);
        
        if (!value && !field.required) {
          continue;
        }

        switch (field.type) {
          case 'text':
          case 'number':
            await this.drawText(page, value, pdfX, pdfY, field, font);
            break;
            
          case 'date':
            const dateValue = this.formatDate(value);
            await this.drawText(page, dateValue, pdfX, pdfY, field, font);
            break;
            
          case 'checkbox':
            await this.drawCheckbox(page, value, pdfX, pdfY, field);
            break;
            
          case 'signature':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawSignature(pdfDoc, page, value, pdfX, pdfY, field);
            }
            break;
            
          case 'image':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawImage(pdfDoc, page, value, pdfX, pdfY, field);
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
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    
    console.log(`🔍 Recherche variable: "${variableName}"`);
    console.log(`🔍 Clés disponibles:`, Object.keys(data));
    
    let value = data[variableName];
    
    // Recherche étendue si pas trouvé
    if (!value) {
      const originalKeys = Object.keys(data);
      
      // Recherche exacte
      let matchingKey = originalKeys.find(key => key === variableName);
      
      // Recherche insensible à la casse
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          key.toLowerCase() === variableName.toLowerCase()
        );
      }
      
      // Recherche normalisée
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          this.normalizeKey(key) === this.normalizeKey(variableName)
        );
      }
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 Trouvé via clé: "${matchingKey}" = "${value}"`);
      } else {
        console.log(`🔍 Variable "${variableName}" non trouvée`);
      }
    }
    
    return value || field.placeholder || '';
  }
  
  private static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
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
    
    // Fond si spécifié
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

    // Texte centré verticalement
    page.drawText(text, {
      x: x + 5,
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
    const size = Math.min(field.width, field.height, 16);
    
    // Case
    page.drawRectangle({
      x,
      y: y + (field.height - size) / 2,
      width: size,
      height: size,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    // Coche
    if (isChecked) {
      page.drawText('✓', {
        x: x + 2,
        y: y + (field.height - size) / 2 + 2,
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
    field: PDFField
  ) {
    try {
      const imageBytes = this.base64ToBytes(signatureData);
      const image = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
    } catch (error) {
      console.error('Erreur signature:', error);
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
    try {
      const imageBytes = this.base64ToBytes(imageData);
      let image;
      
      if (imageData.includes('data:image/png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
    } catch (error) {
      console.error('Erreur image:', error);
      
      // Placeholder en cas d'erreur
      page.drawRectangle({
        x,
        y,
        width: field.width,
        height: field.height,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      page.drawText('Image non disponible', {
        x: x + 5,
        y: y + field.height / 2,
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

  private static base64ToBytes(base64: string): Uint8Array {
    try {
      const base64Data = base64.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    } catch (error) {
      console.error('Erreur conversion base64:', error);
      throw new Error(`Conversion base64 échouée: ${error.message}`);
    }
  }
}