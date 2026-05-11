-- SOLUTION SÉCURISÉE : Préserver handle_new_user
-- Utilise ce script si tu veux garder handle_new_user

-- 1. Mettre à jour ton utilisateur admin existant (sans toucher aux triggers)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 2. Créer la fonction pour injecter le rôle (si n'existe pas)
CREATE OR REPLACE FUNCTION public.inject_role_in_jwt()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Récupérer le rôle depuis la table users
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = NEW.id;
  
  -- Mettre à jour app_metadata
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

-- 3. Créer le trigger (seulement si n'existe pas)
-- NE SUPPRIME PAS handle_new_user !
CREATE TRIGGER IF NOT EXISTS inject_role_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.inject_role_in_jwt();

-- 4. Supprimer SEULEMENT les politiques RLS problématiques
-- PAS les triggers !
DROP POLICY IF EXISTS "Email cannot be changhed via SQL" ON public.users;
DROP POLICY IF EXISTS "User can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read their data" ON public.users;
DROP POLICY IF EXISTS "users_select_own_row" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_read_own_data" ON public.users;
DROP POLICY IF EXISTS "users_update_own_data" ON public.users;
DROP POLICY IF EXISTS "admin_service_role" ON public.users;
DROP POLICY IF EXISTS "authenticated_read_access" ON public.users;

-- 5. Créer la politique admin utilisant le JWT
CREATE POLICY "only_admins_can_access_users" ON public.users
FOR ALL
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');

-- 6. Activer RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7. Vérifier que handle_new_user est toujours là
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';
