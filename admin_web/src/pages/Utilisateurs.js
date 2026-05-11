import React, { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar';
import { supabase } from '../supabase';

const VERT  = '#4ecdc4';
const ROUGE = '#e74c3c';

export default function Utilisateurs() {
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('Tous');
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Fonction pour récupérer les utilisateurs depuis Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début récupération utilisateurs...');
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, surname, email, role, userState, created_at')
        .order('created_at', { ascending: false });
      
      console.log('📊 Résultat requête utilisateurs:', { data, error });
      
      if (error) {
        console.error('❌ Erreur Supabase utilisateurs:', error);
        throw error;
      }
      
      console.log('✅ Utilisateurs chargés:', data?.length || 0, 'utilisateurs');
      setUsersData(data || []);
    } catch (err) {
      console.error('❌ Erreur catch utilisateurs:', err);
      setError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtrage
  const filtered = usersData.filter(u => {
    const fullName = u.name && u.surname ? `${u.name} ${u.surname}` : u.name || '';
    const matchSearch = fullName && u.email && (
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );
    const matchRole = filtre === 'Tous' || u.role === filtre;
    return matchSearch && matchRole;
  });

  // Bloquer / débloquer
  const toggleStatut = async (id) => {
    try {
      const user = usersData.find(u => u.id === id);
      const { error } = await supabase
        .from('users')
        .update({ userState: !user.userState })
        .eq('id', id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setUsersData(usersData.map(u =>
        u.id === id ? { ...u, userState: !u.userState } : u
      ));
      setConfirm(null);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
    }
  };

  // Supprimer
  const supprimer = async (id) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setUsersData(usersData.filter(u => u.id !== id));
      setConfirm(null);
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
            <p>Chargement des utilisateurs...</p>
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
            <button style={styles.retryBtn} onClick={fetchUsers}>
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
          <h1 style={styles.title}>Gestion des utilisateurs</h1>
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span>🔔</span>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div style={styles.statsRow}>
          <StatPill label="Total"      value={usersData.length}                                      color="#555"  />
          <StatPill label="Patients"   value={usersData.filter(u => u.role==='patient').length}      color={VERT}  />
          <StatPill label="Pharmaciens"value={usersData.filter(u => u.role==='pharmacien').length}   color="#3498db"/>
          <StatPill label="Bloqués"    value={usersData.filter(u => !u.userState).length}               color={ROUGE} />
        </div>

        {/* Filtres par rôle */}
        <div style={styles.filtreRow}>
          {['Tous', 'patient', 'pharmacien'].map(f => (
            <button
              key={f}
              style={{
                ...styles.filtreBtn,
                backgroundColor : filtre === f ? VERT : '#fff',
                color           : filtre === f ? '#fff' : '#555',
                border          : `1px solid ${filtre === f ? VERT : '#ddd'}`,
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
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Rôle</th>
                <th style={styles.th}>Date inscription</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>{(u.name || '')[0]}</div>
                      {u.name} {u.surname || ''}
                    </div>
                  </td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.roleBadge,
                      backgroundColor : u.role === 'pharmacien' ? '#3498db22' : VERT + '22',
                      color           : u.role === 'pharmacien' ? '#3498db'   : VERT,
                      border          : `1px solid ${u.role === 'pharmacien' ? '#3498db' : VERT}`,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={styles.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : ''}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statutBadge,
                      backgroundColor : u.userState ? '#2ecc7122' : ROUGE + '22',
                      color           : u.userState ? '#2ecc71'   : ROUGE,
                      border          : `1px solid ${u.userState ? '#2ecc71' : ROUGE}`,
                    }}>
                      {u.userState ? 'Actif' : 'Bloqué'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      {/* Bloquer / Débloquer */}
                      <button
                        style={{
                          ...styles.actionBtn,
                          backgroundColor: u.userState ? '#fff3cd' : '#d4edda',
                          color          : u.userState ? '#856404' : '#155724',
                        }}
                        onClick={() => setConfirm({ id: u.id, action: u.userState ? 'bloquer' : 'debloquer' })}
                        title={u.userState ? 'Bloquer' : 'Débloquer'}
                      >
                        {u.userState ? '🔒' : '🔓'}
                      </button>

                      {/* Supprimer */}
                      <button
                        style={{ ...styles.actionBtn, backgroundColor: '#fde8e8', color: ROUGE }}
                        onClick={() => setConfirm({ id: u.id, action: 'supprimer' })}
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
            <p style={styles.empty}>Aucun utilisateur trouvé.</p>
          )}
        </div>

        {/* Modal de confirmation */}
        {confirm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <p style={styles.modalTitle}>
                {confirm.action === 'supprimer'  && '🗑️ Supprimer cet utilisateur ?'}
                {confirm.action === 'bloquer'    && '🔒 Bloquer cet utilisateur ?'}
                {confirm.action === 'debloquer'  && '🔓 Débloquer cet utilisateur ?'}
              </p>
              <p style={styles.modalSub}>Cette action est irréversible.</p>
              <div style={styles.modalBtns}>
                <button
                  style={styles.modalConfirm}
                  onClick={() =>
                    confirm.action === 'supprimer'
                      ? supprimer(confirm.id)
                      : toggleStatut(confirm.id)
                  }
                >
                  Confirmer
                </button>
                <button
                  style={styles.modalCancel}
                  onClick={() => setConfirm(null)}
                >
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

function StatPill({ label, value, color }) {
  return (
    <div style={{ ...styles.pill, borderLeft: `4px solid ${color}` }}>
      <p style={{ ...styles.pillValue, color }}>{value}</p>
      <p style={styles.pillLabel}>{label}</p>
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
  pill           : { backgroundColor: '#fff', borderRadius: 10, padding: '12px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', minWidth: 100 },
  pillValue      : { fontSize: 24, fontWeight: 'bold', margin: 0 },
  pillLabel      : { fontSize: 12, color: '#888', margin: 0, marginTop: 3 },
  filtreRow      : { display: 'flex', gap: 10, marginBottom: 20 },
  filtreBtn      : { padding: '7px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: '600' },
  tableContainer : { backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table          : { width: '100%', borderCollapse: 'collapse' },
  tableHead      : { backgroundColor: '#f8f8f8' },
  th             : { padding: '13px 16px', textAlign: 'left', fontSize: 12, fontWeight: '700', color: '#555', borderBottom: '2px solid #eee' },
  tr             : { borderBottom: '1px solid #f5f5f5' },
  td             : { padding: '12px 16px', fontSize: 13, color: '#444' },
  userCell       : { display: 'flex', alignItems: 'center', gap: 10 },
  avatar         : { width: 32, height: 32, borderRadius: '50%', backgroundColor: VERT + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', color: VERT },
  roleBadge      : { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: '600' },
  statutBadge    : { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: '600' },
  actionsCell    : { display: 'flex', gap: 8 },
  actionBtn      : { border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 15 },
  empty          : { textAlign: 'center', padding: 30, color: '#aaa' },
  overlay        : { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal          : { backgroundColor: '#fff', borderRadius: 16, padding: '30px 40px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', minWidth: 320 },
  modalTitle     : { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  modalSub       : { fontSize: 13, color: '#888', marginBottom: 25 },
  modalBtns      : { display: 'flex', gap: 15, justifyContent: 'center' },
  modalConfirm   : { padding: '10px 30px', backgroundColor: ROUGE, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 },
  modalCancel    : { padding: '10px 30px', backgroundColor: '#f0f0f0', color: '#444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 },
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
};