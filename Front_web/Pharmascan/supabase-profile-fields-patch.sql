-- Champs profil / inscription (alignés avec la page Profil et les métadonnées Register)
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS phone_code TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS address_reference TEXT;
