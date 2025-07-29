// En getFinalCropFromView.jsx

export const getFinalCropFromView = (img) => {
  const { 
    imagePosition = { x: 0, y: 0 }, 
    zoom = 1, 
    naturalWidth, 
    naturalHeight, 
    assignedFormat = "10x15",
  } = img;

  // Si no tenemos las dimensiones originales, no podemos continuar.
  if (!naturalWidth || !naturalHeight) {
    console.error("Faltan naturalWidth/naturalHeight para el cálculo del recorte.");
    return { x: 0, y: 0, width: 100, height: 150, rotation: 0 };
  }

  // 1. Obtener la relación de aspecto del formato (ej: 10/15)
  const cropFormats = {
    "10x15": 10 / 15, "13x18": 13 / 18, "15x20": 15 / 20,
    "carta": 8.5 / 11, "A4": 210 / 297
  };
  let targetAspect = cropFormats[assignedFormat];
  const imageAspect = naturalWidth / naturalHeight;
  if ((imageAspect > 1 && targetAspect < 1) || (imageAspect < 1 && targetAspect > 1)) {
    targetAspect = 1 / targetAspect;
  }

  // 2. Calcular el área de recorte base que "cubre" la imagen original
  let baseCropWidth = naturalWidth;
  let baseCropHeight = Math.round(baseCropWidth / targetAspect);
  if (baseCropHeight > naturalHeight) {
    baseCropHeight = naturalHeight;
    baseCropWidth = Math.round(baseCropHeight * targetAspect);
  }
  const baseCropX = (naturalWidth - baseCropWidth) / 2;
  const baseCropY = (naturalHeight - baseCropHeight) / 2;

  // 3. Aplicar el zoom del usuario a esa área base
  const visibleWidth = baseCropWidth / zoom;
  const visibleHeight = baseCropHeight / zoom;

  // 4. Calcular el desplazamiento (paneo) del usuario
  const maxOffsetX = (baseCropWidth - visibleWidth) / 2;
  const maxOffsetY = (baseCropHeight - visibleHeight) / 2;
  const offsetX = imagePosition.x * maxOffsetX;
  const offsetY = imagePosition.y * maxOffsetY;
  
  // 5. Calcular la posición final del recorte en el sistema de coordenadas de la imagen original
  const finalX = (baseCropX + baseCropWidth / 2) - (visibleWidth / 2) + offsetX;
  const finalY = (baseCropY + baseCropHeight / 2) - (visibleHeight / 2) + offsetY;

  const adjustedCropParams = {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(visibleWidth),
    height: Math.round(visibleHeight),
    rotation: 0,
  };

  console.log("🎯 Recorte calculado (NUEVA LÓGICA):", { adjustedCropParams });
  
  return adjustedCropParams;
};