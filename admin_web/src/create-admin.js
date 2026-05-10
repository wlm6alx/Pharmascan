// Script pour créer un admin de test
// Exécute ce script dans la console du navigateur sur la page de login

import authService from './services/auth';

async function createTestAdmin() {
  console.log('👨‍💼 Création de l\'admin de test...');
  
  const result = await authService.createAdminUser(
    'admin@pharmascan.cm',  // Email
    'admin123',             // Mot de passe
    'Admin',                // Nom
    'System'                // Prénom
  );
  
  if (result.success) {
    console.log('✅ Admin créé avec succès:', result.data);
    console.log('📧 Email: admin@pharmascan.cm');
    console.log('🔑 Mot de passe: admin123');
    console.log('🎯 Tu peux maintenant te connecter avec ces identifiants!');
  } else {
    console.error('❌ Erreur création admin:', result.error);
  }
}

// Fonction pour exécuter dans la console
window.createTestAdmin = createTestAdmin;

console.log('📝 Pour créer un admin de test, exécute: createTestAdmin()');
