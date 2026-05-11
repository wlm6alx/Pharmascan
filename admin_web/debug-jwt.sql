-- Vérifier si le rôle est bien dans les métadonnées

-- 1. Vérifier les métadonnées de ton utilisateur
SELECT 
  id,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 2. Vérifier si le rôle est bien présent
SELECT 
  id,
  email,
  raw_app_meta_data->>'role' as role_in_app_metadata,
  raw_user_meta_data->>'role' as role_in_user_metadata
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 3. Vérifier l'état de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerlspolicy
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';
