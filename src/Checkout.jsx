import React, { useState, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

// ✅ Se cambian los props para recibir el pedidoId y el selectedPack completo
const Checkout = ({ pedidoId, images, selectedPack, onBack, onReset }) => {
  const user = useUser();
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [cliente, setCliente] = useState({ nombre: user?.user_metadata?.name || "", correo: user?.email || "", telefono: "" });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [accionPago, setAccionPago] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeFinal, setMensajeFinal] = useState(false);
  
  // La lógica de descuentos no cambia
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountMessage, setDiscountMessage] = useState({ text: "", type: "" });

  const handleResetAndClear = () => {
    localStorage.removeItem('pedidoEnProgreso');
    onReset();
  }

  // ✅ El subtotal ahora se calcula de forma más simple y segura
  const subtotal = useMemo(() => {
    if (!selectedPack) return 0;
    if (selectedPack.es_individual) {
          return images.length * selectedPack.precio;
    }
    return selectedPack.precio;
  }, [images, selectedPack]);

  // La lógica del total no cambia
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

  // Ya no necesitamos la función generarPedido aquí, se movió a App.jsx (implícitamente)
  // y al backend. El formulario de pago ahora es más simple.
  
  const handlePago = () => {
    // Definimos si la acción es para mercado pago o transferencia y mostramos el form
    setAccionPago(metodoPago === 'mercadopago' ? 'mercado' : 'transferencia');
    setMostrarFormulario(true);
  };

  const handleFormularioSubmit = async (e) => {
    e.preventDefault();
    setMostrarFormulario(false);

    if (accionPago === "mercado") {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/crear-pago`, {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            packId: selectedPack.id,
            expectedSubtotal: subtotal
          }),
        });

        const data = await response.json();
        if (response.status === 409) {
          alert(`¡Atención! ${data.error} El precio actual es $${data.precios.actual}.`);
          return;
        }
        if (!response.ok) throw new Error(data.error || "No se pudo iniciar el pago.");
        
        // Antes de redirigir, actualizamos el pedido con los datos del cliente y el estado final.
        await supabase.from('pedidos').update({
            nombre_cliente: cliente.nombre,
            correo_cliente: cliente.correo,
            telefono_cliente: cliente.telefono,
            metodo_pago: 'mercadopago',
            status: 'en_proceso_pago',
            descuento_id: appliedDiscount ? appliedDiscount.id : null,
            total: total // Actualizamos el total final por si hubo descuento
        }).eq('id', pedidoId);

        if (data.init_point) window.location.href = data.init_point;
      } catch (error) { 
        alert("Error de conexión al iniciar pago: " + error.message); 
      }
    } else { // Lógica para transferencia
      await supabase.from('pedidos').update({
          nombre_cliente: cliente.nombre,
          correo_cliente: cliente.correo,
          telefono_cliente: cliente.telefono,
          metodo_pago: 'transferencia',
          status: 'por_transferencia',
          descuento_id: appliedDiscount ? appliedDiscount.id : null,
          total: total
      }).eq('id', pedidoId);
      setMensajeFinal(true);
    }
  };

  // ... El resto del JSX (return) se simplifica ...
  
  if (mensajeFinal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-6">
        <h1 className="text-2xl font-bold mb-4">🎉 ¡Gracias por tu pedido!</h1>
        <p className="mb-6">Hemos guardado tu pedido. Recibirás un correo de confirmación.</p>
        <p className="text-sm text-gray-600 mb-6">Si elegiste transferencia, no olvides enviar el comprobante a nuestro correo.</p>
        <button onClick={handleResetAndClear} className="btn-primary">Realizar un nuevo pedido</button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Resumen Final del Pedido</h2>
            <p className="text-gray-600">Confirma los detalles antes de pagar.</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg mb-6 space-y-3">
            <div className="flex justify-between">
                <span className="font-medium text-gray-700">Producto:</span>
                <span className="font-bold">{selectedPack?.nombre_pack || "Cargando..."}</span>
            </div>
            <div className="flex justify-between">
                <span className="font-medium text-gray-700">Cantidad de imágenes:</span>
                <span className="font-bold">{images.length}</span>
            </div>
        </div>
        <div className="mb-6">
            <label className="block text-sm font-medium mb-1">¿Tienes un código de descuento?</label>
            <div className="flex gap-2">
                <input type="text" placeholder="Escribe tu código" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="flex-grow border rounded p-2" disabled={!!appliedDiscount}/>
                <button onClick={handleApplyDiscount} className={`px-4 py-2 rounded text-white ${appliedDiscount ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-800'}`} disabled={!!appliedDiscount}>Aplicar</button>
            </div>
            {discountMessage.text && (<p className={`text-sm mt-2 ${discountMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{discountMessage.text}</p>)}
        </div>
        <div className="text-right space-y-2 border-t pt-4 mb-6">
            <p className="text-gray-600">Subtotal: ${subtotal.toLocaleString('es-CL')}</p>
            {appliedDiscount && (<p className="text-green-600">Descuento ({appliedDiscount.codigo}): -${(subtotal - total).toLocaleString('es-CL')}</p>)}
            <p className="text-2xl font-semibold">Total a pagar: ${total.toLocaleString('es-CL')}</p>
        </div>
        <div className="mb-6">
            <label className="block mb-2 font-medium">Selecciona método de pago:</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="border rounded p-2 w-full bg-white">
                <option value="transferencia">Transferencia Electrónica</option>
                {/*<option value="mercadopago">Mercado Pago (Tarjetas de crédito/débito)</option>*/}
            </select>
        </div>
        {/* 👇 INICIO DEL BLOQUE AÑADIDO */}
        {metodoPago === 'transferencia' && (
            <div className="mt-6 p-4 bg-luitania-sage/10 border border-luitania-sage/30 rounded-lg text-sm text-left transition-all duration-300 ease-in-out">
              <h3 className="font-lora font-bold text-luitania-sage mb-2">Datos para la Transferencia</h3>
              <p className="text-luitania-textbrown/80 mb-3">
                Para finalizar, realiza la transferencia por el monto total y envía el comprobante a nuestro correo.
              </p>
            <div className="space-y-1 text-luitania-textbrown">
              <p><strong>Banco:</strong> Mercado Pago</p>
              <p><strong>Tipo de Cuenta:</strong> Cuenta Vista</p>
              <p><strong>N° de Cuenta:</strong> 1048829808</p>
              <p><strong>Nombre:</strong> Britania Lara Naranjo</p>
              <p><strong>RUT:</strong> 15455513-7</p>
              <p><strong>Correo:</strong> luitaniafotos@gmail.com</p>
              <p className="font-bold mt-2"><strong>Monto:</strong> ${total.toLocaleString('es-CL')}</p>
            </div>
          </div>
        )}
        {/* 👆 FIN DEL BLOQUE AÑADIDO */}

        <div className="flex justify-between mt-8">
            <button onClick={onBack} className="btn-secondary">Volver</button>
            <button onClick={handlePago} className="btn-primary">Ir a Pagar</button>
        </div>
        {mostrarFormulario && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <form onSubmit={handleFormularioSubmit} className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Último paso: Tus datos</h3>
                    <p className="text-sm text-gray-600 mb-4">Estos datos se usarán para confirmar tu pedido.</p>
                    <input type="text" required placeholder="Nombre completo" className="border p-2 rounded w-full mb-3" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} />
                    <input type="email" required placeholder="Correo electrónico" className="border p-2 rounded w-full mb-3" value={cliente.correo} onChange={(e) => setCliente({ ...cliente, correo: e.target.value })} />
                    <input type="tel" placeholder="Teléfono (opcional)" className="border p-2 rounded w-full mb-4" value={cliente.telefono} onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setMostrarFormulario(false)} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Confirmar y Pagar</button>
                    </div>
                </form>
            </div>
        )}
        {/* La pantalla de subida ya no se muestra aquí */}
    </div>
  );
};

export default Checkout;