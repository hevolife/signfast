export interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'radio' | 'checkbox' | 'date' | 'file' | 'textarea' | 'phone' | 'birthdate' | 'signature';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  conditionalFields?: {
    [optionValue: string]: FormField[];
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    mask?: string;
  };
}

export interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    allowMultiple: boolean;
    requireAuth: boolean;
    collectEmail: boolean;
    pdfTemplateId?: string;
    generatePdf: boolean;
    emailPdf: boolean;
    savePdfToServer: boolean;
    webhookUrl?: string;
  };
  user_id: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  password: string | null;
}

export interface FormResponse {
  id: string;
  form_id: string;
  data: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface FormStats {
  totalResponses: number;
  todayResponses: number;
  avgCompletionTime: number;
  fieldStats: Record<string, any>;
}