-- Vérifier les tables existantes et leurs données
-- À exécuter dans Supabase SQL Editor

-- 1. Lister toutes les tables publiques
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Vérifier les données dans users
SELECT COUNT(*) as total_users FROM public.users;

-- 3. Vérifier les données dans pharmacies
SELECT COUNT(*) as total_pharmacies FROM public.pharmacies;

-- 4. Vérifier les données dans patients
SELECT COUNT(*) as total_patients FROM public.patients;

-- 5. Vérifier les données dans pharmacists
SELECT COUNT(*) as total_pharmacists FROM public.pharmacists;

-- 6. Vérifier les données dans medications
SELECT COUNT(*) as total_medications FROM public.medications;

-- 7. Vérifier les données dans notifications
SELECT COUNT(*) as total_notifications FROM public.notifications;

-- 8. Exemples de données
SELECT * FROM public.users LIMIT 3;
SELECT * FROM public.pharmacies LIMIT 3;
