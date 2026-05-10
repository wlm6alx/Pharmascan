import { supabase } from './supabase';

// Test de connexion à Supabase
async function testSupabaseConnection() {
  try {
    console.log('=== DIAGNOSTIC CONNEXION SUPABASE ===');
    console.log('1. Variables d\'environnement:');
    console.log('   URL:', process.env.REACT_APP_SUPABASE_URL);
    console.log('   KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ Présente' : '❌ Manquante');
    
    // Vérification des variables
    if (!process.env.REACT_APP_SUPABASE_URL) {
      console.error('❌ URL Supabase manquante');
      return false;
    }
    
    if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.error('❌ Clé Supabase manquante');
      return false;
    }
    
    console.log('2. Test de connexion client Supabase...');
    
    // Test simple de connexion en vérifiant l'authentification
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erreur de connexion auth:', error.message);
      console.error('   Code erreur:', error.code);
      console.error('   Détails:', error.details);
      return false;
    }
    
    console.log('✅ Connexion auth réussie!');
    console.log('   Session:', data);
    
    // Test de connexion à la base de données
    console.log('3. Test de connexion base de données...');
    console.log('3.1. Vérification des tables existantes...');
    
    // Lister les tables disponibles
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (tablesError) {
        console.error('❌ Erreur listing tables:', tablesError.message);
      } else {
        console.log('✅ Tables trouvées dans public:', tables.map(t => t.table_name));
        
        // Tester chaque table pour voir si elle est accessible
        for (const table of tables) {
          try {
            const { data: testTable, error: testError } = await supabase
              .from(table.table_name)
              .select('*')
              .limit(1);
            
            if (testError) {
              console.log(`❌ Table ${table.table_name}: ${testError.message}`);
            } else {
              console.log(`✅ Table ${table.table_name}: Accessible`);
            }
          } catch (err) {
            console.log(`❌ Table ${table.table_name}: Erreur générale`);
          }
        }
      }
    } catch (err) {
      console.error('❌ Erreur générale listing tables:', err.message);
    }
    
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erreur de connexion BDD:', testError.message);
      console.error('   Code erreur:', testError.code);
      console.error('   Détails:', testError.details);
      return false;
    }
    
    console.log('✅ Connexion base de données réussie!');
    return true;
    
  } catch (err) {
    console.error('❌ Erreur générale lors du test:', err);
    console.error('   Type:', err.constructor.name);
    console.error('   Message:', err.message);
    return false;
  }
}

// Test de récupération des données (exemple: pharmacies)
async function testPharmaciesData() {
  try {
    console.log('=== TEST RÉCUPÉRATION DONNÉES ===');
    console.log('Test de récupération des pharmacies...');
    
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des pharmacies:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Détails:', error.details);
      console.error('   Table existe?', error.message.includes('relation') ? '❌ Non' : '✅ Oui mais autre erreur');
      return { success: false, error: error.message };
    }
    
    console.log('✅ Pharmacies récupérées:', data);
    console.log('   Nombre:', data.length);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erreur générale lors du test pharmacies:', err);
    console.error('   Type:', err.constructor.name);
    console.error('   Message:', err.message);
    return { success: false, error: err.message };
  }
}

// Export pour utilisation dans le dashboard ou autre composant
export { testSupabaseConnection, testPharmaciesData };
