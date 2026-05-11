-- ARRÊTER D'URGENCE LE TRIGGER PROBLÉMATIQUE

-- 1. Supprimer le trigger qui cause la récursion
DROP TRIGGER IF EXISTS inject_role_trigger ON auth.users;

-- 2. Supprimer la fonction problématique
DROP FUNCTION IF EXISTS public.inject_role_in_jwt();

-- 3. Vérifier que c'est bien supprimé
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'inject_role_trigger';

-- 4. Vérifier que la fonction est supprimée
SELECT 
  routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name = 'inject_role_in_jwt';
