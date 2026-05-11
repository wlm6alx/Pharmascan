-- AJOUTER LE RÔLE ADMIN IMMÉDIATEMENT

-- 1. Ajouter le rôle admin dans les métadonnées
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
  raw_app_meta_data->>'role' as role,
  raw_app_meta_data
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 3. Alternative si la première méthode ne marche pas
UPDATE auth.users
SET raw_app_meta_data = '{"role": "admin"}'
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 4. Vérification finale
SELECT raw_app_meta_data->>'role' as role FROM auth.users WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
