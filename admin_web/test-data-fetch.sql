-- Vérifier que toutes les tables ont des données et sont accessibles

-- 1. Vérifier les données dans chaque table
SELECT 'users' as table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'pharmacies' as table_name, COUNT(*) as record_count FROM public.pharmacies
UNION ALL
SELECT 'patients' as table_name, COUNT(*) as record_count FROM public.patients
UNION ALL
SELECT 'medications' as table_name, COUNT(*) as record_count FROM public.medications
UNION ALL
SELECT 'notifications' as table_name, COUNT(*) as record_count FROM public.notifications;

-- 2. Vérifier l'état de RLS sur chaque table
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerlspolicy
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'pharmacies', 'patients', 'medications', 'notifications')
ORDER BY tablename;

-- 3. Tester une requête simple sur chaque table
-- Users
SELECT 'users_test' as test, COUNT(*) as count FROM public.users LIMIT 1;

-- Pharmacies  
SELECT 'pharmacies_test' as test, COUNT(*) as count FROM public.pharmacies LIMIT 1;

-- Patients
SELECT 'patients_test' as test, COUNT(*) as count FROM public.patients LIMIT 1;

-- 4. Vérifier les politiques RLS existantes
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
