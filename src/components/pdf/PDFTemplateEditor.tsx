import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PDFViewer, PDFViewerRef } from './PDFViewer';
import { PDFFieldPalette } from './PDFFieldPalette';
import { PDFFieldOverlay } from './PDFFieldOverlay';
import { PDFFieldProperties } from './PDFFieldProperties';
import { FormSelector } from './FormSelector';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Upload, Save, FileText, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface PDFTemplateEditorProps {
  onSave?: (fields: PDFField[], pdfFile: File) => void;
  initialFields?: PDFField[];
  formVariables?: string[];
  existingPdfUrl?: string;
  templateName?: string;
  linkedFormId?: string;
  onFormLinkChange?: (formId: string | null) => void;
}

export const PDFTemplateEditor: React.FC<PDFTemplateEditorProps> = ({
  onSave,
  initialFields = [],
  formVariables = ['${nom}', '${email}', '${date}', '${signature}'],
  existingPdfUrl,
  templateName,
  linkedFormId,
  onFormLinkChange,
}) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<PDFField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [currentLinkedFormId, setCurrentLinkedFormId] = useState<string | null>(linkedFormId || null);
  const [actualFormVariables, setActualFormVariables] = useState<string[]>(formVariables);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pdfViewerRef = useRef<PDFViewerRef>(null);

  // Détecter mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bloquer sur mobile
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-16">
            <FileText className="h-16 w-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Éditeur de Template PDF
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              L'éditeur de template PDF nécessite un écran plus large pour une expérience optimale.
            </p>
            <Link to="/pdf/templates">
              <Button>Retour aux templates</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Charger PDF existant
  useEffect(() => {
    if (existingPdfUrl && !pdfFile) {
      loadExistingPdf();
    }
  }, [existingPdfUrl]);

  // Initialiser les champs après chargement du PDF
  useEffect(() => {
    if (pdfFile && initialFields.length > 0 && !isInitialized) {
      console.log('🎯 Initialisation des champs existants');
      setFields(initialFields);
      setIsInitialized(true);
    }
  }, [pdfFile, initialFields, isInitialized]);

  // Charger variables du formulaire lié
  useEffect(() => {
    if (currentLinkedFormId) {
      loadLinkedFormVariables();
    } else {
      setActualFormVariables(formVariables);
    }
  }, [currentLinkedFormId, formVariables]);

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

  const loadLinkedFormVariables = () => {
    if (!currentLinkedFormId) return;
    
    try {
      let forms = [];
      
      if (localStorage.getItem('currentUserForms')) {
        forms = JSON.parse(localStorage.getItem('currentUserForms') || '[]');
      } else if (sessionStorage.getItem('currentUserForms')) {
        forms = JSON.parse(sessionStorage.getItem('currentUserForms') || '[]');
      } else if ((window as any).currentUserForms) {
        forms = (window as any).currentUserForms;
      }
      
      const linkedForm = forms.find((f: any) => f.id === currentLinkedFormId);
      
      if (linkedForm?.fields) {
        const variables: string[] = [];
        
        const extractVariables = (fields: any[]) => {
          fields.forEach((field: any) => {
            const variableName = field.label
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            
            variables.push(`\${${variableName}}`);
            
            if (field.conditionalFields) {
              Object.values(field.conditionalFields).forEach((conditionalFields: any) => {
                if (Array.isArray(conditionalFields)) {
                  extractVariables(conditionalFields);
                }
              });
            }
          });
        };
        
        extractVariables(linkedForm.fields);
        variables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
        
        const uniqueVariables = [...new Set(variables)];
        setActualFormVariables(uniqueVariables);
        console.log('🔗 Variables chargées:', uniqueVariables.length);
      }
    } catch (error) {
      console.error('Erreur chargement variables:', error);
      setActualFormVariables(formVariables);
    }
  };

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
    if (!pdfViewerRef.current) return;

    const pdfDimensions = pdfViewerRef.current.getPDFDimensions(currentPage);
    const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(currentPage);
    
    if (!pdfDimensions || !canvasDimensions) {
      console.warn('Dimensions PDF/Canvas non disponibles');
      return;
    }

    // Position par défaut au centre (ratios)
    const xRatio = 0.5; // Centre horizontal
    const yRatio = 0.5; // Centre vertical

    // Dimensions par défaut selon le type
    const defaultSizes = {
      text: { width: 150, height: 25 },
      date: { width: 100, height: 25 },
      number: { width: 80, height: 25 },
      signature: { width: 200, height: 60 },
      checkbox: { width: 20, height: 20 },
      image: { width: 120, height: 80 },
    };

    const { width: defaultWidth, height: defaultHeight } = defaultSizes[type] || { width: 120, height: 25 };

    // Calculer les ratios pour la taille basés sur les dimensions PDF réelles
    const widthRatio = defaultWidth / pdfDimensions.width;
    const heightRatio = defaultHeight / pdfDimensions.height;

    const newField: PDFField = {
      id: uuidv4(),
      type,
      page: currentPage,
      variable: '',
      xRatio,
      yRatio,
      widthRatio,
      heightRatio,
      fontSize: 12,
      fontColor: '#000000',
      backgroundColor: '#ffffff',
      required: false,
      offsetX: 0, // Offset horizontal ajustable
      offsetY: 0, // Offset vertical ajustable
    };

    console.log('➕ Nouveau champ avec ratios:', {
      type,
      ratios: { xRatio, yRatio, widthRatio, heightRatio },
      pdfDimensions,
      canvasDimensions
    });

    setFields(prev => [...prev, newField]);
    setSelectedField(newField.id);
  }, [currentPage]);

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
  }, [selectedField]);

  const handlePageClick = useCallback((canvasX: number, canvasY: number, page: number) => {
    if (!pdfViewerRef.current) return;

    const pdfDimensions = pdfViewerRef.current.getPDFDimensions(page);
    const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(page);
    
    if (!pdfDimensions || !canvasDimensions) return;

    // Calculer les ratios directement depuis les coordonnées canvas réelles
    const xRatio = canvasX / canvasDimensions.width;
    const yRatio = canvasY / canvasDimensions.height;
    
    console.log(`🖱️ Clic page ${page} à canvas (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})`);
    console.log(`🖱️ Canvas dimensions: ${canvasDimensions.width} × ${canvasDimensions.height}`);
    console.log(`🖱️ PDF dimensions: ${pdfDimensions.width} × ${pdfDimensions.height} points`);
    console.log(`🖱️ Ratios calculés: (${xRatio.toFixed(4)}, ${yRatio.toFixed(4)})`);

    setCurrentPage(page);

    if (selectedField) {
      updateField(selectedField, {
        page,
        xRatio,
        yRatio
      });

      toast.success(`Champ déplacé (ratios: ${xRatio.toFixed(3)}, ${yRatio.toFixed(3)})`, { duration: 1000 });
    } else {
      setSelectedField(null);
    }
  }, [selectedField, updateField]);

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

  const handleFormLinkChange = (formId: string | null) => {
    setCurrentLinkedFormId(formId);
    onFormLinkChange?.(formId);
    
    if (formId) {
      toast.success('Formulaire lié ! Variables rechargées.');
    } else {
      toast('Formulaire délié. Variables par défaut utilisées.');
    }
  };

  const selectedFieldData = selectedField ? fields.find(f => f.id === selectedField) : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* En-tête */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Éditeur de Template PDF
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Créez des templates PDF avec positionnement précis par ratios
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={!pdfFile || fields.length === 0}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Sauvegarder</span>
            </Button>
          </div>

          {/* Sélecteur de formulaire */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Formulaire lié
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <FormSelector
                selectedFormId={currentLinkedFormId}
                onFormChange={handleFormLinkChange}
                showVariablesPreview={true}
              />
            </CardContent>
          </Card>

          {!pdfFile ? (
            <Card>
              <CardContent className="text-center py-16">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chargez votre template PDF
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Sélectionnez un fichier PDF qui servira de base à votre template
                </p>
                <Button onClick={() => document.getElementById('pdf-file-input')?.click()}>
                  Choisir un fichier PDF
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Palette des champs */}
              <div className="lg:col-span-1">
                <PDFFieldPalette onAddField={addField} />
              </div>

              {/* Visualiseur PDF */}
              <div className="lg:col-span-2">
                <Card className="h-[700px]">
                  <PDFViewer
                    ref={pdfViewerRef}
                    file={pdfFile}
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
                  </PDFViewer>
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
                    <Card>
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Propriétés
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cliquez sur le PDF pour ajouter un champ ou sélectionnez un champ existant
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
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Input caché pour upload */}
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="pdf-file-input"
          />
        </div>
      </div>
    </DndProvider>
  );
};