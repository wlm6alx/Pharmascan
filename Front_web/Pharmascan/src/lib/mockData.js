// Données mockées pour le mode démo (sans Supabase)

export const mockUser = {
  id: 'demo-user-123',
  email: 'pharmacien@demo.com',
  created_at: new Date().toISOString(),
}

export const mockPharmacy = {
  id: 'demo-pharmacy-123',
  name: 'Pharmacie Centrale',
  address: 'Yaoundé - Cameroun - Avenue Kennedy - Réf: face au marché',
  phone: '+237 6XX XXX XXX',
  email: 'pharmacien@demo.com',
  status: 'approved',
  operational_status: 'open',
  is_on_duty: true,
  owner_name: 'Jean Dupont',
  license_number: 'AGR-CM-12345',
  country: 'CM',
  phone_code: '+237',
  city: 'Yaoundé',
  street: 'Avenue Kennedy',
  address_reference: 'face au marché',
  attestation_url: null,
  photo_url: null,
}

export const mockMedications = [
  {
    id: '1',
    name: 'Paracétamol 500mg',
    category: 'analgésique',
    dosage: '500mg',
    form: 'comprimé',
    manufacturer: 'Laboratoire X',
    barcode: '5901234123457',
    quantity: 150,
    available: true,
    expiration_date: '2025-12-31',
  },
  {
    id: '2',
    name: 'Ibuprofène 400mg',
    category: 'anti-inflammatoire',
    dosage: '400mg',
    form: 'comprimé',
    manufacturer: 'Laboratoire Y',
    barcode: '4006381333931',
    quantity: 80,
    available: true,
    expiration_date: '2025-11-30',
  },
  {
    id: '3',
    name: 'Amoxicilline 500mg',
    category: 'antibiotique',
    dosage: '500mg',
    form: 'gélule',
    manufacturer: 'Laboratoire Z',
    barcode: '9780201379624',
    quantity: 5,
    available: true,
    expiration_date: '2025-10-15',
  },
  {
    id: '4',
    name: 'Loratadine 10mg',
    category: 'antihistamique',
    dosage: '10mg',
    form: 'comprimé',
    manufacturer: 'Laboratoire W',
    barcode: '3614272048591',
    quantity: 0,
    available: false,
    expiration_date: null,
  },
]

export const mockNotifications = [
  { id: '1', description: 'Nouveau médicament ajouté', created_at: new Date().toISOString(), read: false },
  { id: '2', description: 'Stock faible détecté', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), read: false },
  { id: '3', description: 'Commande reçue', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), read: false },
  { id: '4', description: 'Rappel: Vérifier les dates d\'expiration', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), read: true },
  { id: '5', description: 'Nouveau client enregistré', created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), read: true },
  { id: '6', description: 'Mise à jour du système disponible', created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), read: true },
]

// Stockage local pour simuler la base de données
export const mockStorage = {
  user: null,
  pharmacy: mockPharmacy,
  medications: [...mockMedications],
  notifications: [...mockNotifications],
}

