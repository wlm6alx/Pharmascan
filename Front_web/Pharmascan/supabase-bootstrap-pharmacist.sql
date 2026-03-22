-- À exécuter dans Supabase SQL Editor (après supabase-schema.sql)
-- Permet de créer une fiche pharmacien + pharmacie minimale pour un utilisateur déjà connecté
-- (cas : trigger d’inscription absent ou compte créé avant l’installation du trigger).

CREATE OR REPLACE FUNCTION public.bootstrap_pharmacist_if_missing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid;
  em text;
  pid uuid;
  phid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session');
  END IF;

  IF EXISTS (SELECT 1 FROM public.pharmacists WHERE user_id = uid) THEN
    RETURN jsonb_build_object('ok', true, 'already_existed', true);
  END IF;

  SELECT u.email INTO em FROM auth.users u WHERE u.id = uid;
  IF em IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found');
  END IF;

  INSERT INTO public.pharmacists (user_id, email)
  VALUES (uid, em)
  RETURNING id INTO pid;

  INSERT INTO public.pharmacies (name, address, pharmacist_id, status, operational_status, is_on_duty, owner_name, license_number, country, phone_code, city, street, address_reference)
  VALUES ('Pharmacie', '—', pid, 'pending', 'closed', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
  RETURNING id INTO phid;

  UPDATE public.pharmacists SET pharmacy_id = phid WHERE id = pid;

  RETURN jsonb_build_object('ok', true, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_pharmacist_if_missing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_pharmacist_if_missing() TO authenticated;
