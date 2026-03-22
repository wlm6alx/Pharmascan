-- Schema Supabase pour PharmaScan - Espace Pharmacien

-- Table: pharmacists
CREATE TABLE IF NOT EXISTS pharmacists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'open', 'closed', 'busy')),
  is_on_duty BOOLEAN DEFAULT FALSE,
  attestation_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_pharmacists_user_id ON pharmacists(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacists_pharmacy_id ON pharmacists(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_pharmacist_id ON pharmacies(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);
CREATE INDEX IF NOT EXISTS idx_medications_pharmacy_id ON medications(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_medications_available ON medications(available);
CREATE INDEX IF NOT EXISTS idx_medications_barcode ON medications(barcode);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_pharmacists_updated_at BEFORE UPDATE ON pharmacists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Activer RLS sur toutes les tables
ALTER TABLE pharmacists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Policies pour pharmacists
-- Les pharmaciens peuvent voir et modifier leur propre profil
CREATE POLICY "Pharmacists can view own profile"
  ON pharmacists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Pharmacists can update own profile"
  ON pharmacists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Pharmacists can insert own profile"
  ON pharmacists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pour pharmacies
-- Les pharmaciens peuvent voir leur propre pharmacie
CREATE POLICY "Pharmacists can view own pharmacy"
  ON pharmacies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacists.pharmacy_id = pharmacies.id
    )
  );

-- Les pharmaciens peuvent créer leur pharmacie
CREATE POLICY "Pharmacists can create own pharmacy"
  ON pharmacies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacists.id = pharmacies.pharmacist_id
    )
  );

-- Les pharmaciens peuvent modifier leur propre pharmacie
CREATE POLICY "Pharmacists can update own pharmacy"
  ON pharmacies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pharmacists
      WHERE pharmacists.user_id = auth.uid()
      AND pharmacists.pharmacy_id = pharmacies.id
    )
  );

-- Policies pour medications
-- Les pharmaciens peuvent voir les médicaments de leur pharmacie
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

-- Les pharmaciens peuvent ajouter des médicaments à leur pharmacie
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

-- Les pharmaciens peuvent modifier les médicaments de leur pharmacie
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

-- Les pharmaciens peuvent supprimer les médicaments de leur pharmacie
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

