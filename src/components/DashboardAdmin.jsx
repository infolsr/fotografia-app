import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const DashboardAdmin = () => {
  const [dashboardData, setDashboardData] = useState({
    pedidosHoy: 0,
    ingresosMes: 0,
    pendientesEntrega: 0,
    totalPedidosMes: 0, // Nuevo valor para el total de pedidos del mes
  });
  const [ventasDelMes, setVentasDelMes] = useState([]); // Nuevo estado para la lista de ventas
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    
    // --- Fechas para las consultas ---
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    
    // --- Consulta principal para las ventas del mes ---
    const { data: ventasData, error: ventasError } = await supabase
      .from("pedidos")
      .select("*, packs(nombre_pack)") // Obtenemos el nombre del pack relacionado
      .in("status", ["pagado", "entregado"])
      .gte("fecha", firstDayOfMonth);
      // No necesitamos fecha de fin, ya que siempre será el mes actual

    if (ventasError) {
      console.error("Error cargando las ventas del mes:", ventasError);
    } else {
      setVentasDelMes(ventasData || []);
    }

    // --- Consultas para las tarjetas de resumen ---
    const { count: pedidosHoyCount } = await supabase.from("pedidos").select('*', { count: 'exact', head: true }).gte('fecha', startOfDay);
    const { count: pendientesCount } = await supabase.from("pedidos").select('*', { count: 'exact', head: true }).eq("status", "pagado");

    // Calculamos los totales a partir de los datos ya obtenidos
    const ingresosMesTotal = ventasData ? ventasData.reduce((acc, p) => acc + p.total, 0) : 0;
    
    setDashboardData({
      pedidosHoy: pedidosHoyCount || 0,
      ingresosMes: ingresosMesTotal,
      pendientesEntrega: pendientesCount || 0,
      totalPedidosMes: ventasData ? ventasData.length : 0,
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
      
      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-gray-500 text-sm font-medium">Nuevos Pedidos Hoy</h2>
          <p className="text-3xl font-bold">{dashboardData.pedidosHoy}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-gray-500 text-sm font-medium">Ingresos del Mes</h2>
          <p className="text-3xl font-bold">${dashboardData.ingresosMes.toLocaleString('es-CL')}</p>
          <p className="text-gray-500 text-sm mt-1">en {dashboardData.totalPedidosMes} pedidos</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h2 className="text-gray-500 text-sm font-medium">Pedidos Pendientes de Entrega</h2>
          <p className="text-3xl font-bold">{dashboardData.pendientesEntrega}</p>
        </div>
      </div>

      {/* --- INICIO DEL NUEVO INFORME DE VENTAS --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-bold mb-4">Ventas del Mes Actual</h2>
        {ventasDelMes.length === 0 ? (
          <p>Aún no hay ventas este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">N° Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Paquete</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasDelMes.map(venta => (
                  <tr key={venta.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(venta.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono">#{venta.numero_pedido}</td>
                    <td className="px-4 py-3">{venta.nombre_cliente}</td>
                    <td className="px-4 py-3">{venta.packs?.nombre_pack || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-semibold">${venta.total.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td colSpan="4" className="px-4 py-3 text-right text-gray-800">Total del Mes:</td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    ${dashboardData.ingresosMes.toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      {/* --- FIN DEL NUEVO INFORME DE VENTAS --- */}
    </div>
  );
};

export default DashboardAdmin;