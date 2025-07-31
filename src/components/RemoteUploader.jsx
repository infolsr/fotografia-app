// src/components/RemoteUploader.jsx
import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const RemoteUploader = ({ pedidoId, onClose }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const createRemoteSession = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/crear-sesion-remota`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidoId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setToken(data.token);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    createRemoteSession();
  }, [pedidoId]);

  const uploadUrl = `${window.location.origin}/subida-remota?token=${token}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-2xl text-gray-500 hover:text-gray-800">&times;</button>
        <h2 className="text-2xl font-bold mb-4">Añadir desde tu móvil</h2>
        <p className="text-gray-600 mb-6">Escanea este código QR con la cámara de tu teléfono o tablet para subir fotos directamente a este pedido.</p>
        
        <div className="flex justify-center items-center h-64">
          {loading && <p>Generando código...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {token && (
            <QRCodeCanvas
              value={uploadUrl}
              size={256}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"L"}
              includeMargin={true}
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-4">Este código expirará en 10 minutos.</p>
      </div>
    </div>
  );
};

export default RemoteUploader;