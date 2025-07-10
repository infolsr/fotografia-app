import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

const CropPreview = ({
  index, 
  imageUrl,
  formato = "10x15",
  imagePosition = { x: 0, y: 0 },
  zoom = 1,
  isDraggable = false,
  filter = 'ninguno',
  hasBorder = false,
  isFlipped = false,
  onImageUpdate = () => {},
}) => {
  const [image] = useImage(imageUrl, 'Anonymous');
  const imageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 200, height: 300 });
  const [calculatedProps, setCalculatedProps] = useState({
    scaledWidth: 0, scaledHeight: 0, initialX: 0, initialY: 0, imgX: 0, imgY: 0,
  });

  const aspectoPorTamanio = {
    "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20,
    "carta": 8.5 / 11, "A4": 210 / 297,
  };

  useEffect(() => {
    if (!image) return;
    let aspectoPapel = aspectoPorTamanio[formato] || aspectoPorTamanio["10x15"];
    const aspectoImagen = image.width / image.height;
    if ((aspectoImagen > 1 && aspectoPapel < 1) || (aspectoImagen < 1 && aspectoPapel > 1)) {
      aspectoPapel = 1 / aspectoPapel;
    }
    const baseWidth = 200;
    const finalHeight = baseWidth / aspectoPapel;
    setStageSize({ width: baseWidth, height: Math.round(finalHeight) });
  }, [formato, image]);

  useEffect(() => {
    if (!image || stageSize.width === 0) return;
    const zoomToCover = Math.max(stageSize.width / image.width, stageSize.height / image.height);
    const finalZoom = zoomToCover * zoom;
    const scaledWidth = image.width * finalZoom;
    const scaledHeight = image.height * finalZoom;

    const x_bound = (scaledWidth - stageSize.width) / 2;
    const y_bound = (scaledHeight - stageSize.height) / 2;
    const pixelOffsetX = x_bound > 0 ? x_bound * imagePosition.x : 0;
    const pixelOffsetY = y_bound > 0 ? y_bound * imagePosition.y : 0;
    
    const initialX = (stageSize.width - scaledWidth) / 2;
    const initialY = (stageSize.height - scaledHeight) / 2;
    const imgX = initialX + pixelOffsetX;
    const imgY = initialY + pixelOffsetY;

    setCalculatedProps({ scaledWidth, scaledHeight, initialX, initialY, imgX, imgY });
  }, [image, stageSize, zoom, imagePosition]);

  useEffect(() => {
    if (image && imageRef.current && calculatedProps.scaledWidth > 0) {
      const activeFilters = { 'bn': [Konva.Filters.Grayscale], 'sepia': [Konva.Filters.Sepia] }[filter];
      if (activeFilters) {
        imageRef.current.filters(activeFilters);
        imageRef.current.cache();
      } else {
        imageRef.current.filters([]);
        imageRef.current.clearCache();
      }
    }
  }, [image, filter, calculatedProps.scaledWidth]);

  useEffect(() => {
    if (!image || !stageSize.width) return;
    const zoomToCover = Math.max(stageSize.width / image.width, stageSize.height / image.height);
    const finalZoom = zoomToCover * zoom;
    const x_bound = (image.width * finalZoom - stageSize.width) / 2;
    const y_bound = (image.height * finalZoom - stageSize.height) / 2;
    if (x_bound < 0 || y_bound < 0) {
      if (imagePosition.x !== 0 || imagePosition.y !== 0) {
        onImageUpdate(index, { imagePosition: { x: 0, y: 0 } });
      }
      return;
    }

    if (Math.abs(imagePosition.x) > 1 || Math.abs(imagePosition.y) > 1) {
      onImageUpdate(index, {
        imagePosition: {
          x: Math.max(-1, Math.min(imagePosition.x, 1)),
          y: Math.max(-1, Math.min(imagePosition.y, 1)),
        },
      });
    }
  }, [zoom, image, stageSize, imagePosition, onImageUpdate]);

  useEffect(() => {
    if (!image || !stageSize.width) return;
    const zoomToCover = Math.max(stageSize.width / image.width, stageSize.height / image.height);
    const finalZoom = zoomToCover * zoom;

    // Guardamos este zoom real de visualización
    onImageUpdate(index, { zoomReal: finalZoom });
  }, [image, stageSize, zoom, onImageUpdate]);

  const { scaledWidth, scaledHeight, imgX, imgY } = calculatedProps;
  const scaleX = isFlipped ? -1 : 1;
  const offsetX = isFlipped ? scaledWidth : 0;

  const limitDrag = (pos) => {
    const minX = stageSize.width - scaledWidth;
    const maxX = 0;
    const minY = stageSize.height - scaledHeight;
    const maxY = 0;
    const x = Math.max(minX, Math.min(pos.x, maxX));
    const y = Math.max(minY, Math.min(pos.y, maxY));
    return { x, y };
  };

  if (!image) return null;

  return (
    <Stage width={stageSize.width} height={stageSize.height} className="rounded-md">
      <Layer>
        <KonvaImage
          image={image}
          x={imgX}
          y={imgY}
          width={scaledWidth}
          height={scaledHeight}
          scaleX={scaleX}
          offsetX={offsetX}
          opacity={0.5}
          listening={false}
        />
      </Layer>
      <Layer clip={{ x: 0, y: 0, width: stageSize.width, height: stageSize.height }}>
        <KonvaImage
          ref={imageRef}
          image={image}
          x={imgX}
          y={imgY}
          width={scaledWidth}
          height={scaledHeight}
          scaleX={scaleX}
          offsetX={offsetX}
          draggable={isDraggable}
          dragBoundFunc={limitDrag}
          onDragEnd={(e) => {
            const centerX = (stageSize.width - scaledWidth) / 2;
            const centerY = (stageSize.height - scaledHeight) / 2;
            const pixelOffsetX = e.target.x() - centerX;
            const pixelOffsetY = e.target.y() - centerY;
            const x_bound = (scaledWidth - stageSize.width) / 2;
            const y_bound = (scaledHeight - stageSize.height) / 2;
            const normalizedX = x_bound > 0 ? pixelOffsetX / x_bound : 0;
            const normalizedY = y_bound > 0 ? pixelOffsetY / y_bound : 0;

            onImageUpdate(index, { imagePosition: { x: normalizedX, y: normalizedY } });
          }}
        />
      </Layer>
      {hasBorder && (() => {
        const strokeWidth = stageSize.width * 0.04;
        return (
          <Layer>
            <Rect
              x={strokeWidth / 2}
              y={strokeWidth / 2}
              width={stageSize.width - strokeWidth}
              height={stageSize.height - strokeWidth}
              stroke="white"
              strokeWidth={strokeWidth}
              listening={false}
            />
          </Layer>
        );
      })()}
    </Stage>
  );
};

export default CropPreview;
