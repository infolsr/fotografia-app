export const getFinalCropFromView = (img) => {
  const { initialCrop, imagePosition } = img;
  const zoomReal = img.zoomReal ?? 1;

  const visibleWidth = initialCrop.width / zoomReal;
  const visibleHeight = initialCrop.height / zoomReal;

  const maxX = initialCrop.x + initialCrop.width - visibleWidth;
  const maxY = initialCrop.y + initialCrop.height - visibleHeight;

  let adjustedX = initialCrop.x + imagePosition.x * (initialCrop.width - visibleWidth);
  let adjustedY = initialCrop.y + imagePosition.y * (initialCrop.height - visibleHeight);

  // Limitar dentro del rango permitido
  adjustedX = Math.max(initialCrop.x, Math.min(adjustedX, maxX));
  adjustedY = Math.max(initialCrop.y, Math.min(adjustedY, maxY));

  const finalCrop = {
    x: Math.round(adjustedX),
    y: Math.round(adjustedY),
    width: Math.round(visibleWidth),
    height: Math.round(visibleHeight),
    rotation: 0,
  };

  console.log("🧪 [Recorte desde vista del usuario]:", {
    ID: img.id,
    offsetX: imagePosition.x,
    offsetY: imagePosition.y,
    zoom: img.zoom,
    zoomReal,
    visibleWidth,
    visibleHeight,
    adjustedCropParams: finalCrop
  });

  return finalCrop;
};
