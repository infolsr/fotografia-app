import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// --- Componente Modal para Crear/Editar Descuentos ---
const EditDiscountModal = ({ discount, onSave, onClose }) => {
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (discount) {
      setFormData({ ...discount });
    } else {
      // Estado inicial para un nuevo código
      setFormData({
        codigo: "",
        tipo_descuento: "porcentaje",
        valor: 10,
        usos_maximos: null,
        fecha_expiracion: null,
      });
    }
  }, [discount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === "" ? null : value }));
  };

  if (!formData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{discount ? "Editar Código de Descuento" : "Crear Nuevo Código"}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Código</label>
            <input type="text" name="codigo" placeholder="EJ: BIENVENIDA10" value={formData.codigo} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md"/>
          </div>
          <div className="flex gap-4">
            <div className="flex-grow">
              <label className="block text-sm font-medium">Tipo</label>
              <select name="tipo_descuento" value={formData.tipo_descuento} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md">
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto_fijo">Monto Fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Valor</label>
              <input type="number" name="valor" value={formData.valor} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md"/>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium">Límite de Usos (opcional)</label>
              <input type="number" name="usos_maximos" placeholder="Ej: 100" value={formData.usos_maximos || ""} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md"/>
            </div>
            <div>
              <label className="block text-sm font-medium">Fecha Expiración (opcional)</label>
              <input type="date" name="fecha_expiracion" value={formData.fecha_expiracion ? formData.fecha_expiracion.split('T')[0] : ""} onChange={handleChange} className="mt-1 block w-full border p-2 rounded-md"/>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Guardar</button>
        </div>
      </div>
    </div>
  );
};


// --- Componente Principal de la Vista ---
const DescuentosAdmin = () => {
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("descuentos").select("*").order('created_at', { ascending: false });
    if (error) console.error("Error cargando descuentos:", error);
    else setDescuentos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleToggleActive = async (discount) => {
    await supabase.from("descuentos").update({ activo: !discount.activo }).eq("id", discount.id);
    fetchDiscounts();
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDiscount(null);
  };

  const handleSave = async (formData) => {
    const dataToSave = { ...formData };
    
    // Si la fecha está vacía, asegúrate de que sea null
    if (dataToSave.fecha_expiracion === '') {
      dataToSave.fecha_expiracion = null;
    }

    if (formData.id) {
      // Modo Edición
      const { error } = await supabase.from("descuentos").update(dataToSave).eq("id", formData.id);
      if (error) alert("Error actualizando código: " + error.message);
    } else {
      // Modo Creación
      const { error } = await supabase.from("descuentos").insert(dataToSave);
      if (error) alert("Error creando código: " + error.message);
    }
    
    handleCloseModal();
    fetchDiscounts();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No expira";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Códigos de Descuento</h1>
        <button onClick={handleCreate} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">+ Crear Nuevo Código</button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md border">
        {loading ? <p>Cargando...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Expiración</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {descuentos.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold">{d.codigo}</td>
                    <td className="px-4 py-3">{d.tipo_descuento}</td>
                    <td className="px-4 py-3">{d.tipo_descuento === 'porcentaje' ? `${d.valor}%` : `$${d.valor}`}</td>
                    <td className="px-4 py-3">{d.usos_actuales} / {d.usos_maximos || '∞'}</td>
                    <td className="px-4 py-3">{formatDate(d.fecha_expiracion)}</td>
                    <td className="px-4 py-3">{d.activo ? <span className="text-green-600 font-semibold">Activo</span> : <span className="text-gray-500">Inactivo</span>}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEdit(d)} className="text-blue-600 hover:underline text-xs">Editar</button>
                      <button onClick={() => handleToggleActive(d)} className="text-yellow-600 hover:underline text-xs">{d.activo ? 'Desactivar' : 'Activar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {isModalOpen && <EditDiscountModal discount={editingDiscount} onSave={handleSave} onClose={handleCloseModal} />}
    </div>
  );
};

export default DescuentosAdmin;