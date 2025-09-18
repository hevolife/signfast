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
      // Première requête : récupérer le formulaire
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

      // Deuxième requête : récupérer le profil utilisateur
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
      console.error('Erreur récupération formulaire:', error);
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
    // Traitement spécial pour les images
    if (field.type === 'file' && value instanceof File && value.type.startsWith('image/')) {
      try {
        toast.loading('Optimisation de l\'image...', { duration: 3000 });
        const optimizedImage = await OptimizedImageProcessor.processPublicFormImage(value);
        setFormData(prev => ({ ...prev, [field.label]: optimizedImage }));
        toast.success('Image optimisée');
      } catch (error) {
        console.error('Erreur optimisation image:', error);
        toast.error('Erreur lors de l\'optimisation de l\'image');
      }
      return;
    }

    setFormData(prev => ({ ...prev, [field.label]: value }));
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
      // Sauvegarder la réponse
      const { data: response, error } = await supabase
        .from('responses')
        .insert([{
          form_id: form.id,
          data: formData,
          ip_address: null,
          user_agent: navigator.userAgent,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Générer le PDF si configuré
      if (form.settings?.generatePdf) {
        try {
          const pdfBytes = await OptimizedPDFService.generatePDF({
            templateId: form.settings.pdfTemplateId,
            formTitle: form.title,
            responseId: response.id,
            formData,
            saveToServer: form.settings.savePdfToServer,
          });

          // Créer l'URL de téléchargement
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setGeneratedPdfUrl(url);
        } catch (pdfError) {
          console.error('Erreur génération PDF:', pdfError);
          toast.error('Formulaire soumis mais erreur génération PDF');
        }
      }

      setSubmitted(true);
      toast.success('Formulaire soumis avec succès !');
      
    } catch (error: any) {
      console.error('Erreur soumission:', error);
      toast.error('Erreur lors de la soumission');
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
          <MaskedInput
            mask={field.validation.mask}
            value={formData[field.label] || ''}
            onChange={(value) => handleInputChange(field.id, value, field)}
            label={field.label}
            required={field.required}
            placeholder={field.placeholder}
          />
        ) : (
          <Input
            {...baseProps}
            type="text"
            label={field.label}
            onChange={(e) => handleInputChange(field.id, e.target.value, field)}
          />
        );

      case 'email':
      case 'phone':
      case 'number':
        return (
          <Input
            {...baseProps}
            type={field.type === 'phone' ? 'tel' : field.type}
            label={field.label}
            onChange={(e) => handleInputChange(field.id, e.target.value, field)}
          />
        );

      case 'textarea':
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              {...baseProps}
              onChange={(e) => handleInputChange(field.id, e.target.value, field)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              rows={3}
            />
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, idx) => (
                <label key={idx} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={formData[field.label] === option}
                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                    className="text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, idx) => (
                <label key={idx} className="flex items-center space-x-2">
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
                    className="text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'date':
      case 'birthdate':
        return (
          <Input
            {...baseProps}
            type="date"
            label={field.label}
            onChange={(e) => handleInputChange(field.id, e.target.value, field)}
          />
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              id={field.id}
              required={field.required}
              placeholder={field.placeholder}
              type="file"
              label={field.label}
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleInputChange(field.id, file, field);
                }
              }}
            />
            {formData[field.label] && typeof formData[field.label] === 'string' && formData[field.label].startsWith('data:image') && (
              <div className="mt-2">
                <img
                  src={formData[field.label]}
                  alt="Aperçu"
                  className="max-w-xs max-h-32 object-contain border border-gray-300 rounded shadow-lg"
                />
              </div>
            )}
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <SignatureCanvas
              onSignatureChange={(signature) => handleInputChange(field.id, signature, field)}
              value={formData[field.label]}
              required={field.required}
            />
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Merci !
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Votre formulaire a été soumis avec succès.
            </p>
            
            {generatedPdfUrl && (
              <Button
                onClick={downloadPDF}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
              >
                <Download className="h-5 w-5 mr-2" />
                Télécharger le PDF
              </Button>
            )}
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header du formulaire */}
        <div className="text-center mb-8">
          {/* Logo de l'entreprise si disponible */}
          {userProfile?.logo_url ? (
            <div className="mb-6">
              <img
                src={userProfile.logo_url}
                alt={userProfile.company_name || 'Logo entreprise'}
                className="max-w-32 max-h-32 object-contain mx-auto mb-4 shadow-lg rounded-lg"
              />
              {userProfile.company_name && (
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {userProfile.company_name}
                </p>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FormInput className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SignFast
              </span>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {form.description}
            </p>
          )}
        </div>

        {/* Formulaire */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields?.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
              
              <div className="pt-6 border-t border-gray-200/50">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Envoi en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Send className="h-5 w-5" />
                      <span>Envoyer le formulaire</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};