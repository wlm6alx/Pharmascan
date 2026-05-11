-- Remettre userState à true pour ton admin

-- 1. Vérifier l'état actuel
SELECT 
  id,
  email,
  role,
  userstate,
  created_at,
  updated_at
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 2. Remettre userState à true
UPDATE public.users
SET userstate = true,
    updated_at = NOW()
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 3. Vérifier la mise à jour
SELECT 
  id,
  email,
  role,
  userstate,
  updated_at
FROM public.users 
WHERE id = '94ff52ec-7d81-4b22-8ca1-94a6cceab79d';

-- 4. Vérifier tous les utilisateurs avec userState = false
SELECT 
  id,
  email,
  role,
  userstate
FROM public.users 
WHERE userstate = false;

-- 5. Si besoin, réactiver tous les utilisateurs
UPDATE public.users
SET userstate = true,
    updated_at = NOW()
WHERE userstate = false;
