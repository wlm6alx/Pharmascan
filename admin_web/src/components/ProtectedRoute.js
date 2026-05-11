import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/auth';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Écouter les changements d'authentification
      const unsubscribe = authService.onAuthStateChange(async (currentUser) => {
                setIsAuthenticated(!!currentUser);
        setUser(currentUser);
        
        if (currentUser) {
          // Vérifier si l'utilisateur est admin
          const adminStatus = await authService.isAdmin();
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
      });

      // Vérifier l'état initial
      if (authService.isLoggedIn()) {
        setIsAuthenticated(true);
        setUser(authService.getCurrentUser());
        const adminStatus = await authService.isAdmin();
        setIsAdmin(adminStatus);
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }

      return unsubscribe;
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null || isAdmin === null) {
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
        <p> Vérification de l'authentification...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

    return children;
}