// En: src/components/DashboardAdmin.jsx
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const DashboardAdmin = () => {
  const [dashboardData, setDashboardData] = useState({
    pedidosHoy: 0,
    ingresosMes: 0,
    pendientesEntrega: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const { count: pedidosHoyCount } = await supabase.from("pedidos").select('*', { count: 'exact', head: true }).gte('fecha', startOfDay).lte('fecha', endOfDay);
    const { data: ingresosData } = await supabase.from("pedidos").select("total").eq("status", "pagado").gte("fecha", firstDayOfMonth).lte("fecha", lastDayOfMonth);
    const { count: pendientesCount } = await supabase.from("pedidos").select('*', { count: 'exact', head: true }).eq("status", "pagado");

    setDashboardData({
      pedidosHoy: pedidosHoyCount || 0,
      ingresosMes: ingresosData ? ingresosData.reduce((acc, p) => acc + p.total, 0) : 0,
      pendientesEntrega: pendientesCount || 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) return <p>Cargando dashboard...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-gray-500 text-sm font-medium">Nuevos Pedidos Hoy</h2>
          <p className="text-3xl font-bold">{dashboardData.pedidosHoy}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-gray-500 text-sm font-medium">Ingresos del Mes</h2>
          <p className="text-3xl font-bold">${dashboardData.ingresosMes.toLocaleString('es-CL')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h2 className="text-gray-500 text-sm font-medium">Pedidos Pendientes de Entrega</h2>
          <p className="text-3xl font-bold">{dashboardData.pendientesEntrega}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;