import React, { useEffect, useState, useRef } from 'react';
// 1. Se importa 'Rect' para poder dibujar el borde
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

const CropPreview = ({
  index,
  imageUrl,
  formato = "10x15",
  imagePosition = { x: 0, y: 0 },
  zoom = 1,
  isDraggable = true,
  onImageUpdate = () => {},
  naturalWidth,
  naturalHeight,
  filter, 
  hasBorder, 
  isFlipped
}) => {
  const [image] = useImage(imageUrl, 'Anonymous');
  const [stageSize, setStageSize] = useState({ width: 200, height: 300 });
  const [renderProps, setRenderProps] = useState({ scale: 1, x: 0, y: 0 });
  const imageRef = useRef(null);

  // Efecto 1: Calcula el tamaño del escenario (sin cambios)
  useEffect(() => {
    if (!naturalWidth) return;
    const cropFormats = { "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20, "carta": 8.5 / 11, "A4": 210 / 297 };
    let targetAspect = cropFormats[formato] || cropFormats["10x15"];
    const imageAspect = naturalWidth / naturalHeight;
    if ((imageAspect > 1 && targetAspect < 1) || (imageAspect < 1 && targetAspect > 1)) {
      targetAspect = 1 / targetAspect;
    }
    const baseWidth = 200;
    setStageSize({ width: baseWidth, height: Math.round(baseWidth / targetAspect) });
  }, [formato, naturalWidth, naturalHeight]);

  // Efecto 2: Calcula todas las props visuales (sin cambios)
  useEffect(() => {
      if (!naturalWidth || !stageSize.width) return;
      const viewportWidth = stageSize.width;
      const viewportHeight = stageSize.height;
      const scaleToCover = Math.max(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
      const finalScale = scaleToCover * zoom;
      const scaledWidth = naturalWidth * finalScale;
      const scaledHeight = naturalHeight * finalScale;
      const x_bound = (scaledWidth - viewportWidth) / 2;
      const y_bound = (scaledHeight - viewportHeight) / 2;
      const pixelOffsetX = x_bound > 0 ? x_bound * imagePosition.x : 0;
      const pixelOffsetY = y_bound > 0 ? y_bound * imagePosition.y : 0;
      const initialX = (viewportWidth - scaledWidth) / 2;
      const initialY = (viewportHeight - scaledHeight) / 2;
      const x = initialX + pixelOffsetX;
      const y = initialY + pixelOffsetY;
      setRenderProps({ scale: finalScale, x, y });
  }, [naturalWidth, naturalHeight, stageSize, zoom, imagePosition]);

  // 3. Se mejora el useEffect de los filtros para mayor fiabilidad
  useEffect(() => {
    if (!imageRef.current || !image) return;
    const konvaImage = imageRef.current;
    const activeFilters = { 'bn': [Konva.Filters.Grayscale], 'sepia': [Konva.Filters.Sepia] }[filter];
    
    if (activeFilters) {
      konvaImage.filters(activeFilters);
    } else {
      konvaImage.filters([]);
    }
    konvaImage.cache();
    // Se fuerza un redibujado para asegurar que el filtro se aplique visualmente
    konvaImage.getLayer()?.batchDraw();

  }, [filter, image]); // Se añade 'image' a la dependencia

  if (!image || !naturalWidth) {
    return <div style={{width: stageSize.width, height: stageSize.height, backgroundColor: '#f0f0f0'}} />;
  }
  
  const { scale, x, y } = renderProps;
  
  return (
    <Stage width={stageSize.width} height={stageSize.height} className="rounded-md">
      <Layer clip={{ x: 0, y: 0, width: stageSize.width, height: stageSize.height }}>
        <KonvaImage
          ref={imageRef}
          image={image}
          width={naturalWidth * scale}
          height={naturalHeight * scale}
          x={x}
          y={y}
          scaleX={isFlipped ? -1 : 1}
          offsetX={isFlipped ? (naturalWidth * scale) : 0}
          draggable={isDraggable}
          onDragEnd={(e) => {
            // ... tu lógica de drag end ... (sin cambios)
          }}
          dragBoundFunc={(pos) => {
            // ... tu lógica de drag bound ... (sin cambios)
          }}
        />
      </Layer>

      {/* 4. SE AÑADE LA LÓGICA PARA DIBUJAR EL BORDE */}
      {hasBorder &&
        <Layer>
          <Rect
            x={0}
            y={0}
            width={stageSize.width}
            height={stageSize.height}
            stroke="white"
            // El borde será del 5% del ancho de la vista previa
            strokeWidth={stageSize.width * 0.05} 
            // El borde no debe ser interactivo (no se puede arrastrar)
            listening={false} 
          />
        </Layer>
      }
    </Stage>
  );
};

export default CropPreview;