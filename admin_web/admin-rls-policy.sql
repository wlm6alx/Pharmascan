-- ÉTAPE 2 : Politique RLS qui autorise uniquement les admins à lire users
-- Exécuter après le trigger

-- 1. Supprimer toutes les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_read_own_data" ON public.users;
DROP POLICY IF EXISTS "users_update_own_data" ON public.users;
DROP POLICY IF EXISTS "admin_service_role" ON public.users;
DROP POLICY IF EXISTS "authenticated_read_access" ON public.users;
DROP POLICY IF EXISTS "users_select_own_row" ON public.users;
DROP POLICY IF EXISTS "User can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read their data" ON public.users;
DROP POLICY IF EXISTS "Email cannot be changhed via SQL" ON public.users;

-- 2. Politique admin : accès complet à la table users
CREATE POLICY "only_admins_can_access_users" ON public.users
FOR ALL
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');

-- 3. S'assurer que RLS est activé
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Vérifier qu'il n'y a qu'une seule politique
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 5. Test : essayer de lire la table users avec ton admin
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 6. Test : vérifier que le JWT contient bien le rôle
SELECT 
  auth.jwt() as jwt_content,
  auth.jwt()->>'role' as role_from_jwt;
