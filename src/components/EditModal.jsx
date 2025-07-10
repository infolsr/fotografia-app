import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

const EditModal = ({ imageData, onSave, onClose }) => {
  if (!imageData) return null;

  const {
    url, 
    url_original, 
    imagePosition: initialPos, zoom: initialZoom,
    filter: initialFilter, hasBorder: initialBorder, isFlipped: initialFlipped,
    formato,
  } = imageData;

  const [image] = useImage(url_original || url, 'Anonymous');
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 300, height: 450 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 300, height: 450 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && image) {
        const PADDING = 32;
        const MAX_WIDTH = 550;
        const MAX_HEIGHT = 480;
        const VIEWPORT_PADDING_PERCENT = 0.15;

        let containerWidth = containerRef.current.offsetWidth - PADDING;
        let finalWidth = Math.min(containerWidth, MAX_WIDTH);
        
        const cropFormats = {
          "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20,
          "carta": 8.5 / 11, "A4": 210 / 297
        };
        let aspectoMarco = cropFormats[formato] || cropFormats["10x15"];
        const aspectoImagen = image.width / image.height;
        if ((aspectoImagen > 1 && aspectoMarco < 1) || (aspectoImagen < 1 && aspectoMarco > 1)) {
          aspectoMarco = 1 / aspectoMarco;
        }
        let finalHeight = finalWidth / aspectoMarco;

        if (finalHeight > MAX_HEIGHT) {
          finalHeight = MAX_HEIGHT;
          finalWidth = finalHeight * aspectoMarco;
        }

        setStageSize({ width: finalWidth, height: finalHeight });

        const cropBoxWidth = finalWidth * (1 - VIEWPORT_PADDING_PERCENT);
        const cropBoxHeight = finalHeight * (1 - VIEWPORT_PADDING_PERCENT);
        setCropBox({
          width: cropBoxWidth,
          height: cropBoxHeight,
          x: (finalWidth - cropBoxWidth) / 2,
          y: (finalHeight - cropBoxHeight) / 2,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize); 
  }, [image, formato]);

  const [zoom, setZoom] = useState(initialZoom || 1);
  const [imagePosition, setImagePosition] = useState(initialPos || { x: 0, y: 0 });
  const [filter, setFilter] = useState(initialFilter || 'ninguno');
  const [hasBorder, setHasBorder] = useState(initialBorder || false);
  const [isFlipped, setIsFlipped] = useState(initialFlipped || false);
  const imageRef = useRef(null);
  
  const [calculatedProps, setCalculatedProps] = useState({
    scaledWidth: 0, scaledHeight: 0, initialX: 0, initialY: 0, imgX: 0, imgY: 0,
  });

  useEffect(() => {
    if (!image || !cropBox.width) return;

    const zoomToCover = Math.max(cropBox.width / image.width, cropBox.height / image.height);
    const finalZoom = zoomToCover * zoom;
    const scaledWidth = image.width * finalZoom;
    const scaledHeight = image.height * finalZoom;
    
    const x_bound = (scaledWidth - cropBox.width) / 2;
    const y_bound = (scaledHeight - cropBox.height) / 2;
    const pixelOffsetX = x_bound > 0 ? x_bound * imagePosition.x : 0;
    const pixelOffsetY = y_bound > 0 ? y_bound * imagePosition.y : 0;
    
    const initialX = cropBox.x + (cropBox.width - scaledWidth) / 2;
    const initialY = cropBox.y + (cropBox.height - scaledHeight) / 2;
    
    const imgX = initialX + pixelOffsetX;
    const imgY = initialY + pixelOffsetY;

    setCalculatedProps({ scaledWidth, scaledHeight, initialX, initialY, imgX, imgY });

  }, [image, cropBox, zoom, imagePosition]);

  useEffect(() => {
    if (image && imageRef.current && calculatedProps.scaledWidth > 0) {
      const activeFilters = { 'bn': [Konva.Filters.Grayscale], 'sepia': [Konva.Filters.Sepia] }[filter];
      if (activeFilters) { imageRef.current.filters(activeFilters); imageRef.current.cache(); } 
      else { imageRef.current.filters([]); imageRef.current.clearCache(); }
    }
  }, [image, filter, calculatedProps.scaledWidth]);
  
  useEffect(() => {
    if (!image || !calculatedProps.scaledWidth || !cropBox.width) return;
    const { scaledWidth, scaledHeight } = calculatedProps;
    
    const x_bound = (scaledWidth - cropBox.width) / 2;
    const y_bound = (scaledHeight - cropBox.height) / 2;
    
    if (x_bound < 0 || y_bound < 0) return;

    const clampedX = Math.max(-1, Math.min(imagePosition.x, 1));
    const clampedY = Math.max(-1, Math.min(imagePosition.y, 1));

    if (clampedX !== imagePosition.x || clampedY !== imagePosition.y) {
      setImagePosition({ x: clampedX, y: clampedY });
    }
  }, [zoom, cropBox.width, cropBox.height, image, calculatedProps.scaledWidth, calculatedProps.scaledHeight, imagePosition]);

  const { scaledWidth, scaledHeight, initialX, initialY, imgX, imgY } = calculatedProps;

  const handleSave = () => {
    const zoomToCover = Math.max(cropBox.width / image.width, cropBox.height / image.height);
    const zoomReal = zoomToCover * zoom;

    onSave({
      imagePosition,
      zoom,
      zoomReal,
      filter,
      hasBorder,
      isFlipped
    });
    onClose();
  };


  const limitDrag = (pos) => {
    const { x: cropX, y: cropY, width: cropW, height: cropH } = cropBox;
    const minX = cropX + cropW - scaledWidth;
    const maxX = cropX;
    const minY = cropY + cropH - scaledHeight;
    const maxY = cropY;
    const x = Math.max(minX, Math.min(pos.x, maxX));
    const y = Math.max(minY, Math.min(pos.y, maxY));
    return { x, y };
  };

  if (!image) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col sm:flex-row overflow-hidden">
        <div ref={containerRef} className="flex-grow bg-gray-800 flex items-center justify-center p-4">
          <Stage width={stageSize.width} height={stageSize.height}>
            <Layer>
              <KonvaImage
                ref={imageRef}
                image={image}
                x={imgX}
                y={imgY}
                width={scaledWidth}
                height={scaledHeight}
                draggable
                scaleX={isFlipped ? -1 : 1}
                offsetX={isFlipped ? scaledWidth : 0}
                dragBoundFunc={limitDrag}
                // ...
                onDragEnd={(e) => {
                  // Normalización: Convierte los píxeles del arrastre a un ratio (-1 a 1)
                  const x_bound = (scaledWidth - cropBox.width) / 2;
                  const y_bound = (scaledHeight - cropBox.height) / 2;
                  
                  // Calcula la posición del arrastre en píxeles desde el centro
                  const pixelOffsetX = e.target.x() - (cropBox.x + (cropBox.width - scaledWidth) / 2);
                  const pixelOffsetY = e.target.y() - (cropBox.y + (cropBox.height - scaledHeight) / 2);

                  const normalizedX = x_bound > 0 ? pixelOffsetX / x_bound : 0;
                  const normalizedY = y_bound > 0 ? pixelOffsetY / y_bound : 0;
                  
                  setImagePosition({ x: normalizedX, y: normalizedY });
                }}
