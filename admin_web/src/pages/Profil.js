import React, { useState } from 'react';
import Sidebar from '../components/sidebar';

const VERT = '#4ecdc4';

export default function Profil() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleModifier = () => {
    if (currentPassword === 'admin') {
      setMessage('✅ Mot de passe modifié avec succès !');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setMessage('❌ Mot de passe actuel incorrect');
    }
  };

  return (
    <div style={styles.page}>
      <Sidebar />

      <div style={styles.content}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.bellIcon}>🔔</span>
        </div>

        {/* Avatar + titre */}
        <div style={styles.avatarContainer}>
          <div style={styles.avatar}>👤</div>
          <h2 style={styles.title}>Profil</h2>
        </div>

        {/* Formulaire */}
        <div style={styles.form}>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Nom d'utilisateur</label>
            <input
              style={styles.input}
              value="admin"
              readOnly
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Mot de passe actuel</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div style={styles.fieldRow}>
            <label style={styles.label}>Nouveau mot de passe</label>
            <input
              style={styles.input}
              type="password"
              placeholder=""
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          {message && <p style={styles.message}>{message}</p>}

          <button style={styles.button} onClick={handleModifier}>
            Modifier
          </button>

        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f4f0',
  },
  content: {
    flex: 1,
    padding: '20px 40px',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  bellIcon: {
    fontSize: 22,
    cursor: 'pointer',
  },
  avatarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  avatar: {
    fontSize: 60,
    backgroundColor: '#ccc',
    borderRadius: '50%',
    width: 80,
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 600,
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    width: 200,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    flex: 1,
    padding: '10px 15px',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#e0e0e0',
    color: '#555',
    outline: 'none',
  },
  button: {
    width: 120,
    padding: '10px',
    backgroundColor: VERT,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 10,
  },
  message: {
    fontSize: 13,
    marginBottom: 10,
  },
};