// En un nuevo archivo: components/ProtectedRoute.jsx
import { useUser } from "@supabase/auth-helpers-react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import React, { useState, useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const user = useUser();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('clientes').select('role').eq('id', user.id).single();
        setProfile(data);
      };
      fetchProfile();
    }
  }, [user]);

  if (!user) return <Navigate to="/" />; // Si no está logueado, fuera.
  if (profile && profile.role !== 'admin') return <Navigate to="/" />; // Si no es admin, fuera.
  if (profile && profile.role === 'admin') return children; // Si es admin, puede pasar.

  return <div>Verificando acceso...</div>; // Pantalla de carga mientras se verifica
};

export default ProtectedRoute;