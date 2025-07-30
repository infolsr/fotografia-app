import React from "react";
import CropPreview from "./components/CropPreview"; // Asegúrate que la ruta sea correcta

const ReviewOrder = ({ images, selectedPack, onBack, onCheckout }) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      <div className="flex justify-between items-center p-4">
        <button
          onClick={onBack}
          className="btn-secondary" // Usamos los estilos de botón ya definidos
        >
          &larr; Volver y Editar
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Revisa tu Pedido</h1>
        <button
          onClick={onCheckout}
          className="btn-primary" // Usamos los estilos de botón ya definidos
        >
          Confirmar y Pagar &rarr;
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border text-center">
        <h2 className="text-xl font-semibold">{selectedPack?.nombre_pack || ''}</h2>
        {selectedPack?.pack_items && (
          <div className="text-sm text-gray-600 mt-2">
            <p className="font-semibold">Contenido del paquete:</p>
            {selectedPack.pack_items.map(item => (
              <p key={item.id}>
                - {item.cantidad}x {item.formato_impresion} {/* Corregido para mostrar el formato correcto */}
                {item.es_regalo && <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">Regalo</span>}
              </p>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
        {images.map((img, index) => {
          // — Log JSON completo de la imagen en revisión —
          console.log(
            "🟡 [ReviewOrder] img completo:",
            JSON.stringify({
              id: img.id,
              url: img.url,
              imagePosition: img.imagePosition,
              zoom: img.zoom,
              filter: img.filter,
              hasBorder: img.hasBorder,
              isFlipped: img.isFlipped,
              assignedFormat: img.assignedFormat
            })
          );
            return (
              <div key={img.id || index} className="bg-white p-1 shadow-lg rounded-lg">
                <img
                  src={img.url}
                  alt={`Imagen final ${index + 1}`}
                  className="w-full h-auto object-contain rounded"
                />
              </div>
            );
        })}
      </div>
      
      <div className="text-center mt-4 pb-8">
          <button
            onClick={onCheckout}
            className="btn-primary btn-lg" // Botón grande para confirmar
          >
            Confirmar y Pagar &rarr;
          </button>
      </div>

    </div>
  );
};

export default ReviewOrder;