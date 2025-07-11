import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "./lib/supabaseClient";
import { optimizeImage } from './utils/optimizeImage';

// Importación de Componentes y Páginas
import StrictCropEditor from "./components/StrictCropEditor";
import ReviewOrder from "./ReviewOrder";
import Checkout from "./Checkout";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import DashboardAdmin from "./components/DashboardAdmin";
import PedidosAdmin from "./components/PedidosAdmin";
import ProductosAdmin from "./components/ProductosAdmin";
import DescuentosAdmin from "./components/DescuentosAdmin";
import MisPedidos from './MisPedidos';
import RemoteUploadPage from './RemoteUploadPage';
import CircularProgress from "./components/CircularProgress";

// Importación de Assets y Estilos
import logo from "./assets/logo-luitania1.png";
import "./App.css";

// ====================================================================================
// Componente que gestiona el flujo principal del cliente
// ====================================================================================
const ClienteFlow = () => {
  const user = useUser();
  const navigate = useNavigate();

  // --- ESTADOS PRINCIPALES ---
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [productos, setProductos] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [pedidoId, setPedidoId] = useState(null);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- LÓGICA DE DATOS Y PERSISTENCIA ---
  useEffect(() => {
    const fetchProductos = async () => {
      setLoadingProductos(true);
      const { data, error } = await supabase.from('packs').select('*, pack_items(*)').eq('activo', true).order('id');
      if (error) console.error("Error cargando productos:", error);
      else setProductos(data || []);
      setLoadingProductos(false);
    };
    fetchProductos();
  }, []);

  useEffect(() => {
    if (pedidoId && step > 1) {
      const imagesToSave = images.map(({ file, ...rest }) => rest);
      const pedidoEnProgreso = { pedidoId, images: imagesToSave, selectedPackId, step };
      localStorage.setItem('pedidoEnProgreso', JSON.stringify(pedidoEnProgreso));
    }
  }, [images, pedidoId, selectedPackId, step]);

  useEffect(() => {
    const pedidoGuardado = localStorage.getItem('pedidoEnProgreso');
    if (pedidoGuardado) {
      if (window.confirm("Hemos encontrado un pedido sin terminar. ¿Deseas continuar?")) {
        try {
          const data = JSON.parse(pedidoGuardado);
          setPedidoId(data.pedidoId);
          setSelectedPackId(data.selectedPackId);
          setImages(data.images); 
          setStep(data.step || 2);
          alert("Para continuar, es posible que necesites volver a seleccionar los archivos de imagen originales si la vista previa no carga.");
        } catch (e) {
          localStorage.removeItem('pedidoEnProgreso');
        }
      } else {
        localStorage.removeItem('pedidoEnProgreso');
      }
    }
  }, []);

  // --- HANDLERS DE EVENTOS ---
  const handlePackSelect = (packId) => {
    setSelectedPackId(packId.toString());
  };
  
  // En src/App.jsx, dentro del componente ClienteFlow

const handleImageUpload = async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0 || !selectedPackId) return;

  setIsUploading(true);
  setUploadProgress(0);

  try {
    const response = await fetch("http://localhost:4000/crear-borrador-pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packId: selectedPackId,
        imageCount: files.length,
        clienteId: user.id,
        clienteNombre: user.user_metadata?.name || 'Usuario sin nombre',
        clienteCorreo: user.email,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo crear el pedido.");
    
    const newPedidoId = data.pedidoId;
    setPedidoId(newPedidoId);

    // ✅ 1. Inicializamos un contador de subidas completadas
    let completedCount = 0;

    const uploadPromises = files.map(async (file) => {
      const optimizedFile = await optimizeImage(file);
      
      const formData = new FormData();
      formData.append("file", optimizedFile);
      formData.append("upload_preset", "FotosPublicas");
      formData.append("folder", "Pedidos");

      const cloudinaryRes = await fetch("https://api.cloudinary.com/v1_1/dj0lklrks/image/upload", { method: "POST", body: formData });
      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryRes.ok) throw new Error(cloudinaryData.error.message || 'Error en Cloudinary');

      const { data: newImageRecord, error: supabaseError } = await supabase
        .from("imagenes_pedido").insert([{
            pedido_id: newPedidoId,
            url: cloudinaryData.secure_url,
            url_original: cloudinaryData.secure_url,
            public_id: cloudinaryData.public_id,
            vigente: true,
            subida_en: new Date().toISOString(),
        }]).select().single();
      if (supabaseError) throw supabaseError;
      
      // ✅ 2. Incrementamos el contador y actualizamos el progreso basándonos en él
      completedCount++;
      setUploadProgress((completedCount / files.length) * 100);

      return { ...newImageRecord, file: file };
    });

    const uploadedImagesData = await Promise.all(uploadPromises);
    setImages(uploadedImagesData);
    setStep(2);

  } catch (error) {
    alert("Error al subir las imágenes: " + error.message);
    console.error("Error en handleImageUpload:", error);
  } finally {
    setIsUploading(false);
  }
};

  const handleReset = () => {
    localStorage.removeItem('pedidoEnProgreso');
    setImages([]);
    setPedidoId(null);
    setSelectedPackId("");
    setStep(1);
  };
  
  const selectedPack = useMemo(() => {
    if (!productos || !selectedPackId) return null;
    return productos.find(p => p.id.toString() === selectedPackId);
  }, [selectedPackId, productos]);

  // --- RENDERIZADO ---
  if (!user) {
    return (
      <div className="min-h-screen bg-luitania-cream flex flex-col items-center justify-center p-4">
        <img src={logo} alt="Luitania Logo" className="h-40 mb-4" />
        <h1 className="text-3xl text-luitania-textbrown">Bienvenido a Luitania</h1>
        <p className="mb-6 text-luitania-textbrown/80">Por favor inicia sesión para continuar</p>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luitania-cream p-4 sm:p-8">
      {isUploading && (
        <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
          <CircularProgress progress={uploadProgress} />
        </div>
      )}

      <div className={isUploading ? 'blur-sm pointer-events-none' : ''}>
        {step === 1 && (
          <div className="container mx-auto">
            <header className="text-center mb-10">
              <img src={logo} alt="Luitania Logo" className="h-24 mx-auto object-contain mb-2" />
              <p className="text-luitania-textbrown/70">Revelado de fotografías con amor</p>
              <div className="space-x-4">
                <Link to="/mis-pedidos" className="text-sm text-luitania-sage underline mt-4 inline-block">Mis Pedidos</Link>
                <Link to="/admin" className="text-sm text-luitania-sage underline mt-4 inline-block">Panel de Administración</Link>
              </div>
            </header>
            
            <main className="max-w-5xl mx-auto">
              <h2 className="text-3xl text-center mb-8">Nuestras Opciones y Paquetes</h2>
              {loadingProductos ? (
                <p className="text-center text-gray-500">Cargando paquetes...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {productos.map(p => (
                    <div key={p.id} onClick={() => handlePackSelect(p.id)} className={`p-6 rounded-3xl shadow-soft cursor-pointer transition-all duration-300 flex flex-col text-center ${selectedPackId === p.id.toString() ? 'ring-4 ring-luitania-sage bg-white scale-105' : 'bg-white/70 hover:shadow-xl'}`}>
                      <h3 className="text-xl mb-2">{p.nombre_pack}</h3>
                      <p className="text-sm text-luitania-textbrown/80 flex-grow">{p.descripcion}</p>
                      <div className="my-4">
                        <span className="text-4xl font-lora font-bold">${p.precio.toLocaleString('es-CL')}</span>
                        {p.nombre_pack.includes('Individual') && <span className="text-sm text-gray-500"> / cada una</span>}
                      </div>
                      <ul className="text-xs text-luitania-textbrown/60 space-y-1">
                          {p.pack_items.map(item => <li key={item.id}>› {item.cantidad}x {item.formato_impresion} {item.es_regalo && '(Regalo)'}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-center mt-10">
                <label className={`btn-primary ${!selectedPackId || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUploading ? `Subiendo ${Math.round(uploadProgress)}%...` : 'Siguiente: Subir Fotos'}
                  <input
                    type="file" accept="image/*" multiple
                    onChange={handleImageUpload} className="hidden"
                    disabled={!selectedPackId || loadingProductos || isUploading}
                  />
                </label>
                {!selectedPackId && <p className="text-xs text-luitania-textbrown/60 mt-2">Por favor, selecciona un paquete para continuar.</p>}
              </div>
            </main>
          </div>
        )}

        {step === 2 && ( <StrictCropEditor images={images} setImages={setImages} selectedPackId={selectedPackId} productos={productos} pedidoId={pedidoId} onCropsConfirmed={() => setStep(3)} /> )}
        {step === 3 && ( <ReviewOrder images={images} selectedPack={selectedPack} onBack={() => setStep(2)} onCheckout={() => setStep(4)} /> )}
        {step === 4 && ( <Checkout pedidoId={pedidoId} images={images} selectedPack={selectedPack} onBack={() => setStep(3)} onReset={handleReset} /> )}
      </div>
    </div>
  );
};

// ====================================================================================
// Componente Raíz de la Aplicación con el Enrutador
// ====================================================================================
const App = () => {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={null}>
      <Routes>
        <Route path="/" element={<ClienteFlow />} />
        <Route path="/mis-pedidos" element={<MisPedidos />} />
        <Route path="/subida-remota" element={<RemoteUploadPage />} />
        
        <Route path="/admin" element={ <ProtectedRoute><AdminLayout /></ProtectedRoute> }>
          <Route index element={<DashboardAdmin />} />
          <Route path="pedidos" element={<PedidosAdmin />} />
          <Route path="productos" element={<ProductosAdmin />} />
          <Route path="descuentos" element={<DescuentosAdmin />} />
        </Route>
      </Routes>
    </SessionContextProvider>
  );
};

export default App;