// ...
              />
            </Layer>
            <Layer>
              <Rect width={stageSize.width} height={stageSize.height} fill="rgba(0,0,0,0.6)" listening={false} />
              <Rect
                x={cropBox.x} y={cropBox.y}
                width={cropBox.width} height={cropBox.height}
                fill="white"
                globalCompositeOperation="destination-out"
                listening={false}
              />
            </Layer>
            <Layer>
              <Rect
                x={cropBox.x} y={cropBox.y}
                width={cropBox.width} height={cropBox.height}
                stroke="red"
                strokeWidth={cropBox.width * 0.005}
                listening={false}
              />
            </Layer>
            {hasBorder && (() => {
              const strokeWidth = cropBox.width * 0.04;
              return (
                <Layer>
                  <Rect
                    x={cropBox.x + strokeWidth / 2}
                    y={cropBox.y + strokeWidth / 2}
                    width={cropBox.width - strokeWidth}
                    height={cropBox.height - strokeWidth}
                    stroke="white"
                    strokeWidth={strokeWidth}
                    listening={false}
                  />
                </Layer>
              );
            })()}
          </Stage>
        </div>
        <div className="w-full sm:w-80 bg-white p-6 flex flex-col space-y-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-3">Editor Avanzado</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-thumb"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtro de Color</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="ninguno">Ninguno</option>
              <option value="bn">Blanco y Negro</option>
              <option value="sepia">Sepia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opciones</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={hasBorder} onChange={() => setHasBorder(!hasBorder)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                <span className="text-gray-700">Añadir borde blanco</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={isFlipped} onChange={() => setIsFlipped(!isFlipped)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                <span className="text-gray-700">Espejar imagen</span>
              </label>
            </div>
          </div>
          <div className="flex-grow"></div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onClose} className="btn-secondary w-full justify-center">Cancelar</button>
            <button onClick={handleSave} className="btn-primary w-full justify-center">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;