import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

// Se leen las variables de entorno necesarias
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RemoteUploadPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('validando');
  const [pedidoId, setPedidoId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

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

    // --- 👇 INICIO DE LA VALIDACIÓN AÑADIDA 👇 ---
    // Se aplica el límite de subida para dispositivos móviles.
    const uploadLimit = 15; 
    if (files.length > uploadLimit) {
      alert(`Puedes seleccionar un máximo de ${uploadLimit} fotos a la vez para una subida estable.`);
      e.target.value = null; // Limpia el input para una nueva selección
      return;
    }
    // --- 👆 FIN DE LA VALIDACIÓN 👆 ---

    setStatus('subiendo');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pedidoId', pedidoId);
      files.forEach(file => {
        formData.append('images', file);
      });

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/subir-imagenes`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || "No se pudieron subir las imágenes."));
            } catch {
              reject(new Error("Ocurrió un error inesperado en el servidor."));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Error de red al intentar subir las imágenes."));
        xhr.send(formData);
      });
      
      setStatus('completado');

    } catch (err) {
      setErrorMsg(`Error al subir los archivos: ${err.message}`);
      setStatus('error');
    }
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
            <p>{Math.round(uploadProgress)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
              <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
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