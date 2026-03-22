-- Sépare le statut d’ouverture (open/closed/busy) du statut de validation admin (pending/approved/rejected).
-- À exécuter une fois dans Supabase SQL Editor.

ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'closed';

UPDATE public.pharmacies
SET operational_status = status::text
WHERE status::text IN ('open', 'closed', 'busy');

UPDATE public.pharmacies
SET status = 'approved'
WHERE status::text IN ('open', 'closed', 'busy');

UPDATE public.pharmacies
SET operational_status = 'closed'
WHERE operational_status IS NULL OR operational_status = '';

ALTER TABLE public.pharmacies
  ALTER COLUMN operational_status SET DEFAULT 'closed';

ALTER TABLE public.pharmacies
  ALTER COLUMN operational_status SET NOT NULL;

ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_operational_status_check;
ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_operational_status_check
  CHECK (operational_status IN ('open', 'closed', 'busy'));

ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_status_check;
ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));
