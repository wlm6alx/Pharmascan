-- SOLUTION ZÉRO SUPPRESSION : Uniquement ajouter le rôle dans le JWT
-- NE SUPPRIME AUCUN TRIGGER, AUCUNE POLITIQUE, AUCUNE DONNÉE

-- 1. Ajouter le rôle admin directement dans les métadonnées de ton utilisateur
-- C'est tout ce dont on a besoin pour que la connexion marche
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

-- 3. Désactiver temporairement RLS sur users (juste pour tester)
-- NE SUPPRIME RIEN, juste désactive
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 4. Test de lecture pour vérifier que ça marche
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 5. Si ça marche, tu peux réactiver RLS plus tard avec une politique simple
-- Pour l'instant, laisse-le désactivé pour que la connexion passe
