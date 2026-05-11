-- Confirmer manuellement l'email de l'utilisateur créé
-- À exécuter dans Supabase SQL Editor

-- 1. Mettre à jour la confirmation de l'email
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'smith.mavoungou@2028.ucac-icam.com';

-- 2. Vérification
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmé ✅'
    ELSE 'Non confirmé ❌'
  END as status
FROM auth.users 
WHERE email = 'smith.mavoungou@2028.ucac-icam.com';

-- 3. Vérifier que le profil admin existe
SELECT 
  u.id,
  u.email,
  u.role,
  a.user_id as admin_user_id
FROM public.users u
LEFT JOIN public.admin a ON u.id = a.user_id
WHERE u.email = 'smith.mavoungou@2028.ucac-icam.com';
