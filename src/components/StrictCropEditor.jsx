import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import EditModal from "./EditModal";
import CropPreview from './CropPreview';
import { processImage } from '../utils/cropImage';
import { supabase } from '../lib/supabaseClient';
import CircularProgress from './CircularProgress';
import RemoteUploader from './RemoteUploader';
import { calcularRecorteAjustado } from './handleConfirmCrop';
import { getFinalCropFromView } from "../utils/getFinalCropFromView";

const StrictCropEditor = ({ images, setImages, selectedPackId, productos, pedidoId, onCropsConfirmed }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const isModalOpen = editingImageIndex !== null;
  const [showQRModal, setShowQRModal] = useState(false);
  
  // --- ARQUITECTURA FINAL: useRef para evitar "stale state" ---
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const selectedPack = useMemo(() => {
    if (!productos || !selectedPackId) return null;
    return productos.find(p => p.id.toString() === selectedPackId);
  }, [selectedPackId, productos]);

  const { formatosDisponibles } = useMemo(() => {
    if (!selectedPack) return { formatosDisponibles: [] };
    const desglose = selectedPack.pack_items.map(item => item.formato_impresion);
    const formatos = [...new Set(desglose)];
    return { formatosDisponibles: formatos };
  }, [selectedPack]);

  useEffect(() => {
    if (formatosDisponibles.length > 0) {
      const primerFormato = formatosDisponibles[0];
      const necesitaAsignacion = images.some(img => !img.assignedFormat);
      if (necesitaAsignacion) {
        setImages(currentImages =>
          currentImages.map(img =>
            img.assignedFormat ? img : { ...img, assignedFormat: primerFormato }
          )
        );
      }
    }
  }, [images, formatosDisponibles, setImages]);

  useEffect(() => {
    const imagesToInitialize = images.filter(img => img.url_original && !img.initialCrop);
    if (imagesToInitialize.length === 0) return;
    
    const aspectoPorTamanio = { "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20, "carta": 8.5 / 11, "A4": 210 / 297 };

    const initializationPromises = imagesToInitialize.map(imageToInit => {
      return new Promise((resolve, reject) => {
        const imgLoader = new Image();
        imgLoader.crossOrigin = 'Anonymous';
        imgLoader.src = imageToInit.url_original || imageToInit.url;
        imgLoader.onload = () => {
          const { naturalWidth, naturalHeight } = imgLoader;
          const formato = imageToInit.assignedFormat || "10x15";
          let aspectoMarco = aspectoPorTamanio[formato] || aspectoPorTamanio["10x15"];
          const aspectoImagen = naturalWidth / naturalHeight;
          if ((aspectoImagen > 1 && aspectoMarco < 1) || (aspectoImagen < 1 && aspectoMarco > 1)) {
            aspectoMarco = 1 / aspectoMarco;
          }
          let cropWidth, cropHeight;
          if (aspectoImagen > aspectoMarco) {
            cropHeight = naturalHeight;
            cropWidth = Math.round(cropHeight * aspectoMarco);
          } else {
            cropWidth = naturalWidth;
            cropHeight = Math.round(cropWidth / aspectoMarco);
          }
          const cropParams = { x: Math.round((naturalWidth - cropWidth) / 2), y: Math.round((naturalHeight - cropHeight) / 2), width: cropWidth, height: cropHeight };
          console.log("🟢 [StrictCropEditor] InitialCrop generado para imagen", imageToInit.id, cropParams);
          resolve({
            ...imageToInit,
            imagePosition: { x: 0, y: 0 },
            zoom: 1,
            filter: 'ninguno',
            hasBorder: false,
            isFlipped: false,
            initialCrop: cropParams,
          });
        };
        imgLoader.onerror = reject;
      });
    });

    Promise.all(initializationPromises).then(initializedImages => {
      setImages(currentImages =>
        currentImages.map(originalImg => {
          const foundInitialized = initializedImages.find(initImg => initImg.id === originalImg.id);
          return foundInitialized || originalImg;
        })
      );
    }).catch(error => console.error("Error inicializando imágenes", error));
  }, [images, setImages, formatosDisponibles]);

  const handleDeleteImage = (indexToDelete) => {
    setImages(images.filter((_, index) => index !== indexToDelete));
  };
  
  // --- MANEJADOR SIMPLE ---
  // Esta función ahora es "tonta". Solo guarda los cambios en el estado.
const handleImageUpdate = useCallback((index, updates) => {
  setImages(currentImages =>
    currentImages.map((img, i) => {
      if (i !== index) return img;

      // Previene sobrescribir un zoomReal válido con uno inválido
     const incomingZoomReal = typeof updates.zoomReal === 'number' && !isNaN(updates.zoomReal)
        ? updates.zoomReal
        : img.zoomReal ?? 1;

      const finalZoomReal = Math.max(1, incomingZoomReal); // asegura que sea al menos 1

      return {
        ...img,
        ...updates,
        zoomReal: finalZoomReal
      };

    })
  );
}, [setImages]);


  


  // --- FUNCIÓN "CEREBRO" FINAL ---
  // Lee los datos frescos desde la ref y hace todos los cálculos al momento del clic.
  const handleConfirmAndContinue = async () => {
    setIsLoading(true);
    setUploadProgress(0);
    try {
        imagesRef.current = [...images]; // Fuerza sincronización antes del cálculo
        const aspectoPorTamanio = { "10x15": { width: 1000, height: 1500 }, "13x18": { width: 1300, height: 1800 }, "15x20": { width: 1500, height: 2000 }, "carta": { width: 1275, height: 1650 }, "A4": { width: 1240, height: 1754 } };
        const processedImagesData = [];
        const currentImages = imagesRef.current;
        
        for (let i = 0; i < currentImages.length; i++) {
            const img = currentImages[i];
            //debugger; // <--- PONLO AQUÍ

            if (!img.initialCrop) {
                processedImagesData.push(img);
                setUploadProgress(((i + 1) / currentImages.length) * 100);
                continue;
            }
            
            console.log("📸 Parámetros antes de calcular recorte:", {
              id: img.id,
              imageUrl: img.url_original || img.url,
              zoom: img.zoom,
              zoomReal: img.zoomReal,
              imagePosition: img.imagePosition,
              initialCrop: img.initialCrop
            });

            if (!img.zoomReal || isNaN(img.zoomReal)) {
              console.warn("⚠️ [StrictCropEditor] zoomReal no válido, se usará 1. Imagen:", img.id);
              console.log("🧩 Imagen completa al fallar zoomReal:", JSON.stringify(img, null, 2));
              img.zoomReal = 1;
            }


            const adjustedCropParams = getFinalCropFromView(img);
            const formatoAsignado = img.assignedFormat || formatosDisponibles[0];
            const printSize = aspectoPorTamanio[formatoAsignado] || aspectoPorTamanio["10x15"];
            const longSide = Math.max(printSize.width, printSize.height);
            const shortSide = Math.min(printSize.width, printSize.height);
            const cropIsHorizontal = adjustedCropParams.width > adjustedCropParams.height;
            const dimensiones = cropIsHorizontal ? { width: longSide, height: shortSide } : { width: shortSide, height: longSide };
            const opciones = { filter: img.filter, isFlipped: img.isFlipped, hasBorder: img.hasBorder };

            const finalBlob = await processImage(img.url_original || img.url, adjustedCropParams, opciones, dimensiones);
            
            const formData = new FormData();
            formData.append("file", finalBlob, img.public_id);
            formData.append("public_id", img.public_id);
            const res = await fetch("http://localhost:4000/sobrescribir-imagen", { method: "POST", body: formData });
            const cloudinaryData = await res.json();
            if (!res.ok) throw new Error(cloudinaryData.error || "Error en el servidor");
            await supabase.from('imagenes_pedido').update({ url: cloudinaryData.secure_url, acabado: img.paperFinish || 'brillante', filtro: img.filter || 'ninguno', borde: img.hasBorder || false, espejado: img.isFlipped || false, }).eq('id', img.id);
            processedImagesData.push({ ...img, url: cloudinaryData.secure_url });
            setUploadProgress(((i + 1) / currentImages.length) * 100);
        }

        setImages(processedImagesData);
        setTimeout(() => { setIsLoading(false); onCropsConfirmed(); }, 500);
    } catch (error) {
        alert("Ocurrió un error al procesar las imágenes: " + error.message);
        console.error(error);
        setIsLoading(false);
    }
  };
  
  const handleOpenEditModal = (index) => setEditingImageIndex(index);
  const handleCloseEditModal = () => setEditingImageIndex(null);

  return (
    <>
      {isLoading && (<div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50"><CircularProgress progress={uploadProgress} /></div>)}
      <div className={`space-y-6 max-w-7xl mx-auto ${isLoading ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="bg-white p-4 rounded-lg shadow-md border text-center"><h2 className="text-xl font-semibold">{selectedPack.nombre_pack}</h2></div>
        <div className="text-center flex justify-center items-center gap-4">
          <label className="btn-secondary cursor-pointer">+ Agregar más fotos<input type="file" multiple accept="image/*" className="hidden" /></label>
          <button onClick={() => setShowQRModal(true)} className="btn-secondary">Añadir desde móvil (QR)</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
          {images.map((img, i) => (
            <div key={img.id || i} className="relative flex flex-col bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 justify-between">
              <button onClick={() => handleDeleteImage(i)} className="absolute top-2 right-2 z-10 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/60" aria-label="Eliminar imagen">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
              <div className="p-2 flex-grow flex flex-col items-center justify-center bg-gray-200">
                {img.initialCrop && <CropPreview
                  index={i}
                  imageUrl={img.url_original || img.url}
                  formato={img.assignedFormat || formatosDisponibles[0]}
                  isFlipped={img.isFlipped}
                  hasBorder={img.hasBorder}
                  isDraggable={true}
                  imagePosition={img.imagePosition}
                  zoom={img.zoom}
                  onImageUpdate={handleImageUpdate}
                />}
              </div>
              <div className="p-3 bg-gray-50">
                <div className="bg-white p-2">{img.public_id?.substring(0, 20) || `Imagen ${i + 1}`}</div>
                <div className="text-center mt-3 border-t pt-2"><button onClick={() => handleOpenEditModal(i)} className="text-sm">Más Opciones...</button></div>
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-full mt-4 flex justify-center space-x-4">
          <button onClick={() => window.location.reload()} className="btn-secondary" disabled={isLoading}>Cancelar</button>
          <button
            onClick={() => {
              console.log("🔎 Estado actual de images antes de confirmar:", images);
              handleConfirmAndContinue();
            }}
            className="btn-primary"
            disabled={isLoading}
          >
            Confirmar Recortes y Continuar
          </button>
        </div>
      </div>
      {showQRModal && (<RemoteUploader pedidoId={pedidoId} onClose={() => setShowQRModal(false)} />)}
      {isModalOpen && (
        <EditModal
          imageData={images[editingImageIndex]}
          onSave={(customizations) => {
            console.log("🛬 Cambios recibidos desde modal:", customizations);
            handleImageUpdate(editingImageIndex, customizations);
            console.log("📦 Estado actualizado de images tras guardar:", imagesRef.current);

          }}
          onClose={handleCloseEditModal}
        />
      )}
    </>
  );
};

export default StrictCropEditor;