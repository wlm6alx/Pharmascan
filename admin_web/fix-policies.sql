-- Supprimer toutes les politiques RLS sur la table users
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer toutes les politiques sur users
DROP POLICY IF EXISTS "Email cannot be changhed via SQL" ON public.users;
DROP POLICY IF EXISTS "User can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read their data" ON public.users;
DROP POLICY IF EXISTS "users_select_own_row" ON public.users;

-- 2. Vérifier qu'il n'y a plus de politiques
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 3. Confirmer que RLS est bien désactivé
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN 'RLS activé 🔒'
    ELSE 'RLS désactivé 🔓'
  END as rls_status
FROM pg_tables 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 4. Test de lecture directe pour vérifier
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
