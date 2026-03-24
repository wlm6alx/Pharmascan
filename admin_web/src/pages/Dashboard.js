import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

// ─── Données factices (à remplacer par Supabase plus tard) ───
const evolutionData = [
  { date: '29 Oct', patients: 80,  pharmaciesOuvertes: 100, pharmaciesTotales: 90  },
  { date: '01 Nov', patients: 100, pharmaciesOuvertes: 105, pharmaciesTotales: 95  },
  { date: '05 Nov', patients: 120, pharmaciesOuvertes: 110, pharmaciesTotales: 100 },
  { date: '09 Nov', patients: 140, pharmaciesOuvertes: 112, pharmaciesTotales: 105 },
  { date: '13 Nov', patients: 160, pharmaciesOuvertes: 115, pharmaciesTotales: 110 },
  { date: '17 Nov', patients: 190, pharmaciesOuvertes: 118, pharmaciesTotales: 115 },
  { date: '21 Nov', patients: 220, pharmaciesOuvertes: 120, pharmaciesTotales: 120 },
  { date: '25 Nov', patients: 250, pharmaciesOuvertes: 125, pharmaciesTotales: 125 },
];

const scanData = [
  { mois: 'Oct', authentiques: 320, suspects: 45 },
  { mois: 'Nov', authentiques: 410, suspects: 30 },
  { mois: 'Déc', authentiques: 390, suspects: 55 },
  { mois: 'Jan', authentiques: 480, suspects: 25 },
  { mois: 'Fév', authentiques: 520, suspects: 40 },
  { mois: 'Mar', authentiques: 600, suspects: 20 },
];

const recentActions = [
  { id: 1, type: 'Pharmacie',  action: 'Nouvelle inscription',   nom: 'Pharmacie Akwa',        statut: 'En attente', couleur: '#f0a500' },
  { id: 2, type: 'Scan',      action: 'Médicament suspect',      nom: 'Ibuprofène 400mg',      statut: 'Alerte',     couleur: '#e74c3c' },
  { id: 3, type: 'Pharmacie', action: 'Compte validé',           nom: 'Pharmacie Bonanjo',     statut: 'Validé',     couleur: '#2ecc71' },
  { id: 4, type: 'Patient',   action: 'Nouveau compte',          nom: 'Patient #1284',         statut: 'Actif',      couleur: '#2ecc71' },
  { id: 5, type: 'Scan',      action: 'Médicament authentique',  nom: 'Paracétamol 500mg',     statut: 'OK',         couleur: '#2ecc71' },
];

// ─── Couleurs ───
const VERT    = '#4ecdc4';
const ORANGE  = '#f0a500';
const ROUGE   = '#e74c3c';
const BG      = '#f0f4f0';

export default function Dashboard() {
  const navigate = useNavigate();

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
            value="430"
            icon="👥"
            color={ORANGE}
            sous="+12 cette semaine"
          />
          <StatCard
            title="Pharmacies"
            value="148"
            icon="🏥"
            color={VERT}
            sous="dont 120 actives"
          />
          <StatCard
            title="Comptes pharmacien"
            value="234"
            icon="👨‍⚕️"
            color="#3498db"
            sous="+5 ce mois"
          />
          <StatCard
            title="Scans aujourd'hui"
            value="87"
            icon="📷"
            color="#9b59b6"
            sous="3 suspects détectés"
          />
        </div>

        {/* ── Graphiques ── */}
        <div style={styles.chartsRow}>

          {/* Graphique 1 — Évolution */}
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>
              📈 Statistique d'évolution (30 derniers jours)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke={ORANGE}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Patients connectés"
                />
                <Line
                  type="monotone"
                  dataKey="pharmaciesOuvertes"
                  stroke={VERT}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Pharmacies ouvertes"
                />
                <Line
                  type="monotone"
                  dataKey="pharmaciesTotales"
                  stroke="#3498db"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Pharmacies totales"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique 2 — Scans */}
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>
              💊 Scans médicaments (6 derniers mois)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="authentiques" fill={VERT}   name="Authentiques" radius={[4,4,0,0]} />
                <Bar dataKey="suspects"     fill={ROUGE}  name="Suspects"     radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
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
            {['Pharmacie Bali', 'Pharmacie Logpom', 'Pharmacie Omnisport'].map((nom, i) => (
              <div key={i} style={styles.pendingCard}>
                <span style={styles.pendingIcon}>🏥</span>
                <div style={{ flex: 1 }}>
                  <p style={styles.pendingName}>{nom}</p>
                  <p style={styles.pendingDate}>Inscrite il y a {i + 1} jour(s)</p>
                </div>
                <button
                  style={styles.validateBtn}
                  onClick={() => navigate('/pharmacies-attente')}
                >
                  Voir
                </button>
              </div>
            ))}
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
};