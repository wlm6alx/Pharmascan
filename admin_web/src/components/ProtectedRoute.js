import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/auth';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Écouter les changements d'authentification
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      console.log('🔄 ProtectedRoute - Changement état auth:', currentUser);
      setIsAuthenticated(!!currentUser);
      setUser(currentUser);
    });

    // Vérifier l'état initial
    if (authService.isLoggedIn()) {
      setIsAuthenticated(true);
      setUser(authService.getCurrentUser());
    } else {
      setIsAuthenticated(false);
    }

    return unsubscribe;
  }, []);

  if (isAuthenticated === null) {
    // État de chargement
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: 16,
        color: '#666'
      }}>
        <p>🔄 Vérification de l'authentification...</p>
      </div>
    );
  }

  if (!isAuthenticated || !authService.isAdmin()) {
    console.log('❌ Accès refusé - Redirection vers login');
    return <Navigate to="/" replace />;
  }

  console.log('✅ Accès autorisé - Utilisateur:', user);
  return children;
}