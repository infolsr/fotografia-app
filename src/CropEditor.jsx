import React, { useState, useEffect } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg, { getCroppedBlob } from "./utils/cropImage"; // ⬅️ Asegúrate que getCroppedBlob esté exportado

// ...

const CropEditor = ({ images, setImages, selectedSize, onNext }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openEditor = (index) => {
    setCurrentIndex(index);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setModalOpen(true);
  };

  const onCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const applyCrop = async () => {
    const currentImage = images[currentIndex];

    try {
      const croppedImage = await getCroppedImg(
        currentImage.url,
        croppedAreaPixels,
        rotation
      );

      const croppedBlob = await getCroppedBlob(
        currentImage.url,
        croppedAreaPixels,
        rotation
      );

      const updated = [...images];
      updated[currentIndex] = {
        ...currentImage,
        url: croppedImage,
        croppedBlob: croppedBlob, // ✅ Se guarda el blob recortado
      };

      setImages(updated);
      setModalOpen(false);
    } catch (err) {
      console.error("❌ Error aplicando crop:", err);
    }
  };

  const handleDelete = (index) => {
    const updated = [...images];
    updated.splice(index, 1);
    setImages(updated);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 rounded shadow">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Ajustar Imágenes ({selectedSize})</h2>
        <label className="cursor-pointer text-sm text-blue-600 font-semibold underline">
          + Añadir más fotos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const newFiles = Array.from(e.target.files);
              const newImages = newFiles.map((file) => ({
                file,
                url: URL.createObjectURL(file),
              }));
              setImages((prev) => [...prev, ...newImages]);
            }}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img, index) => (
          <div key={index} className="relative border p-2 rounded">
            <img
              src={img.url}
              alt={`Imagen ${index}`}
              className="w-full h-40 object-cover"
              onClick={() => openEditor(index)}
            />
            <button
              onClick={() => handleDelete(index)}
              className="absolute top-1 right-1 bg-red-500 text-white px-2 rounded"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Volver al inicio
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Siguiente
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-6xl h-[700px] flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Editor - {selectedSize}</h2>
            <div className="flex-grow relative bg-gray-100 rounded overflow-hidden">
              <Cropper
                image={images[currentIndex].url}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={getAspectRatio(selectedSize)}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-2 w-full sm:w-1/2">
                  <label className="w-20">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-1/2">
                  <label className="w-20">Rotación</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-center mt-4 space-x-4">
                <button
                  onClick={() => setRotation((prev) => prev - 90)}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  ↺ 90°
                </button>
                <button
                  onClick={() => setRotation((prev) => prev + 90)}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  ↻ 90°
                </button>
                <button
                  onClick={() => {
                    setRotation(0);
                    setZoom(1);
                    setCrop({ x: 0, y: 0 });
                  }}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Reset
                </button>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyCrop}
                  className="px-4 py-2 bg-green-500 text-white rounded"
                >
                  Guardar recorte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getAspectRatio(size) {
  switch (size) {
    case "10x15":
      return 3 / 2;
    case "13x18":
      return 18 / 13;
    case "Carta":
      return 11 / 8.5;
    case "A4":
      return 297 / 210;
    default:
      return 3 / 2;
  }
}

export default CropEditor;
