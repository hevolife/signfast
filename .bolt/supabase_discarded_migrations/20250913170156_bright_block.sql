@@ .. @@
 -- Enable RLS on users table
 ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 
--- Create policies for users table
-CREATE POLICY "Allow public read access to users"
-  ON users
-  FOR SELECT
-  TO public
-  USING (true);
-
-CREATE POLICY "Users can read own data"
-  ON users
-  FOR SELECT
-  TO authenticated
-  USING (auth.uid() = id);
-
-CREATE POLICY "Users can update own data"
-  ON users
-  FOR UPDATE
-  TO authenticated
-  USING (auth.uid() = id)
-  WITH CHECK (auth.uid() = id);
+-- Create policies for users table (with existence checks)
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'users' AND policyname = 'Allow public read access to users'
+  ) THEN
+    CREATE POLICY "Allow public read access to users"
+      ON users
+      FOR SELECT
+      TO public
+      USING (true);
+  END IF;
+
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'users' AND policyname = 'Users can read own data'
+  ) THEN
+    CREATE POLICY "Users can read own data"
+      ON users
+      FOR SELECT
+      TO authenticated
+      USING (auth.uid() = id);
+  END IF;
+
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'users' AND policyname = 'Users can update own data'
+  ) THEN
+    CREATE POLICY "Users can update own data"
+      ON users
+      FOR UPDATE
+      TO authenticated
+      USING (auth.uid() = id)
+      WITH CHECK (auth.uid() = id);
+  END IF;
+END $$;
 
 -- =====================================================
 -- 2. AFFILIATE PROGRAMS TABLE
@@ .. @@
 -- Enable RLS
 ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
 
--- Create policies
-CREATE POLICY "Users can read own affiliate program"
-  ON affiliate_programs
-  FOR SELECT
-  TO authenticated
-  USING (user_id = auth.uid());
-
-CREATE POLICY "Users can update own affiliate program"
-  ON affiliate_programs
-  FOR UPDATE
-  TO authenticated
-  USING (user_id = auth.uid())
-  WITH CHECK (user_id = auth.uid());
-
-CREATE POLICY "Admins can read all affiliate programs"
-  ON affiliate_programs
-  FOR SELECT
-  TO authenticated
-  USING (
-    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
-    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
-  );
+-- Create policies (with existence checks)
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'affiliate_programs' AND policyname = 'Users can read own affiliate program'
+  ) THEN
+    CREATE POLICY "Users can read own affiliate program"
+      ON affiliate_programs
+      FOR SELECT
+      TO authenticated
+      USING (user_id = auth.uid());
+  END IF;
+
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'affiliate_programs' AND policyname = 'Users can update own affiliate program'
+  ) THEN
+    CREATE POLICY "Users can update own affiliate program"
+      ON affiliate_programs
+      FOR UPDATE
+      TO authenticated
+      USING (user_id = auth.uid())
+      WITH CHECK (user_id = auth.uid());
+  END IF;
+
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'affiliate_programs' AND policyname = 'Admins can read all affiliate programs'
+  ) THEN
+    CREATE POLICY "Admins can read all affiliate programs"
+      ON affiliate_programs
+      FOR SELECT
+      TO authenticated
+      USING (
+        (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
+        (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
+      );
+  END IF;
+END $$;
 
 -- =====================================================
 -- 3. AFFILIATE REFERRALS TABLE
@@ .. @@
 -- Enable RLS
 ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
 
--- Create policies
-CREATE POLICY "Users can read own referrals"
-  ON affiliate_referrals
-  FOR SELECT
-  TO authenticated
-  USING (affiliate_user_id = auth.uid());
-
-CREATE POLICY "Users can insert referrals"
-  ON affiliate_referrals
-  FOR INSERT
-  TO authenticated
-  WITH CHECK (affiliate_user_id = auth.uid());
-
-CREATE POLICY "Admins can read all referrals"
-  ON affiliate_referrals
-  FOR SELECT
-  TO authenticated
-  USING (
-    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
-    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
-  );
+-- Create policies (with existence checks)
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'affiliate_referrals' AND policyname = 'Users can read own referrals'
+  ) THEN
+    CREATE POLICY "Users can read own referrals"
+      ON affiliate_referrals
+      FOR SELECT
+      TO authenticated
+      USING (affiliate_user_id = auth.uid());
+  END IF;
+
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'affiliate_referrals' AND policyname = 'Users can insert referrals'
+  ) THEN
+    CREATE POLICY "Users can insert referrals"
+      ON affiliate_referrals
+      FOR INSERT
+      TO authenticated
+      WITH CHECK (affiliate_user_id = auth.uid());
+  END IF;
+
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename = 'affiliate_referrals' AND policyname = 'Admins can read all referrals'
+  ) THEN
+    CREATE POLICY "Admins can read all referrals"
+      ON affiliate_referrals
+      FOR SELECT
+      TO authenticated
+      USING (
+        (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
+        (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
+      );
+  END IF;
+END $$;