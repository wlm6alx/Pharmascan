-- Désactiver RLS sur la table users temporairement
-- À exécuter dans Supabase SQL Editor

-- 1. Désactiver RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Vérifier que RLS est désactivé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users' 
  AND schemaname = 'public';

-- 3. Vérifier que ton utilisateur existe
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE email = 'smith.mavoungou@2028.ucac-icam.com';

-- 4. Donner les permissions si nécessaire
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
