import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const VERT = '#4ecdc4';
const BG   = '#f0f4f0';

const menuItems = [
  { icon: '🏠', label: 'Accueil',              path: '/dashboard'          },
  { icon: '🏥', label: 'Pharmacies',            path: '/pharmacies'         },
  { icon: '⏳', label: 'Pharmacies en attente', path: '/pharmacies-attente' },
  { icon: '👥', label: 'Utilisateurs',          path: '/utilisateurs'       },
  { icon: '💊', label: 'Médicaments suspects',  path: '/medicaments-suspects'},
  { icon: '🔔', label: 'Notifications',         path: '/notifications'      },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ ...styles.sidebar, width: collapsed ? 70 : 200 }}>

      {/* Bouton hamburger */}
      <div style={styles.hamburger} onClick={() => setCollapsed(!collapsed)}>
        ☰
      </div>

      {/* Logo / titre */}
      {!collapsed && (
        <div style={styles.brand}>
          <span style={styles.brandText}>PharmaScan</span>
        </div>
      )}

      {/* Menu items */}
      <div style={styles.menu}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.path}
              style={{
                ...styles.menuItem,
                backgroundColor : isActive ? VERT + '22' : 'transparent',
                borderLeft      : isActive ? `4px solid ${VERT}` : '4px solid transparent',
              }}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : ''}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              {!collapsed && (
                <span style={{
                  ...styles.menuLabel,
                  color: isActive ? VERT : '#444',
                  fontWeight: isActive ? '700' : '500',
                }}>
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Profil en bas */}
      <div
        style={{
          ...styles.menuItem,
          marginTop: 'auto',
          borderLeft: location.pathname === '/profil'
            ? `4px solid ${VERT}` : '4px solid transparent',
          backgroundColor: location.pathname === '/profil'
            ? VERT + '22' : 'transparent',
        }}
        onClick={() => navigate('/profil')}
      >
        <span style={styles.menuIcon}>👤</span>
        {!collapsed && <span style={styles.menuLabel}>Profil</span>}
      </div>

      {/* Déconnexion */}
      <div
        style={{ ...styles.menuItem, borderLeft: '4px solid transparent' }}
        onClick={() => {
  localStorage.removeItem('adminConnected');
  localStorage.removeItem('adminUsername');
  navigate('/');
}}
      >
        <span style={styles.menuIcon}>🚪</span>
        {!collapsed && <span style={{ ...styles.menuLabel, color: '#e74c3c' }}>Déconnexion</span>}
      </div>

    </div>
  );
}

const styles = {
  sidebar: {
    backgroundColor : BG,
    display         : 'flex',
    flexDirection   : 'column',
    paddingTop      : 15,
    paddingBottom   : 15,
    borderRight     : '1px solid #ddd',
    height          : '100vh',
    boxSizing       : 'border-box',
    transition      : 'width 0.25s ease',
    overflow        : 'hidden',
    flexShrink      : 0,
  },
  hamburger: {
    fontSize    : 22,
    cursor      : 'pointer',
    paddingLeft : 18,
    marginBottom: 10,
    color       : '#444',
  },
  brand: {
    paddingLeft  : 18,
    marginBottom : 20,
  },
  brandText: {
    fontSize   : 15,
    fontWeight : 'bold',
    color      : VERT,
  },
  menu: {
    flex  : 1,
    width : '100%',
  },
  menuItem: {
    display     : 'flex',
    alignItems  : 'center',
    gap         : 12,
    padding     : '11px 18px',
    cursor      : 'pointer',
    borderRadius: '0 8px 8px 0',
    transition  : 'background 0.15s',
    whiteSpace  : 'nowrap',
  },
  menuIcon: {
    fontSize   : 20,
    flexShrink : 0,
  },
  menuLabel: {
    fontSize : 13,
    color    : '#444',
  },
};