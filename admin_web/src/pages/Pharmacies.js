import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';

const VERT = '#4ecdc4';

// Données factices
const pharmaciesData = [
  { id: 1, nom: 'Pharmacie de New-Bell',   statut: 'Ouverte', gerant: 'M. EDWARD Thierry',  contact: '+237 694837262' },
  { id: 2, nom: 'Pharmacie NSIMEYONG',     statut: 'Fermée',  gerant: 'M. TANGY Délor',     contact: '+237 656387297' },
  { id: 3, nom: 'Pharmacie de YASSA',      statut: 'Ouverte', gerant: 'M. BARYUN Ingris',   contact: '+237 690784537' },
  { id: 4, nom: 'Pharmacie NDOKOTI',       statut: 'Fermée',  gerant: 'Mme DJUBOUTSI H.',   contact: '+237 648230185' },
  { id: 5, nom: 'Pharmacie Bonanjo',       statut: 'Ouverte', gerant: 'M. YUISSIN Espert',  contact: '+237 627183749' },
  { id: 6, nom: 'Pharmacie Akwa Centre',   statut: 'Ouverte', gerant: 'M. ZANGUY Kerneu',   contact: '+237 683766755' },
];

export default function Pharmacies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = pharmaciesData.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Pharmacies de PharmaScan</h1>
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span style={styles.bell}>🔔</span>
          </div>
        </div>

        {/* Grille */}
        <div style={styles.grid}>
          {filtered.map((p) => (
            <div
              key={p.id}
              style={styles.card}
              onClick={() => navigate(`/pharmacies/${p.id}`)}
            >
              {/* Image pharmacie */}
              <div style={styles.cardImage}>
                <span style={styles.pharmacyIcon}>🏥</span>
                <span style={styles.pharmacyLabel}>PHARMACY</span>
              </div>

              {/* Infos */}
              <div style={styles.cardInfo}>
                <p style={styles.cardName}>{p.nom}</p>
                <p style={{
                  ...styles.cardStatut,
                  color: p.statut === 'Ouverte' ? '#2ecc71' : '#e74c3c'
                }}>
                  {p.statut}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f4f0' },
  content: { flex: 1, padding: '25px 30px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 15 },
  searchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 20, padding: '6px 14px', gap: 8 },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, width: 160, backgroundColor: 'transparent' },
  bell: { fontSize: 22, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 },
  card: {
    backgroundColor: VERT,
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardImage: {
    backgroundColor: VERT,
    height: 140,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pharmacyIcon: { fontSize: 60 },
  pharmacyLabel: { fontSize: 11, fontWeight: 'bold', color: '#fff', backgroundColor: '#2bb5aa', padding: '2px 8px', borderRadius: 4, marginTop: 5 },
  cardInfo: { backgroundColor: '#fff', padding: '10px 14px' },
  cardName: { fontSize: 13, fontWeight: '600', color: '#333', margin: 0, marginBottom: 3 },
  cardStatut: { fontSize: 12, margin: 0, fontWeight: '500' },
};