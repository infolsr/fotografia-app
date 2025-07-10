import React, { useEffect, useState, useCallback } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "../lib/supabaseClient";

const PEDIDOS_PER_PAGE = 5;

// --- INICIO: NUEVO COMPONENTE PARA GESTIONAR PAQUETES ---
const PackManager = () => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    // Esta consulta trae los paquetes y, anidados, los items que contiene cada uno.
    const { data, error } = await supabase
      .from("packs")
      .select("*, pack_items(*)")
      .order('id');

    if (error) {
      console.error("Error cargando paquetes:", error);
    } else {
      setPacks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold mb-4">📦 Gestión de Paquetes y Productos</h2>
      <div className="bg-white p-4 rounded-lg shadow-md border">
        {loading ? <p>Cargando productos...</p> : (
          <div className="space-y-4">
            {packs.map(pack => (
              <div key={pack.id} className="p-3 border rounded-md">
                <div className="flex flex-wrap justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{pack.nombre_pack}</h3>
                    <p className="text-sm text-gray-500">{pack.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <span className="font-mono text-lg text-green-600">${pack.precio.toLocaleString('es-CL')}</span>
                    <button className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600">Editar</button>
                    <button className={`px-3 py-1 text-sm rounded ${pack.activo ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {pack.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
                <div className="mt-3 border-t pt-2">
                  <h4 className="text-sm font-semibold text-gray-600">Contenido del paquete:</h4>
                  <ul className="list-disc list-inside pl-2 mt-1">
                    {pack.pack_items.map(item => (
                      <li key={item.id} className="text-sm text-gray-700">
                        {item.cantidad} x {item.formato_impresion}
                        {item.es_regalo && <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">Regalo</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
// --- FIN: NUEVO COMPONENTE ---


const PriceManager = () => {
    // ... (el código de PriceManager que ya tenías no cambia)
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);
    const [editPrice, setEditPrice] = useState("");
  
    const fetchProductos = useCallback(async () => {
      setLoading(true);
      const { data, error } = await supabase.from("productos").select("*").order('id');
      if (error) {
        console.error("Error cargando productos:", error);
      } else {
        setProductos(data || []);
      }
      setLoading(false);
    }, []);
  
    useEffect(() => {
      fetchProductos();
    }, [fetchProductos]);
  
    const handleEdit = (producto) => {
      setEditId(producto.id);
      setEditPrice(producto.precio);
    };
  
    const handleSave = async (id) => {
      if (isNaN(parseFloat(editPrice)) || parseFloat(editPrice) < 0) {
        alert("Por favor, introduce un precio válido.");
        return;
      }
      await supabase
        .from("productos")
        .update({ precio: parseFloat(editPrice) })
        .eq("id", id);
      
      setEditId(null);
      setEditPrice("");
      fetchProductos();
    };
  
    return (
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">⚙️ Gestión de Precios (obsoleto)</h2>
        <div className="bg-white p-4 rounded-lg shadow-md border">
          {/* ... JSX de PriceManager ... */}
        </div>
      </div>
    );
};


const AdminView = () => {
  // ... (todo el código que ya tienes en AdminView se mantiene igual)
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({pedidosHoy: 0,ingresosMes: 0,pendientesEntrega: 0,});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchDashboardData = useCallback(async () => { /* ... */ }, []);
  const fetchPedidos = useCallback(async () => { /* ... */ }, [currentPage, filterStatus, searchTerm]);

  useEffect(() => {
    fetchDashboardData();
    fetchPedidos();
  }, [fetchDashboardData, fetchPedidos]);

  // ... (todas tus otras funciones como handleSearchChange, marcarComoEntregado, etc.)


  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📦 Panel de Administración</h1>

      {/* ... (Tu Dashboard y Filtros de Pedidos) ... */}
      
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

      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
        {/* ... */}
      </div>

      {/* ... (Tu lista de pedidos) ... */}

      <div className="mt-8 flex justify-between items-center">
        {/* ... */}
      </div>
      
      {/* --- SE AÑADE EL NUEVO GESTOR DE PAQUETES --- */}
      <PackManager />

      {/* El gestor de precios anterior ya no es necesario con la nueva estructura */}
      {/* <PriceManager /> */}
    </div>
  );
};

export default AdminView;