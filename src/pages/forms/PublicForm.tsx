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

    // Traitement spécial pour les dates avec masque
    if ((field.type === 'date' || field.type === 'birthdate') && field.validation?.mask && typeof value === 'string') {
      // Appliquer le masque à la valeur de date
      const maskedValue = applyDateMask(value, field.validation.mask);
      setFormData(prev => ({ ...prev, [field.label]: maskedValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [field.label]: value }));
  };

  // Fonction pour appliquer un masque à une date
  const applyDateMask = (dateValue: string, mask: string): string => {
    if (!dateValue || !mask) return dateValue;
    
    // Si c'est une date au format ISO (YYYY-MM-DD), la convertir selon le masque
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-');
      
      // Appliquer le masque spécifié
      if (mask === '99/99/9999') {
        return `${day}/${month}/${year}`;
      } else if (mask === '99-99-9999') {
        return `${day}-${month}-${year}`;
      } else if (mask === '99.99.9999') {
        return `${day}.${month}.${year}`;
      } else {
        // Format par défaut français
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