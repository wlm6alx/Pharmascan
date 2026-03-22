-- À exécuter une fois dans Supabase SQL Editor si la table medications existait déjà sans ces colonnes

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS production_date DATE;
