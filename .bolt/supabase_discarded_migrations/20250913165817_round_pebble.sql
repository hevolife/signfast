@@ .. @@
 CREATE POLICY "Super admins can manage all settings"
   ON system_settings
   FOR ALL
   TO authenticated
-  USING (((jwt() ->> 'email'::text) = 'admin@signfast.com'::text) OR ((jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text))
-  WITH CHECK (((jwt() ->> 'email'::text) = 'admin@signfast.com'::text) OR ((jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text));
+  USING (((auth.jwt() ->> 'email'::text) = 'admin@signfast.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text))
+  WITH CHECK (((auth.jwt() ->> 'email'::text) = 'admin@signfast.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text));