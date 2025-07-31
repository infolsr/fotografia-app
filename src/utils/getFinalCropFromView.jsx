// Archivo: src/utils/getFinalCropFromView.jsx

export const getFinalCropFromView = (img) => {
  const { 
    imagePosition = { x: 0, y: 0 }, 
    zoom = 1, 
    naturalWidth, 
    naturalHeight, 
    assignedFormat = "10x15",
  } = img;

  if (!naturalWidth || !naturalHeight) {
    console.error("Faltan naturalWidth/naturalHeight.");
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  // 1. Determinar el 'viewport' (el área visible al 100% de zoom)
  const cropFormats = { "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20, "carta": 8.5 / 11, "A4": 210 / 297 };
  let targetAspect = cropFormats[assignedFormat.toLowerCase()] || cropFormats["10x15"];
  const imageAspect = naturalWidth / naturalHeight;
  if ((imageAspect > 1 && targetAspect < 1) || (imageAspect < 1 && targetAspect > 1)) {
    targetAspect = 1 / targetAspect;
  }
  
  let viewportWidth = naturalWidth;
  let viewportHeight = Math.round(viewportWidth / targetAspect);
  if (viewportHeight > naturalHeight) {
    viewportHeight = naturalHeight;
    viewportWidth = Math.round(viewportHeight * targetAspect);
  }

  // 2. Determinar las dimensiones finales del recorte (afectadas por el zoom)
  const finalWidth = viewportWidth / zoom;
  const finalHeight = viewportHeight / zoom;

  // 3. Calcular el desplazamiento causado por el ZOOM
  const zoomOffsetX = (viewportWidth - finalWidth) / 2;
  const zoomOffsetY = (viewportHeight - finalHeight) / 2;

  // 4. Calcular el desplazamiento causado por el PANEO (independiente del zoom)
  const panBoundX = (naturalWidth - viewportWidth) / 2;
  const panBoundY = (naturalHeight - viewportHeight) / 2;
  const pixelPanX = imagePosition.x * panBoundX;
  const pixelPanY = imagePosition.y * panBoundY;

  // 5. Calcular la posición final sumando todos los desplazamientos
  const initialX = (naturalWidth - viewportWidth) / 2;
  const initialY = (naturalHeight - viewportHeight) / 2;
  
  const finalX = initialX + zoomOffsetX - pixelPanX;
  const finalY = initialY + zoomOffsetY - pixelPanY;

  const adjustedCropParams = {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(finalWidth),
    height: Math.round(finalHeight),
  };

  return adjustedCropParams;
};