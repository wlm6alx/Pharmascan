import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import { supabase } from '../supabase';

const VERT = '#4ecdc4';

export default function PharmaciesAttente() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [attenteData, setAttenteData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction pour récupérer les pharmacies en attente depuis Supabase
  const fetchPharmaciesAttente = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAttenteData(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des pharmacies en attente:', err);
      setError('Impossible de charger les pharmacies en attente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmaciesAttente();
  }, []);

  const filtered = attenteData.filter(p =>
    p.nom && p.nom.toLowerCase().includes(search.toLowerCase())
  );

  const handleSupprimer = async (e, id) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('pharmacies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setAttenteData(attenteData.filter(p => p.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <Sidebar />
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <p>Chargement des pharmacies en attente...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <Sidebar />
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <p>❌ {error}</p>
            <button style={styles.retryBtn} onClick={fetchPharmaciesAttente}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              {filtered.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <p>📋 Aucune pharmacie en attente de validation</p>
                  <p style={styles.emptySub}>Les nouvelles demandes apparaîtront ici</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    style={styles.tr}
                    onClick={() => navigate(`/pharmacies-attente/${p.id}`)}
                  >
                    <td style={{ ...styles.td, color: VERT, fontWeight: '600', cursor: 'pointer' }}>
                      {p.nom}
                    </td>
                    <td style={styles.td}>{p.gerant || 'Non spécifié'}</td>
                    <td style={styles.td}>{p.contact || 'Non spécifié'}</td>
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
                ))
              )}
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
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    gap: 20,
  },
  retryBtn: {
    padding: '10px 20px',
    backgroundColor: VERT,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    color: '#999',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 8,
  },
};