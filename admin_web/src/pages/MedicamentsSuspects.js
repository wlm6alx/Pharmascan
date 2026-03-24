import React, { useState } from 'react';
import Sidebar from '../components/sidebar';

const ROUGE  = '#e74c3c';
const ORANGE = '#f0a500';
const VERT   = '#4ecdc4';

const suspectsData = [
  { id: 1, nom: 'Ibuprofène 400mg',    pharmacie: 'Pharmacie Akwa',      date: '15/03/2026', scanneur: 'Alexander B.', niveau: 'Élevé'   },
  { id: 2, nom: 'Paracétamol 500mg',   pharmacie: 'Pharmacie NSIMEYONG', date: '14/03/2026', scanneur: 'Amina M.',     niveau: 'Moyen'   },
  { id: 3, nom: 'Amoxicilline 250mg',  pharmacie: 'Pharmacie Soleil',    date: '13/03/2026', scanneur: 'Jean M.',      niveau: 'Élevé'   },
  { id: 4, nom: 'Ventoline 100mcg',    pharmacie: 'Pharmacie YASSA',     date: '12/03/2026', scanneur: 'Rosette N.',   niveau: 'Faible'  },
  { id: 5, nom: 'Coartem 80/480mg',    pharmacie: 'Pharmacie Bonanjo',   date: '11/03/2026', scanneur: 'Marie E.',     niveau: 'Élevé'   },
  { id: 6, nom: 'Metformine 850mg',    pharmacie: 'Pharmacie NDOKOTI',   date: '10/03/2026', scanneur: 'Paul K.',      niveau: 'Moyen'   },
];

const niveauConfig = {
  'Élevé'  : { color: ROUGE,  bg: ROUGE  + '15', icon: '🔴' },
  'Moyen'  : { color: ORANGE, bg: ORANGE + '15', icon: '🟡' },
  'Faible' : { color: VERT,   bg: VERT   + '15', icon: '🟢' },
};

