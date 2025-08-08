import React, { useState, useEffect, useMemo, useCallback } from "react";
import EditModal from "./EditModal";
import CropPreview from './CropPreview';
import { supabase } from '../lib/supabaseClient';
import CircularProgress from './CircularProgress';
import RemoteUploader from './RemoteUploader';
import { getFinalCropFromView } from "../utils/getFinalCropFromView";
// Importa processImage si no está ya importado
import { processImage } from '../utils/cropImage'; 

const StrictCropEditor = ({ images, setImages, selectedPackId, productos, pedidoId, onCropsConfirmed, onAddImages, onReset  }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const isModalOpen = editingImageIndex !== null;
  const [showQRModal, setShowQRModal] = useState(false);

  // --- ORDEN CORRECTO DE LOS useMemo ---

  // 1. Obtener el paquete seleccionado primero, ya que otros lo necesitan.
  const selectedPack = useMemo(() => {
    if (!productos || !selectedPackId) return null;
    return productos.find(p => p.id.toString() === selectedPackId);
  }, [selectedPackId, productos]);

  // 2. Calcular el total requerido para todo el paquete.
  const totalRequiredCount = useMemo(() => {
    if (!selectedPack?.pack_items) return 0;
    return selectedPack.pack_items.reduce((sum, item) => sum + item.cantidad, 0);
  }, [selectedPack]);

  // 3. Separar los ítems regulares y de regalo.
  const { giftItems, regularItem } = useMemo(() => {
    if (!selectedPack?.pack_items) return { giftItems: [], regularItem: null };
    return {
      giftItems: selectedPack.pack_items.filter(item => item.es_regalo),
      regularItem: selectedPack.pack_items.find(item => !item.es_regalo)
    };
  }, [selectedPack]);

  // 4. Lógica para deshabilitar el botón de confirmación.
  const isConfirmDisabled = useMemo(() => {
    if (selectedPack && !selectedPack.es_individual) {
      return images.length < totalRequiredCount;
    }
    return false;
  }, [selectedPack, images.length, totalRequiredCount]);


  // --- useEffect para asignar el pack_item_id por defecto ---
  useEffect(() => {
    const regularItemId = regularItem?.id;
    if (!regularItemId) return;
    const imagesToInitialize = images.filter(img => !img.pack_item_id);
    if (imagesToInitialize.length === 0) return;
    setImages(currentImages =>
      currentImages.map(img =>
        img.pack_item_id ? img : { ...img, pack_item_id: regularItemId }
      )
    );
  }, [images, regularItem, setImages]);

  // --- useEffect para cargar dimensiones de la imagen ---
  useEffect(() => {
    const imagesToInitialize = images.filter(img => img.url_original && !img.naturalWidth);
    if (imagesToInitialize.length === 0) return;
    const initializationPromises = imagesToInitialize.map(imageToInit => {
      return new Promise((resolve) => {
        const imgLoader = new Image();
        imgLoader.crossOrigin = 'Anonymous';
        imgLoader.src = imageToInit.url_original || imageToInit.url;
        imgLoader.onload = () => {
          const { naturalWidth, naturalHeight } = imgLoader;
          resolve({
            ...imageToInit, naturalWidth, naturalHeight,
            imagePosition: { x: 0, y: 0 }, zoom: 1,
            filter: 'ninguno', hasBorder: false, isFlipped: false
          });
        };
        imgLoader.onerror = () => resolve(imageToInit);
      });
    });
    Promise.all(initializationPromises).then(initializedImages => {
      setImages(currentImages =>
        currentImages.map(originalImg => {
          const foundInitialized = initializedImages.find(initImg => initImg.id === originalImg.id);
          return foundInitialized || originalImg;
        })
      );
    });
  }, [images, setImages]);

  // En: src/components/StrictCropEditor.jsx

  // --- useEffect para escuchar cambios en tiempo real ---
  useEffect(() => {
    // 1. Asegurarse de que tenemos un pedidoId para escuchar.
    if (!pedidoId) return;
    console.log(`%c[StrictCropEditor] Suscribiéndose a cambios en tiempo real para el pedido: ${pedidoId}`, 'color: purple; font-weight: bold;');
    // 2. Crear un canal de comunicación único para este pedido.
    const channel = supabase.channel(`pedido-imagenes-${pedidoId}`);

    // 3. Suscribirse a los eventos de INSERCIÓN en la tabla 'imagenes_pedido'.
    channel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'imagenes_pedido',
            filter: `pedido_id=eq.${pedidoId}` // Escuchar solo cambios para el pedido actual.
        },
        (payload) => {
            console.log('%c[StrictCropEditor] ¡NUEVA IMAGEN RECIBIDA DE SUPABASE REALTIME!', 'color: red; font-weight: bold;', payload.new);
            // 4. Añadir la nueva imagen al estado local, actualizando la UI.
            setImages(currentImages => {
              // Evita añadir duplicados si la imagen ya existe
              if (currentImages.some(img => img.id === payload.new.id)) {
                console.log(`%c[StrictCropEditor] DUPLICADO DETECTADO. La imagen con id ${payload.new.id} ya existe. No se añadirá.`, 'color: orange;');
                return currentImages;
              }
              return [...currentImages, payload.new];
            });
        }
    ).subscribe();

    // 5. Función de limpieza para desconectarse del canal cuando el componente ya no es visible.
    return () => {
      console.log(`%c[StrictCropEditor] Desuscribiéndose de los cambios en tiempo real.`, 'color: purple;');
      supabase.removeChannel(channel);
    };
  }, [pedidoId, setImages]); // Dependencias para el efecto.

  // --- MANEJADORES DE EVENTOS ---
  const handleDeleteImage = (indexToDelete) => {
    setImages(images.filter((_, index) => index !== indexToDelete));
  };

  const handleImageUpdate = useCallback((index, updates) => {
    setImages(currentImages =>
      currentImages.map((img, i) => (i === index ? { ...img, ...updates } : img))
    );
  }, [setImages]);

  const handleItemAssignment = (imageId, newPackItemId) => {
    const allPackItems = [regularItem, ...giftItems].filter(Boolean);
    const targetItem = allPackItems.find(item => item.id === newPackItemId);
    if (!targetItem) return;

    setImages(currentImages => {
      const countInTargetSlot = currentImages.filter(img => img.pack_item_id === newPackItemId).length;
      if (countInTargetSlot >= targetItem.cantidad) {
        alert(`No puedes asignar más imágenes a "${targetItem.formato_impresion}", el límite es ${targetItem.cantidad}.`);
        return currentImages;
      }
      return currentImages.map(img =>
        img.id === imageId ? { ...img, pack_item_id: newPackItemId } : img
      );
    });
  };

  const handleConfirmAndContinue = async () => {
    setIsLoading(true);

    try {
      // 1. Recolecta los datos de transformación de cada imagen en un array.
      // Ya no se procesa nada en el cliente, solo se juntan los datos.
      const transformationData = images.map(img => {
        // Obtenemos el formato de impresión asignado para pasarlo al backend
        const allPackItems = [regularItem, ...giftItems].filter(Boolean);
        const assignedItem = allPackItems.find(item => item.id === img.pack_item_id);
        const formatoAsignado = assignedItem ? assignedItem.formato_impresion : '10x15';

        return {
          id: img.id, // ID de la imagen en la tabla imagenes_pedido
          public_id: img.public_id,
          imagePosition: img.imagePosition,
          zoom: img.zoom,
          filter: img.filter,
          hasBorder: img.hasBorder,
          isFlipped: img.isFlipped,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          formatoAsignado: formatoAsignado,
          pack_item_id: img.pack_item_id,
          acabado: img.paperFinish || 'brillante', // Mantenemos el acabado del papel
        };
      });

      // 2. Envía el lote completo de "recetas" al nuevo endpoint del backend.
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/finalizar-imagenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: pedidoId,
          transformations: transformationData,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Error en el servidor");

      // 3. Actualiza el estado local con las nuevas URLs devueltas por el backend.
      // 3. Actualiza el estado local de forma inteligente, preservando las ediciones.
      const updatedImagesFromBackend = result.updatedImages;
      setImages(currentImages => {
        return currentImages.map(localImage => {
          // Busca la imagen correspondiente que volvió del backend.
          const backendImage = updatedImagesFromBackend.find(img => img.id === localImage.id);
          if (backendImage) {
            // Si la encuentra, actualiza SOLO la URL y mantiene el resto de las propiedades locales.
            return { ...localImage, url: backendImage.url };
          }
          // Si no la encuentra (no debería pasar), devuelve la imagen local sin cambios.
          return localImage;
        });
      });
      
      // 4. Continúa al siguiente paso del flujo.
      setTimeout(() => {
        setIsLoading(false);
        onCropsConfirmed();
      }, 500);

    } catch (error) {
      alert("Error al finalizar los recortes: " + error.message);
      setIsLoading(false);
    }
  };
  
  const handleOpenEditModal = (index) => setEditingImageIndex(index);
  const handleCloseEditModal = () => setEditingImageIndex(null);

  return (
    <>
      {isLoading && (<div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50"><CircularProgress progress={uploadProgress} /></div>)}
      <div className={`space-y-6 max-w-7xl mx-auto ${isLoading ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="bg-white p-4 rounded-lg shadow-md border text-center">
          <h2 className="text-xl font-semibold">{selectedPack?.nombre_pack || ''}</h2>
          {selectedPack?.pack_items && (
            <div className="text-sm text-gray-600 mt-2">
              <p className="font-semibold">Contenido del paquete:</p>
              {selectedPack.pack_items.map(item => (
                <p key={item.id}>
                  - {item.cantidad}x {item.formato_impresion}
                  {item.es_regalo && <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">Regalo</span>}
                </p>
              ))}
            </div>
          )}
          {selectedPack && !selectedPack.es_individual && (
            <div className="mt-4 px-4">
              <div className="flex justify-between items-center text-sm font-semibold mb-1">
                <span>Progreso Total del Paquete</span>
                <span>{images.length} de {totalRequiredCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${(images.length / totalRequiredCount) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
            {/* 👇 INICIO DEL BLOQUE AÑADIDO */}
            {/* Nuevo bloque para el CONTADOR en paquetes individuales */}
            {selectedPack && selectedPack.es_individual && (
              <div className="mt-4 text-center">
                <p className="text-lg font-semibold text-luitania-textbrown">
                  Fotos Subidas: <span className="text-2xl font-lora text-luitania-sage">{images.length}</span>
                </p>
              </div>
            )}
            {/* 👆 FIN DEL BLOQUE AÑADIDO */}
        </div>
        <div className="text-center flex justify-center items-center gap-4">
          <label className="btn-secondary cursor-pointer">
            + Agregar más fotos
            <input 
              type="file" 
              multiple
              accept="image/*" 
              className="hidden"
              onChange={onAddImages} 
            />
          </label>
          <button onClick={() => setShowQRModal(true)} className="btn-secondary">Añadir desde móvil (QR)</button>
        </div>
        
        {/* El banner de regalos obsoleto ha sido eliminado */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
          {images.map((img, i) => {
            const allPackItems = [regularItem, ...giftItems].filter(Boolean);
            const currentItem = allPackItems.find(item => item.id === img.pack_item_id);
            const esRegaloActual = currentItem ? currentItem.es_regalo : false;
            const formatoActual = currentItem ? currentItem.formato_impresion : 'Cargando...';

            return (
              <div key={img.id || i} className={`relative flex flex-col bg-white shadow-lg rounded-lg overflow-hidden border-2 ${esRegaloActual ? 'border-yellow-400' : 'border-gray-200'}`}>
                <button onClick={() => handleDeleteImage(i)} className="absolute top-2 right-2 z-10 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/60">&times;</button>
                <div className="p-2 flex-grow flex flex-col items-center justify-center bg-gray-200">
                  {img.naturalWidth && 
                   <CropPreview
                      index={i}
                      imageUrl={img.url_original || img.url}
                      formato={formatoActual}
                      isDraggable={true}
                      imagePosition={img.imagePosition}
                      zoom={img.zoom}
                      onImageUpdate={handleImageUpdate}
                      naturalWidth={img.naturalWidth}
                      naturalHeight={img.naturalHeight}
                      filter={img.filter}
                      hasBorder={img.hasBorder}
                      isFlipped={img.isFlipped}
                    />}
                </div>
                <div className="p-3 bg-gray-50 space-y-3">
                  <div className="text-center">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Asignar a:</label>
                    <select
                      value={img.pack_item_id || ''}
                      onChange={(e) => handleItemAssignment(img.id, parseInt(e.target.value, 10))}
                      className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {regularItem && (
                        <option value={regularItem.id}>
                          Foto {regularItem.formato_impresion}
                        </option>
                      )}
                      {giftItems.map(gift => (
                        <option key={gift.id} value={gift.id}>
                          Regalo: {gift.formato_impresion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t pt-3 text-center">
                    <button 
                      onClick={() => handleOpenEditModal(i)} 
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Más Opciones...
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="col-span-full mt-4 pb-8 flex flex-col items-center justify-center gap-4">
          <button 
            onClick={handleConfirmAndContinue} 
            className="btn-primary"
            disabled={isConfirmDisabled}
          >
            Confirmar y Continuar
          </button>

                  {/* 3. AÑADE ESTE NUEVO BOTÓN AQUÍ */}
        <button 
          onClick={onReset} 
          className="text-sm text-red-600 hover:underline"
        >
          Anular y Empezar de Nuevo
        </button>
        
          {isConfirmDisabled && (
            <p className="text-xs text-luitania-textbrown/60 mt-2">
              Debes subir todas las imágenes de tu paquete para poder continuar.
            </p>
          )}
        </div>
      </div>
      {showQRModal && (<RemoteUploader pedidoId={pedidoId} onClose={() => setShowQRModal(false)} />)}
      {isModalOpen && (<EditModal imageData={images[editingImageIndex]} onSave={(customizations) => handleImageUpdate(editingImageIndex, customizations)} onClose={handleCloseEditModal} />)}
    </>
  );
};

export default StrictCropEditor;