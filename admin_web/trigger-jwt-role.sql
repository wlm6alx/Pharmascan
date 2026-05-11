-- ÉTAPE 1 : Trigger pour injecter le rôle dans le JWT
-- Exécuter d'abord ce script

-- 1. Créer la fonction pour mettre à jour le rôle dans les métadonnées
CREATE OR REPLACE FUNCTION public.inject_role_in_jwt()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Récupérer le rôle depuis la table users
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = NEW.id;
  
  -- Mettre à jour app_metadata (plus sécurisé que user_metadata)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'),
    '{role}',
    to_jsonb(user_role)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger qui s'exécute après chaque authentification
DROP TRIGGER IF EXISTS inject_role_trigger ON auth.users;
CREATE TRIGGER inject_role_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.inject_role_in_jwt();

-- 3. Mettre à jour ton utilisateur admin existant
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 4. Vérifier que le rôle est bien dans app_metadata
SELECT 
  id,
  email,
  raw_app_meta_data
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
