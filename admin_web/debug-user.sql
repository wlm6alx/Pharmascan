-- Débogage complet de l'utilisateur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si l'utilisateur existe dans auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmé ✅'
    ELSE 'Non confirmé ❌'
  END as email_status
FROM auth.users 
WHERE email = 'smith.mavoungou@2028.ucac-icam.com';

-- 2. Vérifier si le profil existe dans public.users
SELECT 
  id,
  email,
  role,
  userState,
  created_at,
  CASE 
    WHEN id IS NOT NULL THEN 'Profil trouvé ✅'
    ELSE 'Profil manquant ❌'
  END as profile_status
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 3. Vérifier RLS sur la table users
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

-- 4. Vérifier les politiques RLS sur users
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

-- 5. Vérifier les permissions sur users
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY grantee, privilege_type;
