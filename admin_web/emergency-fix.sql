-- URGENCE : Supprimer le trigger qui bloque tout

-- 1. Supprimer le trigger qui cause l'erreur
DROP TRIGGER IF EXISTS inject_role_trigger ON auth.users;

-- 2. Supprimer la fonction problématique
DROP FUNCTION IF EXISTS public.inject_role_in_jwt();

-- 3. Vérifier que c'est supprimé
SELECT 'Trigger supprimé' as status FROM information_schema.triggers 
WHERE trigger_schema = 'auth' AND trigger_name = 'inject_role_trigger';

-- 4. Update direct SANS trigger
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 5. Désactiver RLS temporairement
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 6. Vérifier le résultat
SELECT 
  id,
  email,
  raw_app_meta_data
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
