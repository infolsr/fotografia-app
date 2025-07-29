// src/components/handleConfirmCrop.jsx

export const calcularRecorteAjustado = (img) => {
  const { initialCrop, imagePosition = { x: 0, y: 0 } } = img;

// — Inserta aquí el log de entrada a recorte ajustado —
console.log("🔍 [calcularRecorteAjustado] Entrada:", {
id: img.id,
initialCrop: img.initialCrop,
imagePosition: img.imagePosition,
zoomReal: img.zoomReal
});
  const zoomReal = img.zoomReal ?? 1;


  // Paso 1: Calcular el área visible con el zoom aplicado
  const visibleWidth = initialCrop.width / zoomReal;
  const visibleHeight = initialCrop.height / zoomReal;

  // Paso 2: Máximo desplazamiento en píxeles (desde el centro del recorte)
  const maxOffsetX = (initialCrop.width - visibleWidth) / 2;
  const maxOffsetY = (initialCrop.height - visibleHeight) / 2;

  // Paso 3: Calcular la posición final dentro del recorte
  let newX = Math.round(
    initialCrop.x + (initialCrop.width - visibleWidth) / 2 - imagePosition.x * maxOffsetX
  );
  let newY = Math.round(
    initialCrop.y + (initialCrop.height - visibleHeight) / 2 - imagePosition.y * maxOffsetY
  );

  // Paso 4: Prevenir que los valores se salgan del área válida
  newX = Math.max(0, newX);
  newY = Math.max(0, newY);

  const adjustedCropParams = {
    width: Math.round(visibleWidth),
    height: Math.round(visibleHeight),
    x: newX,
    y: newY,
    rotation: initialCrop.rotation || 0
  };

  // 🧪 DEBUG COMPLETO
  console.log("🟢 [Recorte Ajustado] Parámetros calculados:");
  console.table({
    ID: img.id,
    "Zoom real": zoomReal,
    "Posición X": imagePosition.x,
    "Posición Y": imagePosition.y,
    "Recorte inicial W": initialCrop.width,
    "Recorte inicial H": initialCrop.height,
    "Área visible W": visibleWidth,
    "Área visible H": visibleHeight,
    "MaxOffset X": maxOffsetX,
    "MaxOffset Y": maxOffsetY,
    "Nuevo X": newX,
    "Nuevo Y": newY
  });
  console.log("🟦 Parámetros finales enviados a cropImage:", adjustedCropParams);

  // — Log JSON completo del recorte final —
  console.log(
    "🎯 [calcularRecorteAjustado] finalCrop JSON:",
    JSON.stringify({
      id: img.id,
      adjustedCropParams,
      initialCrop,
      imagePosition,
      zoomReal
    })
  );

  return adjustedCropParams;
};
