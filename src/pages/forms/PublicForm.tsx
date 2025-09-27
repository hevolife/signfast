import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Form, FormField } from '../../types/form';
import { OptimizedPDFService } from '../../services/optimizedPDFService';
import { OptimizedImageProcessor } from '../../utils/optimizedImageProcessor';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { SignatureCanvas } from '../../components/form/SignatureCanvas';
import { MaskedInput } from '../../components/form/MaskedInput';
import { DocumentScanner } from '../../components/form/DocumentScanner';
import { FormInput, Send, Download, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const PublicForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    if (!id) return;

    try {
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (formError || !formData) {
        toast.error('Formulaire non trouvé ou non publié');
        return;
      }

      setForm(formData);

      if (formData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('logo_url, company_name, first_name, last_name')
          .eq('user_id', formData.user_id)
          .single();

        if (!profileError && profileData) {
          setUserProfile(profileData);
        }
      }

      setIsPasswordProtected(!!formData.password);
      
      if (!formData.password) {
        setPasswordVerified(true);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement du formulaire');
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = () => {
    if (!form?.password) return;
    
    if (password === form.password) {
      setPasswordVerified(true);
      toast.success('Accès autorisé');
    } else {
      toast.error('Mot de passe incorrect');
    }
  };

  const handleInputChange = async (fieldId: string, value: any, field: FormField) => {
    if (field.type === 'file' && value instanceof File && value.type.startsWith('image/')) {
      try {
        toast.loading('Optimisation de l\'image...', { duration: 3000 });
        const optimizedImage = await OptimizedImageProcessor.processPublicFormImage(value);
        setFormData(prev => ({ ...prev, [field.label]: optimizedImage }));
        toast.success('Image optimisée');
      } catch (error) {
        toast.error('Erreur lors de l\'optimisation de l\'image');
      }
      return;
    }

    if ((field.type === 'date' || field.type === 'birthdate') && field.validation?.mask && typeof value === 'string') {
      const maskedValue = applyDateMask(value, field.validation.mask);
      setFormData(prev => ({ ...prev, [field.label]: maskedValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [field.label]: value }));
  };

  const applyDateMask = (dateValue: string, mask: string): string => {
    if (!dateValue || !mask) return dateValue;
    
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-');
      
      if (mask === '99/99/9999') {
        return `${day}/${month}/${year}`;
      } else if (mask === '99-99-9999') {
        return `${day}-${month}-${year}`;
      } else if (mask === '99.99.9999') {
        return `${day}.${month}.${year}`;
      } else {
        return `${day}/${month}/${year}`;
      }
    }
    
    return dateValue;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validation des champs obligatoires
    const missingFields = form.fields?.filter(field => 
      field.required && (!formData[field.label] || formData[field.label] === '')
    ) || [];

    if (missingFields.length > 0) {
      toast.error(`Veuillez remplir tous les champs obligatoires`);
      return;
    }

    setSubmitting(true);

    try {
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert([{
          form_id: form.id,
          data: formData,
          ip_address: null,
          user_agent: navigator.userAgent,
        }])
        .select()
        .single();

      if (responseError) {
        throw new Error(`Erreur sauvegarde: ${responseError.message}`);
      }

      let pdfGenerated = false;
      if (form.settings?.generatePdf && form.settings?.pdfTemplateId) {
        try {
          const enrichedFormData = {
            ...formData,
            _form_metadata: { fields: form.fields },
            _original_form_fields: form.fields
          };
          
          const pdfBytes = await OptimizedPDFService.generatePDF({
            templateId: form.settings.pdfTemplateId,
            formTitle: form.title,
            responseId: response.id,
            formData: enrichedFormData,
            saveToServer: form.settings.savePdfToServer,
          });

          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setGeneratedPdfUrl(url);
          pdfGenerated = true;
          
        } catch (pdfError) {
          try {
            await supabase
              .from('responses')
              .delete()
              .eq('id', response.id);
          } catch (deleteError) {
          }
          
          throw new Error(`Erreur génération PDF: ${pdfError.message}`);
        }
      } else {
      }

      setSubmitted(true);
      toast.success('✅ Formulaire envoyé et traité avec succès !');
      
    } catch (error: any) {
      if (error.message?.includes('sauvegarde')) {
        toast.error('❌ Erreur lors de la sauvegarde de vos données. Veuillez réessayer.');
      } else if (error.message?.includes('PDF')) {
        toast.error('❌ Erreur lors de la génération du PDF. Veuillez réessayer.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error('❌ Problème de connexion. Vérifiez votre réseau et réessayez.');
      } else {
        toast.error('❌ Erreur lors de l\'envoi du formulaire. Veuillez réessayer.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPDF = () => {
    if (generatedPdfUrl) {
      const a = document.createElement('a');
      a.href = generatedPdfUrl;
      a.download = `${form?.title || 'document'}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('PDF téléchargé !');
    }
  };

  const renderConditionalFields = (parentField: FormField, selectedValues: string | string[]) => {
    if (!parentField.conditionalFields) return null;

    const valuesToCheck = Array.isArray(selectedValues) ? selectedValues : [selectedValues];
    const fieldsToShow: FormField[] = [];

    valuesToCheck.forEach(value => {
      if (parentField.conditionalFields?.[value]) {
        fieldsToShow.push(...parentField.conditionalFields[value]);
      }
    });

    return fieldsToShow.map(field => (
      <div key={field.id} className="ml-6 border-l-2 border-blue-300 dark:border-blue-600 pl-4 mt-4">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
        {renderField(field)}
        </div>
      </div>
    ));
  };

  const renderField = (field: FormField) => {
    const baseProps = {
      id: field.id,
      required: field.required,
      placeholder: field.placeholder,
      value: formData[field.label] || '',
    };

    switch (field.type) {
      case 'text':
        return field.validation?.mask ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <MaskedInput
              mask={field.validation.mask}
              value={formData[field.label] || ''}
              onChange={(maskedValue) => handleInputChange(field.id, maskedValue, field)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white shadow-sm transition-all duration-200"
            />
            {field.validation.mask && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                <span>Format: {field.validation.mask}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={formData[field.label] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value, field)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white shadow-sm transition-all duration-200"
            />
          </div>
        );

      case 'email':
      case 'phone':
      case 'number':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type === 'phone' ? 'tel' : field.type}
              value={formData[field.label] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value, field)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white shadow-sm transition-all duration-200"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={formData[field.label] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value, field)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white shadow-sm transition-all duration-200 resize-none"
              rows={4}
            />
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-3">
              {field.options?.map((option, idx) => (
                <label key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-md">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={formData[field.label] === option}
                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                    className="text-blue-600 w-4 h-4 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{option}</span>
                </label>
              ))}
            </div>
            {formData[field.label] && renderConditionalFields(field, formData[field.label])}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-3">
              {field.options?.map((option, idx) => (
                <label key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 cursor-pointer transition-all duration-200 hover:shadow-md">
                  <input
                    type="checkbox"
                    value={option}
                    checked={(formData[field.label] || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = formData[field.label] || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option);
                      handleInputChange(field.id, newValues, field);
                    }}
                    className="text-green-600 w-4 h-4 focus:ring-2 focus:ring-green-500 rounded"
                  />
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{option}</span>
                </label>
              ))}
            </div>
            {formData[field.label] && formData[field.label].length > 0 && renderConditionalFields(field, formData[field.label])}
          </div>
        );

      case 'date':
      case 'birthdate':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              value={formData[field.label] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value, field)}
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white shadow-sm transition-all duration-200"
            />
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              accept={field.validation?.acceptedFileTypes?.join(',') || "image/*,.pdf,.doc,.docx"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Vérifier la taille du fichier si configurée
                  if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize * 1024 * 1024) {
                    toast.error(`Le fichier ne doit pas dépasser ${field.validation.maxFileSize} MB`);
                    e.target.value = ''; // Reset input
                    return;
                  }
                  
                  handleInputChange(field.id, file, field);
                }
              }}
              required={field.required}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white shadow-sm transition-all duration-200 cursor-pointer hover:border-blue-400"
            />
            
            {/* Informations sur les restrictions */}
            {(field.validation?.acceptedFileTypes || field.validation?.maxFileSize) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  {field.validation?.acceptedFileTypes && (
                    <div>
                      <strong>Types acceptés :</strong> {field.validation.acceptedFileTypes.join(', ')}
                    </div>
                  )}
                  {field.validation?.maxFileSize && (
                    <div>
                      <strong>Taille maximale :</strong> {field.validation.maxFileSize} MB
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {formData[field.label] && typeof formData[field.label] === 'string' && formData[field.label].startsWith('data:image') && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  ✅ Image uploadée avec succès
                </p>
                <img
                  src={formData[field.label]}
                  alt="Aperçu"
                  className="max-w-full max-h-32 object-contain mx-auto border border-green-200 dark:border-green-700 rounded shadow-md"
                />
                <p className="text-xs text-green-700 dark:text-green-400 mt-2 text-center">
                  {Math.round(formData[field.label].length / 1024)} KB
                </p>
              </div>
            )}
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
                ✍️ Signature électronique
              </p>
              <SignatureCanvas
                onSignatureChange={(signature) => handleInputChange(field.id, signature, field)}
                value={formData[field.label]}
                required={field.required}
              />
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                🔒 Votre signature a une valeur légale équivalente à une signature manuscrite
              </p>
            </div>
          </div>
        );

      case 'scan':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3">
                📷 Scanner de document
              </p>
              <DocumentScanner
                onImageCapture={(imageData) => handleInputChange(field.id, imageData, field)}
                value={formData[field.label]}
                required={field.required}
                scanSettings={field.validation?.scanSettings}
              />
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                📱 Utilisez votre caméra pour numériser des documents avec recadrage automatique
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Formulaire non trouvé
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ce formulaire n'existe pas ou n'est pas publié.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-blue-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-blue-900/20 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background décoratif animé */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-br from-yellow-200/30 to-orange-200/30 rounded-full blur-2xl animate-bounce delay-500"></div>
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-full blur-xl animate-pulse delay-1500"></div>
        </div>
        
        {/* Particules flottantes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
          <div className="absolute top-32 right-16 w-3 h-3 bg-blue-400 rounded-full animate-ping delay-1000"></div>
          <div className="absolute bottom-24 left-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-500"></div>
          <div className="absolute bottom-16 right-1/4 w-3 h-3 bg-purple-400 rounded-full animate-ping delay-1500"></div>
          <div className="absolute top-1/3 right-12 w-2 h-2 bg-pink-400 rounded-full animate-ping delay-2000"></div>
        </div>
        
        <div className="relative max-w-2xl w-full mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in slide-in-from-bottom-8 duration-1000">
            <CardContent className="text-center py-12 px-8 relative overflow-hidden">
              {/* Background gradient subtil */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-900/10 dark:to-blue-900/10"></div>
              
              <div className="relative">
                {/* Animation de succès avec cercles concentriques */}
                <div className="relative mb-8 animate-in zoom-in duration-1000 delay-300">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl relative">
                    {/* Cercles d'animation */}
                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></div>
                    <div className="absolute inset-2 rounded-full bg-green-300 animate-ping opacity-20 delay-300"></div>
                    <div className="absolute inset-4 rounded-full bg-green-200 animate-ping opacity-10 delay-600"></div>
                    
                    {/* Icône principale */}
                    <CheckCircle className="h-16 w-16 text-white animate-pulse" />
                    
                    {/* Étoiles scintillantes */}
                    <div className="absolute -top-3 -right-3 text-yellow-400 animate-bounce">
                      <span className="text-2xl">✨</span>
                    </div>
                    <div className="absolute -bottom-3 -left-3 text-yellow-400 animate-bounce delay-500">
                      <span className="text-xl">⭐</span>
                    </div>
                    <div className="absolute -top-3 -left-3 text-yellow-400 animate-bounce delay-1000">
                      <span className="text-lg">💫</span>
                    </div>
                  </div>
                </div>

                {/* Titre principal avec animation */}
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 animate-in slide-in-from-top duration-1000 delay-500">
                  <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent">
                    Parfait !
                  </span>
                </h1>
                
                {/* Message de confirmation */}
                <div className="space-y-4 mb-8 animate-in slide-in-from-bottom duration-1000 delay-700">
                  <p className="text-xl sm:text-2xl text-gray-800 dark:text-gray-200 font-semibold">
                    🎉 Votre formulaire a été envoyé avec succès !
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                    Merci pour votre confiance. Vos informations ont été transmises en toute sécurité.
                  </p>
                </div>

                {/* Informations de confirmation */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800 mb-8 shadow-lg animate-in fade-in duration-1000 delay-1000">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-300">
                      Confirmation de réception
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">📝</span>
                      <span className="text-green-800 dark:text-green-200">Données sécurisées</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">🔒</span>
                      <span className="text-green-800 dark:text-green-200">Chiffrement SSL</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">⚡</span>
                      <span className="text-green-800 dark:text-green-200">Traitement instantané</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">🇫🇷</span>
                      <span className="text-green-800 dark:text-green-200">Conforme RGPD</span>
                    </div>
                  </div>
                </div>

                {/* Bouton de téléchargement PDF avec animation */}
                {generatedPdfUrl && (
                  <div className="animate-in slide-in-from-bottom duration-1000 delay-1200">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 mb-6 shadow-lg">
                      <div className="flex items-center justify-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <Download className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                          Document PDF généré
                        </h3>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                        Votre document personnalisé est prêt à être téléchargé
                      </p>
                      <Button
                        onClick={downloadPDF}
                        className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 rounded-2xl"
                      >
                        <Download className="h-6 w-6 mr-3 group-hover:animate-bounce" />
                        <span>Télécharger votre PDF</span>
                        <div className="ml-3 opacity-75 group-hover:opacity-100 transition-opacity">📄</div>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Message de fin avec branding */}
                <div className="animate-in fade-in duration-1000 delay-1500">
                  <div className="flex items-center justify-center space-x-3 text-gray-500 dark:text-gray-400">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                      <FormInput className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      Propulsé par <span className="font-bold text-blue-600">SignFast</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Signature électronique française • Sécurisé et conforme
                  </p>
                </div>

                {/* Confettis CSS */}
                <style jsx>{`
                  @keyframes confetti-fall {
                    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
                  }
                  
                  .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    animation: confetti-fall 3s linear infinite;
                  }
                  
                  .confetti:nth-child(1) { left: 10%; animation-delay: 0s; background: #10b981; }
                  .confetti:nth-child(2) { left: 20%; animation-delay: 0.5s; background: #3b82f6; }
                  .confetti:nth-child(3) { left: 30%; animation-delay: 1s; background: #8b5cf6; }
                  .confetti:nth-child(4) { left: 40%; animation-delay: 1.5s; background: #f59e0b; }
                  .confetti:nth-child(5) { left: 50%; animation-delay: 2s; background: #ef4444; }
                  .confetti:nth-child(6) { left: 60%; animation-delay: 0.3s; background: #06b6d4; }
                  .confetti:nth-child(7) { left: 70%; animation-delay: 0.8s; background: #84cc16; }
                  .confetti:nth-child(8) { left: 80%; animation-delay: 1.3s; background: #ec4899; }
                  .confetti:nth-child(9) { left: 90%; animation-delay: 1.8s; background: #6366f1; }
                `}</style>
                
                {/* Confettis animés */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="confetti"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isPasswordProtected && !passwordVerified) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Formulaire protégé
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ce formulaire nécessite un mot de passe
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez le mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <Button
                onClick={verifyPassword}
                disabled={!password}
                className="w-full"
              >
                Accéder au formulaire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 py-8 px-4">
      
      <div className="max-w-2xl mx-auto">
        {/* Header du formulaire simplifié */}
        <div className="text-center mb-8">
          {/* Logo de l'entreprise si disponible */}
          {userProfile?.logo_url ? (
            <div className="mb-6">
              <img
                src={userProfile.logo_url}
                alt={userProfile.company_name || 'Logo entreprise'}
                className="max-w-24 max-h-24 object-contain mx-auto mb-4 rounded-xl shadow-lg"
              />
              {userProfile.company_name && (
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {userProfile.company_name}
                </p>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FormInput className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SignFast
              </span>
            </div>
          )}
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
              {form.description}
            </p>
          )}
          
          {/* Badge de sécurité simplifié */}
          <div className="inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full text-green-800 dark:text-green-300 text-sm font-medium shadow-sm">
            <span className="text-lg">🔒</span>
            <span>Sécurisé et conforme</span>
          </div>
        </div>

        {/* Formulaire simplifié */}
        <Card className="bg-white dark:bg-gray-800 shadow-xl border-0">
          
          <CardContent className="p-6 sm:p-8">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields?.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
              
              {/* Section de soumission simplifiée */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 rounded-xl"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Envoi en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Send className="h-5 w-5" />
                      <span>Envoyer le formulaire</span>
                    </div>
                  )}
                </Button>
                
                {/* Message de confiance simplifié */}
                <div className="text-center mt-4">
                  <div className="flex items-center justify-center space-x-3 text-gray-500 dark:text-gray-400">
                    <span className="text-sm font-medium">
                      Propulsé par <span className="font-bold text-blue-600">SignFast</span>
                    </span>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};