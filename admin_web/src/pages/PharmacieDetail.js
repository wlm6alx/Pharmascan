import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/sidebar';

const pharmaciesData = [
  { id: 1, nom: 'Pharmacie de New-Bell',  statut: 'Ouverte', gerant: 'M. EDWARD Thierry',  contact: '+237 694837262' },
  { id: 2, nom: 'Pharmacie NSIMEYONG',    statut: 'Fermée',  gerant: 'M. TANGY Délor',     contact: '+237 656387297' },
  { id: 3, nom: 'Pharmacie de YASSA',     statut: 'Ouverte', gerant: 'M. BARYUN Ingris',   contact: '+237 690784537' },
  { id: 4, nom: 'Pharmacie NDOKOTI',      statut: 'Fermée',  gerant: 'Mme DJUBOUTSI H.',   contact: '+237 648230185' },
  { id: 5, nom: 'Pharmacie Bonanjo',      statut: 'Ouverte', gerant: 'M. YUISSIN Espert',  contact: '+237 627183749' },
  { id: 6, nom: 'Pharmacie Akwa Centre',  statut: 'Ouverte', gerant: 'M. ZANGUY Kerneu',   contact: '+237 683766755' },
];

export default function PharmacieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pharmacie = pharmaciesData.find(p => p.id === parseInt(id));

  if (!pharmacie) return <div>Pharmacie introuvable.</div>;

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backBtn} onClick={() => navigate('/pharmacies')}>
              ← Retour
            </button>
            <h1 style={styles.title}>Nom de la Pharmacie</h1>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span>🔍</span>
              <input style={styles.searchInput} placeholder="Rechercher..." />
            </div>
            <span>🔔</span>
          </div>
        </div>

        {/* Contenu principal */}
        <div style={styles.mainGrid}>

          {/* Colonne gauche */}
          <div style={styles.leftCol}>
            <div style={styles.pharmacieCard}>
              <div style={styles.pharmacieImage}>
                <span style={{ fontSize: 60 }}>🏥</span>
                <span style={styles.pharmacyLabel}>PHARMACY</span>
              </div>
              <p style={styles.pharmacieName}>{pharmacie.nom}</p>
              <p style={{
                ...styles.pharmacieStatut,
                color: pharmacie.statut === 'Ouverte' ? '#2ecc71' : '#e74c3c'
              }}>
                {pharmacie.statut}
              </p>
            </div>

            <div style={styles.infoCard}>
              <p style={styles.infoLabel}>Informations de la pharmacie</p>
              <div style={styles.infoRow}><span style={styles.infoKey}>Adresse :</span><span style={styles.infoVal}>Douala, Cameroun</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>Ville :</span><span style={styles.infoVal}>Douala</span></div>
              <div style={styles.infoRow}><span style={styles.infoKey}>Horaires :</span><span style={styles.infoVal}>7h - 22h</span></div>
              <div style={styles.infoRow}>
                <span style={styles.infoKey}>Statut :</span>
                <span style={{ ...styles.infoVal, color: pharmacie.statut === 'Ouverte' ? '#2ecc71' : '#e74c3c' }}>
                  {pharmacie.statut}
                </span>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div style={styles.rightCol}>
            <div style={styles.gerantCard}>
              <div style={styles.gerantBadge}>
                <span style={{ fontSize: 30 }}>🏅</span>
                <div>
                  <p style={styles.gerantBadgeTitle}>Conseil central de la section 0</p>
                  <p style={styles.gerantBadgeSubtitle}>PHARMACIENS ADJOINTS D'OFFICINE ET AUTRES EXERCICES</p>
                </div>
                <span style={{ fontSize: 30 }}>➕</span>
              </div>
              <p style={styles.gerantName}>{pharmacie.gerant}</p>
              <p style={styles.gerantContact}>Contact : {pharmacie.contact}</p>
            </div>

            <div style={styles.documentCard}>
              <p style={styles.documentLabel}>📄 Document justificatif</p>
              <div style={styles.documentPlaceholder}>
                <span style={{ fontSize: 40 }}>📋</span>
                <p style={{ color: '#aaa', fontSize: 13 }}>Document vérifié ✅</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f4f0' },
  content: { flex: 1, padding: '25px 30px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 15 },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#4ecdc4', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 15 },
  searchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 20, padding: '6px 14px', gap: 8 },
  searchInput: { border: 'none', outline: 'none', fontSize: 13, width: 160, backgroundColor: 'transparent' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 15 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 15 },
  pharmacieCard: { backgroundColor: '#4ecdc4', borderRadius: 16, overflow: 'hidden' },
  pharmacieImage: { height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  pharmacyLabel: { fontSize: 11, fontWeight: 'bold', color: '#fff', backgroundColor: '#2bb5aa', padding: '2px 8px', borderRadius: 4 },
  pharmacieName: { padding: '8px 15px 2px', fontSize: 14, fontWeight: '600', color: '#fff', margin: 0 },
  pharmacieStatut: { padding: '0 15px 10px', fontSize: 13, fontWeight: '500', margin: 0 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 12, marginTop: 0 },
  infoRow: { display: 'flex', gap: 10, marginBottom: 8 },
  infoKey: { fontSize: 13, fontWeight: '600', color: '#555', width: 80 },
  infoVal: { fontSize: 13, color: '#333' },
  gerantCard: { backgroundColor: '#4ecdc4', borderRadius: 12, padding: '18px 20px' },
  gerantBadge: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 8, padding: '10px', marginBottom: 12 },
  gerantBadgeTitle: { fontSize: 10, color: '#555', margin: 0 },
  gerantBadgeSubtitle: { fontSize: 11, fontWeight: 'bold', color: '#333', margin: 0 },
  gerantName: { fontSize: 15, fontWeight: 'bold', color: '#fff', margin: 0, marginBottom: 5 },
  gerantContact: { fontSize: 13, color: '#e0f7f6', margin: 0 },
  documentCard: { backgroundColor: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1 },
  documentLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 12, marginTop: 0 },
  documentPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, backgroundColor: '#f8f8f8', borderRadius: 8 },
};