export default function MedicamentsSuspects() {
  const [search,  setSearch]  = useState('');
  const [filtre,  setFiltre]  = useState('Tous');
  const [liste,   setListe]   = useState(suspectsData);
  const [confirm, setConfirm] = useState(null);
  const [detail,  setDetail]  = useState(null);

  const filtered = liste.filter(m => {
    const matchSearch = m.nom.toLowerCase().includes(search.toLowerCase())
      || m.pharmacie.toLowerCase().includes(search.toLowerCase());
    const matchNiveau = filtre === 'Tous' || m.niveau === filtre;
    return matchSearch && matchNiveau;
  });

  const supprimer = (id) => {
    setListe(liste.filter(m => m.id !== id));
    setConfirm(null);
  };

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>💊 Médicaments suspects</h1>
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Rechercher un médicament..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span>🔔</span>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <StatCard icon="🔴" label="Niveau élevé"  value={liste.filter(m=>m.niveau==='Élevé').length}  color={ROUGE}  />
          <StatCard icon="🟡" label="Niveau moyen"  value={liste.filter(m=>m.niveau==='Moyen').length}  color={ORANGE} />
          <StatCard icon="🟢" label="Niveau faible" value={liste.filter(m=>m.niveau==='Faible').length} color={VERT}   />
          <StatCard icon="📊" label="Total signalés" value={liste.length}                               color="#555"   />
        </div>

        {/* Filtres */}
        <div style={styles.filtreRow}>
          {['Tous', 'Élevé', 'Moyen', 'Faible'].map(f => (
            <button
              key={f}
              style={{
                ...styles.filtreBtn,
                backgroundColor : filtre === f ? ROUGE : '#fff',
                color           : filtre === f ? '#fff' : '#555',
                border          : `1px solid ${filtre === f ? ROUGE : '#ddd'}`,
              }}
              onClick={() => setFiltre(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Tableau */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Médicament</th>
                <th style={styles.th}>Pharmacie signalante</th>
                <th style={styles.th}>Scanné par</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Niveau de risque</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const cfg = niveauConfig[m.niveau];
                return (
                  <tr key={m.id} style={styles.tr}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#222' }}>
                      💊 {m.nom}
                    </td>
                    <td style={styles.td}>{m.pharmacie}</td>
                    <td style={styles.td}>{m.scanneur}</td>
                    <td style={styles.td}>{m.date}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.niveauBadge,
                        backgroundColor : cfg.bg,
                        color           : cfg.color,
                        border          : `1px solid ${cfg.color}`,
                      }}>
                        {cfg.icon} {m.niveau}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionsCell}>
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#e8f4fd', color: '#3498db' }}
                          onClick={() => setDetail(m)}
                          title="Voir détails"
                        >
                          👁️
                        </button>
                        <button
                          style={{ ...styles.actionBtn, backgroundColor: '#fde8e8', color: ROUGE }}
                          onClick={() => setConfirm(m.id)}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={styles.empty}>Aucun médicament suspect trouvé.</p>
          )}
        </div>

        {/* Modal détail */}
        {detail && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>💊 {detail.nom}</h3>
              <div style={styles.detailGrid}>
                <DetailRow label="Pharmacie"    value={detail.pharmacie} />
                <DetailRow label="Scanné par"   value={detail.scanneur}  />
                <DetailRow label="Date"         value={detail.date}      />
                <DetailRow label="Niveau"       value={detail.niveau}    />
              </div>
              <div style={styles.detailAlert}>
                ⚠️ Ce médicament a été signalé comme suspect. Une vérification auprès des autorités sanitaires est recommandée.
              </div>
              <button style={styles.modalClose} onClick={() => setDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Modal confirmation suppression */}
        {confirm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <p style={styles.modalTitle}>🗑️ Supprimer ce signalement ?</p>
              <p style={styles.modalSub}>Cette action est irréversible.</p>
              <div style={styles.modalBtns}>
                <button style={styles.modalConfirm} onClick={() => supprimer(confirm)}>
                  Confirmer
                </button>
                <button style={styles.modalCancel} onClick={() => setConfirm(null)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <p style={{ ...styles.statValue, color }}>{value}</p>
        <p style={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailKey}>{label} :</span>
      <span style={styles.detailVal}>{value}</span>
    </div>
  );
}

const styles = {
  page           : { display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f4f0' },
  content        : { flex: 1, padding: '25px 30px', overflowY: 'auto' },
  header         : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title          : { fontSize: 22, fontWeight: 'bold', color: '#222', margin: 0 },
  headerRight    : { display: 'flex', alignItems: 'center', gap: 15 },
  searchBox      : { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 20, padding: '6px 14px', gap: 8 },
  searchInput    : { border: 'none', outline: 'none', fontSize: 13, width: 200, backgroundColor: 'transparent' },
  statsRow       : { display: 'flex', gap: 15, marginBottom: 20 },
  statCard       : { backgroundColor: '#fff', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', flex: 1 },
  statValue      : { fontSize: 24, fontWeight: 'bold', margin: 0 },
  statLabel      : { fontSize: 12, color: '#888', margin: 0 },
  filtreRow      : { display: 'flex', gap: 10, marginBottom: 20 },
  filtreBtn      : { padding: '7px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: '600' },
  tableContainer : { backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table          : { width: '100%', borderCollapse: 'collapse' },
  tableHead      : { backgroundColor: '#f8f8f8' },
  th             : { padding: '13px 16px', textAlign: 'left', fontSize: 12, fontWeight: '700', color: '#555', borderBottom: '2px solid #eee' },
  tr             : { borderBottom: '1px solid #f5f5f5' },
  td             : { padding: '12px 16px', fontSize: 13, color: '#444' },
  niveauBadge    : { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: '600' },
  actionsCell    : { display: 'flex', gap: 8 },
  actionBtn      : { border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 15 },
  empty          : { textAlign: 'center', padding: 30, color: '#aaa' },
  overlay        : { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal          : { backgroundColor: '#fff', borderRadius: 16, padding: '30px 40px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', minWidth: 360 },
  modalTitle     : { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  modalSub       : { fontSize: 13, color: '#888', marginBottom: 25 },
  modalBtns      : { display: 'flex', gap: 15, justifyContent: 'center' },
  modalConfirm   : { padding: '10px 30px', backgroundColor: ROUGE, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600' },
  modalCancel    : { padding: '10px 30px', backgroundColor: '#f0f0f0', color: '#444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600' },
  modalClose     : { marginTop: 20, padding: '10px 30px', backgroundColor: VERT, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600' },
  detailGrid     : { textAlign: 'left', marginBottom: 15 },
  detailRow      : { display: 'flex', gap: 10, marginBottom: 10 },
  detailKey      : { fontWeight: '600', color: '#555', width: 100, fontSize: 13 },
  detailVal      : { fontSize: 13, color: '#333' },
  detailAlert    : { backgroundColor: '#fff3cd', color: '#856404', padding: '12px', borderRadius: 8, fontSize: 13, textAlign: 'left', marginBottom: 10 },
};