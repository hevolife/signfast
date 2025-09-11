/*
  # Création de la table pdf_storage

  1. Nouvelle table
    - `pdf_storage` pour stocker les PDFs générés
    - Colonnes pour métadonnées et contenu PDF
    - Support pour les formulaires anonymes et authentifiés

  2. Sécurité
    - Enable RLS sur `pdf_storage`
    - Politique d'accès public pour les formulaires
    - Index pour les performances

  3. Fonctionnalités
    - Stockage du contenu PDF en base64
    - Métadonnées complètes (formulaire, template, données)
    - Timestamps automatiques
*/

-- Créer la table pdf_storage
CREATE TABLE IF NOT EXISTS pdf_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  response_id uuid,
  template_name text NOT NULL DEFAULT 'Template simple',
  form_title text NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}',
  pdf_content text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE pdf_storage ENABLE ROW LEVEL SECURITY;

-- Politique d'accès public (pour les formulaires anonymes)
CREATE POLICY "Tout le monde peut créer des PDFs"
  ON pdf_storage
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Tout le monde peut lire les PDFs"
  ON pdf_storage
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Tout le monde peut supprimer des PDFs"
  ON pdf_storage
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_pdf_storage_file_name ON pdf_storage (file_name);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_form_title ON pdf_storage (form_title);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_created_at ON pdf_storage (created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_pdf_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_pdf_storage_updated_at
  BEFORE UPDATE ON pdf_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_storage_updated_at();