// Mapping de la base de données existante
// Ce fichier permet d'adapter le code aux tables existantes dans ta BDD

// Configuration des tables existantes
export const TABLES = {
  // À adapter selon tes vraies tables
  USERS: 'users', // ou 'utilisateurs', 'app_users', etc.
  PHARMACIES: 'pharmacies', // ou 'pharmacy', 'pharmacie_list', etc.
  MEDICAMENTS: 'medicaments_suspects', // ou 'suspect_medicaments', 'suspicious_drugs', etc.
  NOTIFICATIONS: 'notifications' // ou 'alerts', 'messages', etc.
};

// Mapping des champs pour chaque table
export const FIELD_MAPPING = {
  [TABLES.USERS]: {
    // Adapter selon les vrais noms de colonnes
    id: 'id',
    name: 'name', // ou 'nom', 'username', 'full_name'
    surname: 'surname', // ou 'prenom', 'last_name', 'family_name'
    email: 'email', // ou 'mail', 'email_address'
    role: 'role', // ou 'user_role', 'type', 'category'
    statut: 'userState', // ou 'status', 'active', 'is_active'
    created_at: 'created_at', // ou 'date_creation', 'created_date'
  },
  [TABLES.PHARMACIES]: {
    id: 'id',
    nom: 'nom', // ou 'name', 'pharmacy_name'
    statut: 'statut', // ou 'status', 'state', 'is_active'
    gerant: 'gerant', // ou 'manager', 'owner', 'pharmacist'
    contact: 'contact', // ou 'phone', 'telephone'
    created_at: 'created_at'
  },
  [TABLES.MEDICAMENTS]: {
    id: 'id',
    nom: 'nom', // ou 'name', 'medicament_name'
    pharmacie: 'pharmacie', // ou 'pharmacy', 'pharmacy_name'
    scanneur: 'scanneur', // ou 'scanner', 'scanned_by'
    date: 'date', // ou 'scan_date', 'created_date'
    niveau: 'niveau', // ou 'risk_level', 'severity'
    created_at: 'created_at'
  },
  [TABLES.NOTIFICATIONS]: {
    id: 'id',
    type: 'type', // ou 'category', 'notification_type'
    titre: 'titre', // ou 'title', 'subject', 'message'
    message: 'message', // ou 'content', 'description'
    lu: 'lu', // ou 'read', 'is_read', 'viewed'
    date: 'date', // ou 'created_date', 'notification_date'
    created_at: 'created_at'
  }
};

// Fonction pour mapper les données selon la table
export function mapData(tableName, data) {
  if (!data || !FIELD_MAPPING[tableName]) return data;
  
  const mapping = FIELD_MAPPING[tableName];
  
  if (Array.isArray(data)) {
    return data.map(item => mapSingleItem(tableName, item));
  } else {
    return mapSingleItem(tableName, data);
  }
}

// Mapper un seul élément
function mapSingleItem(tableName, item) {
  const mapping = FIELD_MAPPING[tableName];
  const mapped = {};
  
  // Mapper les champs connus
  Object.keys(mapping).forEach(newField => {
    const oldField = mapping[newField];
    if (item[oldField] !== undefined) {
      mapped[newField] = item[oldField];
    }
  });
  
  // Conserver les champs non mappés
  Object.keys(item).forEach(key => {
    if (!Object.values(mapping).includes(key)) {
      mapped[key] = item[key];
    }
  });
  
  return mapped;
}

// Fonction pour mapper les requêtes (inverse)
export function mapFields(tableName, fields) {
  const mapping = FIELD_MAPPING[tableName];
  const mappedFields = [];
  
  fields.forEach(field => {
    const oldField = mapping[field];
    if (oldField) {
      mappedFields.push(oldField);
    } else {
      mappedFields.push(field);
    }
  });
  
  return mappedFields.join(', ');
}

// Export pour utilisation
export default {
  TABLES,
  FIELD_MAPPING,
  mapData,
  mapFields
};
