-- À exécuter dans Supabase SQL Editor APRÈS supabase-schema.sql
-- Crée automatiquement pharmacien + pharmacie à l’inscription (même sans session JWT),
-- à partir des métadonnées envoyées par l’app (confirmation d’email possible).

CREATE OR REPLACE FUNCTION public.handle_new_pharmacist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  pid uuid;
  phid uuid;
  owner_full text;
  sp int;
  fn text;
  ln text;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  IF (meta->>'register_flow') IS DISTINCT FROM 'pharmascan' THEN
    RETURN NEW;
  END IF;

  owner_full := COALESCE(meta->>'owner_name', '');
  sp := position(' ' IN owner_full);

  IF sp = 0 THEN
    fn := NULLIF(trim(owner_full), '');
    ln := NULL;
  ELSE
    fn := NULLIF(trim(substring(owner_full FROM 1 FOR sp - 1)), '');
    ln := NULLIF(trim(substring(owner_full FROM sp + 1)), '');
  END IF;

  INSERT INTO public.pharmacists (user_id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    fn,
    ln,
    NULLIF(trim(meta->>'phone'), '')
  )
  RETURNING id INTO pid;

  INSERT INTO public.pharmacies (
    name, address, phone, pharmacist_id, status, operational_status, is_on_duty,
    owner_name, license_number, country, phone_code, city, street, address_reference
  )
  VALUES (
    COALESCE(NULLIF(trim(meta->>'pharmacy_name'), ''), 'Pharmacie'),
    COALESCE(NULLIF(trim(meta->>'address'), ''), '—'),
    NULLIF(trim(meta->>'phone'), ''),
    pid,
    'pending',
    'closed',
    FALSE,
    NULLIF(trim(meta->>'owner_name'), ''),
    NULLIF(trim(meta->>'license_number'), ''),
    NULLIF(trim(meta->>'country'), ''),
    NULLIF(trim(meta->>'phone_code'), ''),
    NULLIF(trim(meta->>'city'), ''),
    NULLIF(trim(meta->>'street'), ''),
    NULLIF(trim(meta->>'address_reference'), '')
  )
  RETURNING id INTO phid;

  UPDATE public.pharmacists SET pharmacy_id = phid WHERE id = pid;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_pharmacist();
