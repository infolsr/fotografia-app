import React from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const OrderHistory = () => {
  const history = JSON.parse(localStorage.getItem("photoOrders") || "[]");

  const handleDownloadZip = async (orderIndex) => {
    const zip = new JSZip();
    const order = history[orderIndex];

    for (let i = 0; i < order.images.length; i++) {
      const image = order.images[i];
      const response = await fetch(image.url);
      const blob = await response.blob();
      const extension = blob.type.split("/")[1];
      zip.file(`foto_${i + 1}.${extension}`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `pedido_luitania_${orderIndex + 1}.zip`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Historial de pedidos</h2>
      {history.length === 0 ? (
        <p className="text-gray-600">Aún no hay pedidos guardados.</p>
      ) : (
        history.map((pedido, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded p-4 mb-6 bg-gray-50"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">
                Pedido #{index + 1} - Tamaño: {pedido.size}
              </h3>
              <button
                onClick={() => handleDownloadZip(index)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm"
              >
                Descargar ZIP
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pedido.images.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={`Pedido ${index + 1} - Imagen ${i + 1}`}
                  className="w-full h-32 object-cover rounded border"
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default OrderHistory;