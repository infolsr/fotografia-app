import React, { useEffect, useState } from "react";

const PagoView = () => {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("pedidos")) || [];
    const visibles = data.filter(p => p.status !== "finalizado");
    setPedidos(visibles);
  }, []);

const pagar = async (pedido) => {
  try {
    const response = await fetch("https://luitania-backend.onrender.com/crear-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: `Pedido ${pedido.id}`,
        precio: 10000 // puedes reemplazar con un campo real si lo tienes
      }),
    });

    const data = await response.json();
    if (data.init_point) {
      window.location.href = data.init_point;
    }
  } catch (error) {
    console.error("Error al iniciar pago:", error);
  }
};


  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Vista Cliente</h1>
      {pedidos.map(pedido => (
        <div key={pedido.id} className="border p-3 mb-3 rounded shadow">
          <p><strong>ID:</strong> {pedido.id}</p>
          <p><strong>Estado:</strong> {pedido.status}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {pedido.imagenes && pedido.imagenes.map((img, i) => (
              <img key={i} src={img.dataUrl} alt={img.nombre} className="w-20 h-20 object-cover" />
            ))}
          </div>
          {pedido.status === "pendiente" && (
          <button
            className="mt-2 bg-blue-600 text-white px-4 py-1 rounded"
            onClick={() => pagar(pedido)}
          >
            Pagar con Mercado Pago
          </button>
        )}
        </div>
      ))}
    </div>
  );
};

export default PagoView;