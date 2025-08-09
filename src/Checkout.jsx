import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
// 1. Importamos las regiones y comunas desde el nuevo archivo de datos
import { regiones } from "../data/regiones-y-comunas";

const Checkout = ({ pedidoId, images, selectedPack, onBack, onReset }) => {
  const user = useUser();
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [cliente, setCliente] = useState({ nombre: user?.user_metadata?.name || "", correo: user?.email || "", telefono: "" });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [accionPago, setAccionPago] = useState(null);
  const [mensajeFinal, setMensajeFinal] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountMessage, setDiscountMessage] = useState({ text: "", type: "" });

  // --- ✅ INICIO: NUEVOS ESTADOS PARA EL ENVÍO ---
  const [tipoEntrega, setTipoEntrega] = useState("retiro"); // 'retiro' o 'envio'
  const [shippingAddress, setShippingAddress] = useState({
    rut: "",
    region: "",
    comuna: "",
    direccion: "",
  });
  const [comunasDisponibles, setComunasDisponibles] = useState([]);
  // --- FIN: NUEVOS ESTADOS PARA EL ENVÍO ---

  const handleResetAndClear = () => {
    localStorage.removeItem('pedidoEnProgreso');
    onReset();
  };

  const subtotal = useMemo(() => {
    if (!selectedPack) return 0;
    if (selectedPack.es_individual) {
      return images.length * selectedPack.precio;
    }
    return selectedPack.precio;
  }, [images, selectedPack]);

  const total = useMemo(() => {
    if (!appliedDiscount) return subtotal;
    let discountAmount = 0;
    if (appliedDiscount.tipo_descuento === 'porcentaje') {
      discountAmount = (subtotal * appliedDiscount.valor) / 100;
    } else {
      discountAmount = appliedDiscount.valor;
    }
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, appliedDiscount]);

  const handleApplyDiscount = async () => { /* ... tu función no cambia ... */ };

  // ✅ Efecto para actualizar las comunas cuando cambia la región
  useEffect(() => {
    if (shippingAddress.region) {
      const regionSeleccionada = regiones.find(r => r.nombre === shippingAddress.region);
      setComunasDisponibles(regionSeleccionada ? regionSeleccionada.comunas : []);
      setShippingAddress(prev => ({ ...prev, comuna: "" })); // Resetea la comuna
    } else {
      setComunasDisponibles([]);
    }
  }, [shippingAddress.region]);
  
  // ✅ Handler para los cambios en el formulario de dirección
  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePago = () => {
    setAccionPago(metodoPago === 'mercadopago' ? 'mercado' : 'transferencia');
    setMostrarFormulario(true);
  };

  // ✅ Función de envío de formulario MODIFICADA
  const handleFormularioSubmit = async (e) => {
    e.preventDefault();
    setMostrarFormulario(false);

    // Preparamos el objeto con los datos a actualizar
    let datosAActualizar = {
        nombre_cliente: cliente.nombre,
        correo_cliente: cliente.correo,
        telefono_cliente: cliente.telefono,
        metodo_pago: metodoPago,
        status: metodoPago === 'transferencia' ? 'por_transferencia' : 'en_proceso_pago',
        descuento_id: appliedDiscount ? appliedDiscount.id : null,
        total: total
    };
    
    // Si se eligió envío, añadimos la dirección al objeto
    if (tipoEntrega === 'envio') {
      // Aquí podrías añadir validaciones para los campos de dirección si quieres
      datosAActualizar.direccion_envio = shippingAddress;
    }

    // Se realiza la actualización en la base de datos
    const { error: updateError } = await supabase.from('pedidos').update(datosAActualizar).eq('id', pedidoId);

    if (updateError) {
      alert("Error al guardar los datos del pedido: " + updateError.message);
      return;
    }

    // Se procede con la lógica de pago
    if (accionPago === "mercado") {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/crear-pago`, { /* ... */ });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (data.init_point) window.location.href = data.init_point;
      } catch (error) { 
        alert("Error al iniciar pago: " + error.message); 
      }
    } else { // Lógica para transferencia
      setMensajeFinal(true);
    }
  };
  
  if (mensajeFinal) { /* ... tu JSX de mensaje final no cambia ... */ }

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        {/* --- Resumen, Descuentos y Total (sin cambios) --- */}
        <div className="text-center mb-8"><h2 className="text-2xl font-bold mb-2">Resumen Final del Pedido</h2><p className="text-gray-600">Confirma los detalles antes de pagar.</p></div>
        <div className="bg-gray-50 p-6 rounded-lg mb-6 space-y-3"><div className="flex justify-between"><span className="font-medium text-gray-700">Producto:</span><span className="font-bold">{selectedPack?.nombre_pack || "Cargando..."}</span></div><div className="flex justify-between"><span className="font-medium text-gray-700">Cantidad de imágenes:</span><span className="font-bold">{images.length}</span></div></div>
        <div className="mb-6"><label className="block text-sm font-medium mb-1">¿Tienes un código de descuento?</label><div className="flex gap-2"><input type="text" placeholder="Escribe tu código" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="flex-grow border rounded p-2" disabled={!!appliedDiscount}/><button onClick={handleApplyDiscount} className={`px-4 py-2 rounded text-white ${appliedDiscount ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-800'}`} disabled={!!appliedDiscount}>Aplicar</button></div>{discountMessage.text && (<p className={`text-sm mt-2 ${discountMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{discountMessage.text}</p>)}</div>
        <div className="text-right space-y-2 border-t pt-4 mb-6"><p className="text-gray-600">Subtotal: ${subtotal.toLocaleString('es-CL')}</p>{appliedDiscount && (<p className="text-green-600">Descuento ({appliedDiscount.codigo}): -${(subtotal - total).toLocaleString('es-CL')}</p>)}<p className="text-2xl font-semibold">Total a pagar: ${total.toLocaleString('es-CL')}</p></div>
        
        {/* --- ✅ INICIO: NUEVO FORMULARIO DE ENTREGA --- */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold mb-3">Método de Entrega</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className={`flex items-center gap-2 border p-3 rounded-lg cursor-pointer transition-colors ${tipoEntrega === "retiro" ? 'bg-luitania-sage/20 border-luitania-sage' : 'hover:bg-gray-50'}`}>
              <input type="radio" name="tipoEntrega" value="retiro" checked={tipoEntrega === "retiro"} onChange={(e) => setTipoEntrega(e.target.value)} className="form-radio text-luitania-sage" />
              Coordinar Retiro
            </label>
            <label className={`flex items-center gap-2 border p-3 rounded-lg cursor-pointer transition-colors ${tipoEntrega === "envio" ? 'bg-luitania-sage/20 border-luitania-sage' : 'hover:bg-gray-50'}`}>
              <input type="radio" name="tipoEntrega" value="envio" checked={tipoEntrega === "envio"} onChange={(e) => setTipoEntrega(e.target.value)} className="form-radio text-luitania-sage"/>
              Envío a Domicilio
            </label>
          </div>

          {tipoEntrega === 'envio' && (
            <div className="space-y-3 p-4 border rounded-md bg-gray-50 animate-fade-in">
              <div><label className="block text-sm font-medium mb-1">RUT Destinatario</label><input type="text" name="rut" placeholder="12.345.678-9" value={shippingAddress.rut} onChange={handleShippingChange} className="border p-2 rounded w-full"/></div>
              <div><label className="block text-sm font-medium mb-1">Región</label><select name="region" value={shippingAddress.region} onChange={handleShippingChange} className="border p-2 rounded w-full bg-white"><option value="">Selecciona una región</option>{regiones.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Comuna</label><select name="comuna" value={shippingAddress.comuna} onChange={handleShippingChange} disabled={!shippingAddress.region} className="border p-2 rounded w-full bg-white disabled:bg-gray-200"><option value="">Selecciona una comuna</option>{comunasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Dirección (Calle y Número)</label><input type="text" name="direccion" placeholder="Ej: Av. del Mar 123, Depto 45" value={shippingAddress.direccion} onChange={handleShippingChange} className="border p-2 rounded w-full"/></div>
            </div>
          )}
          
          {(tipoEntrega === 'retiro' || (shippingAddress.region === 'Coquimbo' && shippingAddress.comuna === 'Coquimbo')) && (
             <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-800 text-center animate-fade-in">
               <p>Para la entrega, coordinaremos contigo a través de nuestro WhatsApp <a href="https://wa.me/56995000093" target="_blank" rel="noopener noreferrer" className="font-bold underline">+56 9 9500 0093</a>.</p>
             </div>
          )}
        </div>
        {/* --- FIN: NUEVO FORMULARIO DE ENTREGA --- */}

        {/* --- Métodos de Pago y Botones (sin cambios) --- */}
        <div className="border-t pt-6 mt-6">
            <label className="block mb-2 font-medium">Selecciona método de pago:</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="border rounded p-2 w-full bg-white">
                <option value="transferencia">Transferencia Electrónica</option>
            </select>
        </div>
        {metodoPago === 'transferencia' && ( /* ... tu JSX de datos de transferencia no cambia ... */ )}
        <div className="flex justify-between mt-8"><button onClick={onBack} className="btn-secondary">Volver</button><button onClick={handlePago} className="btn-primary">Ir a Pagar</button></div>
        {mostrarFormulario && ( /* ... tu JSX del modal de datos del cliente no cambia ... */ )}
    </div>
  );
};

export default Checkout;