-- Solution définitive : Supprimer toutes les politiques RLS sur users
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer TOUTES les politiques RLS sur la table users
DROP POLICY IF EXISTS "Email cannot be changhed via SQL" ON public.users;
DROP POLICY IF EXISTS "User can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read their data" ON public.users;
DROP POLICY IF EXISTS "users_select_own_row" ON public.users;

-- 2. Désactiver complètement RLS sur users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. S'assurer qu'aucune politique ne reste
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 4. Confirmer RLS désactivé
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

-- 5. Test de lecture directe
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
