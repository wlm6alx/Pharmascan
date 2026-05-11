-- Créer un admin manuellement via le trigger
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord créer l'utilisateur dans auth.users via le dashboard
-- Supabase Dashboard → Authentication → Users → Add user
-- Email: admin@pharmascan.cm
-- Mot de passe: admin123
-- Auto-confirm: ✅

-- 2. Récupérer l'UUID après création et remplacer ci-dessous
-- Le trigger handle_new_user() va créer automatiquement le profil
-- quand l'utilisateur sera créé via le dashboard

-- 3. Vérification que le trigger fonctionne
SELECT * FROM public.users WHERE email = 'admin@pharmascan.cm';

-- 4. Vérification que l'entrée admin est créée
SELECT * FROM public.admin WHERE user_id IN (
  SELECT id FROM public.users WHERE email = 'admin@pharmascan.cm'
);

-- Note: Le trigger handle_new_user() s'exécute automatiquement
-- quand un utilisateur est créé dans auth.users
-- Il va créer le profil dans public.users ET l'entrée dans public.admin
