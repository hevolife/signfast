import React from 'react';
import { FormField } from '../../types/form';
import { formatDateFR } from '../../utils/dateFormatter';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SignatureCanvas } from './SignatureCanvas';
import { MaskedInput } from './MaskedInput';

interface FormPreviewProps {
  fields: FormField[];
}

export const FormPreview: React.FC<FormPreviewProps> = ({ fields }) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});

  const handleInputChange = (fieldId: string, value: any) => {
    // Formater les dates automatiquement
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      value = formatDateFR(value);
    }
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const shouldShowField = (field: FormField, parentField?: FormField, selectedOption?: string): boolean => {
    if (!parentField || !selectedOption) return true;
    
    const conditionalFields = parentField.conditionalFields?.[selectedOption] || [];
    return conditionalFields.some(cf => cf.id === field.id);
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
      <div key={field.id} className="ml-6 border-l-2 border-blue-200 pl-4">
        {renderField(field)}
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
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
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
                  // Pour les images, traitement optimisé
                  if (file.type.startsWith('image/')) {
                    // Utiliser le traitement optimisé pour formulaires publics
                    import('../../utils/optimizedImageProcessor').then(({ OptimizedImageProcessor }) => {
                      OptimizedImageProcessor.processPublicFormImage(file)
                        .then(processedImage => {
                          handleInputChange(field.id, processedImage);
                        })
                        .catch(error => {
                          console.error('Erreur traitement image preview:', error);
                          // Fallback
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            handleInputChange(field.id, base64);
                          };
                          reader.readAsDataURL(file);
                        });
                    });
                  } else {
                    // Pour les autres fichiers, stocker le nom
                    handleInputChange(field.id, file.name);
                  }
                }
              }}
            />
            {/* Aperçu de l'image */}
            {formData[field.id] && typeof formData[field.id] === 'string' && formData[field.id].startsWith('data:image') && (
              <div className="mt-2">
                <img
                  src={formData[field.id]}
                  alt="Aperçu"
                  className="max-w-xs max-h-32 object-contain border border-gray-300 rounded shadow-lg"
                />
                <p className="text-xs text-green-600 mt-1">
                  ✅ Image optimisée (1920x1080 JPEG) • {Math.round(formData[field.id].length / 1024)} KB
                </p>
              </div>
            )}
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

  if (fields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Ajoutez des champs pour voir l'aperçu du formulaire
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form className="space-y-6">
        {fields.map((field) => (
          <div key={field.id}>
            {renderField(field)}
          </div>
        ))}
        
        <div className="pt-4">
          <Button type="submit" className="w-full">
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
};