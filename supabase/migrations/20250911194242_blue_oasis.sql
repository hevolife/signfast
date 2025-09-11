/*
  # Créer la table des templates PDF

  1. Nouvelle table
    - `pdf_templates`
      - `id` (uuid, primary key)
      - `name` (text, nom du template)
      - `description` (text, description)
      - `pdf_content` (text, contenu PDF en base64)
      - `fields` (jsonb, configuration des champs)
      - `user_id` (uuid, propriétaire)
      - `is_public` (boolean, accessible publiquement)
      - `linked_form_id` (uuid, formulaire lié)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `pdf_templates`
    - Politique pour les templates publics
    - Politique pour les propriétaires
    - Index pour les performances

  3. Trigger
    - Auto-update du timestamp updated_at
*/

-- Créer la table des templates PDF
CREATE TABLE IF NOT EXISTS pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  pdf_content text NOT NULL,
  fields jsonb DEFAULT '[]'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  linked_form_id uuid,
  pages integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

-- Politique pour lire les templates publics (accès anonyme)
CREATE POLICY "Tout le monde peut lire les templates publics"
  ON pdf_templates
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Politique pour lire ses propres templates
CREATE POLICY "Les utilisateurs peuvent lire leurs templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour créer ses templates
CREATE POLICY "Les utilisateurs peuvent créer leurs templates"
  ON pdf_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique pour modifier ses templates
CREATE POLICY "Les utilisateurs peuvent modifier leurs templates"
  ON pdf_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour supprimer ses templates
CREATE POLICY "Les utilisateurs peuvent supprimer leurs templates"
  ON pdf_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_id ON pdf_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_is_public ON pdf_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_linked_form_id ON pdf_templates(linked_form_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_created_at ON pdf_templates(created_at DESC);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_pdf_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_pdf_templates_updated_at ON pdf_templates;
CREATE TRIGGER update_pdf_templates_updated_at
  BEFORE UPDATE ON pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_templates_updated_at();