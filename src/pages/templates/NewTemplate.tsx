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
  GripVertical,
  File,
  X,
  Move,
  MousePointer
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
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pdfDimensions, setPdfDimensions] = useState({ width: 595, height: 842 }); // A4 par défaut

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

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setIsDragging(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    setSelectedField(fieldId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - 200));
    const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - 30));

    // Convertir en coordonnées PDF (proportionnelles)
    const pdfX = Math.round((x / rect.width) * pdfDimensions.width);
    const pdfY = Math.round((y / rect.height) * pdfDimensions.height);

    updateField(isDragging, { x: pdfX, y: pdfY });
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convertir en coordonnées PDF
    const pdfX = Math.round((x / rect.width) * pdfDimensions.width);
    const pdfY = Math.round((y / rect.height) * pdfDimensions.height);

    // Si aucun champ sélectionné, ne rien faire
    if (!selectedField) {
      toast.info('Sélectionnez un champ dans la liste pour le positionner');
      return;
    }

    // Déplacer le champ sélectionné
    updateField(selectedField, { x: pdfX, y: pdfY });
    toast.success('Champ repositionné !');
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
                <div 
                  className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-96 relative overflow-hidden cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleCanvasClick}
                  style={{ aspectRatio: `${pdfDimensions.width}/${pdfDimensions.height}` }}
                >
                  {/* Aperçu PDF si uploadé */}
                  {pdfPreviewUrl && (
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <iframe
                        src={pdfPreviewUrl}
                        className="w-full h-full border-0 pointer-events-none"
                        title="Aperçu PDF"
                      />
                      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
                    </div>
                  )}

                  {/* Grille d'aide */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <svg className="w-full h-full">
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>

                  {/* Champs positionnés sur le PDF */}
                  {fields.map((field) => {
                    const containerRect = { width: pdfDimensions.width, height: pdfDimensions.height };
                    const leftPercent = (field.x / containerRect.width) * 100;
                    const topPercent = (field.y / containerRect.height) * 100;
                    const widthPercent = (field.width / containerRect.width) * 100;
                    const heightPercent = (field.height / containerRect.height) * 100;

                    return (
                      <div
                        key={field.id}
                        className={`absolute border-2 rounded cursor-move transition-all ${
                          selectedField === field.id
                            ? 'border-blue-500 bg-blue-100/50 shadow-lg'
                            : isDragging === field.id
                            ? 'border-green-500 bg-green-100/50 shadow-lg'
                            : 'border-gray-400 bg-white/80 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                          width: `${Math.max(widthPercent, 10)}%`,
                          height: `${Math.max(heightPercent, 3)}%`,
                          minWidth: '80px',
                          minHeight: '24px',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, field.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedField(field.id);
                        }}
                      >
                        <div className="flex items-center justify-between h-full px-2 text-xs">
                          <div className="flex items-center space-x-1 truncate">
                            <GripVertical className="h-3 w-3 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-700 truncate">
                              {field.name}
                            </span>
                            {field.required && <span className="text-red-500">*</span>}
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <span className="text-gray-500 text-xs">
                              {field.type}
                            </span>
                          </div>
                        </div>
                        
                        {/* Poignées de redimensionnement */}
                        {selectedField === field.id && (
                          <>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize"></div>
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize"></div>
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize"></div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Instructions d'utilisation */}
                  {!uploadedPdf && fields.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <File className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Zone de design du template
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Uploadez un PDF ou ajoutez des champs pour commencer
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Instructions pour les champs */}
                  {fields.length > 0 && (
                    <div className="absolute top-2 left-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 text-xs text-blue-700 dark:text-blue-300 max-w-xs">
                      <div className="flex items-center space-x-1 mb-1">
                        <MousePointer className="h-3 w-3" />
                        <span className="font-medium">Instructions :</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        <li>• Cliquez sur un champ pour le sélectionner</li>
                        <li>• Glissez-déposez pour repositionner</li>
                        <li>• Cliquez dans le vide pour placer le champ sélectionné</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Liste des champs en bas */}
                {fields.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Champs du template ({fields.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedField === field.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedField(field.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Move className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {field.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {fieldTypes.find(t => t.type === field.type)?.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                  <span className="ml-2">
                                    ({field.x}, {field.y})
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
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                          💡 Positionnement
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Glissez le champ directement sur le PDF ou ajustez les coordonnées X/Y manuellement.
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
                    {fields.length > 0
                      ? 'Sélectionnez un champ pour modifier ses propriétés'
                      : uploadedPdf 
                      ? 'Ajoutez des champs à votre PDF'
                      : 'Ajoutez des champs ou uploadez un PDF pour commencer'
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