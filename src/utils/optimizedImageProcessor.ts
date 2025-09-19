/**
 * Processeur d'images optimisé pour SignFast
 * Gère la compression, le redimensionnement et l'optimisation des images
 */

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  preserveTransparency?: boolean;
}

export class OptimizedImageProcessor {
  private static readonly DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 0.9,
    maxSizeKB: 250,
    format: 'auto',
    preserveTransparency: false
  };

  /**
   * Traite une image avec optimisation complète
   */
  static async processImage(
    file: File | string,
    options: ImageProcessingOptions = {}
  ): Promise<string> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      console.log('🖼️ Début traitement image:', typeof file === 'string' ? 'DataURL' : file.name);
      
      // Validation
      if (file instanceof File) {
        this.validateFile(file);
      }
      
      // Charger l'image
      const img = await this.loadImage(file);
      
      // Calculer les nouvelles dimensions
      const { width, height } = this.calculateOptimalDimensions(
        img.naturalWidth,
        img.naturalHeight,
        opts.maxWidth,
        opts.maxHeight
      );
      
      // Créer le canvas optimisé
      const canvas = this.createOptimizedCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      
      // Configuration pour qualité maximale
      this.configureCanvasForQuality(ctx);
      
      // Fond blanc si nécessaire
      if (!opts.preserveTransparency || opts.format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);
      
      // Déterminer le format optimal
      const format = this.determineOptimalFormat(opts.format, opts.preserveTransparency);
      
      // Compression progressive
      const result = await this.progressiveCompression(canvas, format, opts.quality, opts.maxSizeKB);
      
      console.log('✅ Image traitée:', {
        originalSize: file instanceof File ? Math.round(file.size / 1024) + 'KB' : 'DataURL',
        finalSize: Math.round(result.length / 1024) + 'KB',
        dimensions: `${width}x${height}`,
        format: format.toUpperCase()
      });
      
      return result;
    } catch (error) {
      console.error('❌ Erreur traitement image:', error);
      throw new Error(`Erreur traitement image: ${error.message}`);
    }
  }

  /**
   * Traitement spécialisé pour signatures
   */
  static async processSignature(dataUrl: string): Promise<string> {
    return this.processImage(dataUrl, {
      maxWidth: 600,
      maxHeight: 300,
      quality: 0.95,
      maxSizeKB: 100,
      format: 'png',
      preserveTransparency: true
    });
  }

  /**
   * Traitement pour formulaires publics (compression maximale)
   */
  static async processPublicFormImage(file: File): Promise<string> {
    return this.processImage(file, {
      maxWidth: 1600,
      maxHeight: 1200,
      quality: 0.92,
      maxSizeKB: 350,
      format: 'jpeg',
      preserveTransparency: false
    });
  }

  private static validateFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      throw new Error('Le fichier doit être une image');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('L\'image ne doit pas dépasser 10MB');
    }

    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      throw new Error('Format non supporté. Utilisez JPEG, PNG ou WebP');
    }
  }

  private static loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
      
      if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Erreur lecture fichier'));
        reader.readAsDataURL(source);
      } else {
        img.src = source;
      }
    });
  }

  private static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    let width = maxWidth;
    let height = maxWidth / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  private static createOptimizedCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private static configureCanvasForQuality(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  private static determineOptimalFormat(
    requestedFormat: string,
    preserveTransparency: boolean
  ): 'webp' | 'jpeg' | 'png' {
    if (requestedFormat !== 'auto') {
      return requestedFormat as 'webp' | 'jpeg' | 'png';
    }

    if (preserveTransparency) {
      return 'png';
    }
    
    return 'jpeg';
  }

  private static async progressiveCompression(
    canvas: HTMLCanvasElement,
    format: 'webp' | 'jpeg' | 'png',
    initialQuality: number,
    maxSizeKB: number
  ): Promise<string> {
    let quality = initialQuality;
    let dataUrl = '';
    let attempts = 0;
    const maxAttempts = 6;

    while (attempts < maxAttempts) {
      dataUrl = canvas.toDataURL(`image/${format}`, quality);
      const sizeKB = dataUrl.length / 1024;
      
      if (sizeKB <= maxSizeKB || quality <= 0.5) {
        break;
      }
      
      quality = Math.max(0.5, quality - 0.08);
      attempts++;
    }

    return dataUrl;
  }
}