import React, { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar';
import { supabase } from '../supabase';

const VERT   = '#4ecdc4';
const ROUGE  = '#e74c3c';
const ORANGE = '#f0a500';
const BLEU   = '#3498db';

const typeConfig = {
  alerte    : { color: ROUGE,  bg: ROUGE  + '15', icon: '⚠️',  label: 'Alerte'    },
  pharmacie : { color: VERT,   bg: VERT   + '15', icon: '🏥',  label: 'Pharmacie' },
  patient   : { color: BLEU,   bg: BLEU   + '15', icon: '👥',  label: 'Patient'   },
  systeme   : { color: ORANGE, bg: ORANGE + '15', icon: '⚙️',  label: 'Système'   },
};

export default function Notifications() {
  const [notificationsData, setNotificationsData] = useState([]);
  const [filtre, setFiltre] = useState('Tous');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction pour récupérer les notifications depuis Supabase
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotificationsData(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des notifications:', err);
      setError('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Marquer comme lu
  const marquerLu = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setNotificationsData(notificationsData.map(n => n.id === id ? { ...n, lu: true } : n));
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
    }
  };

  // Marquer tout comme lu
  const marquerToutLu = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('lu', false);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setNotificationsData(notificationsData.map(n => ({ ...n, lu: true })));
    } catch (err) {
      console.error('Erreur lors du marquage tout comme lu:', err);
    }
  };

  // Supprimer
  const supprimer = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setNotificationsData(notificationsData.filter(n => n.id !== id));
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
            <p>Chargement des notifications...</p>
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
            <button style={styles.retryBtn} onClick={fetchNotifications}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtrage
  const filtered = notificationsData.filter(n => {
    const matchFiltre = filtre === 'Tous'
      || (filtre === 'Non lues' && !n.lu)
      || n.type === filtre.toLowerCase();
    const matchSearch = n.titre && n.message && (
      n.titre.toLowerCase().includes(search.toLowerCase())
      || n.message.toLowerCase().includes(search.toLowerCase())
    );
    return matchFiltre && matchSearch;
  });

  const nonLues = notificationsData.filter(n => !n.lu).length;

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              🔔 Notifications
              {nonLues > 0 && (
                <span style={styles.badge}>{nonLues}</span>
              )}
            </h1>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <span>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {nonLues > 0 && (
              <button style={styles.markAllBtn} onClick={marquerToutLu}>
                ✅ Tout marquer comme lu
              </button>
            )}
          </div>
        </div>

        {/* Stats rapides */}
        <div style={styles.statsRow}>
          <MiniStat label="Total"     value={notificationsData.length}  color="#555"  />
          <MiniStat label="Non lues"  value={nonLues}       color={ROUGE} />
          <MiniStat label="Alertes"   value={notificationsData.filter(n=>n.type==='alerte').length}    color={ROUGE}  />
          <MiniStat label="Pharmacie" value={notificationsData.filter(n=>n.type==='pharmacie').length} color={VERT}   />
          <MiniStat label="Patients"  value={notificationsData.filter(n=>n.type==='patient').length}   color={BLEU}   />
        </div>

        {/* Filtres */}
        <div style={styles.filtreRow}>
          {['Tous', 'Non lues', 'Alerte', 'Pharmacie', 'Patient', 'Systeme'].map(f => (
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

        {/* Liste des notifications */}
        <div style={styles.listContainer}>
          {filtered.length === 0 ? (
            <div style={styles.emptyContainer}>
              <p>🔔 Aucune notification trouvée</p>
              <p style={styles.emptySub}>Les nouvelles notifications apparaîtront ici</p>
            </div>
          ) : (
            filtered.map(n => {
              const cfg = typeConfig[n.type];
              return (
                <div
                  key={n.id}
                  style={{
                    ...styles.notifCard,
                    backgroundColor : n.lu ? '#fff' : '#f0fbfa',
                    borderLeft      : `4px solid ${n.lu ? '#ddd' : cfg.color}`,
                  }}
                  onClick={() => marquerLu(n.id)}
                >
                  {/* Icône type */}
                  <div style={{ ...styles.notifIcon, backgroundColor: cfg.bg }}>
                    <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                  </div>

                  {/* Contenu */}
                  <div style={styles.notifBody}>
                    <div style={styles.notifTop}>
                      <span style={{
                        ...styles.typeBadge,
                        backgroundColor : cfg.bg,
                        color           : cfg.color,
                        border          : `1px solid ${cfg.color}`,
                      }}>
                        {cfg.label}
                      </span>
                      {!n.lu && <span style={styles.newBadge}>Nouveau</span>}
                      <span style={styles.notifDate}>{n.date || new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p style={{
                      ...styles.notifTitre,
                      fontWeight: n.lu ? '500' : '700',
                    }}>
                      {n.titre || 'Notification'}
                    </p>
                    <p style={styles.notifMessage}>{n.message || 'Aucun message'}</p>
                  </div>

                  {/* Actions */}
                  <div style={styles.notifActions}>
                    {!n.lu && (
                      <button
                        style={styles.luBtn}
                        onClick={e => { e.stopPropagation(); marquerLu(n.id); }}
                        title="Marquer comme lu"
                      >
                        ✅
                      </button>
                    )}
                    <button
                      style={styles.suppBtn}
                      onClick={e => { e.stopPropagation(); setConfirm(n.id); }}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Modal confirmation */}
        {confirm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <p style={styles.modalTitle}>🗑️ Supprimer cette notification ?</p>
              <p style={styles.modalSub}>Cette action est irréversible.</p>
              <div style={styles.modalBtns}>
                <button
                  style={styles.modalConfirm}
                  onClick={() => supprimer(confirm)}
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

function MiniStat({ label, value, color }) {
  return (
    <div style={{ ...styles.miniStat, borderLeft: `4px solid ${color}` }}>
      <p style={{ ...styles.miniVal, color }}>{value}</p>
      <p style={styles.miniLabel}>{label}</p>
    </div>
  );
}

const styles = {
  page           : { display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f4f0' },
  content        : { flex: 1, padding: '25px 30px', overflowY: 'auto' },
  header         : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title          : { fontSize: 22, fontWeight: 'bold', color: '#222', margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
  badge          : { backgroundColor: ROUGE, color: '#fff', fontSize: 12, fontWeight: 'bold', padding: '2px 8px', borderRadius: 20 },
  headerRight    : { display: 'flex', alignItems: 'center', gap: 15 },
  searchBox      : { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 20, padding: '6px 14px', gap: 8 },
  searchInput    : { border: 'none', outline: 'none', fontSize: 13, width: 180, backgroundColor: 'transparent' },
  markAllBtn     : { padding: '7px 15px', backgroundColor: VERT, color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: '600' },
  statsRow       : { display: 'flex', gap: 12, marginBottom: 20 },
  miniStat       : { backgroundColor: '#fff', borderRadius: 10, padding: '12px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', flex: 1 },
  miniVal        : { fontSize: 22, fontWeight: 'bold', margin: 0 },
  miniLabel      : { fontSize: 11, color: '#888', margin: 0, marginTop: 2 },
  filtreRow      : { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filtreBtn      : { padding: '6px 15px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: '600' },
  listContainer  : { display: 'flex', flexDirection: 'column', gap: 10 },
  notifCard      : { display: 'flex', alignItems: 'flex-start', gap: 15, padding: '16px 20px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.2s' },
  notifIcon      : { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifBody      : { flex: 1 },
  notifTop       : { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  typeBadge      : { padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: '700' },
  newBadge       : { padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: '700', backgroundColor: ROUGE + '15', color: ROUGE, border: `1px solid ${ROUGE}` },
  notifDate      : { fontSize: 11, color: '#aaa', marginLeft: 'auto' },
  notifTitre     : { fontSize: 14, color: '#222', margin: 0, marginBottom: 4 },
  notifMessage   : { fontSize: 13, color: '#666', margin: 0 },
  notifActions   : { display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 },
  luBtn          : { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  suppBtn        : { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  empty          : { textAlign: 'center', padding: 40, color: '#aaa', fontSize: 15 },
  overlay        : { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal          : { backgroundColor: '#fff', borderRadius: 16, padding: '30px 40px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', minWidth: 320 },
  modalTitle     : { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  modalSub       : { fontSize: 13, color: '#888', marginBottom: 25 },
  modalBtns      : { display: 'flex', gap: 15, justifyContent: 'center' },
  modalConfirm   : { padding: '10px 30px', backgroundColor: ROUGE, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600' },
  modalCancel    : { padding: '10px 30px', backgroundColor: '#f0f0f0', color: '#444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600' },
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