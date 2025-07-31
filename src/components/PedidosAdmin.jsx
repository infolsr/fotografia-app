import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const PEDIDOS_PER_PAGE = 10;

const PedidosAdmin = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("activos");
  const [currentPage, setCurrentPage] = useState(0);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    const from = currentPage * PEDIDOS_PER_PAGE;
    const to = from + PEDIDOS_PER_PAGE - 1;

    let query = supabase
      .from("pedidos")
      .select("*, imagenes_pedido(count)", { count: "exact" })
      .order("fecha", { ascending: false })
      .range(from, to);

    if (filterStatus === 'activos') {
      query = query.in("status", ["pagado", "por_transferencia", "pendiente_pago"]);
    } else {
      query = query.eq("status", filterStatus);
    }
    
    if (searchTerm) {
        if (searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            query = query.eq('id', searchTerm);
        } else {
            query = query.ilike("nombre_cliente", `%${searchTerm}%`);
        }
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

const descargarImagenes = async (pedido) => {
  if (!pedido.nombre_cliente) {
    alert("Error: El pedido no tiene un nombre de cliente asignado.");
    return;
  }
  alert("Iniciando la descarga. Esto puede tardar varios segundos...");
  setLoading(true);

  // 1. La consulta para obtener la información de las imágenes es correcta y no cambia.
  const { data: imagenes, error } = await supabase
    .from('imagenes_pedido')
    .select(`
      url,
      url_original,
      public_id,
      borde,
      pack_items (
        formato_impresion,
        es_regalo
      )
    `)
    .eq('pedido_id', pedido.id)
    .eq('vigente', true);

  if (error || !imagenes || !imagenes.length) {
    alert("No se encontraron imágenes para este pedido o hubo un error.");
    console.error(error);
    setLoading(false);
    return;
  }

  const zip = new JSZip();
  const clienteFolder = zip.folder(pedido.nombre_cliente);

  // 2. CORRECCIÓN: Este bucle ahora procesa cada imagen una sola vez.
  for (const img of imagenes) {
    const item = img.pack_items;
    if (!item) continue; // Ignorar si una imagen no tiene un ítem asociado.

    // Se determina si es un regalo y se elige la URL y el nombre de archivo correctos.
    const esRegalo = item.es_regalo;
    let formato = item.formato_impresion;
    const url_a_descargar = esRegalo ? img.url_original : img.url;
    const cleanPublicId = img.public_id.split('/').pop();
    const nombreArchivo = esRegalo ? `${cleanPublicId}_ORIGINAL.jpg` : `${cleanPublicId}.jpg`;
        // 👇 INICIO DEL BLOQUE AÑADIDO
    // Si la imagen tiene borde y no es un regalo, modifica el nombre de la carpeta.
    if (img.borde && !esRegalo) {
      formato = `${formato}_con_Borde`;
    }
    // 👆 FIN DEL BLOQUE AÑADIDO
    try {
      const response = await fetch(url_a_descargar);
      if (response.ok) {
        const blob = await response.blob();
        // Se crea la carpeta correcta y se guarda el archivo.
        const formatoFolder = clienteFolder.folder(formato || 'Fotos');
        formatoFolder.file(nombreArchivo, blob);
      }
    } catch (e) {
      console.error(`Error descargando la imagen ${img.public_id}`, e);
    }
  }

  // 3. Generamos el ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `pedido_${pedido.nombre_cliente.replace(/ /g, '_')}.zip`);
  setLoading(false);
};

// En: src/components/PedidosAdmin.jsx

const eliminarImagenesAsociadas = async (pedido) => {
  // 1. Obtener la lista de public_id de la base de datos para este pedido.
  const { data: imagenes, error } = await supabase
    .from('imagenes_pedido')
    .select('public_id')
    .eq('pedido_id', pedido.id)
    .eq('vigente', true);

  if (error || !imagenes || imagenes.length === 0) {
    console.log("No se encontraron imágenes vigentes para eliminar.", error);
    return; // No hay nada que eliminar, así que terminamos la función.
  }

  // 2. Extraer los IDs en un array.
  const publicIds = imagenes.map(img => img.public_id).filter(Boolean);

  if (publicIds.length > 0) {
    // 3. Llamar a tu backend para que elimine las imágenes de Cloudinary.
    await fetch('http://localhost:4000/eliminar-fotos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicIds }),
    });

    // 4. Marcar las imágenes como no vigentes en tu base de datos.
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
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "pagado" })
      .eq("id", pedidoId);

    if (error) {
      alert("Error al actualizar el pedido: " + error.message);
      console.error("Error de Supabase:", error);
    } else {
      fetchPedidos();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestión de Pedidos</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por nombre o ID:</label>
          <input
            type="text" placeholder="Nombre del cliente o ID del pedido..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por estado:</label>
          <select onChange={(e) => setFilterStatus(e.target.value)} value={filterStatus} className="w-full p-2 border border-gray-300 rounded-md bg-white">
            <option value="activos">Activos (Pagados / Por Transferir)</option>
            <option value="creando">Creando (Borradores)</option>
            <option value="entregado">Entregados</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
      </div>
      
      {loading ? <p>Cargando pedidos...</p> : (
        pedidos.length === 0 ? <p>No se encontraron pedidos con los filtros actuales.</p> : (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="border rounded p-4 mb-6 shadow-sm bg-white">
              <div className="flex flex-wrap justify-between items-start mb-2">
                <div className="flex-grow pr-4">
                  <p><strong>ID:</strong> <span className="text-xs text-gray-600">{pedido.id}</span></p>
                  <p><strong>Fecha:</strong> {new Date(pedido.fecha).toLocaleString()}</p>
                  <p><strong>Cliente:</strong> {pedido.nombre_cliente}</p>
                  <p><strong>Imágenes:</strong> {pedido.imagenes_pedido[0]?.count || 0}</p>
                  <p><strong>Total:</strong> ${pedido.total ? pedido.total.toLocaleString('es-CL') : '0'}</p>
                  <p><strong>Estado:</strong> <span className="font-semibold">{pedido.status}</span></p>
                </div>
                <div className="flex flex-col space-y-2 w-full sm:w-auto mt-4 sm:mt-0">
                    {(() => {
                        const hayImagenes = (pedido.imagenes_pedido[0]?.count || 0) > 0;
                        const isPagado = pedido.status === 'pagado';

                        if (!hayImagenes) return null;

                        return (
                            <button 
                                onClick={() => descargarImagenes(pedido)} 
                                disabled={!isPagado}
                                title={!isPagado ? 'Confirma el pago para habilitar la descarga' : 'Descargar imágenes del pedido'}
                                className={`text-white px-3 py-2 rounded text-sm text-center transition-colors ${
                                    isPagado 
                                    ? 'bg-blue-600 hover:bg-blue-700' 
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Descargar Imágenes
                            </button>
                        );
                    })()}

                    {pedido.status === "por_transferencia" && (
                        <button onClick={() => validarTransferencia(pedido.id)} className="bg-yellow-500 text-white px-3 py-2 rounded text-sm text-center hover:bg-yellow-600">
                            Validar Transferencia
                        </button>
                    )}
                    {pedido.status === "pagado" && (
                        <button onClick={() => marcarComoEntregado(pedido)} className="bg-green-600 text-white px-3 py-2 rounded text-sm text-center hover:bg-green-700">
                            Marcar Entregado
                        </button>
                    )}
                    {(pedido.status !== 'entregado' && pedido.status !== 'anulado') && (
                        <button onClick={() => anularPedido(pedido)} className="bg-red-600 text-white px-3 py-2 rounded text-sm text-center hover:bg-red-700">
                            Anular Pedido
                        </button>
                    )}
                </div>
              </div>
            </div>
          ))
        )
      )}
      {/* ... (Paginación) ... */}
    </div>
  );
};

export default PedidosAdmin;