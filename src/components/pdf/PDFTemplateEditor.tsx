import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PDFViewer } from './PDFViewer';
import { PDFFieldPalette } from './PDFFieldPalette';
import { PDFFieldOverlay } from './PDFFieldOverlay';
import { PDFFieldProperties } from './PDFFieldProperties';
import { FormSelector } from './FormSelector';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Upload, Save, Eye, Download, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { FileText } from 'lucide-react';
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
  const [fields, setFields] = useState<PDFField[]>(initialFields);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingExistingPdf, setLoadingExistingPdf] = useState(false);
  const [actualFormVariables, setActualFormVariables] = useState<string[]>(formVariables);
  const [isMobile, setIsMobile] = useState(false);
  const [currentLinkedFormId, setCurrentLinkedFormId] = useState<string | null>(linkedFormId || null);

  const loadLinkedFormVariables = useCallback(() => {
    console.log('🔗 loadLinkedFormVariables appelée avec currentLinkedFormId:', currentLinkedFormId);
    if (!currentLinkedFormId) return;
    
    try {
      // Essayer toutes les sources possibles
      let formsData = null;
      let source = '';
      
      // 1. Essayer currentUserForms dans localStorage
      formsData = localStorage.getItem('currentUserForms');
      if (formsData) {
        source = 'localStorage.currentUserForms';
        console.log('🔗 Données trouvées dans localStorage.currentUserForms');
      }
      
      // 2. Essayer currentUserForms dans sessionStorage
      if (!formsData) {
        formsData = sessionStorage.getItem('currentUserForms');
        if (formsData) {
          source = 'sessionStorage.currentUserForms';
          console.log('🔗 Données trouvées dans sessionStorage.currentUserForms');
        }
      }
      
      // 3. Essayer forms dans localStorage
      if (!formsData) {
        formsData = localStorage.getItem('forms');
        if (formsData) {
          source = 'localStorage.forms';
          console.log('🔗 Données trouvées dans localStorage.forms');
        }
      }
      
      // 4. Essayer de récupérer depuis le contexte global (si disponible)
      if (!formsData && typeof window !== 'undefined' && (window as any).currentUserForms) {
        formsData = JSON.stringify((window as any).currentUserForms);
        source = 'window.currentUserForms';
        console.log('🔗 Données trouvées dans window.currentUserForms');
      }
      
      console.log('🔗 Source utilisée:', source);
      console.log('🔗 formsData trouvé:', !!formsData);
      
      if (formsData) {
        const forms = JSON.parse(formsData);
        console.log('🔗 Forms parsés:', forms.length, 'formulaires');
        console.log('🔗 IDs disponibles:', forms.map((f: any) => f.id));
        console.log('🔗 Recherche de currentLinkedFormId:', currentLinkedFormId);
        
        const linkedForm = forms.find((f: any) => f.id === currentLinkedFormId);
        console.log('🔗 Formulaire lié trouvé:', !!linkedForm);
        
        if (linkedForm && linkedForm.fields) {
          console.log('🔗 Titre du formulaire lié:', linkedForm.title);
          console.log('🔗 Champs du formulaire lié:', linkedForm.fields.map((f: any) => f.label));
          
          const generatedVariables = linkedForm.fields.map((field: any) => {
            console.log('🔗 Traitement champ:', field.label, 'type:', field.type);
            const variableName = field.label
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            
            const variable = `\${${variableName}}`;
            console.log('🔗 Variable générée:', field.label, '→', variable);
            return variable;
          });
          
          // Ajouter des variables système
          generatedVariables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
          
          console.log('🔗 Variables générées:', generatedVariables);
          setActualFormVariables(generatedVariables);
          
          // Forcer un re-render
          setTimeout(() => {
            console.log('🔗 Variables définies dans le state:', generatedVariables);
          }, 100);
          return;
        } else {
          console.warn('🔗 Formulaire lié trouvé mais pas de champs:', linkedForm);
        }
      } else {
        console.warn('🔗 Aucune donnée de formulaires trouvée');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des variables du formulaire lié:', error);
    }
    
    // Fallback vers les variables par défaut
    console.log('🔗 Fallback vers variables par défaut');
    setActualFormVariables(formVariables);
  }, [currentLinkedFormId, formVariables]);
  
  const loadExistingPdf = useCallback(async () => {
    if (!existingPdfUrl) return;
    
    setLoadingExistingPdf(true);
    try {
      // Convertir la Data URL en File
      const response = await fetch(existingPdfUrl);
      const blob = await response.blob();
      const file = new File([blob], templateName || 'template.pdf', { type: 'application/pdf' });
      setPdfFile(file);
      toast.success('PDF existant chargé avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement du PDF existant:', error);
      toast.error('Erreur lors du chargement du PDF existant');
    } finally {
      setLoadingExistingPdf(false);
    }
  }, [existingPdfUrl, templateName]);

  // Charger le PDF existant si on est en mode édition
  useEffect(() => {
    if (existingPdfUrl && !pdfFile) {
      loadExistingPdf();
    }
  }, [existingPdfUrl, pdfFile, loadExistingPdf]);

  // Charger les variables du formulaire lié
  useEffect(() => {
    console.log('🔗 Effect linkedFormId changed:', linkedFormId);
    console.log('🔗 Toutes les données disponibles:');
    console.log('🔗 localStorage currentUserForms:', localStorage.getItem('currentUserForms'));
    console.log('🔗 sessionStorage currentUserForms:', sessionStorage.getItem('currentUserForms'));
    console.log('🔗 localStorage forms:', localStorage.getItem('forms'));
    
    if (currentLinkedFormId) {
      loadLinkedFormVariables();
    } else {
      console.log('🔗 Pas de formulaire lié, utilisation variables par défaut');
      setActualFormVariables(formVariables);
    }
  }, [currentLinkedFormId, formVariables, loadLinkedFormVariables]);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setFields([]); // Reset fields when loading new PDF
      setSelectedField(null);
      toast.success('PDF chargé avec succès');
    } else {
      toast.error('Veuillez sélectionner un fichier PDF valide');
    }
  };

  const addField = useCallback((type: PDFField['type']) => {
    const newField: PDFField = {
      id: uuidv4(),
      type,
      x: 100,
      y: 100,
      width: 120,
      height: 30,
      page: currentPage,
      variable: '',
      fontSize: 12,
      fontColor: '#000000',
      backgroundColor: '#ffffff',
      required: false,
    };
    
    setFields(prev => [...prev, newField]);
    setSelectedField(newField.id);
  }, [currentPage]);

  const handlePageClick = useCallback((x: number, y: number, page: number) => {
    // Déselectionner le champ actuel
    setSelectedField(null);
  }, []);

  // Détecter si on est sur mobile
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

  const handleSave = () => {
    if (!pdfFile) {
      toast.error('Veuillez charger un fichier PDF');
      return;
    }

    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ au template');
      return;
    }

    const fieldsWithoutVariables = fields.filter(field => !field.variable || field.variable.trim() === '');
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
      toast.success('Formulaire lié mis à jour ! Les variables vont être rechargées.');
    } else {
      toast('Formulaire délié. Variables par défaut utilisées.');
    }
  };
  const selectedFieldData = selectedField ? fields.find(f => f.id === selectedField) : null;

  // Bloquer sur mobile
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-6">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Éditeur de Template PDF
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              L'éditeur de template PDF est disponible uniquement sur ordinateur pour une meilleure expérience d'édition.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💻 Utilisez un ordinateur ou une tablette en mode paysage pour accéder à l'éditeur
                </p>
              </div>
              <Link to="/pdf/templates">
                <Button className="w-full">
                  Retour aux templates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Créez des templates PDF avec des champs dynamiques
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

          {/* Sélecteur de formulaire lié */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Formulaire lié
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Liez ce template à un formulaire pour générer automatiquement les variables
              </p>
            </CardHeader>
            <CardContent>
              <FormSelector
                selectedFormId={currentLinkedFormId}
                onFormChange={handleFormLinkChange}
                showVariablesPreview={true}
              />
            </CardContent>
          </Card>
          {!pdfFile && !loadingExistingPdf ? (
            <Card>
              <CardContent className="text-center py-16">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {existingPdfUrl ? 'Remplacer le template PDF' : 'Chargez votre template PDF'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {existingPdfUrl 
                    ? 'Sélectionnez un nouveau fichier PDF pour remplacer le template actuel'
                    : 'Sélectionnez un fichier PDF qui servira de base à votre template'
                  }
                </p>
                <Button 
                  type="button" 
                  onClick={() => document.getElementById('pdf-file-input')?.click()}
                >
                  Choisir un fichier PDF
                </Button>
              </CardContent>
            </Card>
          ) : loadingExistingPdf ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chargement du PDF existant...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Veuillez patienter pendant le chargement du template PDF
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Bouton pour changer de PDF */}
              {existingPdfUrl && (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => document.getElementById('pdf-file-input')?.click()}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Remplacer le fichier PDF</span>
                  </Button>
                </div>
              )}

              {/* Layout principal : Champs | PDF | Propriétés */}
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Palette des champs - Gauche */}
                <div className="lg:col-span-1">
                  <div className="sticky top-4">
                    <PDFFieldPalette onAddField={addField} />
                  </div>
                </div>

                {/* Visualiseur PDF - Centre */}
                <div className="lg:col-span-3">
                  <Card className="h-[600px] lg:h-[700px]">
                    <PDFViewer
                      file={pdfFile}
                      onPageClick={handlePageClick}
                      scale={scale}
                      onScaleChange={setScale}
                    >
                      {/* Overlay des champs */}
                      {fields.map(field => (
                          <PDFFieldOverlay
                            key={field.id}
                            field={field}
                            scale={scale}
                            isSelected={selectedField === field.id}
                            onSelect={() => setSelectedField(field.id)}
                            onUpdate={(updates) => updateField(field.id, updates)}
                            onDelete={() => deleteField(field.id)}
                          />
                      ))}
                    </PDFViewer>
                  </Card>
                </div>

                {/* Propriétés du champ - Droite */}
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
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Cliquez sur le PDF pour ajouter un champ ou sélectionnez un champ existant pour modifier ses propriétés
                            </p>
                            
                            {fields.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
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
                                      {field.variable || field.type} ({field.type})
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

              {/* Layout mobile - Stack vertical */}
              <div className="lg:hidden space-y-6">
                {/* Palette mobile */}
                <PDFFieldPalette onAddField={addField} />
                
                {/* PDF mobile */}
                <Card className="h-[500px]">
                  <PDFViewer
                    file={pdfFile}
                    onPageClick={handlePageClick}
                    scale={scale}
                    onScaleChange={setScale}
                  >
                    {fields
                      .filter(field => field.page === currentPage)
                      .map(field => (
                        <PDFFieldOverlay
                          key={field.id}
                          field={field}
                          scale={scale}
                          isSelected={selectedField === field.id}
                          onSelect={() => setSelectedField(field.id)}
                          onUpdate={(updates) => updateField(field.id, updates)}
                          onDelete={() => deleteField(field.id)}
                        />
                      ))}
                  </PDFViewer>
                </Card>
                
                {/* Propriétés mobile */}
                {selectedFieldData && (
                  <PDFFieldProperties
                    field={selectedFieldData}
                    onUpdate={(updates) => updateField(selectedFieldData.id, updates)}
                    availableVariables={actualFormVariables}
                    linkedFormId={currentLinkedFormId}
                  />
                )}
              </div>
            </div>
          )}

          {/* Input caché pour le changement de PDF */}
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