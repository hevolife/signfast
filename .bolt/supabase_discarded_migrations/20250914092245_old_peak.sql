@@ .. @@
 /*
   # Fix template public access for forms
 
   1. Security Updates
     - Add policy for public access to templates linked to published forms
     - Ensure templates are accessible for PDF generation
   2. Data Updates  
     - Mark existing templates as public for immediate access
 */

 -- Supprimer l'ancienne politique qui causait des erreurs
 DROP POLICY IF EXISTS "Public access to templates linked to published forms" ON pdf_templates;

 -- Créer une nouvelle politique plus simple et robuste
 CREATE POLICY "Templates linked to published forms are accessible"
   ON pdf_templates
   FOR SELECT
   TO anon, authenticated
   USING (
     is_public = true 
     OR 
     linked_form_id IN (
       SELECT id FROM forms WHERE is_published = true
     )
   );

+-- Créer une politique spécifique pour les templates avec formulaires publiés
+CREATE POLICY "Templates with published forms access"
+  ON pdf_templates
+  FOR SELECT
+  TO anon, authenticated
+  USING (
+    EXISTS (
+      SELECT 1 FROM forms 
+      WHERE forms.id = pdf_templates.linked_form_id 
+      AND forms.is_published = true
+    )
+  );
+
 -- Marquer tous les templates existants comme publics pour éviter les problèmes d'accès
 UPDATE pdf_templates SET is_public = true WHERE is_public = false;