export const calcularRecorteAjustado = (img) => {
  const { initialCrop, imagePosition } = img;
  const zoomReal = img.zoomReal ?? 1;

  const visibleWidth = Math.min(initialCrop.width / zoomReal, initialCrop.width);
  const visibleHeight = Math.min(initialCrop.height / zoomReal, initialCrop.height);

  const maxOffsetX = (initialCrop.width - visibleWidth) / 2;
  const maxOffsetY = (initialCrop.height - visibleHeight) / 2;

  let newX = Math.round(initialCrop.x + (initialCrop.width - visibleWidth) / 2 - imagePosition.x * maxOffsetX);
  let newY = Math.round(initialCrop.y + (initialCrop.height - visibleHeight) / 2 - imagePosition.y * maxOffsetY);

  // Limita para que el crop no se pase de los bordes
  newX = Math.max(0, Math.min(newX, initialCrop.width - visibleWidth));
  newY = Math.max(0, Math.min(newY, initialCrop.height - visibleHeight));

  const adjustedCropParams = {
    width: Math.round(visibleWidth),
    height: Math.round(visibleHeight),
    x: newX,
    y: newY,
    rotation: initialCrop.rotation || 0,
  };

  console.log("🟢 Recorte ajustado desde handleConfirmCrop:", {
    id: img.id,
    zoomReal,
    imagePosition,
    initialCrop,
    visibleWidth,
    visibleHeight,
    maxOffsetX,
    maxOffsetY,
    newX,
    newY,
    adjustedCropParams
  });

  return adjustedCropParams;
};
