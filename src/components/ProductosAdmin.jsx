import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// --- INICIO: COMPONENTE MODAL MODIFICADO ---
// Ahora puede manejar tanto la creación (pack=null) como la edición (pack=objeto)
const EditPackModal = ({ pack, onSave, onClose }) => {
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    // Si recibe un 'pack', está en modo edición.
    // Si 'pack' es nulo, está en modo creación y se inicializa un formulario vacío.
    if (pack) {
      setFormData({ ...pack });
    } else {
      setFormData({
        nombre_pack: "",
        precio: 0,
        descripcion: "",
        pack_items: [{ formato_impresion: '10x15', cantidad: 1, es_regalo: false }],
      });
    }
  }, [pack]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newItems = [...formData.pack_items];
    newItems[index] = { ...newItems[index], [name]: type === 'checkbox' ? checked : value };
    setFormData(prev => ({ ...prev, pack_items: newItems }));
  };

  const addItem = () => {
    const newItems = [...formData.pack_items, { formato_impresion: '10x15', cantidad: 1, es_regalo: false }];
    setFormData(prev => ({ ...prev, pack_items: newItems }));
  };

  const removeItem = (index) => {
    const newItems = formData.pack_items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, pack_items: newItems }));
  };

  if (!formData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        {/* El título cambia dependiendo del modo */}
        <h2 className="text-xl font-bold mb-4">{pack ? `Editando Paquete: ${pack.nombre_pack}` : "Crear Nuevo Paquete"}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Paquete</label>
            <input type="text" name="nombre_pack" value={formData.nombre_pack} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Precio</label>
            <input type="number" name="precio" value={formData.precio} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows="3"></textarea>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Contenido del Paquete</h3>
          <div className="space-y-2">
            {formData.pack_items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                <input type="text" name="formato_impresion" placeholder="Formato" value={item.formato_impresion} onChange={(e) => handleItemChange(index, e)} className="p-1 border rounded w-1/3"/>
                <input type="number" name="cantidad" placeholder="Cantidad" value={item.cantidad} onChange={(e) => handleItemChange(index, e)} className="p-1 border rounded w-1/4"/>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="es_regalo" checked={item.es_regalo} onChange={(e) => handleItemChange(index, e)} /> Es Regalo</label>
                <button onClick={() => removeItem(index)} className="text-red-500 font-bold">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="mt-2 text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">+ Añadir Ítem</button>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};
// --- FIN: COMPONENTE MODAL ---


const ProductosAdmin = () => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState(null);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("packs").select("*, pack_items(*)").order('id');
    if (error) console.error("Error cargando paquetes:", error);
    else setPacks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  const handleToggleActive = async (pack) => {
    const nuevoEstado = !pack.activo;
    await supabase.from("packs").update({ activo: nuevoEstado }).eq("id", pack.id);
    fetchPacks();
  };

  const handleEdit = (pack) => {
    setEditingPack(pack);
    setIsModalOpen(true);
  };

  // --- INICIO: NUEVA FUNCIÓN PARA CREAR ---
  const handleCreate = () => {
    setEditingPack(null); // Asegura que el modal sepa que es modo creación
    setIsModalOpen(true);
  };
  // --- FIN: NUEVA FUNCIÓN PARA CREAR ---

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPack(null);
  };

  const handleSave = async (packData) => {
    if (packData.id) {
      // --- LÓGICA DE EDICIÓN (existente) ---
      const { error } = await supabase.rpc('actualizar_pack_completo', {
        pack_id_to_update: packData.id,
        new_nombre: packData.nombre_pack,
        new_precio: packData.precio,
        new_descripcion: packData.descripcion,
        new_items: packData.pack_items.map(({ formato_impresion, cantidad, es_regalo }) => ({
          formato_impresion, cantidad: Number(cantidad), es_regalo
        }))
      });
      if (error) alert("Error guardando el paquete.");
    } else {
      // --- LÓGICA DE CREACIÓN (nueva) ---
      const { nombre_pack, precio, descripcion, pack_items } = packData;
      // 1. Inserta el paquete principal
      const { data: newPack, error: packError } = await supabase
        .from("packs")
        .insert({ nombre_pack, precio, descripcion })
        .select()
        .single();
      
      if (packError) {
        alert("Error creando el nuevo paquete.");
        console.error(packError);
        return;
      }
      
      // 2. Prepara los ítems con el ID del nuevo paquete
      const newItems = pack_items.map(item => ({
        pack_id: newPack.id,
        formato_impresion: item.formato_impresion,
        cantidad: Number(item.cantidad),
        es_regalo: item.es_regalo,
      }));

      // 3. Inserta los ítems
      const { error: insertError } = await supabase.from("pack_items").insert(newItems);
      if (insertError) alert("Error guardando los ítems del paquete.");
    }
    
    handleCloseModal();
    fetchPacks();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestión de Productos y Paquetes</h1>
      <div className="mb-4 text-right">
        {/* Botón de crear ahora tiene una función */}
        <button onClick={handleCreate} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          + Crear Nuevo Paquete
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md border">
        {loading ? <p>Cargando productos...</p> : (
          <div className="space-y-4">
            {packs.map(pack => (
              <div key={pack.id} className={`p-3 border rounded-md ${!pack.activo ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}`}>
                <div className="flex flex-wrap justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{pack.nombre_pack}</h3>
                    <p className="text-sm text-gray-500">{pack.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <span className="font-mono text-lg text-green-600">${pack.precio.toLocaleString('es-CL')}</span>
                    <button onClick={() => handleEdit(pack)} className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600">Editar</button>
                    <button onClick={() => handleToggleActive(pack)} className={`px-3 py-1 text-sm rounded ${pack.activo ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-500 text-white hover:bg-gray-600'}`}>
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
      {isModalOpen && <EditPackModal pack={editingPack} onSave={handleSave} onClose={handleCloseModal} />}
    </div>
  );
};

export default ProductosAdmin;