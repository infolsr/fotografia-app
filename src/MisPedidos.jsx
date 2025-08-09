import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import { Link, useNavigate } from 'react-router-dom';

const MisPedidos = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // Para deshabilitar botones durante una acción
  const [error, setError] = useState(null);

  // 1. OBTENCIÓN DE DATOS MEJORADA
  // La consulta ahora incluye el conteo de imágenes de cada pedido.
  const fetchPedidos = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, imagenes_pedido(count)') // <-- Se añade el conteo de imágenes
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

  // 2. NUEVA FUNCIÓN PARA CONTINUAR UN PEDIDO EN CURSO
    const handleContinueOrder = async (pedido) => {
    if (!pedido.pack_id) {
      alert("Error: No se puede recuperar este pedido porque no tiene un paquete asociado.");
      return;
    }
    
    setActionLoading(pedido.id);
    try {
      // Obtenemos todas las imágenes del pedido
      const { data: imagesFromDB, error: imagesError } = await supabase
        .from('imagenes_pedido')
        .select('*') // Obtenemos todas las columnas, incluyendo las nuevas
        .eq('pedido_id', pedido.id);

      if (imagesError) throw imagesError;

      // ✅ MAPEO CLAVE: Convertimos los nombres de la base de datos a los del estado.
      const images = imagesFromDB.map(img => ({
        ...img,
        // Si hay datos de transformaciones guardados, los usamos. Si no, valores por defecto.
        imagePosition: img.transformaciones || { x: 0, y: 0 },
        zoom: img.zoom_image || 1,
        filter: img.filtro || 'ninguno',
        hasBorder: img.borde || false,
        isFlipped: img.espejado || false
      }));

      const pedidoEnProgreso = {
        pedidoId: pedido.id,
        images: images, // Usamos el array de imágenes ya mapeado
        selectedPackId: pedido.pack_id,
        step: 2,
      };

      localStorage.setItem('pedidoEnProgreso', JSON.stringify(pedidoEnProgreso));
      navigate('/');

    } catch (error) {
      alert(`Error al intentar recuperar tu pedido: ${error.message}`);
      setActionLoading(null);
    }
  };

  // 3. LÓGICA DE ANULACIÓN ROBUSTA
  const handleCancelOrder = async (pedido) => {
    if (!window.confirm("¿Estás seguro de que quieres anular tu pedido? Las imágenes se eliminarán permanentemente de la nube. Esta acción no se puede deshacer.")) return;
    
    setActionLoading(pedido.id);
    try {
      // a. Obtenemos los public_id de las imágenes a borrar.
      const { data: imagenes, error: imgError } = await supabase
        .from('imagenes_pedido')
        .select('public_id')
        .eq('pedido_id', pedido.id);
      
      if (imgError) throw imgError;

      // b. Si hay imágenes, se las enviamos al backend para que las borre de Cloudinary.
      const publicIds = imagenes.map(img => img.public_id).filter(Boolean);
      if (publicIds.length > 0) {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/eliminar-fotos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicIds }),
        });
        if (!response.ok) throw new Error("No se pudieron eliminar las imágenes de la nube.");
      }

      // c. Finalmente, actualizamos el estado del pedido en nuestra base de datos.
      await supabase.from('pedidos').update({ status: 'anulado' }).eq('id', pedido.id);

      // d. Actualizamos la lista de pedidos en la vista.
      fetchPedidos();

    } catch (error) {
      alert("Error al anular el pedido: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="text-center p-10">Cargando tus pedidos...</div>;
  if (error) return <div className="text-center p-10 text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 border-b pb-4">Mis Pedidos</h1>
      <div className="mb-6">
          <Link to="/" className="text-sm text-luitania-sage underline hover:text-luitania-textbrown transition-colors">
              &larr; Volver a la página principal
          </Link>
      </div>
      {pedidos.length === 0 ? (
        <div className="text-center bg-gray-50 p-8 rounded-lg">
          <p className="mb-4 text-gray-700">Aún no has realizado ningún pedido.</p>
          <Link to="/" className="btn-primary">Empezar un Pedido Nuevo</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-white p-4 rounded-lg shadow-md border flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-grow">
                <p className="font-bold text-gray-800">Pedido #{pedido.id.substring(0, 8)}...</p>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <p><strong>Fecha:</strong> {new Date(pedido.fecha).toLocaleDateString()}</p>
                  <p><strong>Total:</strong> ${(pedido.total ?? 0).toLocaleString('es-CL')}</p>
                  {/* Se muestra la cantidad de imágenes obtenida del conteo */}
                  <p><strong>Imágenes:</strong> {pedido.imagenes_pedido[0]?.count || 0}</p>
                </div>
              </div>
              <div className="flex flex-col items-stretch sm:items-end justify-between gap-2">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize self-end ${
                  pedido.status === 'pagado' || pedido.status === 'entregado' ? 'bg-green-100 text-green-800' :
                  pedido.status === 'anulado' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {pedido.status.replace('_', ' ')}
                </span>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  {/* Lógica de botones condicional */}
                  {pedido.status === 'creando' && (
                    <button 
                      onClick={() => handleContinueOrder(pedido)}
                      disabled={actionLoading === pedido.id}
                      className="btn-primary text-sm w-full sm:w-auto"
                    >
                      {actionLoading === pedido.id ? 'Cargando...' : 'Continuar Pedido'}
                    </button>
                  )}
                  {(pedido.status === 'creando' || pedido.status === 'por_transferencia' || pedido.status === 'pendiente_pago') && (
                    <button 
                      onClick={() => handleCancelOrder(pedido)}
                      disabled={actionLoading === pedido.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-semibold transition-colors disabled:bg-gray-400"
                    >
                      {actionLoading === pedido.id ? 'Anulando...' : 'Anular'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MisPedidos;