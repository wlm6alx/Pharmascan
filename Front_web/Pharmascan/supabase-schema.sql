-- Schema Supabase pour PharmaScan - Espace Pharmacien
-- Ordre des tables : pharmacists (sans FK vers pharmacies) -> pharmacies -> contrainte pharmacy_id

-- Table: pharmacists (pharmacy_id sans FK au départ pour éviter la dépendance circulaire)
CREATE TABLE IF NOT EXISTS pharmacists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  pharmacy_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: pharmacies
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  pharmacist_id UUID NOT NULL REFERENCES pharmacists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  operational_status TEXT NOT NULL DEFAULT 'closed' CHECK (operational_status IN ('open', 'closed', 'busy')),
  is_on_duty BOOLEAN DEFAULT FALSE,
  attestation_url TEXT,
  photo_url TEXT,
  owner_name TEXT,
  license_number TEXT,
  country TEXT,
  phone_code TEXT,
  city TEXT,
  street TEXT,
  address_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lier pharmacists.pharmacy_id à pharmacies (après création des deux tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pharmacists_pharmacy_id_fkey'
  ) THEN
    ALTER TABLE pharmacists
      ADD CONSTRAINT pharmacists_pharmacy_id_fkey
      FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Table: medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  dosage TEXT,
  form TEXT,
  manufacturer TEXT,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  price NUMERIC(12, 2) DEFAULT 0,
  photo_urls TEXT[] DEFAULT '{}'::text[],
  production_date DATE,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: notifications (utilisée par Layout et Notifications.jsx)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  description TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacists_user_id ON pharmacists(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacists_pharmacy_id ON pharmacists(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_pharmacist_id ON pharmacies(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);
CREATE INDEX IF NOT EXISTS idx_medications_pharmacy_id ON medications(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_medications_available ON medications(available);
CREATE INDEX IF NOT EXISTS idx_medications_barcode ON medications(barcode);
CREATE INDEX IF NOT EXISTS idx_notifications_pharmacy_id ON notifications(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_pharmacists_updated_at ON pharmacists;
CREATE TRIGGER update_pharmacists_updated_at BEFORE UPDATE ON pharmacists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pharmacies_updated_at ON pharmacies;
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

ALTER TABLE pharmacists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies pharmacists
DROP POLICY IF EXISTS "Pharmacists can view own profile" ON pharmacists;
CREATE POLICY "Pharmacists can view own profile"
  ON pharmacists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Pharmacists can update own profile" ON pharmacists;
CREATE POLICY "Pharmacists can update own profile"
  ON pharmacists FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Pharmacists can insert own profile" ON pharmacists;
CREATE POLICY "Pharmacists can insert own profile"
  ON pharmacists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pharmacies
DROP POLICY IF EXISTS "Pharmacists can view own pharmacy" ON pharmacies;
CREATE POLICY "Pharmacists can view own pharmacy"
  ON pharmacies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacists.pharmacy_id = pharmacies.id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can create own pharmacy" ON pharmacies;
CREATE POLICY "Pharmacists can create own pharmacy"
  ON pharmacies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacists.id = pharmacies.pharmacist_id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can update own pharmacy" ON pharmacies;
CREATE POLICY "Pharmacists can update own pharmacy"
  ON pharmacies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacists.pharmacy_id = pharmacies.id
    )
  );

-- Policies medications
DROP POLICY IF EXISTS "Pharmacists can view own pharmacy medications" ON medications;
CREATE POLICY "Pharmacists can view own pharmacy medications"
  ON medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      JOIN pharmacists ON pharmacists.pharmacy_id = pharmacies.id
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacies.id = medications.pharmacy_id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can insert medications to own pharmacy" ON medications;
CREATE POLICY "Pharmacists can insert medications to own pharmacy"
  ON medications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pharmacies
      JOIN pharmacists ON pharmacists.pharmacy_id = pharmacies.id
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacies.id = medications.pharmacy_id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can update own pharmacy medications" ON medications;
CREATE POLICY "Pharmacists can update own pharmacy medications"
  ON medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      JOIN pharmacists ON pharmacists.pharmacy_id = pharmacies.id
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacies.id = medications.pharmacy_id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can delete own pharmacy medications" ON medications;
CREATE POLICY "Pharmacists can delete own pharmacy medications"
  ON medications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      JOIN pharmacists ON pharmacists.pharmacy_id = pharmacies.id
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacies.id = medications.pharmacy_id
    )
  );

-- Policies notifications (lecture / mise à jour pour la pharmacie liée)
DROP POLICY IF EXISTS "Pharmacists can view own pharmacy notifications" ON notifications;
CREATE POLICY "Pharmacists can view own pharmacy notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      JOIN pharmacists ON pharmacists.pharmacy_id = pharmacies.id
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacies.id = notifications.pharmacy_id
    )
  );

DROP POLICY IF EXISTS "Pharmacists can update own pharmacy notifications" ON notifications;
CREATE POLICY "Pharmacists can update own pharmacy notifications"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      JOIN pharmacists ON pharmacists.pharmacy_id = pharmacies.id
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacies.id = notifications.pharmacy_id
    )
  );
