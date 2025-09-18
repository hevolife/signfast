import React, { useState, useCallback, useEffect, useRef } from 'react';
import { OptimizedPDFViewer, OptimizedPDFViewerRef } from './OptimizedPDFViewer';
import { PDFFieldPalette } from '../pdf/PDFFieldPalette';
import { PDFFieldOverlay } from '../pdf/PDFFieldOverlay';
import { PDFFieldProperties } from '../pdf/PDFFieldProperties';
import { FormSelector } from '../pdf/FormSelector';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Upload, Save, Eye, FileText, Link as LinkIcon, Layers } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface OptimizedPDFTemplateEditorProps {
  onSave?: (fields: PDFField[], pdfFile: File) => void;
  initialFields?: PDFField[];
  formVariables?: string[];
  existingPdfUrl?: string;
  templateName?: string;
  linkedFormId?: string;
  onFormLinkChange?: (formId: string | null) => void;
  onTemplateNameChange?: (name: string) => void;
}

export const OptimizedPDFTemplateEditor: React.FC<OptimizedPDFTemplateEditorProps> = ({
  onSave,
  initialFields = [],
  formVariables = ['${nom}', '${email}', '${date}', '${signature}'],
  existingPdfUrl,
  templateName,
  linkedFormId,
  onFormLinkChange,
  onTemplateNameChange,
}) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<PDFField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState(templateName || '');
  const [currentLinkedFormId, setCurrentLinkedFormId] = useState<string | null>(linkedFormId || null);
  const [actualFormVariables, setActualFormVariables] = useState<string[]>(formVariables);
  const [draggedFieldType, setDraggedFieldType] = useState<PDFField['type'] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const pdfViewerRef = useRef<OptimizedPDFViewerRef>(null);

  // Charger PDF existant
  useEffect(() => {
    if (existingPdfUrl && !pdfFile) {
      loadExistingPdf();
    }
  }, [existingPdfUrl]);

  // Initialiser les champs
  useEffect(() => {
    if (pdfFile && initialFields.length > 0 && !isInitialized && pdfDimensions.length > 0) {
      setTimeout(() => {
        setFields(initialFields);
        setIsInitialized(true);
      }, 500);
    }
  }, [pdfFile, initialFields, isInitialized, pdfDimensions]);

  const loadExistingPdf = async () => {
    if (!existingPdfUrl) return;
    
    try {
      const response = await fetch(existingPdfUrl);
      const blob = await response.blob();
      const file = new File([blob], templateName || 'template.pdf', { type: 'application/pdf' });
      setPdfFile(file);
      toast.success('PDF existant chargé');
    } catch (error) {
      console.error('Erreur chargement PDF:', error);
      toast.error('Erreur lors du chargement du PDF');
    }
  };

  const handlePDFLoaded = useCallback((dimensions: { width: number; height: number }[]) => {
    console.log('📄 PDF dimensions reçues:', dimensions);
    setPdfDimensions(dimensions);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setFields([]);
      setSelectedField(null);
      setIsInitialized(false);
      toast.success('PDF chargé avec succès');
    } else {
      toast.error('Veuillez sélectionner un fichier PDF valide');
    }
  };

  const addField = useCallback((type: PDFField['type']) => {
    setDraggedFieldType(type);
    toast(`Cliquez sur la page ${currentPage} pour placer le champ`, { duration: 3000 });
  }, [currentPage]);

  const handlePageClick = useCallback((canvasX: number, canvasY: number, page: number) => {
    if (draggedFieldType && pdfViewerRef.current) {
      const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(page);
      if (!canvasDimensions) return;

      const xRatio = canvasX / canvasDimensions.width;
      const yRatio = canvasY / canvasDimensions.height;

      const defaultRatios = {
        text: { width: 0.25, height: 0.04 },
        date: { width: 0.15, height: 0.04 },
        number: { width: 0.12, height: 0.04 },
        signature: { width: 0.35, height: 0.1 },
        checkbox: { width: 0.03, height: 0.03 },
        image: { width: 0.2, height: 0.15 },
      };

      const { width: widthRatio, height: heightRatio } = defaultRatios[draggedFieldType] || { width: 0.2, height: 0.04 };

      const newField: PDFField = {
        id: uuidv4(),
        type: draggedFieldType,
        page: page,
        variable: '',
        xRatio,
        yRatio,
        widthRatio,
        heightRatio,
        fontSize: 12,
        fontColor: '#000000',
        backgroundColor: '#ffffff',
        required: false,
      };

      setFields(prev => [...prev, newField]);
      setSelectedField(newField.id);
      setCurrentPage(page);
      setDraggedFieldType(null);
      toast.success(`Champ ${draggedFieldType} ajouté sur la page ${page}`);
    }
  }, [draggedFieldType, currentPage]);

  const updateField = useCallback((id: string, updates: Partial<PDFField>) => {
    setFields(prev => prev.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
    toast.success('Champ supprimé');
  }, [selectedField]);

  const handleSave = () => {
    if (!pdfFile) {
      toast.error('Veuillez charger un fichier PDF');
      return;
    }

    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ au template');
      return;
    }

    const fieldsWithoutVariables = fields.filter(field => !field.variable?.trim());
    if (fieldsWithoutVariables.length > 0) {
      toast.error('Tous les champs doivent avoir une variable associée');
      return;
    }

    onSave?.(fields, pdfFile);
  };

  const selectedFieldData = selectedField ? fields.find(f => f.id === selectedField) : null;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Éditeur de Template PDF
            </h1>
            <p className="text-white/90 mb-6">
              Créez des templates PDF avec positionnement précis et variables dynamiques
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={handleSave}
                disabled={!pdfFile || fields.length === 0}
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>

        {/* Configuration du template */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Nom du template
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Identifiez votre template PDF
                    </p>
                  </div>
                </div>
                <Input
                  value={currentTemplateName}
                  onChange={(e) => {
                    setCurrentTemplateName(e.target.value);
                    onTemplateNameChange?.(e.target.value);
                  }}
                  placeholder="Ex: Contrat de location, Facture..."
                  className="bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium shadow-lg"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <LinkIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Formulaire lié
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Source des variables dynamiques
                    </p>
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <FormSelector
                    selectedFormId={currentLinkedFormId}
                    onFormChange={(formId) => {
                      setCurrentLinkedFormId(formId);
                      onFormLinkChange?.(formId);
                    }}
                    showVariablesPreview={false}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!pdfFile ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Upload className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Chargez votre template PDF
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Sélectionnez un fichier PDF qui servira de base à votre template
              </p>
              <Button 
                onClick={() => document.getElementById('pdf-file-input')?.click()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                <Upload className="h-5 w-5 mr-2" />
                Choisir un fichier PDF
              </Button>
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Visualiseur PDF */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <PDFFieldPalette onAddField={addField} />
              </div>
              
              <Card className="h-[800px]">
                <OptimizedPDFViewer
                  ref={pdfViewerRef}
                  file={pdfFile}
                  onPDFLoaded={handlePDFLoaded}
                  onPageClick={handlePageClick}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  scale={scale}
                  onScaleChange={setScale}
                >
                  {fields.map(field => (
                    <PDFFieldOverlay
                      key={field.id}
                      field={field}
                      scale={scale}
                      isSelected={selectedField === field.id}
                      onSelect={(field) => setSelectedField(field.id)}
                      onUpdate={(updatedField) => updateField(updatedField.id, updatedField)}
                      onDelete={deleteField}
                      currentPage={currentPage}
                      pdfViewerRef={pdfViewerRef}
                    />
                  ))}
                </OptimizedPDFViewer>
              </Card>
            </div>

            {/* Propriétés */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                {selectedFieldData ? (
                  <PDFFieldProperties
                    field={selectedFieldData}
                    onUpdate={(updates) => updateField(selectedFieldData.id, updates)}
                    availableVariables={actualFormVariables}
                    linkedFormId={currentLinkedFormId}
                  />
                ) : (
                  <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Propriétés
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">👆</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cliquez sur un champ pour modifier ses propriétés
                        </p>
                        
                        {fields.length > 0 && (
                          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                              Champs ajoutés ({fields.length})
                            </h4>
                            <div className="space-y-1">
                              {fields.map(field => (
                                <div 
                                  key={field.id}
                                  className="text-xs text-blue-700 dark:text-blue-400 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800 p-1 rounded"
                                  onClick={() => setSelectedField(field.id)}
                                >
                                  {field.variable || field.type} (page {field.page})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};