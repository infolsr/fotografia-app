import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const PEDIDOS_PER_PAGE = 10; // Puedes ajustar cuántos pedidos mostrar por página

const PedidosAdmin = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("activos"); // 'activos', 'entregado', 'anulado'
  const [currentPage, setCurrentPage] = useState(0);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    const from = currentPage * PEDIDOS_PER_PAGE;
    const to = from + PEDIDOS_PER_PAGE - 1;

    let query = supabase
      .from("pedidos").select("*, imagenes_pedido(*)", { count: "exact" })
      .order("fecha", { ascending: false }).range(from, to);

    // Lógica de filtrado
    if (filterStatus === 'activos') {
      query = query.in("status", ["pagado", "por_transferencia", "pendiente_pago"]);
    } else {
      query = query.eq("status", filterStatus);
    }
    
    if (searchTerm) {
      query = query.ilike("nombre_cliente", `%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) console.error("❌ Error cargando pedidos:", error.message);
    else setPedidos(data || []);
    setLoading(false);
  }, [currentPage, filterStatus, searchTerm]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // --- LÓGICA DE ACCIONES ---

  // Función de ayuda para no repetir código
  const eliminarImagenesAsociadas = async (pedido) => {
    if (pedido.imagenes_pedido && pedido.imagenes_pedido.length > 0) {
      const publicIds = pedido.imagenes_pedido.map(img => img.public_id);
      
      // Llama al backend para eliminar de Cloudinary
      await fetch('http://localhost:4000/eliminar-fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds }),
      });
      
      // Actualiza la base de datos para marcar las imágenes como no vigentes
      await supabase.from('imagenes_pedido').update({ vigente: false }).in('public_id', publicIds);
    }
  };

  const anularPedido = async (pedido) => {
    if (!window.confirm(`¿Seguro que deseas ANULAR el pedido de ${pedido.nombre_cliente}? Esta acción no se puede deshacer.`)) return;
    try {
      setLoading(true);
      await eliminarImagenesAsociadas(pedido);
      await supabase.from("pedidos").update({ status: "anulado" }).eq("id", pedido.id);
      fetchPedidos();
    } catch (error) {
      alert("Error al anular el pedido: " + error.message);
      setLoading(false);
    }
  };

  const marcarComoEntregado = async (pedido) => {
    if (!window.confirm(`¿Seguro que deseas marcar como ENTREGADO el pedido de ${pedido.nombre_cliente}?`)) return;
    try {
      setLoading(true);
      await eliminarImagenesAsociadas(pedido);
      await supabase.from("pedidos").update({ status: "entregado" }).eq("id", pedido.id);
      fetchPedidos();
    } catch (error) {
      alert("Error al marcar como entregado: " + error.message);
      setLoading(false);
    }
  };
  
  const validarTransferencia = async (pedidoId) => {
    await supabase.from("pedidos").update({ status: "pagado" }).eq("id", pedidoId);
    fetchPedidos();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestión de Pedidos</h1>
      
      {/* --- Filtros y Búsqueda --- */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por nombre:</label>
          <input
            type="text" placeholder="Nombre del cliente..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por estado:</label>
          <select onChange={(e) => setFilterStatus(e.target.value)} value={filterStatus} className="w-full p-2 border border-gray-300 rounded-md bg-white">
            <option value="activos">Activos</option>
            <option value="entregado">Entregados</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
      </div>
      
      {/* --- Lista de Pedidos --- */}
      {loading ? <p>Cargando pedidos...</p> : (
        pedidos.length === 0 ? <p>No se encontraron pedidos con los filtros actuales.</p> : (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="border rounded p-4 mb-6 shadow-sm bg-white">
              <div className="flex flex-wrap justify-between items-start mb-2">
                <div className="flex-grow pr-4">
                  <p><strong>ID:</strong> <span className="text-xs text-gray-600">{pedido.id}</span></p>
                  <p><strong>Fecha:</strong> {new Date(pedido.fecha).toLocaleString()}</p>
                  <p><strong>Cliente:</strong> {pedido.nombre_cliente}</p>
                  <p><strong>Formato:</strong> {pedido.formato}</p>
                  <p><strong>Total:</strong> ${pedido.total ? pedido.total.toLocaleString('es-CL') : '0'}</p>
                  <p><strong>Estado:</strong> <span className="font-semibold">{pedido.status}</span></p>
                </div>
                <div className="flex flex-col space-y-2 w-full sm:w-auto mt-4 sm:mt-0">
                  {pedido.status === "por_transferencia" && (
                    <button onClick={() => validarTransferencia(pedido.id)} className="bg-yellow-500 text-white px-3 py-2 rounded text-sm text-center">Validar Transferencia</button>
                  )}
                  {pedido.status === "pagado" && (
                    <button onClick={() => marcarComoEntregado(pedido)} className="bg-green-600 text-white px-3 py-2 rounded text-sm text-center">Marcar Entregado</button>
                  )}
                  {/* ✅ Botón para anular pedidos pendientes */}
                  {(pedido.status === 'por_transferencia' || pedido.status === 'pendiente_pago' || pedido.status === 'pagado') && (
                    <button onClick={() => anularPedido(pedido)} className="bg-red-600 text-white px-3 py-2 rounded text-sm text-center">
                      Anular Pedido
                    </button>
                  )}
                </div>
              </div>
              {/* ... (resto de tu JSX para mostrar imágenes) ... */}
            </div>
          ))
        )
      )}
      {/* ... (resto de tu JSX para paginación) ... */}
    </div>
  );
};

export default PedidosAdmin;