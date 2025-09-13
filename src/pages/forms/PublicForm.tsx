import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatDateFR } from '../../utils/dateFormatter';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useForms } from '../../hooks/useForms';
import { stripeConfig } from '../../stripe-config';
import { Form, FormField } from '../../types/form';
import { UserProfile } from '../../types/user';
import { PDFService } from '../../services/pdfService';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { SignatureCanvas } from '../../components/form/SignatureCanvas';
import { FormInput, CheckCircle, FileText, Download, Lock, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const PublicForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { forms } = useForms();
  const [form, setForm] = useState<Form | null>(null);
  const [formOwnerProfile, setFormOwnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedPDF, setGeneratedPDF] = useState<Uint8Array | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [savedPdfFileName, setSavedPdfFileName] = useState<string | null>(null);
  const [isFormLocked, setIsFormLocked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  useEffect(() => {
    // Vérifier si le formulaire est verrouillé
    if (form && user && forms.length > 0) {
      const formIndex = forms.findIndex(f => f.id === form.id);
      const isLocked = !isSubscribed && formIndex >= stripeConfig.freeLimits.maxForms;
      setIsFormLocked(isLocked);
    }
  }, [form, user, forms, isSubscribed]);

  const fetchForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error) {
        console.error('Error fetching form:', error);
        return;
      }

      setForm(data);
      
      // Récupérer le profil du propriétaire du formulaire pour afficher le logo
      if (data.user_id) {
        fetchFormOwnerProfile(data.user_id);
      }
    } catch (error) {
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOwnerProfile = async (userId: string) => {
    try {
     // Vérifier si Supabase est configuré
     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
     
     if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
       setFormOwnerProfile({
         id: '',
         user_id: userId,
         first_name: null,
         last_name: null,
         company_name: null,
         address: null,
         siret: null,
         logo_url: null,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
       });
       return;
     }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
       setFormOwnerProfile({
         id: '',
         user_id: userId,
         first_name: null,
         last_name: null,
         company_name: null,
         address: null,
         siret: null,
         logo_url: null,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
       });
        return;
      }

      if (!data) {
        // Créer un profil vide au lieu de null pour éviter le "Chargement..."
        setFormOwnerProfile({
          id: '',
          user_id: userId,
          first_name: null,
          last_name: null,
          company_name: null,
          address: null,
          siret: null,
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }

      setFormOwnerProfile(data);
    } catch (error) {
      // Créer un profil vide en cas d'erreur
      setFormOwnerProfile({
        id: '',
        user_id: userId,
        first_name: null,
        last_name: null,
        company_name: null,
        address: null,
        siret: null,
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Fonction utilitaire pour normaliser les clés (même logique que dans pdfGenerator)
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;
    
    setSubmitting(true);
    
    try {
      // Préparer les données pour la base (sans les gros fichiers)
      const dbSubmissionData = { ...formData };
      // Préparer les données complètes pour le PDF (avec les images)
      const pdfSubmissionData = { ...formData };
      
      // Traitement spécial pour les signatures
      // Créer un mapping direct par libellé de champ pour simplifier
      const fieldLabelToId = new Map();
      form.fields?.forEach(field => {
        fieldLabelToId.set(field.label, field.id);
        fieldLabelToId.set(normalizeKey(field.label), field.id);
      });
      
      // Traiter chaque champ du formulaire
      form.fields?.forEach(field => {
        const fieldValue = formData[field.id];
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // Créer les clés de mapping
          const normalizedKey = normalizeKey(field.label);
          const keys = [
            field.label,           // Libellé exact
            normalizedKey,         // Libellé normalisé (pour variable)
            field.label.toLowerCase(), // Minuscules
          ];
          
          // Pour les signatures, ajouter des clés spéciales
          if (field.type === 'signature') {
            keys.push('signature', 'Signature', 'SIGNATURE');
          }
          
          // Pour les signatures, sauvegarder avec plusieurs formats
          if (field.type === 'signature' && typeof fieldValue === 'string' && fieldValue.startsWith('data:image')) {
            // Sauvegarder avec toutes les clés possibles
            keys.forEach(key => {
              pdfSubmissionData[key] = fieldValue;
              dbSubmissionData[key] = `[SIGNATURE_${field.id}]`;
            });
          }
          // Images normales
          else if (typeof fieldValue === 'string' && fieldValue.startsWith('data:image')) {
            keys.forEach(key => {
              pdfSubmissionData[key] = fieldValue;
              dbSubmissionData[key] = `[IMAGE_${field.id}]`;
            });
          } 
          // Données normales
          else {
            keys.forEach(key => {
              pdfSubmissionData[key] = fieldValue;
              dbSubmissionData[key] = fieldValue;
            });
          }
        }
        
        // Traiter les champs conditionnels
        if (field.conditionalFields && fieldValue) {
          const selectedValues = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
          
          selectedValues.forEach(selectedValue => {
            const conditionalFields = field.conditionalFields?.[selectedValue];
            if (conditionalFields) {
              conditionalFields.forEach(conditionalField => {
                const conditionalValue = formData[conditionalField.id];
                if (conditionalValue !== undefined && conditionalValue !== null && conditionalValue !== '') {
                  const conditionalNormalizedKey = normalizeKey(conditionalField.label);
                  const conditionalKeys = [
                    conditionalField.label,
                    conditionalNormalizedKey,
                    conditionalField.label.toLowerCase(),
                  ];
                  
                  if (conditionalField.type === 'signature') {
                    conditionalKeys.push('signature', 'Signature', 'SIGNATURE');
                  }
                  
                  if (conditionalField.type === 'signature' && typeof conditionalValue === 'string' && conditionalValue.startsWith('data:image')) {
                    conditionalKeys.forEach(key => {
                      pdfSubmissionData[key] = conditionalValue;
                      dbSubmissionData[key] = conditionalValue; // GARDER LA SIGNATURE COMPLÈTE
                    });
                  } else if (typeof conditionalValue === 'string' && conditionalValue.startsWith('data:image')) {
                    conditionalKeys.forEach(key => {
                      pdfSubmissionData[key] = conditionalValue;
                      dbSubmissionData[key] = `[IMAGE_${conditionalField.id}]`;
                    });
                  } else {
                    conditionalKeys.forEach(key => {
                      pdfSubmissionData[key] = conditionalValue;
                      dbSubmissionData[key] = conditionalValue;
                    });
                  }
                }
              });
            }
          });
        }
      });

      // Formater les dates au format français avant soumission
      Object.keys(dbSubmissionData).forEach(key => {
        const value = dbSubmissionData[key];
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          dbSubmissionData[key] = formatDateFR(value);
          pdfSubmissionData[key] = formatDateFR(value);
        }
      });

      // Sauvegarder dans la base avec les données allégées
      const { data: responseData, error } = await supabase
        .from('responses')
        .insert([{
          form_id: id,
          data: dbSubmissionData,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error:', error);
        toast.error('Erreur lors de l\'envoi du formulaire');
        return;
      }

      // Génération PDF
      // Traitement PDF en arrière-plan pour éviter les timeouts
      setTimeout(async () => {
        try {
          await handlePDFGeneration(responseData, pdfSubmissionData);
        } catch (error) {
          // Ne pas afficher d'erreur à l'utilisateur car le formulaire est déjà envoyé
        }
      }, 100);

      setSubmitted(true);
      toast.success('Formulaire envoyé avec succès !');
      
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePDFGeneration = async (response: any, submissionData: Record<string, any>) => {
    try {
      // Ne pas afficher de toast pour les utilisateurs publics
      // Préparer les métadonnées
      const timestamp = Date.now();
      const fileName = `${form.title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`;
      
      // Sauvegarder le nom de fichier pour le téléchargement
      setSavedPdfFileName(fileName);
      
      // IMPORTANT: Récupérer l'ID du propriétaire du formulaire pour la sauvegarde PDF
      const formOwnerId = form.user_id;
      
      if (!formOwnerId) {
        return; // Échec silencieux pour les formulaires publics
      }
      
      const metadata = {
        responseId: response.id,
        templateName: 'PDF Simple',
        formTitle: form.title,
        formData: submissionData,
        userId: formOwnerId,
      };

      // Vérifier si un template PDF est configuré
      if (form.settings?.pdfTemplateId) {
        try {
          // Charger le template depuis Supabase avec timeout
          const template = await Promise.race([
            PDFTemplateService.getTemplate(form.settings.pdfTemplateId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          
          if (template) {
            metadata.templateName = template.name;
            // Ajouter les données du template dans form_data avec la structure _template
            submissionData._template = {
              templateId: template.id,
              templateFields: template.fields,
              templatePdfContent: template.originalPdfUrl,
            };
            
            metadata.templateName = 'PDF Simple';
          }
        } catch (templateError) {
          metadata.templateName = 'PDF Simple';
        }
      }

      // Mettre à jour les métadonnées avec les données finales
      metadata.formData = submissionData;
      
      // Sauvegarder les métadonnées (pas le PDF lui-même)
      await PDFService.savePDFMetadata(fileName, metadata);
      
      // Simuler qu'un PDF est disponible pour le téléchargement
      setGeneratedPDF(new Uint8Array([1])); // Dummy data pour activer le bouton
      
    } catch (error) {
      // Échec silencieux pour les formulaires publics
      // Le formulaire est envoyé même si le PDF échoue
    }
  };

  const downloadPDF = () => {
    if (!generatedPDF || !form || !savedPdfFileName) return;

    toast.loading('📄 Génération du PDF en cours...');
    
    setTimeout(async () => {
      try {
        const success = await PDFService.generateAndDownloadPDF(savedPdfFileName);
        
        if (success) {
          toast.success('📄 PDF téléchargé avec succès !');
        } else {
          toast.error('❌ Erreur lors de la génération du PDF');
        }
      } catch (error) {
        toast.error('❌ Erreur lors du téléchargement');
      }
    }, 1000);
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

    return fieldsToShow.map(conditionalField => (
      <div key={conditionalField.id} className="ml-6 border-l-2 border-blue-200 pl-4 mt-4">
        {renderField(conditionalField)}
      </div>
    ));
  };

  const renderField = (field: FormField) => {
    const baseProps = {
      id: field.id,
      required: field.required,
      placeholder: field.placeholder,
      value: formData[field.id] || '',
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div>
            <Input
              {...baseProps}
              type={field.type === 'phone' ? 'tel' : field.type}
              label={field.label}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'textarea':
        return (
          <div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                {...baseProps}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows={3}
              />
            </div>
          </div>
        );
      
      case 'radio':
        return (
          <div>
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
                      checked={formData[field.id] === option}
                      onChange={(e) => {
                        handleInputChange(field.id, e.target.value);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            {formData[field.id] && renderConditionalFields(field, formData[field.id])}
          </div>
        );
      
      case 'checkbox':
        return (
          <div>
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
                      checked={(formData[field.id] || []).includes(option)}
                      onChange={(e) => {
                        const currentValues = formData[field.id] || [];
                        const newValues = e.target.checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        handleInputChange(field.id, newValues);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            {formData[field.id] && formData[field.id].length > 0 && renderConditionalFields(field, formData[field.id])}
          </div>
        );
      
      case 'date':
      case 'birthdate':
        return (
          <div>
            <Input
              {...baseProps}
              type="date"
              label={field.label}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'file':
        return (
          <div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="file"
                id={field.id}
                accept="image/*,.pdf,.doc,.docx"
                required={field.required}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Pour les images, convertir en base64
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        handleInputChange(field.id, base64);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      // Pour les autres fichiers, stocker le nom
                      handleInputChange(field.id, file.name);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              {/* Aperçu de l'image si c'est une image */}
              {formData[field.id] && typeof formData[field.id] === 'string' && formData[field.id].startsWith('data:image') && (
                <div className="mt-2">
                  <p className="text-xs text-green-600 mb-1">✅ Image chargée et prête pour le PDF</p>
                  <img
                    src={formData[field.id]}
                    alt="Aperçu"
                    className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          </div>
        );
      
      case 'signature':
        return (
          <div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <SignatureCanvas
                onSignatureChange={(signature) => handleInputChange(field.id, signature)}
                value={formData[field.id]}
                required={field.required}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Si le formulaire est verrouillé, afficher le message de verrouillage
  if (isFormLocked) {
    const product = stripeConfig.products[0];
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-full mb-6 shadow-lg">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Formulaire verrouillé
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ce formulaire nécessite un abonnement {product.name} pour être accessible au public.
            </p>
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Crown className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900 dark:text-blue-300">
                    {product.name}
                  </span>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                    {product.price}€/mois
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Formulaires publics illimités
                </p>
              </div>
              
              {user ? (
                <Link to="/subscription">
                  <Button className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600">
                    <Crown className="h-4 w-4" />
                    <span>Passer à {product.name}</span>
                  </Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link to="/login">
                    <Button className="w-full">
                      Se connecter pour débloquer
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-500">
                    Connectez-vous pour gérer vos abonnements
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <FormInput className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Formulaire non trouvé
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ce formulaire n'existe pas ou n'est plus disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Merci pour votre réponse !
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Votre formulaire a été envoyé avec succès.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo de l'entreprise - Toujours affiché pour debug */}
        <div className="text-center mb-8">
          <div className="mb-6">
            {formOwnerProfile === null ? (
              <div className="h-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-400 text-sm ml-2">Chargement du profil...</span>
              </div>
            ) : formOwnerProfile?.logo_url ? (
              <img
                src={formOwnerProfile.logo_url}
                alt={formOwnerProfile.company_name || "Logo de l'entreprise"}
                className="h-24 w-auto mx-auto object-contain max-w-xs"
                onError={(e) => {
                  console.error('❌ Erreur chargement logo:', formOwnerProfile.logo_url);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('✅ Logo chargé avec succès');
                }}
              />
            ) : (
              <div className="h-24 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  {/* Utiliser la signature originale en attendant l'optimisation */}
                </div>
              </div>
            )}
          </div>
          
          {/* Informations de l'entreprise */}
          {formOwnerProfile === null ? (
            <p className="text-xs text-gray-500 mt-2">
              Chargement des informations...
            </p>
          ) : formOwnerProfile?.company_name ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {formOwnerProfile.company_name}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              {formOwnerProfile.first_name || formOwnerProfile.last_name 
                ? `${formOwnerProfile.first_name || ''} ${formOwnerProfile.last_name || ''}`.trim()
                : 'Utilisateur SignFast'
              }
            </p>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {form.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
              
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Envoi en cours...' : 'Envoyer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};