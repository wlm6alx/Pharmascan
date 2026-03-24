import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute             from './components/ProtectedRoute';
import Login                      from './pages/login';
import Dashboard                  from './pages/Dashboard';
import Profil                     from './pages/Profil';
import Pharmacies                 from './pages/Pharmacies';
import PharmacieDetail            from './pages/PharmacieDetail';
import PharmaciesAttente          from './pages/PharmaciesAttente';
import PharmacieAttenteDetail     from './pages/PharmacieAttenteDetail';
import Utilisateurs               from './pages/Utilisateurs';
import MedicamentsSuspects        from './pages/MedicamentsSuspects';
import Notifications              from './pages/Notifications';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Route publique */}
        <Route path="/" element={<Login />} />

        {/* Routes protégées */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        }/>
        <Route path="/profil" element={
          <ProtectedRoute><Profil /></ProtectedRoute>
        }/>
        <Route path="/pharmacies" element={
          <ProtectedRoute><Pharmacies /></ProtectedRoute>
        }/>
        <Route path="/pharmacies/:id" element={
          <ProtectedRoute><PharmacieDetail /></ProtectedRoute>
        }/>
        <Route path="/pharmacies-attente" element={
          <ProtectedRoute><PharmaciesAttente /></ProtectedRoute>
        }/>
        <Route path="/pharmacies-attente/:id" element={
          <ProtectedRoute><PharmacieAttenteDetail /></ProtectedRoute>
        }/>
        <Route path="/utilisateurs" element={
          <ProtectedRoute><Utilisateurs /></ProtectedRoute>
        }/>
        <Route path="/medicaments-suspects" element={
          <ProtectedRoute><MedicamentsSuspects /></ProtectedRoute>
        }/>
        <Route path="/notifications" element={
          <ProtectedRoute><Notifications /></ProtectedRoute>
        }/>

      </Routes>
    </BrowserRouter>
  );
}

export default App;