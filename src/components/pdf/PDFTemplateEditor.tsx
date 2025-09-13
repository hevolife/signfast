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
    console.log('🔄 updateField appelé pour:', id);
    console.log('🔄 Anciennes valeurs:', fields.find(f => f.id === id));
    console.log('🔄 Nouvelles valeurs:', updates);
    
    setFields(prev => prev.map(field => 
      field.id === id ? { 
        ...field, 
        ...updates,
        // Force la mise à jour des ratios
        xRatio: updates.xRatio !== undefined ? updates.xRatio : field.xRatio,
        yRatio: updates.yRatio !== undefined ? updates.yRatio : field.yRatio,
      } : field
    ));
    
    console.log('🔄 Champ mis à jour');
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  }, [selectedField]);

  const handlePageClick = useCallback((canvasX: number, canvasY: number, page: number) => {
    console.log('🎯 === HANDLE PAGE CLICK ===');
    console.log('🎯 Page reçue du clic:', page);
    console.log('🎯 Page courante (state):', currentPage);
    console.log('🎯 Mode placement actif:', !!draggedFieldType);
    console.log('🎯 Type de champ à placer:', draggedFieldType);
    console.log('🎯 Coordonnées reçues:', { canvasX, canvasY });
    console.log('🎯 PDF dimensions disponibles:', pdfDimensions.length, 'pages');
    
    // Si on est en mode placement de champ
    if (draggedFieldType) {
      console.log('🎯 === PLACEMENT DE CHAMP ===');
      console.log('🎯 PLACEMENT SUR PAGE:', page);
      console.log('🎯 Type de champ:', draggedFieldType);
      
      if (!pdfViewerRef.current) return;

      console.log('🎯 Récupération dimensions pour page:', page);
      const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(page);
      if (!canvasDimensions) {
        console.error('🎯 ❌ Dimensions canvas non disponibles pour page:', page);
        toast.error(`Impossible de placer le champ sur la page ${page}`);
        console.error('🎯 ❌ Vérification: canvas existe?', !!pdfViewerRef.current.getCanvasElement(page));
        return;
      }
      
      console.log('🎯 Dimensions canvas page', page, ':', canvasDimensions);

      // Calculer les ratios depuis la position de clic
      const xRatio = canvasX / canvasDimensions.width;
      const yRatio = canvasY / canvasDimensions.height;
      
      console.log('🎯 Ratios calculés:', { xRatio, yRatio });

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
      
      console.log('🖱️ Ratios de taille:', { widthRatio, heightRatio });

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
        offsetX: 0,
        offsetY: 0,
      };

      console.log('🎯 === NOUVEAU CHAMP CRÉÉ ===');
      console.log('🎯 Champ créé:', {
        id: newField.id,
        type: draggedFieldType,
        page: page,
        position: { xRatio, yRatio },
        size: { widthRatio, heightRatio },
      });

      setFields(prev => {
        const newFields = [...prev, newField];
        console.log('🎯 Total champs après ajout:', newFields.length);
        console.log('🎯 Répartition par page:', newFields.reduce((acc, f) => {
          acc[f.page] = (acc[f.page] || 0) + 1;
          return acc;
        }, {} as Record<number, number>));
        return newFields;
      });
      setSelectedField(newField.id);
      
      // Changer vers la page où le champ a été placé
      if (page !== currentPage) {
        console.log('🎯 Changement de page courante vers:', page);
        setCurrentPage(page);
      }
      
      setDraggedFieldType(null);
      toast.success(`✅ Champ ${draggedFieldType} ajouté sur la page ${page} !`, { duration: 3000 });
      return;
    }

    // Mode normal - changer de page
    if (currentPage !== page) {
      console.log('🎯 === CHANGEMENT DE PAGE NORMAL ===');
      console.log('🎯 Changement de page vers:', page);
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

  // Bloquer sur mobile - après tous les hooks
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
              L'éditeur de template PDF nécessite un écran plus larger pour une expérience optimale.
            </p>
            <Link to="/pdf/templates">
              <Button>Retour aux templates</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">📄</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Éditeur de Template PDF
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                Créez des templates PDF avec positionnement précis par ratios
              </p>
            
            {/* Statistiques du template */}
            {fields.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{fields.length}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">Champs totaux</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{fields.filter(f => f.required).length}</div>
                    <div className="text-sm text-green-700 dark:text-green-400">Obligatoires</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">{fields.filter(f => f.type === 'signature').length}</div>
                    <div className="text-sm text-purple-700 dark:text-purple-400">Signatures</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">{currentPage}</div>
                    <div className="text-sm text-orange-700 dark:text-orange-400">Page actuelle</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-3">
              <Button
                onClick={handlePreviewPDF}
                disabled={!pdfFile || fields.length === 0 || previewLoading}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
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
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>Sauvegarder</span>
              </Button>
            </div>
          </div>

          {/* Sélecteur de formulaire */}
          <Card className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">🔗</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300">
                    Formulaire lié
                  </h3>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400">
                    Associez ce template à un formulaire pour générer les variables
                  </p>
                </div>
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
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
              <CardContent className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl mb-6 shadow-lg">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chargez votre template PDF
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Sélectionnez un fichier PDF qui servira de base à votre template
                </p>
                <label className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-lg cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Upload className="h-5 w-5 mr-2" />
                  Choisir un fichier PDF
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Palette des champs - au-dessus du visualiseur */}
              <div className="lg:col-span-4 mb-6">
                <PDFFieldPalette onAddField={addField} />
              </div>

              {/* Visualiseur PDF et propriétés */}
              <div className="lg:col-span-3">
                <Card className="bg-white dark:bg-gray-800 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {templateName || 'Template PDF'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Page {currentPage}
                        </span>
                        {draggedFieldType && (
                          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            Mode placement: {draggedFieldType}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <PDFViewer
                        ref={pdfViewerRef}
                        file={pdfFile}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        onPageClick={handlePageClick}
                        onPDFLoaded={handlePDFLoaded}
                        scale={scale}
                        onScaleChange={setScale}
                      />
                      <PDFFieldOverlay
                        fields={fields}
                        selectedField={selectedField}
                        onFieldSelect={setSelectedField}
                        onFieldUpdate={updateField}
                        currentPage={currentPage}
                        pdfViewerRef={pdfViewerRef}
                        scale={scale}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Propriétés du champ */}
              <div className="lg:col-span-1">
                <PDFFieldProperties
                  field={selectedFieldData}
                  onUpdate={updateField}
                  onDelete={deleteField}
                  onDelete={deleteField}
                  variables={actualFormVariables}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};