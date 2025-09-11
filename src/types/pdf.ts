export interface PDFField {
  id: string;
  type: 'text' | 'date' | 'number' | 'signature' | 'checkbox' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  variable: string; // ${nom}, ${email}, etc.
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  required?: boolean;
  placeholder?: string;
}

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  originalPdfUrl: string;
  fields: PDFField[];
  linkedFormId?: string; // Lié à un formulaire spécifique
  pages: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface PDFGeneration {
  id: string;
  templateId: string;
  formResponseId: string;
  generatedPdfUrl: string;
  data: Record<string, any>;
  created_at: string;
}