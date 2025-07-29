// En: src/utils/cropImage.js

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
  // --- LOG DE DEBUG 0: PARÁMETROS DE ENTRADA ---
  console.log("--- INICIANDO processImage ---");
  // — Log JSON completo de entrada al procesamiento —
  console.log(
    "🔄 [cropImage] Entrada processImage:",
    JSON.stringify({ imageUrl, cropParams, options, outputSize })
  );

  const image = await createImage(imageUrl);
  const { filter, isFlipped, hasBorder } = options;
  const { rotation = 0 } = cropParams;

  // 1. RECORTAR PRIMERO
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) throw new Error('No se pudo obtener el contexto del canvas recortado');

  croppedCanvas.width = cropParams.width;
  croppedCanvas.height = cropParams.height;

  croppedCtx.drawImage(
    image,
    cropParams.x,
    cropParams.y,
    cropParams.width,
    cropParams.height,
    0, 0,
    cropParams.width,
    cropParams.height
  );
  
  // --- LOG DE DEBUG 1: DESPUÉS DEL RECORTE ---
  console.log("PASO 1: Dimensiones después del recorte inicial:", { width: croppedCanvas.width, height: croppedCanvas.height });
  
  let currentCanvas = croppedCanvas;

  // 2. APLICAR TRANSFORMACIONES
  if (rotation !== 0) {
    const rotatedCanvas = document.createElement('canvas');
    const rotatedCtx = rotatedCanvas.getContext('2d');
    if (!rotatedCtx) throw new Error('No se pudo obtener el contexto del canvas rotado');
    
    const rotRad = (rotation * Math.PI) / 180;
    const { width: newWidth, height: newHeight } = rotateSize(currentCanvas.width, currentCanvas.height, rotation);
    rotatedCanvas.width = newWidth;
    rotatedCanvas.height = newHeight;

    rotatedCtx.translate(newWidth / 2, newHeight / 2);
    rotatedCtx.rotate(rotRad);
    rotatedCtx.drawImage(currentCanvas, -currentCanvas.width / 2, -currentCanvas.height / 2);
    
    currentCanvas = rotatedCanvas;
    // --- LOG DE DEBUG 2: DESPUÉS DE LA ROTACIÓN ---
    console.log("PASO 2a: Dimensiones después de la rotación:", { width: currentCanvas.width, height: currentCanvas.height });
  }
  
  if (isFlipped) {
    // ... lógica de espejado ...
    currentCanvas = flippedCanvas;
  }
  if (filter && filter !== 'ninguno') {
    // ... lógica de filtro ...
    currentCanvas = filteredCanvas;
  }
  if (hasBorder) {
    // ... lógica de borde ...
    currentCanvas = borderedCanvas;
  }

  // --- LOG DE DEBUG 3: ANTES DEL REDIMENSIONADO ---
  console.log("PASO 3: Dimensiones ANTES del redimensionado final:", { width: currentCanvas.width, height: currentCanvas.height });

  // 3. REDIMENSIONADO FINAL
  const resizedCanvas = document.createElement('canvas');
  const resizedCtx = resizedCanvas.getContext('2d');
  resizedCanvas.width = outputSize.width;
  resizedCanvas.height = outputSize.height;
  
  // --- LOG DE DEBUG 4: DIMENSIONES DE SALIDA ---
  //console.log("PASO 4: Redimensionando A:", { width: resizedCanvas.width, height: resizedCanvas.height });
  // — Log JSON del tamaño final antes de exportar blob —
  console.log(
    "🔄 [cropImage] outputSize:",
    JSON.stringify(outputSize)
  );
  
  resizedCtx.drawImage(currentCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);

  return new Promise((resolve) => {
    resizedCanvas.toBlob(resolve, 'image/jpeg', 0.95);
  });
}