-- Vérifier tous les triggers existants sur la base
-- Exécuter avant de modifier quoi que ce soit

-- 1. Triggers sur auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Triggers sur public.users
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 3. Fonctions existantes
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 4. Vérifier si handle_new_user existe
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';
