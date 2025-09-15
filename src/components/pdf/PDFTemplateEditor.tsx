import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PDFViewer, PDFViewerRef } from './PDFViewer';
import { PDFFieldPalette } from './PDFFieldPalette';
import { PDFFieldOverlay } from './PDFFieldOverlay';
import { PDFFieldProperties } from './PDFFieldProperties';
import { FormSelector } from './FormSelector';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Upload, Save, FileText, Link as LinkIcon } from 'lucide-react';
import { Eye, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { PDFGenerator } from '../../utils/pdfGenerator';

interface PDFTemplateEditorProps {
  onSave?: (fields: PDFField[], pdfFile: File) => void;
  initialFields?: PDFField[];
  formVariables?: string[];
  existingPdfUrl?: string;
  templateName?: string;
  linkedFormId?: string;
  onFormLinkChange?: (formId: string | null) => void;
  onTemplateNameChange?: (name: string) => void;
}

export const PDFTemplateEditor: React.FC<PDFTemplateEditorProps> = ({
  onSave,
  initialFields = [],
  formVariables = ['${nom}', '${email}', '${date}', '${signature}'],
  existingPdfUrl,
  templateName,
  linkedFormId,
  onFormLinkChange,
  onTemplateNameChange,
}) => {
  // État pour les dimensions PDF - doit être déclaré en premier
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }[]>([]);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<PDFField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [currentLinkedFormId, setCurrentLinkedFormId] = useState<string | null>(linkedFormId || null);
  const [actualFormVariables, setActualFormVariables] = useState<string[]>(formVariables);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [draggedFieldType, setDraggedFieldType] = useState<PDFField['type'] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [currentTemplateName, setCurrentTemplateName] = useState(templateName || '');
  const pdfViewerRef = useRef<PDFViewerRef>(null);

  // Détecter mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Charger PDF existant
  useEffect(() => {
    if (existingPdfUrl && !pdfFile && !pdfLoaded) {
      loadExistingPdf();
    }
  }, [existingPdfUrl, pdfLoaded]);

  // Mettre à jour le nom du template quand il change
  useEffect(() => {
    if (templateName) {
      setCurrentTemplateName(templateName);
    }
  }, [templateName]);
  // Initialiser les champs après chargement du PDF
  useEffect(() => {
    if (pdfFile && initialFields.length > 0 && !isInitialized && pdfDimensions.length > 0) {
      console.log('🎯 Initialisation des champs existants');
      console.log('🎯 Initial fields:', initialFields);
      console.log('🎯 PDF dimensions disponibles:', pdfDimensions.length, 'pages');
      
      // Délai pour s'assurer que le PDF est complètement rendu
      setTimeout(() => {
        setFields(initialFields);
        setIsInitialized(true);
        console.log('🎯 Champs initialisés:', initialFields.length, 'champs');
        
        // Force plusieurs re-renders pour s'assurer du positionnement
        setTimeout(() => {
          console.log('🎯 Force refresh 1');
          setFields(prev => [...prev]);
          
          setTimeout(() => {
            console.log('🎯 Force refresh 2');
            setFields(prev => [...prev]);
          }, 200);
        }, 100);
      }, 500);
    }
  }, [pdfFile, initialFields, isInitialized, pdfDimensions]);

  // Callback pour recevoir les dimensions du PDF
  const handlePDFLoaded = useCallback((dimensions: { width: number; height: number }[]) => {
    console.log('📄 PDF dimensions reçues:', dimensions);
    setPdfDimensions(dimensions);
    
    // Forcer le rendu de la première page après chargement des dimensions
    setTimeout(() => {
      console.log('📄 Forçage rendu page 1 après chargement dimensions');
      setCurrentPage(1);
    }, 200);
  }, []);

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
      setPdfLoaded(true);
      const response = await fetch(existingPdfUrl);
      const blob = await response.blob();
      const file = new File([blob], templateName || 'template.pdf', { type: 'application/pdf' });
      setPdfFile(file);
      toast.success('PDF existant chargé');
    } catch (error) {
      console.error('Erreur chargement PDF:', error);
      toast.error('Erreur lors du chargement du PDF');
      setPdfLoaded(false);
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
    // Activer le mode de placement manuel
    setDraggedFieldType(type);
    toast(`Cliquez sur la page ${currentPage} pour placer le champ`, { duration: 3000 });
  }, [currentPage]);

  const updateField = useCallback((id: string, updates: Partial<PDFField>) => {
    setFields(prev => prev.map(field => 
      field.id === id ? { 
        ...field, 
        ...updates,
        // Force la mise à jour des ratios
        xRatio: updates.xRatio !== undefined ? updates.xRatio : field.xRatio,
        yRatio: updates.yRatio !== undefined ? updates.yRatio : field.yRatio,
      } : field
    ));
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  }, [selectedField]);

  const handlePageClick = useCallback((canvasX: number, canvasY: number, page: number) => {
    // Si on est en mode placement de champ
    if (draggedFieldType) {
      if (!pdfViewerRef.current) return;

      const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(page);
      if (!canvasDimensions) {
        toast.error(`Impossible de placer le champ sur la page ${page}`);
        return;
      }
      

      // Calculer les ratios depuis la position de clic
      const xRatio = canvasX / canvasDimensions.width;
      const yRatio = canvasY / canvasDimensions.height;
      

      // Ratios de taille selon le type
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
        page: page, // FORCER LA PAGE CLIQUÉE
        variable: '',
        xRatio,
        yRatio,
        widthRatio,
        heightRatio,
        fontSize: 12,
        fontColor: '#000000',
        backgroundColor: '#ffffff',
        required: false,
        offsetX: -75,
        offsetY: 10,
      };


      setFields(prev => {
        const newFields = [...prev, newField];
        return newFields;
      });
      setSelectedField(newField.id);
      
      // Changer vers la page où le champ a été placé
      if (page !== currentPage) {
        setCurrentPage(page);
      }
      
      setDraggedFieldType(null);
      toast.success(`✅ Champ ${draggedFieldType} ajouté sur la page ${page} !`, { duration: 3000 });
      return;
    }

    // Mode normal - changer de page
    if (currentPage !== page) {
      setCurrentPage(page);
      setSelectedField(null);
    }
  }, [draggedFieldType, currentPage, pdfDimensions]);

  // Annuler le mode placement si on appuie sur Échap
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draggedFieldType) {
        setDraggedFieldType(null);
        toast.info('Placement annulé');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [draggedFieldType]);

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

  const generateSampleData = (): Record<string, any> => {
    const sampleData: Record<string, any> = {};
    
    // Générer des données d'exemple pour chaque variable
    actualFormVariables.forEach(variable => {
      const varName = variable.replace(/^\$\{|\}$/g, '').toLowerCase();
      
      if (varName.includes('nom')) {
        sampleData[varName] = 'Dupont';
      } else if (varName.includes('prenom')) {
        sampleData[varName] = 'Jean';
      } else if (varName.includes('email')) {
        sampleData[varName] = 'jean.dupont@email.com';
      } else if (varName.includes('telephone') || varName.includes('phone')) {
        sampleData[varName] = '01 23 45 67 89';
      } else if (varName.includes('adresse')) {
        sampleData[varName] = '123 Rue de la Paix, 75001 Paris';
      } else if (varName.includes('date_naissance') || varName.includes('birthdate')) {
        sampleData[varName] = '15/03/1985';
      } else if (varName.includes('date')) {
        sampleData[varName] = new Date().toLocaleDateString('fr-FR');
      } else if (varName.includes('heure')) {
        sampleData[varName] = new Date().toLocaleTimeString('fr-FR');
      } else if (varName.includes('numero')) {
        sampleData[varName] = Math.floor(Math.random() * 10000).toString();
      } else if (varName.includes('salaire') || varName.includes('prix') || varName.includes('montant')) {
        sampleData[varName] = '2500€';
      } else if (varName.includes('signature')) {
        // Générer une signature d'exemple simple
        sampleData[varName] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      } else {
        // Valeur par défaut
        sampleData[varName] = `Exemple ${varName}`;
      }
    });
    
    return sampleData;
  };

  const handlePreviewPDF = async () => {
    if (!pdfFile) {
      toast.error('Veuillez charger un fichier PDF');
      return;
    }

    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ pour prévisualiser');
      return;
    }

    const fieldsWithoutVariables = fields.filter(field => !field.variable?.trim());
    if (fieldsWithoutVariables.length > 0) {
      toast.error('Tous les champs doivent avoir une variable pour la prévisualisation');
      return;
    }

    setPreviewLoading(true);
    
    try {
      toast.loading('🎨 Génération de la prévisualisation...');
      
      // Générer des données d'exemple
      const sampleData = generateSampleData();
      console.log('🎨 Données d\'exemple générées:', sampleData);
      
      // Créer un template temporaire
      const tempTemplate = {
        id: 'preview',
        name: 'Prévisualisation',
        fields: fields,
        originalPdfUrl: '', // Pas utilisé ici
      };
      
      // Convertir le fichier PDF en bytes
      const pdfArrayBuffer = await pdfFile.arrayBuffer();
      const originalPdfBytes = new Uint8Array(pdfArrayBuffer);
      
      // Générer le PDF avec les données d'exemple
      const pdfBytes = await PDFGenerator.generatePDF(tempTemplate, sampleData, originalPdfBytes);
      
      // Télécharger la prévisualisation
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preview_${templateName || 'template'}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('🎨 Prévisualisation générée et téléchargée !');
    } catch (error) {
      console.error('Erreur prévisualisation:', error);
      toast.error('Erreur lors de la génération de la prévisualisation');
    } finally {
      setPreviewLoading(false);
    }
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
    <div className="bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Avertissement mobile */}
        {isMobile && (
          <Card className="mb-6 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-yellow-600" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                    Éditeur optimisé pour ordinateur
                  </h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Pour une meilleure expérience, utilisez un écran plus large
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
          <div className="flex items-center space-x-3">
            <Button
              onClick={handlePreviewPDF}
              disabled={!pdfFile || fields.length === 0 || previewLoading}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              {previewLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>{previewLoading ? 'Génération...' : 'Prévisualiser'}</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={!pdfFile || fields.length === 0}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Sauvegarder</span>
            </Button>
          </div>
        </div>

        {/* Nom du template */}
        {/* Menu moderne inspiré du super admin */}
        <div className="mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Nom du template */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">📝</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Nom du template
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Identifiez votre template PDF
                      </p>
                    </div>
                  </div>
                  <Input
                    value={currentTemplateName}
                    onChange={(e) => onTemplateNameChange?.(e.target.value)}
                    placeholder="Ex: Contrat de location, Facture..."
                    className="w-full bg-white/70 backdrop-blur-sm border-gray-200/50 focus:border-blue-500 rounded-xl font-medium shadow-lg"
                  />
                </div>
                
                {/* Formulaire lié */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">🔗</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Formulaire lié
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Source des variables dynamiques
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <FormSelector
                      selectedFormId={currentLinkedFormId}
                      onFormChange={handleFormLinkChange}
                      showVariablesPreview={false}
                    />
                  </div>
                </div>
              </div>
              
              {/* Indicateur de statut */}
              <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full shadow-lg ${currentTemplateName ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${currentTemplateName ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                      {currentTemplateName ? 'Nom défini' : 'Nom requis'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full shadow-lg ${currentLinkedFormId ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${currentLinkedFormId ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500'}`}>
                      {currentLinkedFormId ? 'Formulaire lié' : 'Liaison optionnelle'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full shadow-lg ${pdfFile ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${pdfFile ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}>
                      {pdfFile ? 'PDF chargé' : 'PDF requis'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
            {/* Visualiseur PDF avec palette au-dessus */}
            <div className="lg:col-span-2">
              {/* Palette des champs au-dessus */}
              <div className="mb-4">
                <div className="relative">
                  <PDFFieldPalette onAddField={addField} />
                  {draggedFieldType && (
                    <div className="absolute inset-0 bg-blue-100/90 dark:bg-blue-900/90 rounded-lg flex items-center justify-center border-2 border-blue-500 border-dashed">
                      <div className="text-center">
                        <p className="text-blue-800 dark:text-blue-200 font-medium">
                          Mode placement: {draggedFieldType}
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 text-sm">
                          Cliquez sur le PDF pour placer le champ
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDraggedFieldType(null)}
                          className="mt-2 text-blue-600 hover:text-blue-700"
                        >
                          Annuler (Échap)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Visualiseur PDF */}
              <Card className={`h-[800px] ${draggedFieldType ? 'ring-2 ring-blue-500' : ''}`}>
                <PDFViewer
                  ref={pdfViewerRef}
                  file={pdfFile}
                  onPDFLoaded={handlePDFLoaded}
                  onPageClick={handlePageClick}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  scale={scale}
                  onScaleChange={setScale}
                  draggedFieldType={draggedFieldType}
                  hideZoomControls={true}
                  key={`pdf-viewer-${currentPage}-${pdfFile?.name || 'no-file'}`}
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
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Propriétés
                        </h3>
                        <Button
                          onClick={handlePreviewPDF}
                          disabled={!pdfFile || fields.length === 0 || previewLoading}
                          variant="secondary"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          {previewLoading ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          <span className="text-xs">{previewLoading ? 'Génération...' : 'Prévisualiser'}</span>
                        </Button>
                      </div>
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
      </div>
    </div>
  );
};