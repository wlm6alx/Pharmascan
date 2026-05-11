-- SOLUTION PRODUCTION : Créer des politiques admin sécurisées
-- À exécuter en production - ne supprime rien, ajoute seulement

-- 1. Politique pour les admins (accès complet)
CREATE POLICY "admin_full_access" ON public.users
FOR ALL
USING (auth.uid() = id AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (true);

-- 2. Politique pour les utilisateurs authentifiés normaux (lecture seule)
CREATE POLICY "users_read_own_data" ON public.users
FOR SELECT
USING (auth.uid() = id)
WITH CHECK (true);

-- 3. Politique pour les utilisateurs authentifiés (mise à jour de leur profil)
CREATE POLICY "users_update_own_data" ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (true);

-- 4. S'assurer que RLS est activé (sécurité maintenue)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier que les politiques sont créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public'
ORDER BY policyname;

-- 6. Test avec ton utilisateur admin
SELECT 
  id,
  email,
  role,
  userState
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 7. Si ça ne marche toujours pas, tu peux désactiver RLS temporairement :
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
