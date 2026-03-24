import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const isConnected = localStorage.getItem('adminConnected');

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return children;
}