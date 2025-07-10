import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import { Link } from 'react-router-dom';

const MisPedidos = () => {
  const user = useUser();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar los pedidos del usuario
  const fetchPedidos = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', user.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err) {
      setError('No se pudieron cargar tus pedidos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);


  // --- LÓGICA DE ACCIONES DEL CLIENTE ---

  const handleRetryPayment = async (pedido) => {
    try {
      const response = await fetch("http://localhost:4000/crear-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo generar el link de pago.");
      if (data.init_point) window.location.href = data.init_point;
    } catch (err) {
      alert("No se pudo generar un nuevo link de pago. Intenta más tarde.");
      console.error("Error al reintentar el pago:", err);
    }
  };

  // En src/MisPedidos.jsx

const handleCancelOrder = async (pedido) => {
  if (!window.confirm("¿Estás seguro de que quieres anular tu pedido? Las imágenes se eliminarán y esta acción no se puede deshacer.")) return;
  
  try {
    const { data, error: rpcError } = await supabase.rpc('anular_mi_pedido', {
      pedido_id_a_anular: pedido.id
    });

    if (rpcError) throw rpcError;

    if (data && data.publicIds && data.publicIds.length > 0) {
      await fetch('http://localhost:4000/eliminar-fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds: data.publicIds }),
      });
    }

    // ✅ Se mueven al final, después de que todo fue exitoso
    localStorage.removeItem('pedidoEnProgreso');
    fetchPedidos();
    alert("Tu pedido ha sido anulado con éxito.");

  } catch (error) {
    alert("Error al anular el pedido: " + error.message);
    console.error(error);
  }
};


  if (loading) {
    return <div className="text-center p-10">Cargando tus pedidos...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 border-b pb-4">Mis Pedidos</h1>
      {pedidos.length === 0 ? (
        <div className="text-center bg-gray-100 p-8 rounded-lg">
          <p className="mb-4">Aún no has realizado ningún pedido.</p>
          <Link to="/" className="btn-primary">
            Empezar un Pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-4 sm:mb-0">
                <p className="font-bold text-gray-800">Pedido <span className="font-mono text-sm">#{pedido.id.substring(0, 8)}</span></p>
                <p className="text-sm text-gray-600">
                  Fecha: {new Date(pedido.fecha).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Total: ${pedido.total.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="text-right flex flex-col items-end gap-2 w-full sm:w-auto">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                  pedido.status === 'pagado' ? 'bg-green-200 text-green-800' :
                  pedido.status === 'entregado' ? 'bg-blue-200 text-blue-800' :
                  pedido.status === 'anulado' ? 'bg-red-200 text-red-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {pedido.status.replace('_', ' ')}
                </span>
                
                {/* Mostramos botones solo para pedidos pendientes */}
                {(pedido.status === 'en_proceso_pago' || pedido.status === 'pendiente_pago' || pedido.status === 'por_transferencia') && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
                    <button 
                      onClick={() => handleRetryPayment(pedido)}
                      className="btn-primary text-sm w-full"
                    >
                      Finalizar Pago
                    </button>
                    <button 
                      onClick={() => handleCancelOrder(pedido)}
                      className="w-full bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2 rounded text-xs font-semibold transition-colors"
                    >
                      Anular
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MisPedidos;