-- SOLUTION SERVICE ROLE : Utiliser postgres au lieu de authenticated
-- Plus sécurisé et évite la récursion

-- 1. Créer un rôle admin dans Supabase (si n'existe pas)
-- Va dans Supabase Dashboard → Settings → Database → Extensions → pg_auth
-- Crée le rôle "admin" s'il n'existe pas

-- 2. Donner les permissions au rôle admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;

-- 3. Politique admin utilisant le rôle postgres
CREATE POLICY "admin_service_role" ON public.users
FOR ALL
USING (pg_has_role(auth.jwt(), 'admin'))
WITH CHECK (true);

-- 4. Mettre à jour ton utilisateur pour qu'il utilise le rôle admin
UPDATE public.users 
SET role = 'admin' 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 5. Donner le rôle admin à ton utilisateur dans auth.users
-- Dans Supabase Dashboard → Authentication → Users → Éditer ton utilisateur
-- Ajoute le rôle "admin" dans "User metadata" → app_metadata → roles: ["admin"]

-- 6. Vérifier que ça marche
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';
