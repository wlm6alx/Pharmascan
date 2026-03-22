-- À exécuter dans Supabase SQL Editor (après supabase-schema.sql).
-- Crée la fiche pharmacien même si l’INSERT client est bloqué par RLS ou autre.
-- Ne crée pas la pharmacie (voir bootstrap_pharmacist_if_missing pour le pack complet).

CREATE OR REPLACE FUNCTION public.ensure_pharmacist_for_current_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid;
  pid uuid;
  em text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO pid FROM public.pharmacists WHERE user_id = uid LIMIT 1;
  IF pid IS NOT NULL THEN
    RETURN pid;
  END IF;

  SELECT u.email INTO em FROM auth.users u WHERE u.id = uid;

  INSERT INTO public.pharmacists (user_id, email)
  VALUES (uid, em)
  RETURNING id INTO pid;

  RETURN pid;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_pharmacist_for_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_pharmacist_for_current_user() TO authenticated;
