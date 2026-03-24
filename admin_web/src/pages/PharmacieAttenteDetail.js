import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/sidebar';

const VERT = '#4ecdc4';

const attenteData = [
  { id: 1, nom: "Pharmacie d'Akwa",      gerant: 'M. MALTIN Albert',      contact: '+237 673847362' },
  { id: 2, nom: 'Pharmacie Soleil',       gerant: 'M. Cedric GILBERT',     contact: '+237 645783392' },
  { id: 3, nom: 'Pharmacie Health',       gerant: 'M. TANGY Délor',        contact: '+237 656387297' },
  { id: 4, nom: 'Pharmacie Couronne',     gerant: 'Mme DJUBOUTSI Hélène',  contact: '+237 648230185' },
  { id: 5, nom: 'Pharmacie La Réussite',  gerant: 'M. YUISSIN Espert',     contact: '+237 627183749' },
  { id: 6, nom: 'Pharmacie du repos',     gerant: 'M. ZANGUY Kerneu',      contact: '+237 683766755' },
  { id: 7, nom: 'Pharmacie Le Secret',    gerant: 'M. BARYUN Ingris',      contact: '+237 690784537' },
  { id: 8, nom: 'Pharmacie Saint Ignace', gerant: 'M. Ignace REUSSIN',     contact: '+237 623847297' },
];

export default function PharmacieAttenteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pharmacie = attenteData.find(p => p.id === parseInt(id));
  const [decision, setDecision] = useState(null);

  if (!pharmacie) return <div>Pharmacie introuvable.</div>;

  const handleValider = () => {
    setDecision('validé');
    setTimeout(() => navigate('/pharmacies-attente'), 1500);
  };

  const handleRefuser = () => {
    setDecision('refusé');
    setTimeout(() => navigate('/pharmacies-attente'), 1500);
  };

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backBtn} onClick={() => navigate('/pharmacies-attente')}>
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

        {/* Message de confirmation */}
        {decision && (
          <div style={{
            ...styles.alertBox,
            backgroundColor: decision === 'validé' ? '#d4edda' : '#f8d7da',
            color: decision === 'validé' ? '#155724' : '#721c24',
          }}>
            {decision === 'validé'
              ? '✅ Pharmacie validée avec succès ! Redirection...'
              : '❌ Pharmacie refusée. Redirection...'}
          </div>
        )}

        {/* Contenu principal */}
        <div style={styles.mainGrid}>

          {/* Colonne gauche */}
          <div style={styles.leftCol}>
            {/* Image pharmacie */}
            <div style={styles.pharmacieCard}>
              <div style={styles.pharmacieImage}>
                <span style={{ fontSize: 60 }}>🏥</span>
                <span style={styles.pharmacyLabel}>PHARMACY</span>
              </div>
              <p style={styles.pharmacieName}>{pharmacie.nom}</p>
            </div>

            {/* Infos pharmacie */}
            <div style={styles.infoCard}>
              <p style={styles.infoLabel}>Informations de la pharmacie</p>
              <div style={styles.infoRow}>
                <span style={styles.infoKey}>Adresse :</span>
                <span style={styles.infoVal}>Akwa, Douala</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoKey}>Ville :</span>
                <span style={styles.infoVal}>Douala</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoKey}>Horaires :</span>
                <span style={styles.infoVal}>7h - 22h</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoKey}>Statut :</span>
                <span style={{ ...styles.infoVal, color: '#f0a500' }}>En attente</span>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div style={styles.rightCol}>
            {/* Carte gérant */}
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

            {/* Document justificatif */}
            <div style={styles.documentCard}>
              <p style={styles.documentLabel}>📄 Document justificatif</p>
              <div style={styles.documentPlaceholder}>
                <span style={{ fontSize: 40 }}>📋</span>
                <p style={{ color: '#aaa', fontSize: 13 }}>Document en attente de vérification</p>
              </div>
            </div>
          </div>

        </div>

        {/* Boutons Valider / Refuser */}
        <div style={styles.actionsRow}>
          <button
            style={styles.validateBtn}
            onClick={handleValider}
            disabled={!!decision}
          >
            ✅ Valider
          </button>
          <button
            style={styles.refuseBtn}
            onClick={handleRefuser}
            disabled={!!decision}
          >
            ❌ Refuser
          </button>
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
  alertBox: { padding: '12px 20px', borderRadius: 8, marginBottom: 20, fontWeight: '600', fontSize: 14 },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 15 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 15 },
  pharmacieCard: { backgroundColor: '#4ecdc4', borderRadius: 16, overflow: 'hidden' },
  pharmacieImage: { height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  pharmacyLabel: { fontSize: 11, fontWeight: 'bold', color: '#fff', backgroundColor: '#2bb5aa', padding: '2px 8px', borderRadius: 4 },
  pharmacieName: { padding: '10px 15px', fontSize: 14, fontWeight: '600', color: '#fff', margin: 0 },
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
  actionsRow: { display: 'flex', gap: 20, justifyContent: 'center', marginTop: 10 },
  validateBtn: { padding: '12px 50px', backgroundColor: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: '600', cursor: 'pointer' },
  refuseBtn: { padding: '12px 50px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: '600', cursor: 'pointer' },
};