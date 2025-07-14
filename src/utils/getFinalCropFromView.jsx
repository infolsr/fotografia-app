export const getFinalCropFromView = (img) => {
  const { initialCrop, imagePosition = { x: 0, y: 0 }, zoomReal = 1 } = img;

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const visibleWidth = initialCrop.width / zoomReal;
  const visibleHeight = initialCrop.height / zoomReal;

  const maxOffsetX = (initialCrop.width - visibleWidth) / 2;
  const maxOffsetY = (initialCrop.height - visibleHeight) / 2;

  const offsetX = clamp(imagePosition.x, -1, 1) * maxOffsetX;
  const offsetY = clamp(imagePosition.y, -1, 1) * maxOffsetY;

  const newX = Math.round(initialCrop.x + (initialCrop.width - visibleWidth) / 2 + offsetX);
  const newY = Math.round(initialCrop.y + (initialCrop.height - visibleHeight) / 2 + offsetY);

  const adjustedCropParams = {
    x: Math.max(0, newX),
    y: Math.max(0, newY),
    width: Math.round(visibleWidth),
    height: Math.round(visibleHeight),
    rotation: initialCrop.rotation || 0,
  };

  console.log("🎯 Recorte calculado desde vista principal:", {
    ID: img.id,
    zoomReal,
    imagePosition,
    visibleWidth,
    visibleHeight,
    adjustedCropParams
  });

  return adjustedCropParams;
};
