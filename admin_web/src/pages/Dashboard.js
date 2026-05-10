import React, { useEffect, useState } from 'react';
import Sidebar from '../components/sidebar';
import { testSupabaseConnection, testPharmaciesData } from '../test-supabase';
import { supabase } from '../supabase';
import { TABLES, mapData } from '../database-mapper';

// ─── Couleurs ───
const VERT    = '#4ecdc4';
const ORANGE  = '#f0a500';
const BG      = '#f0f4f0';

export default function Dashboard() {
  const [connectionStatus, setConnectionStatus] = useState('Test en cours...');
  const [loading, setLoading] = useState(true);
  
  // Données factices - à remplacer par Supabase
  const [recentActions, setRecentActions] = useState([]);
  const [statsData, setStatsData] = useState({
    patients: 0,
    pharmacies: 0,
    pharmaciens: 0,
    scansToday: 0
  });
  
  // Fonctions pour récupérer les données depuis Supabase
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les statistiques principales
      const { data: stats, error: statsError } = await supabase
        .from('users')
        .select('role', { count: 'exact' });
      
      if (statsError) throw statsError;
      
      // Calculer les statistiques
      const patientsCount = stats?.filter(u => u.role === 'patient').length || 0;
      const pharmaciensCount = stats?.filter(u => u.role === 'pharmacien').length || 0;
      
      setStatsData({
        patients: patientsCount,
        pharmacies: 0, // À implémenter avec table pharmacies
        pharmaciens: pharmaciensCount,
        scansToday: 0 // À implémenter avec table scans
      });
      
      // Récupérer l'activité récente
      const { data: activities, error: activitiesError } = await supabase
        .from('users')
        .select('name, surname, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activitiesError) throw activitiesError;
      
      // Transformer en format d'activité
      const formattedActivities = activities?.map(user => ({
        id: user.id,
        type: 'Utilisateur',
        action: `Nouveau ${user.role}`,
        nom: `${user.name} ${user.surname || ''}`,
        statut: 'Actif',
        couleur: '#2ecc71'
      })) || [];
      
      setRecentActions(formattedActivities);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setConnectionStatus('❌ Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Tester la connexion à Supabase au chargement du dashboard
    const testConnection = async () => {
      try {
        const isConnected = await testSupabaseConnection();
        setConnectionStatus(isConnected ? '✅ Connecté à Supabase' : '❌ Erreur de connexion');
        
        if (isConnected) {
          await fetchDashboardData();
        }
        
        // Tester la récupération des données
        const pharmaciesResult = await testPharmaciesData();
        console.log('Résultat pharmacies:', pharmaciesResult);
      } catch (error) {
        setConnectionStatus('❌ Erreur de test');
        console.error('Erreur de test:', error);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.welcome}>Bienvenue, Administrateur</h1>
            <p style={styles.date}>{new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}</p>
            <p style={styles.connectionStatus}>{connectionStatus}</p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span>🔍</span>
              <input style={styles.searchInput} placeholder="Rechercher..." />
            </div>
            <span style={styles.bell}>🔔</span>
          </div>
        </div>

        {/* ── Cartes statistiques ── */}
        <div style={styles.cardsRow}>
          <StatCard
            title="Patients inscrits"
            value={statsData.patients.toString()}
            icon="👥"
            color={ORANGE}
            sous="Inscrits"
          />
          <StatCard
            title="Pharmacies"
            value={statsData.pharmacies.toString()}
            icon="🏥"
            color={VERT}
            sous="Enregistrées"
          />
          <StatCard
            title="Comptes pharmacien"
            value={statsData.pharmaciens.toString()}
            icon="👨‍⚕️"
            color="#3498db"
            sous="Actifs"
          />
          <StatCard
            title="Scans aujourd'hui"
            value={statsData.scansToday.toString()}
            icon="📷"
            color="#9b59b6"
            sous="Scans"
          />
        </div>

        {/* ── Graphiques ── */}
        <div style={styles.chartsRow}>

          {/* Graphique 1 — Évolution */}
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>
              📈 Statistique d'évolution (30 derniers jours)
            </h3>
            <div style={styles.emptyChart}>
              <p>📊 Données en cours de chargement...</p>
              <p style={styles.emptySub}>Les graphiques seront disponibles une fois les données collectées</p>
            </div>
          </div>

          {/* Graphique 2 — Scans */}
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>
              💊 Scans médicaments (6 derniers mois)
            </h3>
            <div style={styles.emptyChart}>
              <p>📊 Données en cours de chargement...</p>
              <p style={styles.emptySub}>Les graphiques seront disponibles une fois les données collectées</p>
            </div>
          </div>

        </div>

        {/* ── Activité récente + Pharmacies en attente ── */}
        <div style={styles.bottomRow}>

          {/* Activité récente */}
          <div style={styles.tableBox}>
            <h3 style={styles.chartTitle}>🕐 Activité récente</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentActions.map((row) => (
                  <tr key={row.id} style={styles.tableRow}>
                    <td style={styles.td}>{row.type}</td>
                    <td style={styles.td}>{row.action}</td>
                    <td style={styles.td}>{row.nom}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: row.couleur + '22',
                        color: row.couleur,
                        border: `1px solid ${row.couleur}`,
                      }}>
                        {row.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pharmacies en attente */}
          <div style={{ ...styles.tableBox, maxWidth: 280 }}>
            <h3 style={styles.chartTitle}>⏳ En attente de validation</h3>
            <div style={styles.emptyChart}>
              <p>📋 Aucune pharmacie en attente</p>
              <p style={styles.emptySub}>Les nouvelles demandes apparaîtront ici</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── Composant carte stat ───
function StatCard({ title, value, icon, color, sous }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLeft}>
        <p style={styles.cardTitle}>{title}</p>
        <p style={{ ...styles.cardValue, color }}>{value}</p>
        <p style={styles.cardSous}>{sous}</p>
      </div>
      <div style={{ ...styles.cardIcon, backgroundColor: color + '22' }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>
    </div>
  );
}

// ─── Styles ───
const styles = {
  page: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: BG,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: '25px 30px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    margin: 0,
  },
  date: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: 20,
    padding: '6px 14px',
    gap: 8,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 13,
    width: 160,
    backgroundColor: 'transparent',
  },
  bell: {
    fontSize: 22,
    cursor: 'pointer',
  },
  cardsRow: {
    display: 'flex',
    gap: 15,
    marginBottom: 25,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 13,
    color: '#666',
    margin: 0,
    marginBottom: 6,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 0,
  },
  cardSous: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartsRow: {
    display: 'flex',
    gap: 15,
    marginBottom: 25,
  },
  chartBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 0,
  },
  bottomRow: {
    display: 'flex',
    gap: 15,
  },
  tableBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f8f8f8',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    borderBottom: '1px solid #eee',
  },
  tableRow: {
    borderBottom: '1px solid #f5f5f5',
  },
  td: {
    padding: '10px 12px',
    fontSize: 13,
    color: '#444',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '600',
  },
  pendingCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  pendingIcon: {
    fontSize: 24,
  },
  pendingName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  pendingDate: {
    fontSize: 11,
    color: '#aaa',
    margin: 0,
  },
  validateBtn: {
    padding: '5px 12px',
    backgroundColor: VERT,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  connectionStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontWeight: '500',
  },
  emptyChart: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 220,
    color: '#999',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 8,
  },
};