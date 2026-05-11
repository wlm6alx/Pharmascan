-- SOLUTION JWT : Injecter le rôle dans le token pour éviter la récursion
-- C'est la méthode recommandée par Supabase

-- 1. Créer la fonction pour injecter le rôle dans le JWT
CREATE OR REPLACE FUNCTION public.set_jwt_claim()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = NEW.id;
  
  -- Mettre à jour les métadonnées de l'utilisateur dans auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'),
    '{role}',
    to_jsonb(user_role)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger pour mettre à jour le JWT lors de la création/mise à jour
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_jwt_claim();

-- 3. Mettre à jour ton utilisateur admin existant
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 4. Créer les politiques RLS utilisant le JWT (plus de récursion !)
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
CREATE POLICY "admin_full_access" ON public.users
FOR ALL
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');

-- 5. Politique pour les utilisateurs normaux (lecture de leurs données)
DROP POLICY IF EXISTS "users_read_own_data" ON public.users;
CREATE POLICY "users_read_own_data" ON public.users
FOR SELECT
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. S'assurer que RLS est activé
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7. Vérifier que le rôle est bien dans les métadonnées
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 8. Test de lecture avec le JWT
SELECT 
  id,
  email,
  role
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
