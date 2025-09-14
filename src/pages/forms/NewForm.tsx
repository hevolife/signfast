import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormBuilder } from '../../components/form/FormBuilder';
import { useForms } from '../../hooks/useForms';
import { FormField } from '../../types/form';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useDemo } from '../../contexts/DemoContext';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import toast from 'react-hot-toast';

export const NewForm: React.FC = () => {
  const [step, setStep] = useState<'info' | 'builder'>('info');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { createForm } = useForms();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();

  const handleBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Le titre du formulaire est requis');
      return;
    }
    setStep('builder');
  };

  const handleSaveForm = async (fields: FormField[]) => {
    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ à votre formulaire');
      return;
    }

    // Vérifier les limites en mode démo
    if (isDemoMode) {
      // Cette vérification sera gérée par le hook useDemoForms
    }

    setSaving(true);
    try {
      const form = await createForm({
        title: formTitle,
        description: formDescription,
        fields,
        settings: {
          allowMultiple: true,
          requireAuth: false,
          collectEmail: false,
          generatePdf: true,
          emailPdf: false,
          savePdfToServer: true,
        },
        is_published: false,
      });

      if (form) {
        toast.success('Formulaire créé avec succès !');
        navigate(`/forms/${form.id}/edit`);
      } else {
        toast.error('Erreur lors de la création du formulaire');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du formulaire');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'info') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                Nouveau formulaire
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Commencez par donner un titre à votre formulaire
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfo} className="space-y-4">
                <Input
                  id="title"
                  label="Titre du formulaire"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Enquête de satisfaction"
                  required
                />
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Décrivez brièvement votre formulaire..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Créer le formulaire
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <FormBuilder
      onSave={handleSaveForm}
      saving={saving}
    />
  );
};