import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function PharmaciesAttente() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [liste, setListe] = useState(attenteData);

  const filtered = liste.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  const handleSupprimer = (e, id) => {
    e.stopPropagation(); // empêche le clic de naviguer
    setListe(liste.filter(p => p.id !== id));
  };

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Pharmacies en attente</h1>
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

        {/* Tableau */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Nom de pharmacie</th>
                <th style={styles.th}>Nom du gérant</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  style={styles.tr}
                  onClick={() => navigate(`/pharmacies-attente/${p.id}`)}
                >
                  <td style={{ ...styles.td, color: VERT, fontWeight: '600', cursor: 'pointer' }}>
                    {p.nom}
                  </td>
                  <td style={styles.td}>{p.gerant}</td>
                  <td style={styles.td}>{p.contact}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {/* Bouton modifier */}
                      <button
                        style={styles.editBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pharmacies-attente/${p.id}`);
                        }}
                        title="Voir détails"
                      >
                        ✏️
                      </button>
                      {/* Bouton supprimer */}
                      <button
                        style={styles.deleteBtn}
                        onClick={(e) => handleSupprimer(e, p.id)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p style={styles.empty}>Aucune pharmacie en attente.</p>
          )}
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
  tableContainer: { backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#f8f8f8' },
  th: { padding: '14px 18px', textAlign: 'left', fontSize: 13, fontWeight: '700', color: '#444', borderBottom: '2px solid #eee' },
  tr: { borderBottom: '1px solid #f5f5f5', transition: 'background 0.15s', cursor: 'pointer' },
  td: { padding: '13px 18px', fontSize: 13, color: '#444' },
  actions: { display: 'flex', gap: 10 },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  empty: { textAlign: 'center', padding: 30, color: '#aaa' },
};