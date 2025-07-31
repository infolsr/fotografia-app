import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

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
  filter, hasBorder, isFlipped // <-- Nuevas props
}) => {
  const [image] = useImage(imageUrl, 'Anonymous');
  const [stageSize, setStageSize] = useState({ width: 200, height: 300 });
  const [renderProps, setRenderProps] = useState({
    scale: 1,
    baseCrop: { x: 0, y: 0, width: 1, height: 1 },
    x: 0,
    y: 0,
  });
  const imageRef = useRef(null); // <-- Ref para la imagen de Konva

  // Efecto 1: Calcula el tamaño del escenario
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

  // Efecto 2: Calcula todas las props visuales
  useEffect(() => {
      if (!naturalWidth || !stageSize.width) return;

      // --- LÓGICA UNIFICADA Y FINAL ---
      const viewportWidth = stageSize.width;
      const viewportHeight = stageSize.height;

      // 1. Escala para que la imagen completa CUBRA el viewport
      const scaleToCover = Math.max(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
      const finalScale = scaleToCover * zoom;

      // 2. Dimensiones de la imagen escalada
      const scaledWidth = naturalWidth * finalScale;
      const scaledHeight = naturalHeight * finalScale;

      // 3. Rango de paneo y desplazamiento en píxeles
      const x_bound = (scaledWidth - viewportWidth) / 2;
      const y_bound = (scaledHeight - viewportHeight) / 2;
      const pixelOffsetX = x_bound > 0 ? x_bound * imagePosition.x : 0;
      const pixelOffsetY = y_bound > 0 ? y_bound * imagePosition.y : 0;

      // 4. Posición inicial (centrada) y final (con paneo)
      const initialX = (viewportWidth - scaledWidth) / 2;
      const initialY = (viewportHeight - scaledHeight) / 2;
      const x = initialX + pixelOffsetX;
      const y = initialY + pixelOffsetY;
      // --- FIN LÓGICA UNIFICADA ---

      setRenderProps({ scale: finalScale, x, y });
      
  }, [naturalWidth, naturalHeight, stageSize, zoom, imagePosition]);

    // useEffect para aplicar filtros de Konva
  useEffect(() => {
    if (!imageRef.current) return;
    const activeFilters = { 'bn': [Konva.Filters.Grayscale], 'sepia': [Konva.Filters.Sepia] }[filter];
    if (activeFilters) {
      imageRef.current.filters(activeFilters);
      imageRef.current.cache();
    } else {
      imageRef.current.filters([]);
      imageRef.current.clearCache();
    }
  }, [filter]);

  if (!image || !naturalWidth) {
    return <div style={{width: stageSize.width, height: stageSize.height, backgroundColor: '#f0f0f0'}} />;
  }
  
  const { scale, baseCrop, x, y } = renderProps;
  
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
          scaleX={isFlipped ? -1 : 1} // <-- Aplica espejado
          offsetX={isFlipped ? (naturalWidth * scale) : 0} // <-- Compensa el espejado
          draggable={isDraggable}
          onDragEnd={(e) => {
            const { scale } = renderProps;
            const scaledWidth = naturalWidth * scale;
            const scaledHeight = naturalHeight * scale;

            const x_bound = (scaledWidth - stageSize.width) / 2;
            const y_bound = (scaledHeight - stageSize.height) / 2;

            const pixelOffsetX = e.target.x() - (stageSize.width - scaledWidth) / 2;
            const pixelOffsetY = e.target.y() - (stageSize.height - scaledHeight) / 2;

            const normalizedX = x_bound > 0 ? pixelOffsetX / x_bound : 0;
            const normalizedY = y_bound > 0 ? pixelOffsetY / y_bound : 0;
            
            onImageUpdate(index, { 
              imagePosition: { 
                x: Math.max(-1, Math.min(1, normalizedX)),
                y: Math.max(-1, Math.min(1, normalizedY)),
              } 
            });
        }}
          // En: src/components/CropPreview.jsx -> dentro de <KonvaImage>

          dragBoundFunc={(pos) => {
              const { scale } = renderProps;
              const scaledWidth = naturalWidth * scale;
              const scaledHeight = naturalHeight * scale;

              const minX = stageSize.width - scaledWidth;
              const maxX = 0;
              const minY = stageSize.height - scaledHeight;
              const maxY = 0;

              return {
                x: Math.max(minX, Math.min(pos.x, maxX)),
                y: Math.max(minY, Math.min(pos.y, maxY)),
              };
          }}
        />
      </Layer>
    </Stage>
  );
};

export default CropPreview;