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
import { MaskedInput } from '../../components/form/MaskedInput';
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
  const [loading, setLoading] = useState(false);
  const [formLoaded, setFormLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error) {
        setForm(null);
        setFormLoaded(true);
        return;
      }

      setForm(data);
      setFormLoaded(true);
      
      // Récupérer le profil du propriétaire du formulaire pour afficher le logo
      if (data.user_id) {
        // Charger le profil en arrière-plan sans bloquer l'affichage
        fetchFormOwnerProfile(data.user_id).catch(error => {
          // Créer un profil vide pour éviter le loading infini
          setFormOwnerProfile({
            id: '',
            user_id: data.user_id,
            first_name: null,
            last_name: null,
            company_name: null,
            address: null,
            siret: null,
            logo_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
      } else {
        // Pas de propriétaire, créer un profil vide
        setFormOwnerProfile({
          id: '',
          user_id: '',
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
    } catch (error) {
      setForm(null);
      setFormLoaded(true);
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

  // Fonction pour compresser les images avant soumission
  const compressImageData = async (data: Record<string, any>): Promise<Record<string, any>> => {
    const { ImageCompressor } = await import('../../utils/imageCompression');
    const compressedData = { ...data };
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.startsWith('data:image')) {
        try {
          console.log(`🖼️ Compression image pour champ: ${key}`);
          const originalSize = Math.round(value.length / 1024);
          console.log(`🖼️ Taille originale: ${originalSize}KB`);
          
          // Compression avec paramètres optimisés
          const compressed = await ImageCompressor.compressImage(value, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.7,
            maxSizeKB: 512, // Limite à 512KB par image
            format: 'jpeg',
            preserveTransparency: false
          });
          
          const compressedSize = Math.round(compressed.length / 1024);
          console.log(`🖼️ Taille compressée: ${compressedSize}KB (${Math.round((1 - compressed.length / value.length) * 100)}% de réduction)`);
          
          compressedData[key] = compressed;
        } catch (error) {
          console.warn(`⚠️ Erreur compression image ${key}:`, error);
          // Garder l'original en cas d'erreur
          compressedData[key] = value;
        }
      }
    }
    
    return compressedData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;
    
    setSubmitting(true);
    
    try {
      // Préparer les données pour la base (sans les gros fichiers)
      const dbSubmissionData = {};
      // Préparer les données complètes pour le PDF (avec les images compressées)
      const pdfSubmissionData = await compressImageData(formData);
      
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
          
          // Pour les signatures, sauvegarder avec plusieurs formats
          if (field.type === 'signature' && typeof fieldValue === 'string' && fieldValue.startsWith('data:image')) {
            // Ajouter des clés spécifiques pour les signatures
            keys.push('signature', 'Signature', 'SIGNATURE');
            keys.forEach(key => {
              pdfSubmissionData[key] = fieldValue;
              dbSubmissionData[key] = fieldValue; // Garder les signatures complètes
            });
          }
          // Images normales
          else if (typeof fieldValue === 'string' && fieldValue.startsWith('data:image')) {
            // Ajouter des clés spécifiques pour les images
            keys.push('image', 'Image', 'IMAGE', 'photo', 'Photo', 'PHOTO');
            keys.forEach(key => {
              pdfSubmissionData[key] = fieldValue;
              dbSubmissionData[key] = fieldValue; // Garder les images complètes
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
                    // Ne pas ajouter de clés génériques pour les signatures conditionnelles
                  }
                  
                  if (conditionalField.type === 'signature' && typeof conditionalValue === 'string' && conditionalValue.startsWith('data:image')) {
                    // Ajouter des clés spécifiques pour les signatures conditionnelles
                    conditionalKeys.push('signature', 'Signature', 'SIGNATURE');
                    conditionalKeys.forEach(key => {
                      pdfSubmissionData[key] = conditionalValue;
                      dbSubmissionData[key] = conditionalValue; // Garder les signatures complètes
                    });
                  } else if (typeof conditionalValue === 'string' && conditionalValue.startsWith('data:image')) {
                    // Ajouter des clés spécifiques pour les images conditionnelles
                    conditionalKeys.push('image', 'Image', 'IMAGE', 'photo', 'Photo', 'PHOTO');
                    conditionalKeys.forEach(key => {
                      pdfSubmissionData[key] = conditionalValue;
                      dbSubmissionData[key] = conditionalValue; // Garder les images complètes
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

      // Appliquer les masques de saisie pour le PDF
      form.fields?.forEach(field => {
        if (field.validation?.mask && formData[field.id]) {
          const rawValue = formData[field.id];
          const maskedValue = applyMaskToValue(rawValue, field.validation.mask);
          
          // Mettre à jour toutes les clés associées à ce champ
          const normalizedKey = normalizeKey(field.label);
          const keys = [
            field.label,
            normalizedKey,
            field.label.toLowerCase(),
          ];
          
          keys.forEach(key => {
            if (pdfSubmissionData[key] === rawValue) {
              pdfSubmissionData[key] = maskedValue;
            }
          });
        }
        
        // Traiter aussi les champs conditionnels
        if (field.conditionalFields && formData[field.id]) {
          const selectedValues = Array.isArray(formData[field.id]) ? formData[field.id] : [formData[field.id]];
          
          selectedValues.forEach(selectedValue => {
            const conditionalFields = field.conditionalFields?.[selectedValue];
            if (conditionalFields) {
              conditionalFields.forEach(conditionalField => {
                if (conditionalField.validation?.mask && formData[conditionalField.id]) {
                  const rawValue = formData[conditionalField.id];
                  const maskedValue = applyMaskToValue(rawValue, conditionalField.validation.mask);
                  
                  const conditionalNormalizedKey = normalizeKey(conditionalField.label);
                  const conditionalKeys = [
                    conditionalField.label,
                    conditionalNormalizedKey,
                    conditionalField.label.toLowerCase(),
                  ];
                  
                  conditionalKeys.forEach(key => {
                    if (pdfSubmissionData[key] === rawValue) {
                      pdfSubmissionData[key] = maskedValue;
                    }
                  });
                }
              });
            }
          });
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
        toast.error('Erreur lors de l\'envoi du formulaire');
        return;
      }


      setSubmitted(true);
      toast.success('Formulaire envoyé avec succès !');
      
      // Attendre 3 secondes avant d'afficher le message final
      setTimeout(() => {
        setShowFinalMessage(true);
      }, 3000);
      
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  // Fonction pour appliquer un masque à une valeur
  const applyMaskToValue = (value: string, mask: string): string => {
    if (!value || !mask) return value;
    
    let masked = '';
    let maskIndex = 0;
    let valueIndex = 0;
    
    // Nettoyer la valeur (garder seulement les caractères alphanumériques)
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
    
    while (maskIndex < mask.length && valueIndex < cleanValue.length) {
      const maskChar = mask[maskIndex];
      const inputChar = cleanValue[valueIndex];
      
      if (maskChar === '9') {
        // Chiffre requis
        if (/[0-9]/.test(inputChar)) {
          masked += inputChar;
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === 'A') {
        // Lettre majuscule requise
        if (/[a-zA-Z]/.test(inputChar)) {
          masked += inputChar.toUpperCase();
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === 'a') {
        // Lettre minuscule requise
        if (/[a-zA-Z]/.test(inputChar)) {
          masked += inputChar.toLowerCase();
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === '*') {
        // Caractère alphanumérique
        if (/[a-zA-Z0-9]/.test(inputChar)) {
          masked += inputChar;
          valueIndex++;
        } else {
          break;
        }
      } else {
        // Caractère littéral du masque
        masked += maskChar;
      }
      
      maskIndex++;
    }
    
    return masked;
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
        return (
          <div>
            {field.validation?.mask ? (
              <MaskedInput
                mask={field.validation.mask}
                value={formData[field.id] || ''}
                onChange={(value) => handleInputChange(field.id, value)}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
              />
            ) : (
              <Input
                {...baseProps}
                type="text"
                label={field.label}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
              />
            )}
          </div>
        );
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
                    // Pour les images, traitement optimisé avec redimensionnement
                    if (file.type.startsWith('image/')) {
                      // Validation et traitement avec redimensionnement automatique
                      import('../../utils/imageCompression').then(({ ImageCompressor }) => {
                        const validation = ImageCompressor.validateImage(file);
                        if (!validation.valid) {
                          toast.error(validation.error || 'Image invalide');
                          return;
                        }
                        
                        toast.loading('🖼️ Traitement de l\'image (redimensionnement 1920x1080 + conversion JPEG)...');
                        
                        // Utiliser la nouvelle fonction de traitement pour formulaires publics
                        ImageCompressor.processPublicFormImage(file)
                          .then(processedImage => {
                            toast.dismiss();
                            toast.success('✅ Image optimisée et prête (1920x1080 JPEG)');
                            handleInputChange(field.id, processedImage);
                          })
                          .catch(error => {
                            toast.dismiss();
                            console.error('Erreur traitement image:', error);
                            toast.error('Erreur lors du traitement de l\'image');
                          });
                      }).catch(() => {
                        // Fallback : lecture basique sans optimisation
                        toast.error('Module de compression non disponible');
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          handleInputChange(field.id, base64);
                        };
                        reader.readAsDataURL(file);
                      });
                    } else {
                      // Compression de l'image
                      toast.loading('🖼️ Compression de l\'image...');
                      ImageCompressor.compressImage(file, {
                        maxWidth: 1920,
                        maxHeight: 1080,
                        quality: 0.75,
                        maxSizeKB: 512,
                        format: 'jpeg',
                        preserveTransparency: false
                      }).then(compressedImage => {
                        toast.dismiss();
                        toast.success('✅ Image compressée et prête');
                        handleInputChange(field.id, compressedImage);
                      }).catch(error => {
                        toast.dismiss();
                        toast.error('Erreur lors de la compression');
                      });
                    }
                  } else {
                    // Pour les autres fichiers, stocker le nom
                    handleInputChange(field.id, file.name);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              {/* Aperçu de l'image si c'est une image */}
              {formData[field.id] && typeof formData[field.id] === 'string' && formData[field.id].startsWith('data:image') && (
                <div className="mt-2">
                  <p className="text-xs text-green-600 mb-1">✅ Image optimisée (1920x1080 JPEG) et prête pour le PDF</p>
                  <img
                    src={formData[field.id]}
                    alt="Aperçu"
                    className="max-w-xs max-h-32 object-contain border border-gray-300 rounded shadow-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Taille finale: {Math.round(formData[field.id].length / 1024)} KB
                  </p>
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

  if (!form && formLoaded) {
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

  // Afficher un skeleton pendant le chargement initial
  if (!formLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Skeleton du logo */}
          <div className="text-center mb-8">
            <div className="h-24 flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto animate-pulse"></div>
          </div>
          
          {/* Skeleton du formulaire */}
          <Card>
            <CardHeader>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Si le formulaire n'est pas encore chargé, ne rien afficher
  if (!form) {
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500">
            <CardContent className="text-center py-12 px-8">
            {!showFinalMessage ? (
              <>
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
                  Merci pour votre réponse !
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                  Traitement de votre formulaire en cours...
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse delay-150"></div>
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse delay-300"></div>
                </div>
              </>
            ) : (
              <>
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-in zoom-in duration-700">
                    <CheckCircle className="h-12 w-12 text-white animate-in zoom-in duration-500 delay-300" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
                
                <div className="space-y-6 animate-in slide-in-from-bottom duration-700 delay-500">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                      🎉 Parfait !
                    </h2>
                    <p className="text-xl text-gray-700 dark:text-gray-300 font-medium mb-2">
                      Votre formulaire a été envoyé avec succès
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nous avons bien reçu vos informations
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800 shadow-lg">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">✅</span>
                      </div>
                      <h3 className="text-lg font-bold text-green-900 dark:text-green-300">
                        Prochaines étapes
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 text-xs">📧</span>
                        </div>
                        <span>Vous recevrez une confirmation par email si configurée</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 text-xs">📄</span>
                        </div>
                        <span>Le document PDF sera généré automatiquement</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 text-xs">🔒</span>
                        </div>
                        <span>Vos données sont sécurisées et traitées avec soin</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium text-center">
                      💡 Besoin d'aide ? Contactez-nous si vous avez des questions
                    </p>
                  </div>
                </div>
              </>
            )}
            </CardContent>
          </Card>
          
          {/* Animation de confettis */}
          {showFinalMessage && (
            <div className="fixed inset-0 pointer-events-none z-50">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-100"></div>
              <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping delay-300"></div>
              <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500"></div>
              <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-700"></div>
              <div className="absolute top-3/4 left-1/2 w-2 h-2 bg-pink-400 rounded-full animate-ping delay-900"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo de l'entreprise - Toujours affiché pour debug */}
        <div className="text-center mb-8">
          <div className="mb-6">
            {formOwnerProfile?.logo_url ? (
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
                </div>
              </div>
            )}
          </div>
          
          {/* Informations de l'entreprise */}
          {formOwnerProfile?.company_name ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {formOwnerProfile.company_name}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              {formOwnerProfile?.first_name || formOwnerProfile?.last_name 
                ? `${formOwnerProfile.first_name || ''} ${formOwnerProfile.last_name || ''}`.trim()
                : 'Utilisateur SignFast'
              }
            </p>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-center">
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
        
        {/* Pied de page SignFast */}
        <div className="text-center mt-8 py-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Propulsé par{' '}
            <a
              href="https://signfastpro.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
            >
              SignFast
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};