// Archivo: src/utils/processImage.js

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function rotateSize(width, height, rotation) {
  const rotRad = (Math.abs(rotation) * Math.PI) / 180;
  return {
    width: Math.round(Math.abs(width * Math.cos(rotRad)) + Math.abs(height * Math.sin(rotRad))),
    height: Math.round(Math.abs(width * Math.sin(rotRad)) + Math.abs(height * Math.cos(rotRad))),
  };
}

export async function processImage(imageUrl, cropParams, options = {}, outputSize) {
  const image = await createImage(imageUrl);
  const { filter, isFlipped, hasBorder } = options;
  const { rotation = 0 } = cropParams;

  // 1. Crear canvas inicial con la imagen recortada
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = cropParams.width;
  canvas.height = cropParams.height;
  ctx.drawImage(
    image,
    cropParams.x, cropParams.y,
    cropParams.width, cropParams.height,
    0, 0,
    cropParams.width, cropParams.height
  );

  // Variable para el canvas que se va modificando
  let currentCanvas = canvas;

  // 2. Aplicar rotación si es necesario (código que ya tenías)
  if (rotation !== 0) {
    const rotatedCanvas = document.createElement('canvas');
    const rotatedCtx = rotatedCanvas.getContext('2d');
    const { width: newWidth, height: newHeight } = rotateSize(currentCanvas.width, currentCanvas.height, rotation);
    rotatedCanvas.width = newWidth;
    rotatedCanvas.height = newHeight;
    rotatedCtx.translate(newWidth / 2, newHeight / 2);
    rotatedCtx.rotate((rotation * Math.PI) / 180);
    rotatedCtx.drawImage(currentCanvas, -currentCanvas.width / 2, -currentCanvas.height / 2);
    currentCanvas = rotatedCanvas;
  }
  
  // 3. Crear un canvas final para aplicar efectos y redimensionar
  const finalCanvas = document.createElement('canvas');
  const finalCtx = finalCanvas.getContext('2d');
  finalCanvas.width = outputSize.width;
  finalCanvas.height = outputSize.height;

  // 4. Aplicar filtros y espejado
  let filterString = '';
  if (filter === 'bn') filterString = 'grayscale(100%)';
  if (filter === 'sepia') filterString = 'sepia(100%)';
  finalCtx.filter = filterString;

  if (isFlipped) {
    finalCtx.translate(finalCanvas.width, 0);
    finalCtx.scale(-1, 1);
  }
  
  // 5. Dibujar la imagen (ya recortada y rotada) en el canvas final
  finalCtx.drawImage(currentCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // 6. Añadir borde si es necesario (se dibuja encima de todo)
  if (hasBorder) {
    finalCtx.filter = 'none'; // Resetea el filtro para que el borde no se vea afectado
    finalCtx.strokeStyle = 'white';
    // El grosor del borde es un % del lado más corto de la imagen
    const strokeWidth = Math.min(finalCanvas.width, finalCanvas.height) * 0.025; 
    finalCtx.lineWidth = strokeWidth;
    // Dibuja el rectángulo del borde
    finalCtx.strokeRect(strokeWidth / 2, strokeWidth / 2, finalCanvas.width - strokeWidth, finalCanvas.height - strokeWidth);
  }

  // 7. Exportar el resultado como un Blob
  return new Promise((resolve) => {
    finalCanvas.toBlob(resolve, 'image/jpeg', 0.95);
  });
}