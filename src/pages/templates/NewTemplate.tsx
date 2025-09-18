import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
  Save, 
  Eye, 
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Settings,
  Plus,
  Trash2,
  GripVertical
  File,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'signature' | 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  placeholder?: string;
}

export const NewTemplate: React.FC = () => {
  const navigate = useNavigate();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [category, setCategory] = useState('Business');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const categories = ['Business', 'Immobilier', 'Juridique', 'RH', 'Commercial'];

  const fieldTypes = [
    { type: 'text', label: 'Texte', icon: FileText },
    { type: 'number', label: 'Nombre', icon: FileText },
    { type: 'date', label: 'Date', icon: FileText },
    { type: 'signature', label: 'Signature', icon: FileText },
    { type: 'checkbox', label: 'Case à cocher', icon: FileText },
  ];

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedPdf(file);
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      
      // Auto-remplir le nom du template avec le nom du fichier
      if (!templateName) {
        const fileName = file.name.replace('.pdf', '');
        setTemplateName(fileName);
      }
      
      toast.success('PDF uploadé avec succès !');
    } else {
      toast.error('Veuillez sélectionner un fichier PDF valide');
    }
  };

  const removePdf = () => {
    setUploadedPdf(null);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };
  const addField = (type: TemplateField['type']) => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      name: `Nouveau champ ${type}`,
      type,
      x: 50,
      y: 50 + fields.length * 60,
      width: 200,
      height: 30,
      required: false,
      placeholder: '',
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Le nom du template est requis');
      return;
    }

    if (fields.length === 0 && !uploadedPdf) {
      toast.error('Ajoutez au moins un champ au template ou uploadez un PDF');
      return;
    }

    try {
      // Simuler la sauvegarde du template
      const templateData = {
        id: `template_${Date.now()}`,
        name: templateName,
        description: templateDescription,
        category,
        fields,
        is_public: isPublic,
        has_pdf: !!uploadedPdf,
        pdf_name: uploadedPdf?.name,
        created_at: new Date().toISOString(),
      };

      // Sauvegarder dans localStorage pour la démo
      const existingTemplates = JSON.parse(localStorage.getItem('templates') || '[]');
      existingTemplates.push(templateData);
      localStorage.setItem('templates', JSON.stringify(existingTemplates));

      toast.success('Template créé avec succès !');
      navigate('/templates');
    } catch (error) {
      toast.error('Erreur lors de la création du template');
    }
  };

  const selectedFieldData = fields.find(field => field.id === selectedField);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/templates')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Nouveau Template PDF
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Créez votre template PDF personnalisé
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Aperçu</span>
            </Button>
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Sauvegarder</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Panneau des types de champs */}
          <div className="lg:col-span-1">
            {/* Upload PDF */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Upload PDF
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {!uploadedPdf ? (
                  <div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <File className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cliquez pour uploader
                      </span>
                      <span className="text-xs text-gray-500">
                        PDF uniquement
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <File className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            {uploadedPdf.name}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {(uploadedPdf.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePdf}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Types de champs
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {fieldTypes.map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <button
                        key={fieldType.type}
                        onClick={() => addField(fieldType.type as TemplateField['type'])}
                        className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 transition-all"
                      >
                        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {fieldType.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Paramètres du template */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Paramètres
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catégorie
                    </label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Template public
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Éditeur de template */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <Input
                    label="Nom du template"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Contrat de prestation de services"
                    className="text-lg font-semibold"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Description du template..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Zone de design du PDF */}
                <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 min-h-96 relative overflow-hidden">
                  {/* Aperçu PDF si uploadé */}
                  {pdfPreviewUrl && (
                    <div className="absolute inset-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <File className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          PDF Template
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {uploadedPdf?.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4"
                          onClick={() => window.open(pdfPreviewUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le PDF
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center text-gray-500 dark:text-gray-400 mb-4">
                    <FileText className="h-12 w-12 mx-auto mb-2" />
                    <p>{uploadedPdf ? 'PDF uploadé - Ajoutez des champs' : 'Zone de design du PDF'}</p>
                    <p className="text-sm">{uploadedPdf ? 'Positionnez vos champs sur le PDF' : 'Uploadez un PDF ou glissez les champs depuis la gauche'}</p>
                  </div>

                  {fields.length === 0 && !uploadedPdf ? (
                    <div className="text-center py-12">
                      <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2">
                        Aucun PDF ou champ ajouté
                      </p>
                      <p className="text-sm text-gray-400">
                        Uploadez un PDF ou sélectionnez un type de champ à gauche
                      </p>
                    </div>
                  ) : fields.length > 0 && (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedField === field.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedField(field.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {field.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {fieldTypes.find(t => t.type === field.type)?.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                  <span className="ml-2 text-xs">
                                    Position: {field.x}, {field.y}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.id);
                              }}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panneau de propriétés */}
          <div className="lg:col-span-1">
            {selectedFieldData ? (
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Propriétés du champ
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <Input
                      label="Nom du champ"
                      value={selectedFieldData.name}
                      onChange={(e) => updateField(selectedFieldData.id, { name: e.target.value })}
                    />
                    
                    <Input
                      label="Placeholder"
                      value={selectedFieldData.placeholder || ''}
                      onChange={(e) => updateField(selectedFieldData.id, { placeholder: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Position X"
                        type="number"
                        value={selectedFieldData.x}
                        onChange={(e) => updateField(selectedFieldData.id, { x: parseInt(e.target.value) || 0 })}
                      />
                      <Input
                        label="Position Y"
                        type="number"
                        value={selectedFieldData.y}
                        onChange={(e) => updateField(selectedFieldData.id, { y: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Largeur"
                        type="number"
                        value={selectedFieldData.width}
                        onChange={(e) => updateField(selectedFieldData.id, { width: parseInt(e.target.value) || 0 })}
                      />
                      <Input
                        label="Hauteur"
                        type="number"
                        value={selectedFieldData.height}
                        onChange={(e) => updateField(selectedFieldData.id, { height: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedFieldData.required}
                        onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Champ obligatoire
                      </span>
                    </label>

                    {uploadedPdf && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                          💡 Conseil
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Ajustez les positions X/Y pour placer le champ exactement où vous le souhaitez sur votre PDF.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {uploadedPdf 
                      ? 'Ajoutez des champs à votre PDF ou sélectionnez un champ existant'
                      : 'Sélectionnez un champ pour modifier ses propriétés'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};