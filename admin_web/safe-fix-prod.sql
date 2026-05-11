-- SOLUTION SÉCURISÉE POUR LA PRODUCTION
-- À n'exécuter qu'après avoir fait un BACKUP complet
-- ET seulement si tu comprends exactement ce que ça fait

-- ⚠️  ATTENTION : Ce script modifie la sécurité de ta base de données
-- Fais un BACKUP complet avant d'exécuter !

-- 1. Créer une politique admin simple (au lieu de supprimer tout)
CREATE POLICY "admin_full_access" ON public.users
FOR ALL
USING (auth.uid() = id)
WITH CHECK (true);

-- 2. Créer une politique lecture pour tous les utilisateurs authentifiés
CREATE POLICY "authenticated_read_access" ON public.users
FOR SELECT
USING (auth.role() = 'authenticated')
WITH CHECK (true);

-- 3. Vérifier les nouvelles politiques
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 4. Test de lecture pour ton admin
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 5. Si ça ne marche pas, seulement là tu peux supprimer les anciennes :
-- DROP POLICY IF EXISTS "Email cannot be changhed via SQL" ON public.users;
-- DROP POLICY IF EXISTS "User can manage own profile" ON public.users;
-- DROP POLICY IF EXISTS "Users can read their data" ON public.users;
-- DROP POLICY IF EXISTS "users_select_own_row" ON public.users;
