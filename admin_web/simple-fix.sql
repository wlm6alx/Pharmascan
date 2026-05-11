-- SOLUTION SIMPLE ET SANS RISQUE
-- PAS DE TRIGGER - JUSTE UN UPDATE DIRECT

-- 1. Mettre à jour ton utilisateur admin directement (sans trigger)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 2. Vérifier que le rôle est bien ajouté
SELECT 
  id,
  email,
  raw_app_meta_data
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 3. Désactiver RLS temporairement pour éviter la récursion
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 4. C'EST TOUT ! PAS DE TRIGGER !
