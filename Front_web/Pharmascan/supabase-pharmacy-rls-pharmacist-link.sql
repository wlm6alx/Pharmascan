-- À exécuter dans Supabase SQL Editor si la pharmacie existe (pharmacist_id) mais
-- pharmacists.pharmacy_id est NULL : les anciennes politiques RLS ne voyaient pas la ligne,
-- et l’embed `pharmacies(*)` restait vide → erreurs client (pharmacy.id null).

-- 1) Réparer les lignes orphelines (lien manquant côté pharmacists)
UPDATE public.pharmacists p
SET pharmacy_id = ph.id
FROM public.pharmacies ph
WHERE p.pharmacy_id IS NULL
  AND ph.pharmacist_id = p.id;

-- 2) Politiques : accès si pharmacy_id correspond OU si la pharmacie pointe vers ce pharmacien
DROP POLICY IF EXISTS "Pharmacists can view own pharmacy" ON public.pharmacies;
CREATE POLICY "Pharmacists can view own pharmacy"
  ON public.pharmacies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND (
        pharmacists.pharmacy_id = pharmacies.id
        OR pharmacists.id = pharmacies.pharmacist_id
      )
    )
  );

DROP POLICY IF EXISTS "Pharmacists can update own pharmacy" ON public.pharmacies;
CREATE POLICY "Pharmacists can update own pharmacy"
  ON public.pharmacies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND (
        pharmacists.pharmacy_id = pharmacies.id
        OR pharmacists.id = pharmacies.pharmacist_id
      )
    )
  );
