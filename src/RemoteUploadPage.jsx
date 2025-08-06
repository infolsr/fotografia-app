import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { optimizeImage } from './utils/optimizeImage';

// --- 👇 SE AÑADEN LAS VARIABLES DE ENTORNO FALTANTES 👇 ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

const RemoteUploadPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('validando');
  const [pedidoId, setPedidoId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setErrorMsg('No se proporcionó un token de sesión.');
        setStatus('error');
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/validar-sesion-remota/${token}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        setPedidoId(data.pedidoId);
        setStatus('listo');
      } catch (err) {
        setErrorMsg(err.message);
        setStatus('error');
      }
    };
    validateToken();
  }, [token]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (files.length > 20) {
      alert("Puedes seleccionar un máximo de 20 fotos a la vez.");
      return;
    }

    setStatus('subiendo');
    setUploadProgress({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const optimizedFile = await optimizeImage(file);

        const formData = new FormData();
        formData.append("file", optimizedFile);
        formData.append("upload_preset", "FotosPublicas");
        formData.append("folder", "Pedidos");

        // --- 👇 LA CORRECCIÓN SE USA AQUÍ 👇 ---
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData,
        });
        const cloudinaryData = await res.json();
        if (!res.ok) throw new Error(cloudinaryData.error.message || 'Error en Cloudinary');

        const { error: supabaseError } = await supabase.from("imagenes_pedido").insert([{
          pedido_id: pedidoId,
          url: cloudinaryData.secure_url,
          url_original: cloudinaryData.secure_url,
          public_id: cloudinaryData.public_id,
        }]);

        if (supabaseError) throw supabaseError;
        
      } catch (err) {
        setErrorMsg(`Error al subir el archivo ${file.name}: ${err.message}`);
        setStatus('error');
        return;
      }
    }

    setStatus('completado');
  };

  const renderContent = () => {
    switch (status) {
      case 'validando':
        return <p>Validando sesión...</p>;
      case 'error':
        return <p className="text-red-600 font-semibold">{errorMsg}</p>;
      case 'subiendo':
        return (
          <div>
            <p className="text-lg font-semibold">Subiendo imágenes...</p>
            <p>{uploadProgress.current} de {uploadProgress.total}</p>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
              <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
            </div>
          </div>
        );
      case 'completado':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-2">¡Éxito!</h2>
            <p>Tus fotos se han añadido al pedido. Ya puedes cerrar esta ventana.</p>
          </div>
        );
      case 'listo':
      default:
        return (
          <label className="btn-primary cursor-pointer">
            Seleccionar Fotos
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Subida de Fotos Remota</h1>
      <p className="text-gray-600 mb-8 max-w-md">Añade fotos desde este dispositivo a tu pedido principal. Cuando termines, puedes cerrar esta ventana.</p>
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        {renderContent()}
      </div>
    </div>
  );
};

export default RemoteUploadPage;